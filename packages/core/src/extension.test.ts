import { beforeEach, describe, expect, it, vi } from 'vitest';

// コマンドコールバックを保存する変数
let registeredCommands: Map<string, () => void> = new Map();

// モックのKanbanPanelProvider
const mockShowOrCreate = vi.fn();
const mockDispose = vi.fn();

// bootstrapモジュールをモック（クラスコンストラクタとして正しく動作するように）
vi.mock('./bootstrap', () => {
	// クラスとして動作するモック
	const MockKanbanPanelProvider = vi.fn(function (this: unknown) {
		return {
			showOrCreate: vi.fn(),
			dispose: vi.fn(),
		};
	});

	return {
		KanbanPanelProvider: MockKanbanPanelProvider,
		getContainer: vi.fn().mockReturnValue({}),
		disposeContainer: vi.fn(),
	};
});

// vscodeモジュールをモック
vi.mock('vscode', () => ({
	commands: {
		registerCommand: vi.fn((_command: string, _callback: () => void) => {
			return { dispose: vi.fn() };
		}),
	},
	window: {
		activeTextEditor: undefined,
	},
}));

describe('extension', () => {
	let mockContext: {
		extensionUri: { path: string };
		subscriptions: { dispose: () => void }[];
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		registeredCommands = new Map();

		mockContext = {
			extensionUri: { path: '/mock/extension/path' },
			subscriptions: [],
		};

		// registerCommandのモックをリセットしてコールバックを保存するように設定
		const vscode = await import('vscode');
		vi.mocked(vscode.commands.registerCommand).mockImplementation(
			(command: string, callback: () => void) => {
				registeredCommands.set(command, callback);
				return { dispose: vi.fn() };
			},
		);

		// KanbanPanelProviderのモックをリセット
		const bootstrap = await import('./bootstrap');
		vi.mocked(bootstrap.KanbanPanelProvider).mockImplementation(function (this: unknown) {
			return {
				showOrCreate: mockShowOrCreate,
				dispose: mockDispose,
			};
		} as unknown as typeof bootstrap.KanbanPanelProvider);
	});

	describe('activate', () => {
		it('KanbanPanelProviderを作成する', async () => {
			const { KanbanPanelProvider } = await import('./bootstrap');
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			expect(KanbanPanelProvider).toHaveBeenCalledWith(mockContext.extensionUri, expect.anything());
		});

		it('markdownKanban.openBoardコマンドを登録する', async () => {
			const vscode = await import('vscode');
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
				'markdownKanban.openBoard',
				expect.any(Function),
			);
		});

		it('markdownKanban.openBoardFromEditorコマンドを登録する', async () => {
			const vscode = await import('vscode');
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
				'markdownKanban.openBoardFromEditor',
				expect.any(Function),
			);
		});

		it('コマンドをsubscriptionsに追加する', async () => {
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			expect(mockContext.subscriptions).toHaveLength(2);
		});

		it('openBoardコマンド実行時にshowOrCreateを呼び出す', async () => {
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			const openBoardCallback = registeredCommands.get('markdownKanban.openBoard');
			expect(openBoardCallback).toBeDefined();

			openBoardCallback?.();

			expect(mockShowOrCreate).toHaveBeenCalled();
		});

		it('openBoardFromEditorコマンド実行時にshowOrCreateを呼び出す', async () => {
			const extension = await import('./extension');

			extension.activate(mockContext as never);

			const openBoardCallback = registeredCommands.get('markdownKanban.openBoardFromEditor');
			expect(openBoardCallback).toBeDefined();

			openBoardCallback?.();

			expect(mockShowOrCreate).toHaveBeenCalled();
		});
	});

	describe('deactivate', () => {
		it('パネルプロバイダーを破棄する', async () => {
			const extension = await import('./extension');

			extension.activate(mockContext as never);
			extension.deactivate();

			expect(mockDispose).toHaveBeenCalled();
		});

		it('DIコンテナを破棄する', async () => {
			const bootstrap = await import('./bootstrap');
			const extension = await import('./extension');

			extension.activate(mockContext as never);
			extension.deactivate();

			expect(bootstrap.disposeContainer).toHaveBeenCalled();
		});

		it('activateされていない場合もエラーにならない', async () => {
			const extension = await import('./extension');
			mockDispose.mockClear();

			// deactivateを直接呼び出してもエラーにならないことを確認
			expect(() => extension.deactivate()).not.toThrow();
			// activateされていないのでdisposeは呼ばれない
			expect(mockDispose).not.toHaveBeenCalled();
		});
	});
});
