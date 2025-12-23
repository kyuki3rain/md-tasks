import { err, ok, type Result } from 'neverthrow';
import type * as vscode from 'vscode';

/**
 * ドキュメントが見つからないエラー
 */
export class DocumentNotFoundError extends Error {
	readonly _tag = 'DocumentNotFoundError';
	constructor(message = 'ドキュメントが見つかりません') {
		super(message);
		this.name = 'DocumentNotFoundError';
	}
}

/**
 * アクティブなエディタがないエラー
 * これは正常な状態遷移の一つ（WebViewにフォーカスがある場合など）
 */
export class NoActiveEditorError extends Error {
	readonly _tag = 'NoActiveEditorError';
	constructor(message = 'アクティブなエディタがありません') {
		super(message);
		this.name = 'NoActiveEditorError';
	}
}

/**
 * ドキュメント編集エラー
 */
export class DocumentEditError extends Error {
	readonly _tag = 'DocumentEditError';
	constructor(message: string) {
		super(message);
		this.name = 'DocumentEditError';
	}
}

/**
 * VSCodeドキュメント操作の依存性インターフェース
 * テスト時にモック可能にするため
 */
export interface VscodeDocumentDeps {
	getActiveTextEditor(): vscode.TextEditor | undefined;
	openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
	applyEdit(edit: vscode.WorkspaceEdit): Thenable<boolean>;
	createWorkspaceEdit(): vscode.WorkspaceEdit;
	createRange(
		startLine: number,
		startCharacter: number,
		endLine: number,
		endCharacter: number,
	): vscode.Range;
	readFile(uri: vscode.Uri): Thenable<Uint8Array>;
}

/**
 * ドキュメント情報
 */
export interface DocumentInfo {
	uri: vscode.Uri;
	text: string;
	languageId: string;
	lineCount: number;
}

/**
 * VscodeDocumentClient
 * VSCodeのテキストドキュメント操作のラッパー
 */
export class VscodeDocumentClient {
	private currentDocumentUri: vscode.Uri | undefined;

	constructor(private readonly deps: VscodeDocumentDeps) {}

	/**
	 * 現在のドキュメントURIを設定する
	 * WebViewパネル作成時やエディタ切り替え時に呼び出される
	 */
	setCurrentDocumentUri(uri: vscode.Uri | undefined): void {
		this.currentDocumentUri = uri;
	}

	/**
	 * 現在のドキュメントURIを取得する
	 */
	getCurrentDocumentUri(): vscode.Uri | undefined {
		return this.currentDocumentUri;
	}

	/**
	 * アクティブなドキュメントの情報を取得する
	 */
	getActiveDocument(): Result<DocumentInfo, NoActiveEditorError> {
		const editor = this.deps.getActiveTextEditor();
		if (!editor) {
			return err(new NoActiveEditorError());
		}

		const document = editor.document;
		return ok({
			uri: document.uri,
			text: document.getText(),
			languageId: document.languageId,
			lineCount: document.lineCount,
		});
	}

	/**
	 * アクティブなドキュメントのテキストを取得する
	 */
	getActiveDocumentText(): Result<string, NoActiveEditorError> {
		const result = this.getActiveDocument();
		return result.map((doc) => doc.text);
	}

	/**
	 * アクティブなドキュメントのURIを取得する
	 */
	getActiveDocumentUri(): Result<vscode.Uri, NoActiveEditorError> {
		const result = this.getActiveDocument();
		return result.map((doc) => doc.uri);
	}

	/**
	 * 現在のドキュメントのテキストを取得する
	 * currentDocumentUriがセットされている場合はそれを使用し、
	 * なければactiveTextEditorから取得する
	 */
	async getCurrentDocumentText(): Promise<
		Result<string, NoActiveEditorError | DocumentNotFoundError>
	> {
		// currentDocumentUriがセットされている場合はそれを使用
		if (this.currentDocumentUri) {
			return this.openAndGetText(this.currentDocumentUri);
		}

		// フォールバック: activeTextEditorから取得
		return this.getActiveDocumentText();
	}

	/**
	 * 現在のドキュメントのURIを取得する
	 * currentDocumentUriがセットされている場合はそれを使用し、
	 * なければactiveTextEditorから取得する
	 */
	getCurrentDocumentUriOrActive(): Result<vscode.Uri, NoActiveEditorError> {
		if (this.currentDocumentUri) {
			return ok(this.currentDocumentUri);
		}
		return this.getActiveDocumentUri();
	}

