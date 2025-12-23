import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '../di/container';
import { KanbanPanelProvider } from './kanbanPanelProvider';

// VSCode APIのモック
const mockWebview = {
	asWebviewUri: vi.fn((uri) => uri),
	cspSource: 'mock-csp-source',
	html: '',
	postMessage: vi.fn(),
	onDidReceiveMessage: vi.fn(),
};

const mockPanel = {
	webview: mockWebview,
	reveal: vi.fn(),
	onDidDispose: vi.fn(),
	dispose: vi.fn(),
};

vi.mock('vscode', () => ({
	window: {
		createWebviewPanel: vi.fn(() => mockPanel),
		onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
		activeTextEditor: undefined,
	},
	workspace: {
		onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
	},
	ViewColumn: {
		Beside: 2,
	},
	Uri: {
		joinPath: vi.fn((...paths: string[]) => paths.join('/')),
	},
}));

describe('KanbanPanelProvider', () => {
	let provider: KanbanPanelProvider;
	let mockContainer: Container;
	let mockExtensionUri: { path: string };

	beforeEach(() => {
		vi.clearAllMocks();

		mockExtensionUri = { path: '/mock/extension/path' };

		mockContainer = {
			createWebViewMessageHandler: vi.fn(() => ({
				handleMessage: vi.fn(),
			})),
			getTaskController: vi.fn(() => ({
				getTasks: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
			})),
			getConfigController: vi.fn(() => ({
				getConfig: vi.fn().mockResolvedValue({}),
			})),
			getVscodeDocumentClient: vi.fn(() => ({
				setCurrentDocumentUri: vi.fn(),
				getCurrentDocumentUri: vi.fn().mockReturnValue(undefined),
			})),
		} as unknown as Container;

		provider = new KanbanPanelProvider(mockExtensionUri as never, mockContainer);
	});

	describe('viewType', () => {
		it('正しいviewTypeが定義されている', () => {
			expect(KanbanPanelProvider.viewType).toBe('markdownKanban.kanbanBoard');
		});
	});

	describe('showOrCreate', () => {
		it('パネルが作成される', async () => {
			const vscode = await import('vscode');

			provider.showOrCreate();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'markdownKanban.kanbanBoard',
				'Kanban Board',
				2, // ViewColumn.Beside
				expect.any(Object),
			);
		});

		it('既存のパネルがある場合はrevealする', async () => {
			provider.showOrCreate();
			vi.clearAllMocks();

			provider.showOrCreate();

			expect(mockPanel.reveal).toHaveBeenCalled();
		});

		it('HTMLがWebViewにセットされる', () => {
			provider.showOrCreate();

			expect(mockWebview.html).toContain('<!DOCTYPE html>');
			expect(mockWebview.html).toContain('<div id="root"></div>');
		});

		it('メッセージハンドラーがセットアップされる', () => {
			provider.showOrCreate();

			expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
			expect(mockContainer.createWebViewMessageHandler).toHaveBeenCalled();
		});
	});

	describe('dispose', () => {
		it('パネルを破棄できる', async () => {
			const vscode = await import('vscode');

			provider.showOrCreate();
			provider.dispose();

			// disposeの後、showOrCreateは新しいパネルを作成する
			provider.showOrCreate();
			expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
		});
	});
});
