import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DocumentOperationError,
	type DocumentService,
	NoActiveDocumentError,
} from '../ports/documentService';
import { RevertDocumentUseCase } from './revertDocumentUseCase';

describe('RevertDocumentUseCase', () => {
	let useCase: RevertDocumentUseCase;
	let mockDocumentService: DocumentService;

	beforeEach(() => {
		mockDocumentService = {
			saveDocument: vi.fn(),
			revertDocument: vi.fn(),
		};

		useCase = new RevertDocumentUseCase(mockDocumentService);
	});

	it('ドキュメントの破棄に成功した場合、okを返す', async () => {
		vi.mocked(mockDocumentService.revertDocument).mockResolvedValue(ok(undefined));

		const result = await useCase.execute();

		expect(result.isOk()).toBe(true);
		expect(mockDocumentService.revertDocument).toHaveBeenCalledTimes(1);
	});

	it('アクティブなドキュメントがない場合、NoActiveDocumentErrorを返す', async () => {
		const error = new NoActiveDocumentError('No active document');
		vi.mocked(mockDocumentService.revertDocument).mockResolvedValue(err(error));

		const result = await useCase.execute();

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toBeInstanceOf(NoActiveDocumentError);
		}
	});

	it('破棄に失敗した場合、DocumentOperationErrorを返す', async () => {
		const error = new DocumentOperationError('Revert failed');
		vi.mocked(mockDocumentService.revertDocument).mockResolvedValue(err(error));

		const result = await useCase.execute();

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error).toBeInstanceOf(DocumentOperationError);
		}
	});
});
