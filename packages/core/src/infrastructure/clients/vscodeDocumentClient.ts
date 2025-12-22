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
	constructor(private readonly deps: VscodeDocumentDeps) {}

	/**
	 * アクティブなドキュメントの情報を取得する
	 */
	getActiveDocument(): Result<DocumentInfo, DocumentNotFoundError> {
		const editor = this.deps.getActiveTextEditor();
		if (!editor) {
			return err(new DocumentNotFoundError('アクティブなエディタがありません'));
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
	getActiveDocumentText(): Result<string, DocumentNotFoundError> {
		const result = this.getActiveDocument();
		return result.map((doc) => doc.text);
	}

	/**
	 * アクティブなドキュメントのURIを取得する
	 */
	getActiveDocumentUri(): Result<vscode.Uri, DocumentNotFoundError> {
		const result = this.getActiveDocument();
		return result.map((doc) => doc.uri);
	}

	/**
	 * アクティブなドキュメントのテキストを置換する
	 */
	async replaceDocumentText(
		newText: string,
	): Promise<Result<void, DocumentNotFoundError | DocumentEditError>> {
		const uriResult = this.getActiveDocumentUri();
		if (uriResult.isErr()) {
			return err(uriResult.error);
		}

		const uri = uriResult.value;
		const docResult = this.getActiveDocument();
		if (docResult.isErr()) {
			return err(docResult.error);
		}

		const lineCount = docResult.value.lineCount;
		const lastLine = lineCount > 0 ? lineCount - 1 : 0;
		const lastLineText = docResult.value.text.split('\n')[lastLine] ?? '';

		const edit = this.deps.createWorkspaceEdit();
		const fullRange = this.deps.createRange(0, 0, lastLine, lastLineText.length);
		edit.replace(uri, fullRange, newText);

		const success = await this.deps.applyEdit(edit);
		if (!success) {
			return err(new DocumentEditError('ドキュメントの編集に失敗しました'));
		}

		return ok(undefined);
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
}
