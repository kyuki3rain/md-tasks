import type { Result } from 'neverthrow';

/**
 * ドキュメント操作エラー
 */
export class DocumentOperationError extends Error {
	readonly _tag = 'DocumentOperationError';
	constructor(message: string) {
		super(message);
		this.name = 'DocumentOperationError';
	}
}

/**
 * アクティブなエディタがないエラー
 */
export class NoActiveDocumentError extends Error {
	readonly _tag = 'NoActiveDocumentError';
	constructor(message = 'アクティブなドキュメントがありません') {
		super(message);
		this.name = 'NoActiveDocumentError';
	}
}

/**
 * ドキュメント操作サービスポート
 * ドキュメントの保存・破棄操作を定義する
 */
export interface DocumentService {
	/**
	 * 現在のドキュメントを保存する
	 */
	saveDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>>;

	/**
	 * 現在のドキュメントの変更を破棄する
	 */
	revertDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>>;
}
