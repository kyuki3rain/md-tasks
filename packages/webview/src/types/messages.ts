/**
 * WebView側のメッセージ型定義
 * Extension側の型定義と同期を維持すること
 */

/**
 * タスクメタデータ
 */
export interface TaskMetadata {
	priority?: string;
	due?: string;
	assignee?: string;
	tags?: string[];
	[key: string]: unknown;
}

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

/**
 * カンバン設定
 */
export interface KanbanConfig {
	statuses: string[];
	doneStatuses: string[];
	defaultStatus: string;
	defaultDoneStatus: string;
	sortBy: 'markdown' | 'priority' | 'due' | 'alphabetical';
	syncCheckboxWithDone: boolean;
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
 * WebView → Extension の全メッセージタイプ
 */
export type WebViewToExtensionMessage =
	| GetTasksRequest
	| CreateTaskRequest
	| UpdateTaskRequest
	| DeleteTaskRequest
	| ChangeTaskStatusRequest
	| GetConfigRequest;

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
 * タスク作成成功メッセージ
 */
export interface TaskCreatedMessage {
	type: 'TASK_CREATED';
	payload: {
		task: TaskDto;
	};
}

/**
 * タスク更新成功メッセージ
 */
export interface TaskUpdatedMessage {
	type: 'TASK_UPDATED';
	payload: {
		task: TaskDto;
	};
}

/**
 * タスク削除成功メッセージ
 */
export interface TaskDeletedMessage {
	type: 'TASK_DELETED';
	payload: {
		id: string;
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
 * Extension → WebView の全メッセージタイプ
 */
export type ExtensionToWebViewMessage =
	| TasksUpdatedMessage
	| TaskCreatedMessage
	| TaskUpdatedMessage
	| TaskDeletedMessage
	| ConfigUpdatedMessage
	| ErrorMessage;

/**
 * 全メッセージタイプ
 */
export type Message = WebViewToExtensionMessage | ExtensionToWebViewMessage;

/**
 * メッセージタイプの文字列リテラル
 */
export type MessageType = Message['type'];
