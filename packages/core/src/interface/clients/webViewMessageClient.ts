import type { KanbanConfig } from '../../domain/ports/configProvider';
import type { ExtensionToWebViewMessage, TaskDto } from '../types/messages';

/**
 * WebView通信の依存性インターフェース
 * テスト時にモック可能にするため
 */
export interface WebViewMessageDeps {
	postMessage(message: ExtensionToWebViewMessage): void;
}

/**
 * WebViewMessageClient
 * WebViewへのメッセージ送信を担当するクライアント
 */
export class WebViewMessageClient {
	constructor(private readonly deps: WebViewMessageDeps) {}

	/**
	 * メッセージを送信する
	 */
	postMessage(message: ExtensionToWebViewMessage): void {
		this.deps.postMessage(message);
	}

	/**
	 * タスク一覧更新メッセージを送信する
	 */
	sendTasksUpdated(tasks: TaskDto[]): void {
		this.postMessage({
			type: 'TASKS_UPDATED',
			payload: { tasks },
		});
	}

	/**
	 * タスク作成成功メッセージを送信する
	 */
	sendTaskCreated(task: TaskDto): void {
		this.postMessage({
			type: 'TASK_CREATED',
			payload: { task },
		});
	}

	/**
	 * タスク更新成功メッセージを送信する
	 */
	sendTaskUpdated(task: TaskDto): void {
		this.postMessage({
			type: 'TASK_UPDATED',
			payload: { task },
		});
	}

	/**
	 * タスク削除成功メッセージを送信する
	 */
	sendTaskDeleted(id: string): void {
		this.postMessage({
			type: 'TASK_DELETED',
			payload: { id },
		});
	}

	/**
	 * 設定更新メッセージを送信する
	 */
	sendConfigUpdated(config: KanbanConfig): void {
		this.postMessage({
			type: 'CONFIG_UPDATED',
			payload: { config },
		});
	}

	/**
	 * エラーメッセージを送信する
	 */
	sendError(message: string, code?: string): void {
		this.postMessage({
			type: 'ERROR',
			payload: code ? { message, code } : { message },
		});
	}
}
