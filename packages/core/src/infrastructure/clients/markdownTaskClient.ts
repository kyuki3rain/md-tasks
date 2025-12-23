import type { Heading, List, ListItem, Paragraph, RootContent, Text } from 'mdast';
import { err, ok, type Result } from 'neverthrow';
import type { TaskMetadata } from '../../domain/entities/task';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { RemarkClient } from '../clients/remarkClient';

/**
 * パース結果のタスク情報（行番号付き）
 */
export interface ParsedTask {
	id: string;
	title: string;
	status: Status;
	path: Path;
	isChecked: boolean;
	metadata: TaskMetadata;
	startLine: number;
	endLine: number;
}

/**
 * フロントマターから読み取ったKanban設定
 */
export interface FrontmatterConfig {
	statuses?: string[];
	doneStatuses?: string[];
	defaultStatus?: string;
	defaultDoneStatus?: string;
	sortBy?: string;
	syncCheckboxWithDone?: boolean;
}

/**
 * パース結果
 */
export interface ParseResult {
	tasks: ParsedTask[];
	headings: Path[];
	warnings: string[];
	config?: FrontmatterConfig;
}

/**
 * パースエラー
 */
export class MarkdownParseError extends Error {
	readonly _tag = 'MarkdownParseError';
	constructor(message: string) {
		super(message);
		this.name = 'MarkdownParseError';
	}
}

/**
 * タスク作成情報
 */
export interface CreateTaskInfo {
	title: string;
	path: Path;
	status: Status;
}

/**
 * タスク編集情報
 */
export interface TaskEdit {
	/** 編集対象タスクのID（更新/削除時に使用） */
	taskId?: string;
	/** 新しいステータス */
	newStatus?: Status;
	/** 新しいタイトル */
	newTitle?: string;
	/** 新しいパス（見出し階層） */
	newPath?: Path;
	/** 削除フラグ */
	delete?: boolean;
	/** 新規作成情報 */
	create?: CreateTaskInfo;
	/** 完了扱いとするステータスのリスト */
	doneStatuses?: string[];
}

/**
 * シリアライザーエラー
 */
export class SerializerError extends Error {
	readonly _tag = 'SerializerError';
	constructor(message: string) {
		super(message);
		this.name = 'SerializerError';
	}
}

/**
 * MarkdownTaskClient
 * Markdownファイルからタスクを抽出・編集するクライアント
 */
export class MarkdownTaskClient {
	private static readonly DEFAULT_STATUS = 'todo';
	private static readonly DEFAULT_DONE_STATUS = 'done';
	private static readonly KEY_VALUE_PATTERN = /^([^:]+):\s*(.+)$/;

	constructor(private readonly remarkClient: RemarkClient = new RemarkClient()) {}

	/**
	 * Markdownをパースしてタスクを抽出する
	 */
	parse(markdown: string): Result<ParseResult, MarkdownParseError> {
		// フロントマターを抽出
		const { content, data } = this.remarkClient.parseFrontmatter(markdown);
		const config = this.extractConfig(data);

		// フロントマターを除いた行のオフセットを計算
		const frontmatterLineCount = this.remarkClient.countFrontmatterLines(markdown, content);

		// Markdownをパース
		const tree = this.remarkClient.parseToAst(content);

		// 見出しスタックを初期化
		const headingStack: { level: number; text: string }[] = [];
		const headings: Path[] = [];
		const tasks: ParsedTask[] = [];
		const warnings: string[] = [];

		// ASTを走査
		this.walkNodes(
			tree.children,
			headingStack,
			headings,
			tasks,
			frontmatterLineCount,
			content,
			config,
		);

		// 重複タスクを検出
		this.detectDuplicates(tasks, warnings);

		return ok({
			tasks,
			headings,
			warnings,
			config,
		});
	}

