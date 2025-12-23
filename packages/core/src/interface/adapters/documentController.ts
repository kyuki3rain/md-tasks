import type { Result } from 'neverthrow';
import type {
	DocumentOperationError,
	NoActiveDocumentError,
} from '../../application/ports/documentService';
import type { RevertDocumentUseCase, SaveDocumentUseCase } from '../../application/usecases';

/**
 * DocumentController
 * ドキュメント操作のエントリーポイント
 */
export class DocumentController {
	constructor(
		private readonly saveDocumentUseCase: SaveDocumentUseCase,
		private readonly revertDocumentUseCase: RevertDocumentUseCase,
	) {}

	/**
	 * ドキュメントを保存する
	 */
	async saveDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		return this.saveDocumentUseCase.execute();
	}

	/**
	 * ドキュメントの変更を破棄する
	 */
	async revertDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		return this.revertDocumentUseCase.execute();
	}
}