	/**
	 * 現在のドキュメントのテキストを置換する
	 * currentDocumentUriがセットされている場合はそれを使用し、
	 * なければactiveTextEditorから取得する
	 */
	async replaceDocumentText(
		newText: string,
	): Promise<Result<void, NoActiveEditorError | DocumentNotFoundError | DocumentEditError>> {
		// URIを取得
		const uriResult = this.getCurrentDocumentUriOrActive();
		if (uriResult.isErr()) {
			return err(uriResult.error);
		}
		const uri = uriResult.value;

		// ドキュメントを開いてテキストと行数を取得
		try {
			const document = await this.deps.openTextDocument(uri);
			const lineCount = document.lineCount;
			const lastLine = lineCount > 0 ? lineCount - 1 : 0;
			const lastLineText = document.getText().split('\n')[lastLine] ?? '';

			const edit = this.deps.createWorkspaceEdit();
			const fullRange = this.deps.createRange(0, 0, lastLine, lastLineText.length);
			edit.replace(uri, fullRange, newText);

			const success = await this.deps.applyEdit(edit);
			if (!success) {
				return err(new DocumentEditError('ドキュメントの編集に失敗しました'));
			}

			return ok(undefined);
		} catch (error) {
			return err(
				new DocumentNotFoundError(
					`ドキュメントを開けませんでした: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	}

	/**
	 * 指定URIのドキュメントを開いてテキストを取得する
	 */
	async openAndGetText(uri: vscode.Uri): Promise<Result<string, DocumentNotFoundError>> {
		try {
			const document = await this.deps.openTextDocument(uri);
			return ok(document.getText());
		} catch (error) {
			return err(
				new DocumentNotFoundError(
					`ドキュメントを開けませんでした: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	}

	/**
	 * 現在のドキュメントを保存する
	 */
	async saveDocument(): Promise<
		Result<void, NoActiveEditorError | DocumentNotFoundError | DocumentEditError>
	> {
		// URIを取得
		const uriResult = this.getCurrentDocumentUriOrActive();
		if (uriResult.isErr()) {
			return err(uriResult.error);
		}
		const uri = uriResult.value;

		try {
			const document = await this.deps.openTextDocument(uri);
			const success = await document.save();
			if (!success) {
				return err(new DocumentEditError('ドキュメントの保存に失敗しました'));
			}
			return ok(undefined);
		} catch (error) {
			return err(
				new DocumentNotFoundError(
					`ドキュメントを保存できませんでした: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	}

	/**
	 * 現在のドキュメントの変更を破棄する（revert）
	 * ディスクからファイルを読み込み、ドキュメントを上書きして保存する
	 */
	async revertDocument(): Promise<
		Result<void, NoActiveEditorError | DocumentNotFoundError | DocumentEditError>
	> {
		// URIを取得
		const uriResult = this.getCurrentDocumentUriOrActive();
		if (uriResult.isErr()) {
			return err(uriResult.error);
		}
		const uri = uriResult.value;

		try {
			// ドキュメントを開く
			const document = await this.deps.openTextDocument(uri);

			// isDirtyでない場合は何もしない
			if (!document.isDirty) {
				return ok(undefined);
			}

			// ディスクからファイルを読み込む
			const diskContent = await this.deps.readFile(uri);
			const diskText = new TextDecoder('utf-8').decode(diskContent);

			// 現在のドキュメントの内容を取得して範囲を計算
			const currentText = document.getText();
			const currentLines = currentText.length > 0 ? currentText.split(/\r?\n/) : [''];
			const lastLineIndex = Math.max(currentLines.length - 1, 0);
			const lastLineLength = currentLines[lastLineIndex]?.length ?? 0;

			// ドキュメント全体をディスクの内容で置き換える
			const edit = this.deps.createWorkspaceEdit();
			const targetRange = this.deps.createRange(0, 0, lastLineIndex, lastLineLength);
			edit.replace(uri, targetRange, diskText);

			const applied = await this.deps.applyEdit(edit);
			if (!applied) {
				return err(new DocumentEditError('ドキュメントの変更を破棄できませんでした'));
			}

			// 保存してisDirtyをfalseにする
			const saved = await document.save();
			if (!saved) {
				return err(new DocumentEditError('ドキュメントの保存に失敗しました'));
			}

			return ok(undefined);
		} catch (error) {
			return err(
				new DocumentEditError(
					`ドキュメントの変更を破棄できませんでした: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	}
}
