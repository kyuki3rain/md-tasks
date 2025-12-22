import { err, ok, type Result } from 'neverthrow';
import { Task } from '../../domain/entities/task';
import { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import { TaskParseError } from '../../domain/errors/taskParseError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';
import type { MarkdownTaskClient, ParsedTask } from '../clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';
import { NoActiveEditorError as InfraNoActiveEditorError } from '../clients/vscodeDocumentClient';

/**
 * MarkdownTaskRepository
 * TaskRepositoryポートのMarkdown実装
 */
export class MarkdownTaskRepository implements TaskRepository {
	constructor(
		private readonly markdownClient: MarkdownTaskClient,
		private readonly documentClient: VscodeDocumentClient,
	) {}

	/**
	 * 全タスクを取得する
	 */
	async findAll(): Promise<Result<Task[], TaskParseError | NoActiveEditorError>> {
		const textResult = await this.documentClient.getCurrentDocumentText();
		if (textResult.isErr()) {
			// NoActiveEditorErrorの場合はドメイン層のエラーに変換
			if (textResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskParseError(0, textResult.error.message));
		}

		const parseResult = this.markdownClient.parse(textResult.value);
		if (parseResult.isErr()) {
			return err(new TaskParseError(0, parseResult.error.message));
		}

		const tasks = parseResult.value.tasks.map((parsedTask) => this.toTask(parsedTask));
		return ok(tasks);
	}

	/**
	 * IDでタスクを取得する
	 */
	async findById(
		id: string,
	): Promise<Result<Task, TaskNotFoundError | TaskParseError | NoActiveEditorError>> {
		const allResult = await this.findAll();
		if (allResult.isErr()) {
			return err(allResult.error);
		}

		const task = allResult.value.find((t) => t.id === id);
		if (!task) {
			return err(new TaskNotFoundError(id));
		}

		return ok(task);
	}

	/**
	 * パスでタスクをフィルタリングして取得する
	 */
	async findByPath(path: Path): Promise<Result<Task[], TaskParseError | NoActiveEditorError>> {
		const allResult = await this.findAll();
		if (allResult.isErr()) {
			return err(allResult.error);
		}

		const tasks = allResult.value.filter((t) => t.path.equals(path));
		return ok(tasks);
	}

	/**
	 * タスクを保存する（作成または更新）
	 */
	async save(task: Task): Promise<Result<Task, TaskNotFoundError | NoActiveEditorError>> {
		const textResult = await this.documentClient.getCurrentDocumentText();
		if (textResult.isErr()) {
			if (textResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskNotFoundError(task.id));
		}

		const markdown = textResult.value;
		const parseResult = this.markdownClient.parse(markdown);
		if (parseResult.isErr()) {
			return err(new TaskNotFoundError(task.id));
		}

		const existingTask = parseResult.value.tasks.find((t) => t.id === task.id);

		let editResult: ReturnType<MarkdownTaskClient['applyEdit']>;

		if (existingTask) {
			// 更新
			editResult = this.markdownClient.applyEdit(markdown, {
				taskId: task.id,
				newStatus: task.status,
				newTitle: task.title !== existingTask.title ? task.title : undefined,
			});
		} else {
			// 作成
			editResult = this.markdownClient.applyEdit(markdown, {
				create: {
					title: task.title,
					path: task.path,
					status: task.status,
				},
			});
		}

		if (editResult.isErr()) {
			return err(new TaskNotFoundError(task.id));
		}

		const writeResult = await this.documentClient.replaceDocumentText(editResult.value);
		if (writeResult.isErr()) {
			if (writeResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskNotFoundError(task.id));
		}

		return ok(task);
	}

	/**
	 * タスクを削除する
	 */
	async delete(id: string): Promise<Result<void, TaskNotFoundError | NoActiveEditorError>> {
		const textResult = await this.documentClient.getCurrentDocumentText();
		if (textResult.isErr()) {
			if (textResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskNotFoundError(id));
		}

		const markdown = textResult.value;
		const parseResult = this.markdownClient.parse(markdown);
		if (parseResult.isErr()) {
			return err(new TaskNotFoundError(id));
		}

		const existingTask = parseResult.value.tasks.find((t) => t.id === id);
		if (!existingTask) {
			return err(new TaskNotFoundError(id));
		}

		const editResult = this.markdownClient.applyEdit(markdown, {
			taskId: id,
			delete: true,
		});

		if (editResult.isErr()) {
			return err(new TaskNotFoundError(id));
		}

		const writeResult = await this.documentClient.replaceDocumentText(editResult.value);
		if (writeResult.isErr()) {
			if (writeResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskNotFoundError(id));
		}

		return ok(undefined);
	}

	/**
	 * 利用可能なパス（見出し階層）を全て取得する
	 */
	async getAvailablePaths(): Promise<Result<Path[], TaskParseError | NoActiveEditorError>> {
		const textResult = await this.documentClient.getCurrentDocumentText();
		if (textResult.isErr()) {
			if (textResult.error instanceof InfraNoActiveEditorError) {
				return err(new NoActiveEditorError());
			}
			return err(new TaskParseError(0, textResult.error.message));
		}

		const parseResult = this.markdownClient.parse(textResult.value);
		if (parseResult.isErr()) {
			return err(new TaskParseError(0, parseResult.error.message));
		}

		return ok(parseResult.value.headings);
	}

	/**
	 * ParsedTaskをTaskエンティティに変換
	 */
	private toTask(parsedTask: ParsedTask): Task {
		return Task.create({
			id: parsedTask.id,
			title: parsedTask.title,
			status: parsedTask.status,
			path: parsedTask.path,
			isChecked: parsedTask.isChecked,
			metadata: parsedTask.metadata,
		});
	}
}