	/**
	 * 編集を適用する
	 */
	applyEdit(markdown: string, edit: TaskEdit): Result<string, SerializerError> {
		// 新規作成の場合
		if (edit.create) {
			return this.createTask(markdown, edit.create, edit.doneStatuses);
		}

		// 更新/削除の場合
		if (!edit.taskId) {
			return err(new SerializerError('タスクIDが指定されていません'));
		}

		// Markdownをパース
		const parseResult = this.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks } = parseResult.value;

		// タスクを検索
		const task = tasks.find((t) => t.id === edit.taskId);
		if (!task) {
			return err(new SerializerError(`タスクが見つかりません: ${edit.taskId}`));
		}

		// 削除の場合
		if (edit.delete) {
			return this.deleteTask(markdown, task);
		}

		// 更新の場合
		return this.updateTask(markdown, task, edit);
	}

	/**
	 * フロントマターからKanban設定を抽出
	 */
	private extractConfig(data: Record<string, unknown>): FrontmatterConfig | undefined {
		const kanban = data.kanban;
		if (!kanban || typeof kanban !== 'object') {
			return undefined;
		}

		const config = kanban as Record<string, unknown>;
		return {
			statuses: Array.isArray(config.statuses) ? config.statuses : undefined,
			doneStatuses: Array.isArray(config.doneStatuses) ? config.doneStatuses : undefined,
			defaultStatus: typeof config.defaultStatus === 'string' ? config.defaultStatus : undefined,
			defaultDoneStatus:
				typeof config.defaultDoneStatus === 'string' ? config.defaultDoneStatus : undefined,
			sortBy: typeof config.sortBy === 'string' ? config.sortBy : undefined,
			syncCheckboxWithDone:
				typeof config.syncCheckboxWithDone === 'boolean' ? config.syncCheckboxWithDone : undefined,
		};
	}

	/**
	 * ASTノードを走査
	 */
	private walkNodes(
		nodes: RootContent[],
		headingStack: { level: number; text: string }[],
		headings: Path[],
		tasks: ParsedTask[],
		lineOffset: number,
		content: string,
		config?: FrontmatterConfig,
		isInBlockquote = false,
	): void {
		for (const node of nodes) {
			// 引用内は無視
			if (node.type === 'blockquote') {
				continue;
			}

			// コードブロック内は無視
			if (node.type === 'code') {
				continue;
			}

			// 見出しを処理
			if (node.type === 'heading') {
				this.processHeading(node, headingStack, headings);
				continue;
			}

			// リストを処理
			if (node.type === 'list') {
				this.processList(node, headingStack, tasks, lineOffset, content, config, isInBlockquote);
			}
		}
	}

	/**
	 * 見出しを処理
	 */
	private processHeading(
		heading: Heading,
		headingStack: { level: number; text: string }[],
		headings: Path[],
	): void {
		const text = this.extractTextFromNodes(heading.children);
		const level = heading.depth;

		// 現在のレベル以上の見出しを削除
		while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
			headingStack.pop();
		}

		// 新しい見出しをスタックに追加
		headingStack.push({ level, text });

		// パスを生成
		const segments = headingStack.map((h) => h.text);
		const path = Path.create(segments);
		headings.push(path);
	}

	/**
	 * リストを処理
	 */
	private processList(
		list: List,
		headingStack: { level: number; text: string }[],
		tasks: ParsedTask[],
		lineOffset: number,
		content: string,
		config?: FrontmatterConfig,
		isInBlockquote = false,
	): void {
		for (const item of list.children) {
			if (item.type !== 'listItem') {
				continue;
			}

			// チェックボックスでない場合はスキップ
			if (item.checked === null || item.checked === undefined) {
				// 子リストがあれば処理（通常のリスト内のチェックボックス）
				for (const child of item.children) {
					if (child.type === 'list') {
						this.processList(
							child,
							headingStack,
							tasks,
							lineOffset,
							content,
							config,
							isInBlockquote,
						);
					}
				}
				continue;
			}

			// 引用内のチェックボックスは無視
			if (isInBlockquote) {
				continue;
			}

			// タスクを抽出
			const task = this.extractTask(item, headingStack, lineOffset, content, config);
			if (task) {
				tasks.push(task);
			}
		}
	}

	/**
	 * リストアイテムからタスクを抽出
	 */
	private extractTask(
		item: ListItem,
		headingStack: { level: number; text: string }[],
		lineOffset: number,
		content: string,
		config?: FrontmatterConfig,
	): ParsedTask | null {
		const isChecked = item.checked === true;

		// タイトルを抽出（最初のParagraphから、元のMarkdownソースを保持）
		let title = '';
		let metadata: TaskMetadata = {};
		let endLine = item.position?.end.line ?? 0;

		for (const child of item.children) {
			if (child.type === 'paragraph' && title === '') {
				// positionからオリジナルのMarkdownを抽出
				if (
					child.position?.start.offset !== undefined &&
					child.position?.end.offset !== undefined
				) {
					let rawTitle = content
						.slice(child.position.start.offset, child.position.end.offset)
						.trim();
					// チェックボックスパターンを除去（mdastのParagraphにはチェックボックスが含まれる）
					rawTitle = rawTitle.replace(/^\[[ xX]\]\s*/, '');
					title = rawTitle;
				} else {
					// フォールバック: テキスト抽出
					title = this.extractTextFromNodes(child.children);
				}
			} else if (child.type === 'list') {
				// 子リストからメタデータを抽出
				const extracted = this.extractMetadata(child);
				metadata = extracted.metadata;
				if (child.position?.end.line) {
					endLine = child.position.end.line;
				}
			}
		}

		if (!title) {
			return null;
		}

		// パスを生成
		const segments = headingStack.map((h) => h.text);
		const path = Path.create(segments);

		// ステータスを決定
		const statusValue = this.determineStatus(metadata.status, isChecked, config);
		const statusResult = Status.create(statusValue);
		if (statusResult.isErr()) {
			return null;
		}
		const status = statusResult.value;

		// メタデータからstatusを削除（エンティティのstatusに移動したため）
		const { status: _status, ...otherMetadata } = metadata;

		// IDを生成
		const id = this.generateTaskId(path, title);

		const startLine = (item.position?.start.line ?? 0) + lineOffset;
		const actualEndLine = endLine + lineOffset;

		return {
			id,
			title,
			status,
			path,
			isChecked,
			metadata: otherMetadata,
			startLine,
			endLine: actualEndLine,
		};
	}

	/**
	 * ステータスを決定する
	 */
	private determineStatus(
		explicitStatus: string | undefined,
		isChecked: boolean,
		config?: FrontmatterConfig,
	): string {
		if (explicitStatus) {
			return explicitStatus;
		}

		if (isChecked) {
			return config?.defaultDoneStatus ?? MarkdownTaskClient.DEFAULT_DONE_STATUS;
		}

		return config?.defaultStatus ?? MarkdownTaskClient.DEFAULT_STATUS;
	}

	/**
	 * 子リストからメタデータを抽出
	 */
	private extractMetadata(list: List): { metadata: TaskMetadata } {
		const metadata: TaskMetadata = {};

		for (const item of list.children) {
			if (item.type !== 'listItem') {
				continue;
			}

			// Paragraph内のテキストを取得
			for (const child of item.children) {
				if (child.type !== 'paragraph') {
					continue;
				}

				const text = this.extractTextFromNodes(child.children).trim();
				const match = text.match(MarkdownTaskClient.KEY_VALUE_PATTERN);

				if (match) {
					const key = match[1].trim();
					const value = match[2].trim();

					// 空のキーは無視
					if (key) {
						metadata[key] = value;
					}
				}
			}
		}

		return { metadata };
	}

	/**
	 * ノードからテキストを抽出
	 */
	private extractTextFromNodes(
		nodes: Array<
			RootContent | Text | Paragraph | { type: string; children?: unknown[]; value?: string }
		>,
	): string {
		let text = '';

		for (const node of nodes) {
			if (node.type === 'text') {
				text += (node as Text).value;
			} else if (node.type === 'inlineCode') {
				text += `\`${(node as { value: string }).value}\``;
			} else if ('children' in node && Array.isArray(node.children)) {
				text += this.extractTextFromNodes(node.children as Array<Text>);
			}
		}

		return text;
	}

	/**
	 * タスクIDを生成
	 */
	private generateTaskId(path: Path, title: string): string {
		return `${path.toString()}::${title}`;
	}

	/**
	 * 重複タスクを検出
	 */
	private detectDuplicates(tasks: ParsedTask[], warnings: string[]): void {
		const seen = new Map<string, number[]>();

		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			const key = task.id;

			if (seen.has(key)) {
				seen.get(key)?.push(task.startLine);
			} else {
				seen.set(key, [task.startLine]);
			}
		}

		for (const [id, lines] of seen.entries()) {
			if (lines.length > 1) {
				// IDからタイトルとパスを抽出
				const [pathStr, title] = id.split('::');
				warnings.push(`⚠ 重複タスクを検出: "${title}" (${pathStr}) - ${lines.join('行目, ')}行目`);
			}
		}
	}

	/**
	 * タスクを更新する（その場で更新）
	 */
	private updateTask(
		markdown: string,
		task: ParsedTask,
		edit: TaskEdit,
	): Result<string, SerializerError> {
		// パス変更がある場合は移動処理に委譲
		if (edit.newPath && !edit.newPath.equals(task.path)) {
			return this.moveTask(markdown, task, edit);
		}

		const lines = markdown.split('\n');

		// タスク行を取得して変更を適用
		const taskLines = lines.slice(task.startLine - 1, task.endLine);
		this.applyTitleChange(taskLines, edit.newTitle);
		this.applyStatusChange(taskLines, edit.newStatus, edit.doneStatuses);

		// 変更後の行で元の行を置き換え
		lines.splice(task.startLine - 1, task.endLine - task.startLine + 1, ...taskLines);

		return ok(lines.join('\n'));
	}

	/**
	 * タスクを別のパスに移動する
	 */
	private moveTask(
		markdown: string,
		task: ParsedTask,
		edit: TaskEdit,
	): Result<string, SerializerError> {
		const newPath = edit.newPath;
		if (!newPath) {
			return err(new SerializerError('移動先パスが指定されていません'));
		}

		// 移動先パスの検証
		const validationResult = this.validateTargetPath(markdown, newPath);
		if (validationResult.isErr()) {
			return err(validationResult.error);
		}

		// タスクの元のテキストを取得（メタデータを含む全行）
		const lines = markdown.split('\n');
		const taskLines = lines.slice(task.startLine - 1, task.endLine);

		// タスク行に変更を適用
		this.applyTitleChange(taskLines, edit.newTitle);
		this.applyStatusChange(taskLines, edit.newStatus, edit.doneStatuses);

		// 元の場所からタスクを削除
		const deleteCount = task.endLine - task.startLine + 1;
		lines.splice(task.startLine - 1, deleteCount);

		// 削除後のMarkdownを再パースして挿入位置を決定
		const deletedMarkdown = lines.join('\n');
		const insertLineResult = this.findInsertLineForNewPath(deletedMarkdown, newPath);
		if (insertLineResult.isErr()) {
			return err(insertLineResult.error);
		}

		// 新しい場所にタスクを挿入
		const remainingLines = deletedMarkdown.split('\n');
		remainingLines.splice(insertLineResult.value, 0, ...taskLines);

		return ok(remainingLines.join('\n'));
	}

	/**
	 * タスク行にタイトル変更を適用する
	 */
	private applyTitleChange(taskLines: string[], newTitle?: string): void {
		if (!newTitle) return;

		const checkboxPattern = /^(\s*-\s*\[[ xX]\]\s*)(.+)$/;
		const match = taskLines[0].match(checkboxPattern);
		if (match) {
			taskLines[0] = match[1] + newTitle;
		}
	}

	/**
	 * タスク行にステータス変更を適用する
	 */
	private applyStatusChange(
		taskLines: string[],
		newStatus?: Status,
		doneStatuses?: string[],
	): void {
		if (!newStatus) return;

		const isDone = doneStatuses?.includes(newStatus.value) ?? false;

		// チェックボックスを更新
		if (isDone) {
			taskLines[0] = taskLines[0].replace(/\[[ ]\]/, '[x]');
		} else {
			taskLines[0] = taskLines[0].replace(/\[[xX]\]/, '[ ]');
		}

		// ステータス行を更新または追加
		const statusLineIndex = this.findStatusLineIndex(taskLines);

		if (statusLineIndex >= 0) {
			const indent = taskLines[statusLineIndex].match(/^(\s*)/)?.[1] ?? '  ';
			taskLines[statusLineIndex] = `${indent}- status: ${newStatus.value}`;
		} else {
			taskLines.splice(1, 0, `  - status: ${newStatus.value}`);
		}
	}

	/**
	 * タスク行内のステータス行のインデックスを見つける
	 */
	private findStatusLineIndex(taskLines: string[]): number {
		for (let i = 1; i < taskLines.length; i++) {
			if (taskLines[i].match(/^\s*-\s*status:\s*.+$/)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * 移動先パスが有効か検証する
	 */
	private validateTargetPath(markdown: string, targetPath: Path): Result<void, SerializerError> {
		if (targetPath.isRoot()) {
			return ok(undefined);
		}

		const parseResult = this.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { headings } = parseResult.value;
		const headingExists = headings.some((h) => h.equals(targetPath));
		if (!headingExists) {
			return err(new SerializerError(`見出しが見つかりません: ${targetPath.toString()}`));
		}

		return ok(undefined);
	}

	/**
	 * 新しいパスへの挿入位置を決定する
	 */
	private findInsertLineForNewPath(
		markdown: string,
		targetPath: Path,
	): Result<number, SerializerError> {
		const parseResult = this.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks, headings } = parseResult.value;
		const lines = markdown.split('\n');

		if (targetPath.isRoot()) {
			return ok(this.findInsertLineForRoot(lines, tasks));
		}

		return ok(this.findInsertLineForHeading(lines, tasks, headings, targetPath));
	}

	/**
	 * ルートへの挿入位置を決定する
	 */
	private findInsertLineForRoot(lines: string[], tasks: ParsedTask[]): number {
		const rootTasks = tasks.filter((t) => t.path.isRoot());
		if (rootTasks.length > 0) {
			return rootTasks[rootTasks.length - 1].endLine;
		}

		const firstHeadingLine = this.findFirstHeadingLine(lines);
		return firstHeadingLine >= 0 ? firstHeadingLine : lines.length;
	}

	/**
	 * 見出し配下への挿入位置を決定する
	 */
	private findInsertLineForHeading(
		lines: string[],
		tasks: ParsedTask[],
		headings: Path[],
		targetPath: Path,
	): number {
		const pathTasks = tasks.filter((t) => t.path.equals(targetPath));
		if (pathTasks.length > 0) {
			return pathTasks[pathTasks.length - 1].endLine;
		}

		return this.findInsertLineForPath(lines, targetPath, headings);
	}

	/**
	 * タスクを削除する
	 */
	private deleteTask(markdown: string, task: ParsedTask): Result<string, SerializerError> {
		const lines = markdown.split('\n');

		// タスク行と子要素を削除
		const deleteCount = task.endLine - task.startLine + 1;
		lines.splice(task.startLine - 1, deleteCount);

		return ok(lines.join('\n'));
	}

	/**
	 * タスクを作成する
	 */
	private createTask(
		markdown: string,
		create: CreateTaskInfo,
		doneStatuses?: string[],
	): Result<string, SerializerError> {
		const parseResult = this.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks, headings } = parseResult.value;
		const lines = markdown.split('\n');

		// チェックボックスの状態を決定
		const isDone = doneStatuses?.includes(create.status.value) ?? false;
		const checkbox = isDone ? '[x]' : '[ ]';

		// タスク行を生成
		const taskLines = [`- ${checkbox} ${create.title}`, `  - status: ${create.status.value}`];

		// 挿入位置を決定
		let insertLine: number;

		if (create.path.isRoot()) {
			// ルートパスの場合
			// 既存のルートタスクの後、または先頭
			const rootTasks = tasks.filter((t) => t.path.isRoot());
			if (rootTasks.length > 0) {
				const lastTask = rootTasks[rootTasks.length - 1];
				insertLine = lastTask.endLine;
			} else {
				// ルートタスクがない場合、最初の見出しの前か、ファイル末尾
				const firstHeadingLine = this.findFirstHeadingLine(lines);
				if (firstHeadingLine >= 0) {
					insertLine = firstHeadingLine;
				} else {
					insertLine = lines.length;
				}
			}
		} else {
			// パスが指定されている場合
			// 見出しを検索
			const headingExists = headings.some((h) => h.equals(create.path));
			if (!headingExists) {
				return err(new SerializerError(`見出しが見つかりません: ${create.path.toString()}`));
			}

			// パス配下のタスクを検索
			const pathTasks = tasks.filter((t) => t.path.equals(create.path));
			if (pathTasks.length > 0) {
				// 最後のタスクの後に挿入
				const lastTask = pathTasks[pathTasks.length - 1];
				insertLine = lastTask.endLine;
			} else {
				// タスクがない場合、見出しの直後に挿入
				insertLine = this.findInsertLineForPath(lines, create.path, headings);
			}
		}

		// 行を挿入
		lines.splice(insertLine, 0, ...taskLines);

		return ok(lines.join('\n'));
	}

	/**
	 * 最初の見出し行を見つける
	 */
	private findFirstHeadingLine(lines: string[]): number {
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].match(/^#{1,6}\s+/)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * パスに対応する挿入位置を見つける
	 */
	private findInsertLineForPath(lines: string[], targetPath: Path, _headings: Path[]): number {
		// 対象の見出しを見つける
		let targetHeadingLine = -1;
		let nextHeadingLine = -1;
		const targetDepth = targetPath.depth();

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				const level = headingMatch[1].length;
				const text = headingMatch[2].trim();

				// 対象の見出しかどうかチェック
				if (targetHeadingLine < 0) {
					// 見出しがターゲットパスの最後のセグメントと一致するかチェック
					if (text === targetPath.last()) {
						// 完全なパスをチェック
						const currentPath = this.buildPathAtLine(lines, i);
						if (currentPath?.equals(targetPath)) {
							targetHeadingLine = i;
						}
					}
				} else {
					// 次の見出し（同レベル以上）を探す
					if (level <= targetDepth) {
						nextHeadingLine = i;
						break;
					}
				}
			}
		}

		if (targetHeadingLine < 0) {
			return lines.length;
		}

		// 次の見出しがあればその直前、なければファイル末尾
		return nextHeadingLine >= 0 ? nextHeadingLine : lines.length;
	}

	/**
	 * 指定行時点でのパスを構築
	 */
	private buildPathAtLine(lines: string[], lineIndex: number): Path | null {
		const headingStack: { level: number; text: string }[] = [];

		for (let i = 0; i <= lineIndex; i++) {
			const line = lines[i];
			const match = line.match(/^(#{1,6})\s+(.+)$/);

			if (match) {
				const level = match[1].length;
				const text = match[2].trim();

				// 現在のレベル以上の見出しを削除
				while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
					headingStack.pop();
				}

				headingStack.push({ level, text });
			}
		}

		return Path.create(headingStack.map((h) => h.text));
	}
}
