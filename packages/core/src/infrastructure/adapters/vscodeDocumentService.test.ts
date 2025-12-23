import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DocumentOperationError,
	NoActiveDocumentError,
} from '../../application/ports/documentService';
import {
	DocumentEditError,
	DocumentNotFoundError,
	NoActiveEditorError,
	type VscodeDocumentClient,
} from '../clients/vscodeDocumentClient';
import { VscodeDocumentService } from './vscodeDocumentService';

describe('VscodeDocumentService', () => {
	let service: VscodeDocumentService;
	let mockDocumentClient: VscodeDocumentClient;

	beforeEach(() => {
		mockDocumentClient = {
			saveDocument: vi.fn(),
			revertDocument: vi.fn(),
		} as unknown as VscodeDocumentClient;

		service = new VscodeDocumentService(mockDocumentClient);
	});

	describe('saveDocument', () => {
		it('保存に成功した場合、okを返す', async () => {
			vi.mocked(mockDocumentClient.saveDocument).mockResolvedValue(ok(undefined));

			const result = await service.saveDocument();

			expect(result.isOk()).toBe(true);
			expect(mockDocumentClient.saveDocument).toHaveBeenCalledTimes(1);
		});

		it('NoActiveEditorErrorの場合、NoActiveDocumentErrorに変換する', async () => {
			const clientError = new NoActiveEditorError('No active editor');
			vi.mocked(mockDocumentClient.saveDocument).mockResolvedValue(err(clientError));

			const result = await service.saveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(NoActiveDocumentError);
				expect(result.error.message).toBe('No active editor');
			}
		});

		it('DocumentNotFoundErrorの場合、DocumentOperationErrorに変換する', async () => {
			const clientError = new DocumentNotFoundError('Document not found');
			vi.mocked(mockDocumentClient.saveDocument).mockResolvedValue(err(clientError));

			const result = await service.saveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('Document not found');
			}
		});

		it('DocumentEditErrorの場合、DocumentOperationErrorに変換する', async () => {
			const clientError = new DocumentEditError('Save failed');
			vi.mocked(mockDocumentClient.saveDocument).mockResolvedValue(err(clientError));

			const result = await service.saveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('Save failed');
			}
		});
	});

	describe('revertDocument', () => {
		it('破棄に成功した場合、okを返す', async () => {
			vi.mocked(mockDocumentClient.revertDocument).mockResolvedValue(ok(undefined));

			const result = await service.revertDocument();

			expect(result.isOk()).toBe(true);
			expect(mockDocumentClient.revertDocument).toHaveBeenCalledTimes(1);
		});

		it('NoActiveEditorErrorの場合、NoActiveDocumentErrorに変換する', async () => {
			const clientError = new NoActiveEditorError('No active editor');
			vi.mocked(mockDocumentClient.revertDocument).mockResolvedValue(err(clientError));

			const result = await service.revertDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(NoActiveDocumentError);
				expect(result.error.message).toBe('No active editor');
			}
		});

		it('DocumentEditErrorの場合、DocumentOperationErrorに変換する', async () => {
			const clientError = new DocumentEditError('Revert failed');
			vi.mocked(mockDocumentClient.revertDocument).mockResolvedValue(err(clientError));

			const result = await service.revertDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('Revert failed');
			}
		});
	});
});
