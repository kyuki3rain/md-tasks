import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
	DocumentEditError,
	DocumentNotFoundError,
	VscodeDocumentClient,
	type VscodeDocumentDeps,
} from './vscodeDocumentClient';

const createMockUri = (path: string): vscode.Uri =>
	({
		scheme: 'file',
		path,
		fsPath: path,
	}) as vscode.Uri;

const createMockRange = (
	startLine: number,
	startCharacter: number,
	endLine: number,
	endCharacter: number,
): vscode.Range =>
	({
		start: { line: startLine, character: startCharacter },
		end: { line: endLine, character: endCharacter },
	}) as vscode.Range;

const createMockDeps = (overrides: Partial<VscodeDocumentDeps> = {}): VscodeDocumentDeps => ({
	getActiveTextEditor: vi.fn().mockReturnValue(undefined),
	openTextDocument: vi.fn().mockResolvedValue({ getText: () => '' }),
	applyEdit: vi.fn().mockResolvedValue(true),
	createWorkspaceEdit: vi.fn().mockReturnValue({ replace: vi.fn() }),
	createRange: vi.fn().mockImplementation(createMockRange),
	...overrides,
});

describe('VscodeDocumentClient', () => {
	describe('getActiveDocument', () => {
		it('アクティブなエディタがない場合はエラーを返す', () => {
			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(undefined),
			});
			const client = new VscodeDocumentClient(deps);

			const result = client.getActiveDocument();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentNotFoundError);
				expect(result.error.message).toBe('アクティブなエディタがありません');
			}
		});

		it('アクティブなドキュメントの情報を返す', () => {
			const mockUri = createMockUri('/test/file.md');
			const mockDocument = {
				uri: mockUri,
				getText: () => '# Test\n- [ ] Task 1',
				languageId: 'markdown',
				lineCount: 2,
			};
			const mockEditor = { document: mockDocument };

			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(mockEditor),
			});
			const client = new VscodeDocumentClient(deps);

			const result = client.getActiveDocument();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.uri).toBe(mockUri);
				expect(result.value.text).toBe('# Test\n- [ ] Task 1');
				expect(result.value.languageId).toBe('markdown');
				expect(result.value.lineCount).toBe(2);
			}
		});
	});

	describe('getActiveDocumentText', () => {
		it('アクティブなドキュメントのテキストを返す', () => {
			const mockDocument = {
				uri: createMockUri('/test/file.md'),
				getText: () => '# Test Content',
				languageId: 'markdown',
				lineCount: 1,
			};
			const mockEditor = { document: mockDocument };

			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(mockEditor),
			});
			const client = new VscodeDocumentClient(deps);

			const result = client.getActiveDocumentText();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe('# Test Content');
			}
		});
	});

	describe('getActiveDocumentUri', () => {
		it('アクティブなドキュメントのURIを返す', () => {
			const mockUri = createMockUri('/test/file.md');
			const mockDocument = {
				uri: mockUri,
				getText: () => '',
				languageId: 'markdown',
				lineCount: 0,
			};
			const mockEditor = { document: mockDocument };

			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(mockEditor),
			});
			const client = new VscodeDocumentClient(deps);

			const result = client.getActiveDocumentUri();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(mockUri);
			}
		});
	});

	describe('replaceDocumentText', () => {
		it('ドキュメントのテキストを置換する', async () => {
			const mockUri = createMockUri('/test/file.md');
			const originalText = '# Original\n- [ ] Task';
			const newText = '# Updated\n- [x] Task';
			const mockReplace = vi.fn();

			const mockDocument = {
				uri: mockUri,
				getText: () => originalText,
				languageId: 'markdown',
				lineCount: 2,
			};
			const mockEditor = { document: mockDocument };

			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(mockEditor),
				createWorkspaceEdit: vi.fn().mockReturnValue({ replace: mockReplace }),
				applyEdit: vi.fn().mockResolvedValue(true),
			});
			const client = new VscodeDocumentClient(deps);

			const result = await client.replaceDocumentText(newText);

			expect(result.isOk()).toBe(true);
			expect(mockReplace).toHaveBeenCalledWith(mockUri, expect.anything(), newText);
			expect(deps.applyEdit).toHaveBeenCalled();
		});

		it('アクティブなエディタがない場合はエラーを返す', async () => {
			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(undefined),
			});
			const client = new VscodeDocumentClient(deps);

			const result = await client.replaceDocumentText('new text');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentNotFoundError);
			}
		});

		it('編集に失敗した場合はエラーを返す', async () => {
			const mockDocument = {
				uri: createMockUri('/test/file.md'),
				getText: () => 'text',
				languageId: 'markdown',
				lineCount: 1,
			};
			const mockEditor = { document: mockDocument };

			const deps = createMockDeps({
				getActiveTextEditor: vi.fn().mockReturnValue(mockEditor),
				applyEdit: vi.fn().mockResolvedValue(false),
			});
			const client = new VscodeDocumentClient(deps);

			const result = await client.replaceDocumentText('new text');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentEditError);
			}
		});
	});

	describe('openAndGetText', () => {
		it('URIからドキュメントを開いてテキストを取得する', async () => {
			const mockUri = createMockUri('/test/file.md');
			const expectedText = '# File Content';

			const deps = createMockDeps({
				openTextDocument: vi.fn().mockResolvedValue({ getText: () => expectedText }),
			});
			const client = new VscodeDocumentClient(deps);

			const result = await client.openAndGetText(mockUri);

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toBe(expectedText);
			}
			expect(deps.openTextDocument).toHaveBeenCalledWith(mockUri);
		});

		it('ドキュメントを開けない場合はエラーを返す', async () => {
			const mockUri = createMockUri('/test/nonexistent.md');

			const deps = createMockDeps({
				openTextDocument: vi.fn().mockRejectedValue(new Error('File not found')),
			});
			const client = new VscodeDocumentClient(deps);

			const result = await client.openAndGetText(mockUri);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentNotFoundError);
				expect(result.error.message).toContain('File not found');
			}
		});
	});
});
