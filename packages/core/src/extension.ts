import * as vscode from 'vscode';
import { disposeContainer, getContainer, KanbanPanelProvider } from './bootstrap';
import { logger } from './shared';

// パネルプロバイダーのインスタンス
let kanbanPanelProvider: KanbanPanelProvider | undefined;

/**
 * 拡張機能がアクティブになった時に呼ばれる
 */
export function activate(context: vscode.ExtensionContext): void {
	logger.info('MD Tasks extension is activating...');

	// DIコンテナを初期化
	const container = getContainer();

	// KanbanPanelProviderを作成
	kanbanPanelProvider = new KanbanPanelProvider(context.extensionUri, container);

	// コマンドを登録: カンバンボードを開く
	const openBoardCommand = vscode.commands.registerCommand('mdTasks.openBoard', () => {
		logger.info('Opening Kanban board...');
		kanbanPanelProvider?.showOrCreate();
	});
	context.subscriptions.push(openBoardCommand);

	// エディタのタイトルバーアクション（Markdownファイルでのみ表示）
	const editorTitleCommand = vscode.commands.registerCommand('mdTasks.openBoardFromEditor', () => {
		logger.info('Opening Kanban board from editor title...');
		kanbanPanelProvider?.showOrCreate();
	});
	context.subscriptions.push(editorTitleCommand);

	logger.info('MD Tasks extension activated successfully');
}

/**
 * 拡張機能が非アクティブになった時に呼ばれる
 */
export function deactivate(): void {
	logger.info('MD Tasks extension is deactivating...');

	// パネルプロバイダーを破棄
	kanbanPanelProvider?.dispose();
	kanbanPanelProvider = undefined;

	// DIコンテナを破棄
	disposeContainer();

	logger.info('MD Tasks extension deactivated');
}
