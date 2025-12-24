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

	/**
	 * ドキュメント状態変更メッセージを送信する
	 */
	sendDocumentStateChanged(isDirty: boolean): void {
		this.postMessage({
			type: 'DOCUMENT_STATE_CHANGED',
			payload: { isDirty },
		});
	}
}
