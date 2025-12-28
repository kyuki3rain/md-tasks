import * as vscode from 'vscode';
import type { WebViewToExtensionMessage } from '../../interface/types/messages';
import { logger } from '../../shared';
import type { Container } from '../di/container';

/**
 * KanbanPanelProvider
 * カンバンボードのWebViewパネルを管理する
 */
export class KanbanPanelProvider {
	public static readonly viewType = 'mdTasks.kanbanBoard';

	private panel: vscode.WebviewPanel | undefined;
	private readonly extensionUri: vscode.Uri;
	private readonly container: Container;
	private disposables: vscode.Disposable[] = [];

	constructor(extensionUri: vscode.Uri, container: Container) {
		this.extensionUri = extensionUri;
		this.container = container;
	}

	/**
	 * 現在のアクティブエディタがMarkdownファイルの場合、そのURIを保存する
	 */
	private updateCurrentDocumentUri(): void {
		const editor = vscode.window.activeTextEditor;
		if (editor && this.isMarkdownDocument(editor.document)) {
			this.container.getVscodeDocumentClient().setCurrentDocumentUri(editor.document.uri);
			logger.debug(`Current document URI updated: ${editor.document.uri.toString()}`);
		}
	}

	/**
	 * パネルを表示または作成する
	 */
	public showOrCreate(viewColumn?: vscode.ViewColumn): void {
		// 既存のパネルがある場合は表示
		if (this.panel) {
			this.panel.reveal(viewColumn);
			return;
		}

		// パネル作成前に現在のドキュメントURIを保存
		// (createWebviewPanelの後はactiveTextEditorがundefinedになるため)
		this.updateCurrentDocumentUri();

		// 新しいパネルを作成
		this.panel = vscode.window.createWebviewPanel(
			KanbanPanelProvider.viewType,
			'Kanban Board',
			viewColumn ?? vscode.ViewColumn.Beside,
			this.getWebviewOptions(),
		);

		// HTMLをセット
		this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

		// メッセージハンドラーをセットアップ
		this.setupMessageHandler();

		// ドキュメント変更を監視
		this.setupDocumentWatcher();

		// パネルが閉じられた時の処理
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		logger.info('Kanban panel created');
	}

	/**
	 * WebViewオプションを取得
	 */
	private getWebviewOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
		return {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')],
		};
	}

	/**
	 * WebView用のHTMLを生成
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// WebViewのスクリプトとスタイルのURI
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'index.js'),
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'index.css'),
		);

		// CSP用のnonce
		const nonce = this.getNonce();

		return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<link href="${styleUri}" rel="stylesheet">
	<title>Kanban Board</title>
</head>
<body>
	<div id="root"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}

	/**
	 * メッセージハンドラーをセットアップ
	 */
	private setupMessageHandler(): void {
		if (!this.panel) {
			return;
		}

		const messageHandler = this.container.createWebViewMessageHandler({
			postMessage: (message) => {
				this.panel?.webview.postMessage(message);
			},
		});

		this.panel.webview.onDidReceiveMessage(
			async (message: WebViewToExtensionMessage) => {
				logger.debug(`Received message from WebView: ${message.type}`);
				await messageHandler.handleMessage(message);
			},
			null,
			this.disposables,
		);
	}

	/**
	 * ドキュメント変更を監視
	 */
	private setupDocumentWatcher(): void {
		// アクティブエディタ変更時
		const activeEditorChange = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (editor && this.isMarkdownDocument(editor.document)) {
				// MarkdownファイルのURIを更新
				this.container.getVscodeDocumentClient().setCurrentDocumentUri(editor.document.uri);
				logger.debug(`Current document URI updated: ${editor.document.uri.toString()}`);
				await this.sendTasksUpdate();
				this.sendDocumentStateUpdate(editor.document);
			}
		});
		this.disposables.push(activeEditorChange);

		// ドキュメント変更時
		const documentChange = vscode.workspace.onDidChangeTextDocument(async (event) => {
			// currentDocumentUriがセットされている場合は、そのドキュメントの変更を検出
			const currentUri = this.container.getVscodeDocumentClient().getCurrentDocumentUri();
			const isCurrentDocument =
				currentUri && event.document.uri.toString() === currentUri.toString();

			// アクティブエディタのドキュメントまたはcurrentDocumentの変更を検出
			const activeEditor = vscode.window.activeTextEditor;
			const isActiveDocument = activeEditor && event.document === activeEditor.document;

			if ((isCurrentDocument || isActiveDocument) && this.isMarkdownDocument(event.document)) {
				await this.sendTasksUpdate();
				this.sendDocumentStateUpdate(event.document);
			}
		});
		this.disposables.push(documentChange);

		// ドキュメント保存時
		const documentSave = vscode.workspace.onDidSaveTextDocument((document) => {
			const currentUri = this.container.getVscodeDocumentClient().getCurrentDocumentUri();
			const isCurrentDocument = currentUri && document.uri.toString() === currentUri.toString();

			if (isCurrentDocument && this.isMarkdownDocument(document)) {
				this.sendDocumentStateUpdate(document);
			}
		});
		this.disposables.push(documentSave);
	}

	/**
	 * Markdownドキュメントかどうか判定
	 */
	private isMarkdownDocument(document: vscode.TextDocument): boolean {
		return document.languageId === 'markdown';
	}

	/**
	 * タスク更新をWebViewに送信
	 */
	private async sendTasksUpdate(): Promise<void> {
		if (!this.panel) {
			return;
		}

		const taskController = this.container.getTaskController();
		const result = await taskController.getTasks();

		if (result.isOk()) {
			this.panel.webview.postMessage({
				type: 'TASKS_UPDATED',
				payload: { tasks: result.value },
			});
		}
	}

	/**
	 * ドキュメント状態更新をWebViewに送信
	 */
	private sendDocumentStateUpdate(document: vscode.TextDocument): void {
		if (!this.panel) {
			return;
		}

		this.panel.webview.postMessage({
			type: 'DOCUMENT_STATE_CHANGED',
			payload: { isDirty: document.isDirty },
		});
		logger.debug(`Document state updated: isDirty=${document.isDirty}`);
	}

	/**
	 * CSP用のnonceを生成
	 */
	private getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	/**
	 * リソースを破棄
	 */
	public dispose(): void {
		this.panel = undefined;

		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];

		logger.info('Kanban panel disposed');
	}
}
