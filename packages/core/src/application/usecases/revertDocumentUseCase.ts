import type { Result } from 'neverthrow';
import { logger } from '../../shared';
import type {
	DocumentOperationError,
	DocumentService,
	NoActiveDocumentError,
} from '../ports/documentService';

/**
 * ドキュメント変更破棄ユースケース
 */
export class RevertDocumentUseCase {
	constructor(private readonly documentService: DocumentService) {}

	/**
	 * ドキュメントの変更を破棄する
	 */
	async execute(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		logger.debug('RevertDocumentUseCase: execute start');
		const result = await this.documentService.revertDocument();
		if (result.isOk()) {
			logger.debug('RevertDocumentUseCase: execute success');
		} else {
			logger.debug(`RevertDocumentUseCase: execute failed - ${result.error.message}`);
		}
		return result;
	}
}
