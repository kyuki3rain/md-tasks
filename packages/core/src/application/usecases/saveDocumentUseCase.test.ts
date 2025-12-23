import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DocumentOperationError,
	type DocumentService,
	NoActiveDocumentError,
} from '../ports/documentService';
import { SaveDocumentUseCase } from './saveDocumentUseCase';

describe('SaveDocumentUseCase', () => {
	let useCase: SaveDocumentUseCase;
	let mockDocumentService: DocumentService;

	beforeEach(() => {
		mockDocumentService = {
			saveDocument: vi.fn(),
			revertDocument: vi.fn(),
		};

		useCase = new SaveDocumentUseCase(mockDocumentService);
	});

	it('ドキュメントの保存に成功した場合、okを返す', async () => {
		vi.mocked(mockDocumentService.saveDocument).mockResolvedValue(ok(undefined));

		const result = await useCase.execute();

		expect(result.isOk()).toBe(true);
		expect(mockDocumentService.saveDocument).toHaveBeenCalledTimes(1);
	});

	it('アクティブなドキュメントがない場合、NoActiveDocumentErrorを返す', async () => {
		const error = new NoActiveDocumentError('No active document');
		vi.mocked(mockDocumentService.saveDocument).mockResolvedValue(err(error));

		const result = await useCase.execute();

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toBeInstanceOf(NoActiveDocumentError);
		}
	});

	it('保存に失敗した場合、DocumentOperationErrorを返す', async () => {
		const error = new DocumentOperationError('Save failed');
		vi.mocked(mockDocumentService.saveDocument).mockResolvedValue(err(error));

		const result = await useCase.execute();

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toBeInstanceOf(DocumentOperationError);
		}
	});
});
