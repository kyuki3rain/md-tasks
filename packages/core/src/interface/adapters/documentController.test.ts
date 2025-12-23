import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DocumentOperationError,
	NoActiveDocumentError,
} from '../../application/ports/documentService';
import type { RevertDocumentUseCase, SaveDocumentUseCase } from '../../application/usecases';
import { DocumentController } from './documentController';

describe('DocumentController', () => {
	let controller: DocumentController;
	let mockSaveDocumentUseCase: SaveDocumentUseCase;
	let mockRevertDocumentUseCase: RevertDocumentUseCase;

	beforeEach(() => {
		mockSaveDocumentUseCase = {
			execute: vi.fn(),
		} as unknown as SaveDocumentUseCase;

		mockRevertDocumentUseCase = {
			execute: vi.fn(),
		} as unknown as RevertDocumentUseCase;

		controller = new DocumentController(mockSaveDocumentUseCase, mockRevertDocumentUseCase);
	});

	describe('saveDocument', () => {
		it('保存に成功した場合、okを返す', async () => {
			vi.mocked(mockSaveDocumentUseCase.execute).mockResolvedValue(ok(undefined));

			const result = await controller.saveDocument();

			expect(result.isOk()).toBe(true);
			expect(mockSaveDocumentUseCase.execute).toHaveBeenCalledTimes(1);
		});

		it('アクティブなドキュメントがない場合、NoActiveDocumentErrorを返す', async () => {
			const error = new NoActiveDocumentError('No active document');
			vi.mocked(mockSaveDocumentUseCase.execute).mockResolvedValue(err(error));

			const result = await controller.saveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(NoActiveDocumentError);
			}
		});

		it('保存に失敗した場合、DocumentOperationErrorを返す', async () => {
			const error = new DocumentOperationError('Save failed');
			vi.mocked(mockSaveDocumentUseCase.execute).mockResolvedValue(err(error));

			const result = await controller.saveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});
	});

	describe('revertDocument', () => {
		it('破棄に成功した場合、okを返す', async () => {
			vi.mocked(mockRevertDocumentUseCase.execute).mockResolvedValue(ok(undefined));

			const result = await controller.revertDocument();

			expect(result.isOk()).toBe(true);
			expect(mockRevertDocumentUseCase.execute).toHaveBeenCalledTimes(1);
		});

		it('アクティブなドキュメントがない場合、NoActiveDocumentErrorを返す', async () => {
			const error = new NoActiveDocumentError('No active document');
			vi.mocked(mockRevertDocumentUseCase.execute).mockResolvedValue(err(error));

			const result = await controller.revertDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(NoActiveDocumentError);
			}
		});

		it('破棄に失敗した場合、DocumentOperationErrorを返す', async () => {
			const error = new DocumentOperationError('Revert failed');
			vi.mocked(mockRevertDocumentUseCase.execute).mockResolvedValue(err(error));

			const result = await controller.revertDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});
	});
});
