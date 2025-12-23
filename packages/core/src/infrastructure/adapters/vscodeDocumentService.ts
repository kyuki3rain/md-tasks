import { err, ok, type Result } from 'neverthrow';
import {
	DocumentOperationError,
	type DocumentService,
	NoActiveDocumentError,
} from '../../application/ports/documentService';
import { logger } from '../../shared';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';

/**
 * VscodeDocumentService
 * DocumentServiceポートのVSCode実装
 */
export class VscodeDocumentService implements DocumentService {
	constructor(private readonly documentClient: VscodeDocumentClient) {}

	/**
	 * 現在のドキュメントを保存する
	 */
	async saveDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		logger.debug('VscodeDocumentService: saveDocument start');
		const result = await this.documentClient.saveDocument();

		if (result.isErr()) {
			const error = result.error;
			logger.debug(`VscodeDocumentService: saveDocument failed - ${error._tag}: ${error.message}`);
			if (error._tag === 'NoActiveEditorError') {
				return err(new NoActiveDocumentError(error.message));
			}
			return err(new DocumentOperationError(error.message));
		}

		logger.debug('VscodeDocumentService: saveDocument success');
		return ok(undefined);
	}

	/**
	 * 現在のドキュメントの変更を破棄する
	 */
	async revertDocument(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		logger.debug('VscodeDocumentService: revertDocument start');
		const result = await this.documentClient.revertDocument();

		if (result.isErr()) {
			const error = result.error;
			logger.debug(
				`VscodeDocumentService: revertDocument failed - ${error._tag}: ${error.message}`,
			);
			if (error._tag === 'NoActiveEditorError') {
				return err(new NoActiveDocumentError(error.message));
			}
			return err(new DocumentOperationError(error.message));
		}

		logger.debug('VscodeDocumentService: revertDocument success');
		return ok(undefined);
	}
}
