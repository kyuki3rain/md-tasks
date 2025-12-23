import type { Result } from 'neverthrow';
import type {
	DocumentOperationError,
	DocumentService,
	NoActiveDocumentError,
} from '../ports/documentService';

/**
 * ドキュメント保存ユースケース
 */
export class SaveDocumentUseCase {
	constructor(private readonly documentService: DocumentService) {}

	/**
	 * ドキュメントを保存する
	 */
	async execute(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		return this.documentService.saveDocument();
	}
}
