import type { TaskMetadata } from '../../domain/entities/task';
import type { KanbanConfig } from '../../domain/ports/configProvider';

/**
 * タスクDTO（Extension ⇔ WebView間の通信用）
 */
export interface TaskDto {
	id: string;
	title: string;
	status: string;
	path: string[];
	isChecked: boolean;
	metadata: TaskMetadata;
}

// =============================================================================
// WebView → Extension メッセージ
// =============================================================================

/**
 * タスク一覧取得リクエスト
 */
export interface GetTasksRequest {
	type: 'GET_TASKS';
}

/**
 * タスク作成リクエスト
 */
export interface CreateTaskRequest {
	type: 'CREATE_TASK';
	payload: {
		title: string;
		path: string[];
		status?: string;
		metadata?: TaskMetadata;
	};
}

/**
 * タスク更新リクエスト
 */
export interface UpdateTaskRequest {
	type: 'UPDATE_TASK';
	payload: {
		id: string;
		title?: string;
		path?: string[];
		status?: string;
		metadata?: TaskMetadata;
	};
}

/**
 * タスク削除リクエスト
 */
export interface DeleteTaskRequest {
	type: 'DELETE_TASK';
	payload: {
		id: string;
	};
}

/**
 * タスクステータス変更リクエスト
 */
export interface ChangeTaskStatusRequest {
	type: 'CHANGE_TASK_STATUS';
	payload: {
		id: string;
		status: string;
	};
}

/**
 * 設定取得リクエスト
 */
export interface GetConfigRequest {
	type: 'GET_CONFIG';
}

/**
 * ドキュメント保存リクエスト
 */
export interface SaveDocumentRequest {
	type: 'SAVE_DOCUMENT';
}

/**
 * ドキュメント破棄リクエスト
 */
export interface RevertDocumentRequest {
	type: 'REVERT_DOCUMENT';
}

/**
 * WebView → Extension の全メッセージタイプ
 */
export type WebViewToExtensionMessage =
	| GetTasksRequest
	| CreateTaskRequest
	| UpdateTaskRequest
	| DeleteTaskRequest
	| ChangeTaskStatusRequest
	| GetConfigRequest
	| SaveDocumentRequest
	| RevertDocumentRequest;

// =============================================================================
// Extension → WebView メッセージ
// =============================================================================

/**
 * タスク一覧更新メッセージ
 */
export interface TasksUpdatedMessage {
	type: 'TASKS_UPDATED';
	payload: {
		tasks: TaskDto[];
	};
}

/**
 * 設定更新メッセージ
 */
export interface ConfigUpdatedMessage {
	type: 'CONFIG_UPDATED';
	payload: {
		config: KanbanConfig;
	};
}

/**
 * エラーメッセージ
 */
export interface ErrorMessage {
	type: 'ERROR';
	payload: {
		message: string;
		code?: string;
	};
}

/**
 * ドキュメント状態変更メッセージ
 */
export interface DocumentStateChangedMessage {
	type: 'DOCUMENT_STATE_CHANGED';
	payload: {
		isDirty: boolean;
	};
}

/**
 * Extension → WebView の全メッセージタイプ
 */
export type ExtensionToWebViewMessage =
	| TasksUpdatedMessage
	| ConfigUpdatedMessage
	| ErrorMessage
	| DocumentStateChangedMessage;

/**
 * 全メッセージタイプ
 */
export type Message = WebViewToExtensionMessage | ExtensionToWebViewMessage;

/**
 * メッセージタイプの文字列リテラル
 */
export type MessageType = Message['type'];
