import { logger } from '../../shared';
import type { WebViewMessageClient } from '../clients/webViewMessageClient';
import type { WebViewToExtensionMessage } from '../types/messages';
import type { ConfigController } from './configController';
import type { TaskController } from './taskController';

/**
 * WebViewMessageHandler
 * WebViewからのメッセージをハンドリングする
 */
export class WebViewMessageHandler {
	constructor(
		private readonly taskController: TaskController,
		private readonly configController: ConfigController,
		private readonly messageClient: WebViewMessageClient,
	) {}

	/**
	 * メッセージを処理する
	 */
	async handleMessage(message: WebViewToExtensionMessage): Promise<void> {
		logger.info(`Handling message: ${message.type}`);

		switch (message.type) {
			case 'GET_TASKS':
				await this.handleGetTasks();
				break;
			case 'CREATE_TASK':
				await this.handleCreateTask(message.payload);
				break;
			case 'UPDATE_TASK':
				await this.handleUpdateTask(message.payload);
				break;
			case 'DELETE_TASK':
				await this.handleDeleteTask(message.payload.id);
				break;
			case 'CHANGE_TASK_STATUS':
				await this.handleChangeTaskStatus(message.payload.id, message.payload.status);
				break;
			case 'GET_CONFIG':
				await this.handleGetConfig();
				break;
			default:
				logger.error(`Unknown message type: ${(message as { type: string }).type}`);
		}
	}

	/**
	 * タスク一覧取得を処理する
	 */
	private async handleGetTasks(): Promise<void> {
		const result = await this.taskController.getTasks();

		if (result.isOk()) {
			this.messageClient.sendTasksUpdated(result.value);
		} else {
			this.sendError(result.error);
		}
	}

	/**
	 * タスク作成を処理する
	 */
	private async handleCreateTask(payload: {
		title: string;
		path: string[];
		status?: string;
		metadata?: Record<string, string>;
	}): Promise<void> {
		const result = await this.taskController.createTask({
			title: payload.title,
			path: payload.path,
			status: payload.status,
			metadata: payload.metadata,
		});

		if (result.isOk()) {
			this.messageClient.sendTaskCreated(result.value);
		} else {
			this.sendError(result.error);
		}
	}

	/**
	 * タスク更新を処理する
	 */
	private async handleUpdateTask(payload: {
		id: string;
		title?: string;
		path?: string[];
		metadata?: Record<string, string>;
	}): Promise<void> {
		const result = await this.taskController.updateTask({
			id: payload.id,
			title: payload.title,
			path: payload.path,
			metadata: payload.metadata,
		});

		if (result.isOk()) {
			this.messageClient.sendTaskUpdated(result.value);
		} else {
			this.sendError(result.error);
		}
	}

	/**
	 * タスク削除を処理する
	 */
	private async handleDeleteTask(id: string): Promise<void> {
		const result = await this.taskController.deleteTask(id);

		if (result.isOk()) {
			this.messageClient.sendTaskDeleted(id);
		} else {
			this.sendError(result.error);
		}
	}

	/**
	 * タスクステータス変更を処理する
	 */
	private async handleChangeTaskStatus(id: string, status: string): Promise<void> {
		const result = await this.taskController.changeTaskStatus(id, status);

		if (result.isOk()) {
			this.messageClient.sendTaskUpdated(result.value);
		} else {
			this.sendError(result.error);
		}
	}

	/**
	 * 設定取得を処理する
	 */
	private async handleGetConfig(): Promise<void> {
		const config = await this.configController.getConfig();
		this.messageClient.sendConfigUpdated(config);
	}

	/**
	 * エラーを送信する
	 */
	private sendError(error: Error & { _tag?: string }): void {
		// NoActiveEditorErrorは正常な状態遷移の一つなのでdebugレベルでログ出力
		if (error._tag === 'NoActiveEditorError') {
			logger.debug(`No active editor: ${error.message}`);
		} else {
			logger.error(`Error: ${error.message}`, { errorType: error._tag, message: error.message });
		}
		this.messageClient.sendError(error.message, error._tag);
	}
}
