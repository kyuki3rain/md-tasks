import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '../di/container';
import { KanbanPanelProvider } from './kanbanPanelProvider';

// コールバックを保存するための変数
let activeEditorChangeCallback: ((editor: unknown) => void) | null = null;
let documentChangeCallback: ((event: unknown) => void) | null = null;
let documentSaveCallback: ((document: unknown) => void) | null = null;

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
		onDidChangeActiveTextEditor: vi.fn((callback) => {
			activeEditorChangeCallback = callback;
			return { dispose: vi.fn() };
		}),
		activeTextEditor: undefined,
	},
	workspace: {
		onDidChangeTextDocument: vi.fn((callback) => {
			documentChangeCallback = callback;
			return { dispose: vi.fn() };
		}),
		onDidSaveTextDocument: vi.fn((callback) => {
			documentSaveCallback = callback;
			return { dispose: vi.fn() };
		}),
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

		// コールバック変数をリセット
		activeEditorChangeCallback = null;
		documentChangeCallback = null;
		documentSaveCallback = null;

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
			expect(KanbanPanelProvider.viewType).toBe('mdTasks.kanbanBoard');
		});
	});

	describe('showOrCreate', () => {
		it('パネルが作成される', async () => {
			const vscode = await import('vscode');

			provider.showOrCreate();

			expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
				'mdTasks.kanbanBoard',
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

	describe('getHtmlForWebview', () => {
		it('スクリプトURIを含むHTMLを生成する', () => {
			provider.showOrCreate();

			expect(mockWebview.html).toContain('index.js');
		});

		it('スタイルURIを含むHTMLを生成する', () => {
			provider.showOrCreate();

			expect(mockWebview.html).toContain('index.css');
		});

		it('CSPヘッダーを含むHTMLを生成する', () => {
			provider.showOrCreate();

			expect(mockWebview.html).toContain('Content-Security-Policy');
			expect(mockWebview.html).toContain('mock-csp-source');
		});

		it('nonceを含むHTMLを生成する', () => {
			provider.showOrCreate();

			// nonceは32文字の英数字
			expect(mockWebview.html).toMatch(/nonce-[A-Za-z0-9]{32}/);
		});
	});

	describe('setupDocumentWatcher', () => {
		describe('アクティブエディタ変更時', () => {
			it('Markdownファイルの場合、URIを更新する', async () => {
				const mockSetCurrentDocumentUri = vi.fn();
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: mockSetCurrentDocumentUri,
					getCurrentDocumentUri: vi.fn().mockReturnValue(undefined),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();

				// Markdownファイルのエディタをシミュレート
				const mockEditor = {
					document: {
						languageId: 'markdown',
						uri: { toString: () => 'file:///test.md' },
					},
				};
				await activeEditorChangeCallback?.(mockEditor);

				expect(mockSetCurrentDocumentUri).toHaveBeenCalledWith(mockEditor.document.uri);
			});

			it('Markdownファイルでない場合、何もしない', async () => {
				const mockSetCurrentDocumentUri = vi.fn();
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: mockSetCurrentDocumentUri,
					getCurrentDocumentUri: vi.fn().mockReturnValue(undefined),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();

				// 非Markdownファイルのエディタをシミュレート
				const mockEditor = {
					document: {
						languageId: 'typescript',
						uri: { toString: () => 'file:///test.ts' },
					},
				};
				await activeEditorChangeCallback?.(mockEditor);

				expect(mockSetCurrentDocumentUri).not.toHaveBeenCalled();
			});

			it('エディタがない場合、何もしない', async () => {
				const mockSetCurrentDocumentUri = vi.fn();
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: mockSetCurrentDocumentUri,
					getCurrentDocumentUri: vi.fn().mockReturnValue(undefined),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();

				await activeEditorChangeCallback?.(undefined);

				expect(mockSetCurrentDocumentUri).not.toHaveBeenCalled();
			});
		});

		describe('ドキュメント変更時', () => {
			it('currentDocumentのMarkdownファイルの場合、タスクとドキュメント状態を送信する', async () => {
				const mockUri = { toString: () => 'file:///test.md' };
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: vi.fn(),
					getCurrentDocumentUri: vi.fn().mockReturnValue(mockUri),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;
				mockContainer.getTaskController = vi.fn(() => ({
					getTasks: vi.fn().mockResolvedValue({ isOk: () => true, value: [] }),
				})) as unknown as typeof mockContainer.getTaskController;

				provider.showOrCreate();
				vi.clearAllMocks();

				// ドキュメント変更イベントをシミュレート
				const mockEvent = {
					document: {
						uri: mockUri,
						languageId: 'markdown',
						isDirty: true,
					},
				};
				await documentChangeCallback?.(mockEvent);

				expect(mockWebview.postMessage).toHaveBeenCalledWith({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
				expect(mockWebview.postMessage).toHaveBeenCalledWith({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: true },
				});
			});

			it('Markdownファイルでない場合、何もしない', async () => {
				const mockUri = { toString: () => 'file:///test.ts' };
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: vi.fn(),
					getCurrentDocumentUri: vi.fn().mockReturnValue(mockUri),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();
				vi.clearAllMocks();

				// 非Markdownファイルの変更イベントをシミュレート
				const mockEvent = {
					document: {
						uri: mockUri,
						languageId: 'typescript',
						isDirty: true,
					},
				};
				await documentChangeCallback?.(mockEvent);

				expect(mockWebview.postMessage).not.toHaveBeenCalled();
			});
		});

		describe('ドキュメント保存時', () => {
			it('currentDocumentのMarkdownファイルの場合、ドキュメント状態を送信する', async () => {
				const mockUri = { toString: () => 'file:///test.md' };
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: vi.fn(),
					getCurrentDocumentUri: vi.fn().mockReturnValue(mockUri),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();
				vi.clearAllMocks();

				// 保存イベントをシミュレート
				const mockDocument = {
					uri: mockUri,
					languageId: 'markdown',
					isDirty: false,
				};
				await documentSaveCallback?.(mockDocument);

				expect(mockWebview.postMessage).toHaveBeenCalledWith({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: false },
				});
			});

			it('currentDocumentでない場合、何もしない', async () => {
				const mockCurrentUri = { toString: () => 'file:///current.md' };
				const mockOtherUri = { toString: () => 'file:///other.md' };
				mockContainer.getVscodeDocumentClient = vi.fn(() => ({
					setCurrentDocumentUri: vi.fn(),
					getCurrentDocumentUri: vi.fn().mockReturnValue(mockCurrentUri),
				})) as unknown as typeof mockContainer.getVscodeDocumentClient;

				provider.showOrCreate();
				vi.clearAllMocks();

				// 異なるドキュメントの保存イベントをシミュレート
				const mockDocument = {
					uri: mockOtherUri,
					languageId: 'markdown',
					isDirty: false,
				};
				await documentSaveCallback?.(mockDocument);

				expect(mockWebview.postMessage).not.toHaveBeenCalled();
			});
		});
	});

	describe('sendTasksUpdate', () => {
		it('タスク取得成功時、TASKS_UPDATEDメッセージを送信する', async () => {
			const mockTasks = [{ id: 'task-1', title: 'Test Task' }];
			mockContainer.getTaskController = vi.fn(() => ({
				getTasks: vi.fn().mockResolvedValue({ isOk: () => true, value: mockTasks }),
			})) as unknown as typeof mockContainer.getTaskController;

			provider.showOrCreate();

			// アクティブエディタ変更でsendTasksUpdateを呼び出す
			const mockEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
					isDirty: false,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				type: 'TASKS_UPDATED',
				payload: { tasks: mockTasks },
			});
		});

		it('タスク取得失敗時、TASKS_UPDATEDは送信せずDOCUMENT_STATE_CHANGEDのみ送信する', async () => {
			mockContainer.getTaskController = vi.fn(() => ({
				getTasks: vi.fn().mockResolvedValue({ isOk: () => false, error: new Error('Failed') }),
			})) as unknown as typeof mockContainer.getTaskController;

			provider.showOrCreate();
			vi.clearAllMocks();

			// アクティブエディタ変更でsendTasksUpdateを呼び出す
			const mockEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
					isDirty: false,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			// TASKS_UPDATEDは送信されない
			expect(mockWebview.postMessage).not.toHaveBeenCalledWith(
				expect.objectContaining({ type: 'TASKS_UPDATED' }),
			);
			// DOCUMENT_STATE_CHANGEDは送信される
			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				type: 'DOCUMENT_STATE_CHANGED',
				payload: { isDirty: false },
			});
		});
	});

	describe('sendDocumentStateUpdate', () => {
		it('isDirty: trueでDOCUMENT_STATE_CHANGEDを送信する', async () => {
			provider.showOrCreate();

			const mockEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
					isDirty: true,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				type: 'DOCUMENT_STATE_CHANGED',
				payload: { isDirty: true },
			});
		});

		it('isDirty: falseでDOCUMENT_STATE_CHANGEDを送信する', async () => {
			provider.showOrCreate();

			const mockEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
					isDirty: false,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			expect(mockWebview.postMessage).toHaveBeenCalledWith({
				type: 'DOCUMENT_STATE_CHANGED',
				payload: { isDirty: false },
			});
		});
	});

	describe('Markdown判定による処理分岐', () => {
		it('languageIdがmarkdownの場合、タスク更新を送信する', async () => {
			provider.showOrCreate();

			const mockEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
					isDirty: false,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			expect(mockWebview.postMessage).toHaveBeenCalled();
		});

		it('languageIdがmarkdownでない場合、タスク更新を送信しない', async () => {
			provider.showOrCreate();
			vi.clearAllMocks();

			const mockEditor = {
				document: {
					languageId: 'javascript',
					uri: { toString: () => 'file:///test.js' },
					isDirty: false,
				},
			};
			await activeEditorChangeCallback?.(mockEditor);

			expect(mockWebview.postMessage).not.toHaveBeenCalled();
		});
	});

	describe('getNonce', () => {
		it('32文字の英数字文字列を生成する', () => {
			provider.showOrCreate();

			// HTMLからnonceを抽出
			const nonceMatch = mockWebview.html.match(/nonce-([A-Za-z0-9]+)/);
			expect(nonceMatch).not.toBeNull();
			expect(nonceMatch?.[1]).toHaveLength(32);
		});

		it('呼び出すたびに異なる値を生成する', () => {
			provider.showOrCreate();
			const firstNonce = mockWebview.html.match(/nonce-([A-Za-z0-9]+)/)?.[1];

			provider.dispose();
			provider.showOrCreate();
			const secondNonce = mockWebview.html.match(/nonce-([A-Za-z0-9]+)/)?.[1];

			expect(firstNonce).not.toBe(secondNonce);
		});
	});

	describe('updateCurrentDocumentUri', () => {
		it('アクティブエディタがMarkdownの場合、showOrCreate時にURIを更新する', async () => {
			const mockSetCurrentDocumentUri = vi.fn();
			mockContainer.getVscodeDocumentClient = vi.fn(() => ({
				setCurrentDocumentUri: mockSetCurrentDocumentUri,
				getCurrentDocumentUri: vi.fn().mockReturnValue(undefined),
			})) as unknown as typeof mockContainer.getVscodeDocumentClient;

			// アクティブエディタがMarkdownファイル
			const vscode = await import('vscode');
			(vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = {
				document: {
					languageId: 'markdown',
					uri: { toString: () => 'file:///test.md' },
				},
			};

			provider.showOrCreate();

			expect(mockSetCurrentDocumentUri).toHaveBeenCalled();
		});
	});
});
