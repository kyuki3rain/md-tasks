import { useCallback, useEffect, useState } from 'react';
import type {
	ExtensionToWebViewMessage,
	KanbanConfig,
	TaskDto,
	TaskMetadata,
	WebViewToExtensionMessage,
} from '../types';

interface VscodeApi {
	postMessage: (message: WebViewToExtensionMessage) => void;
	getState: () => unknown;
	setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VscodeApi;

let vscodeApi: VscodeApi | null = null;

function getVscodeApi(): VscodeApi {
	if (!vscodeApi) {
		try {
			vscodeApi = acquireVsCodeApi();
		} catch {
			// Development mode fallback
			vscodeApi = {
				postMessage: (message) => {
					console.log('[WebView → Extension]', message);
				},
				getState: () => null,
				setState: (state) => {
					console.log('[WebView State]', state);
				},
			};
		}
	}
	return vscodeApi;
}

/**
 * VSCode API の基本フック
 */
export function useVscodeApi() {
	const api = getVscodeApi();

	const postMessage = useCallback(
		(message: WebViewToExtensionMessage) => {
			api.postMessage(message);
		},
		[api],
	);

	const getState = useCallback(() => {
		return api.getState();
	}, [api]);

	const setState = useCallback(
		(state: unknown) => {
			api.setState(state);
		},
		[api],
	);

	return { postMessage, getState, setState };
}

/**
 * 特定タイプのメッセージを購読するフック
 */
export function useVscodeMessage(
	messageType: ExtensionToWebViewMessage['type'],
	handler: (payload: unknown) => void,
) {
	useEffect(() => {
		const handleMessage = (event: MessageEvent<ExtensionToWebViewMessage>) => {
			const message = event.data;
			if (message.type === messageType && 'payload' in message) {
				handler(message.payload);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [messageType, handler]);
}

type MessageHandlers = {
	TASKS_UPDATED?: (payload: { tasks: TaskDto[] }) => void;
	TASK_CREATED?: (payload: { task: TaskDto }) => void;
	TASK_UPDATED?: (payload: { task: TaskDto }) => void;
	TASK_DELETED?: (payload: { id: string }) => void;
	CONFIG_UPDATED?: (payload: { config: KanbanConfig }) => void;
	ERROR?: (payload: { message: string; code?: string }) => void;
};

/**
 * 複数タイプのメッセージを購読するフック
 */
export function useVscodeMessages(handlers: MessageHandlers) {
	const [lastMessage, setLastMessage] = useState<ExtensionToWebViewMessage | null>(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent<ExtensionToWebViewMessage>) => {
			const message = event.data;
			setLastMessage(message);

			if ('payload' in message) {
				const handler = handlers[message.type as keyof MessageHandlers];
				if (handler) {
					// biome-ignore lint/suspicious/noExplicitAny: Type is checked at runtime
					(handler as (payload: any) => void)(message.payload);
				}
			}
		};

		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [handlers]);

	return lastMessage;
}

// =============================================================================
// カンバンボード用のカスタムフック
// =============================================================================

interface KanbanState {
	tasks: TaskDto[];
	config: KanbanConfig | null;
	isLoading: boolean;
	error: string | null;
}

const defaultConfig: KanbanConfig = {
	statuses: ['todo', 'in-progress', 'done'],
	doneStatuses: ['done'],
	defaultStatus: 'todo',
	defaultDoneStatus: 'done',
	sortBy: 'markdown',
	syncCheckboxWithDone: true,
};

/**
 * カンバンボードの状態管理フック
 */
export function useKanban() {
	const { postMessage } = useVscodeApi();
	const [state, setState] = useState<KanbanState>({
		tasks: [],
		config: null,
		isLoading: true,
		error: null,
	});

	// メッセージハンドラー
	const handlers = useCallback(
		() => ({
			TASKS_UPDATED: (payload: { tasks: TaskDto[] }) => {
				setState((prev) => ({
					...prev,
					tasks: payload.tasks,
					isLoading: false,
				}));
			},
			CONFIG_UPDATED: (payload: { config: KanbanConfig }) => {
				setState((prev) => ({
					...prev,
					config: payload.config,
				}));
			},
			TASK_CREATED: (payload: { task: TaskDto }) => {
				setState((prev) => ({
					...prev,
					tasks: [...prev.tasks, payload.task],
				}));
			},
			TASK_UPDATED: (payload: { task: TaskDto }) => {
				setState((prev) => ({
					...prev,
					tasks: prev.tasks.map((t) => (t.id === payload.task.id ? payload.task : t)),
				}));
			},
			TASK_DELETED: (payload: { id: string }) => {
				setState((prev) => ({
					...prev,
					tasks: prev.tasks.filter((t) => t.id !== payload.id),
				}));
			},
			ERROR: (payload: { message: string }) => {
				setState((prev) => ({
					...prev,
					error: payload.message,
					isLoading: false,
				}));
			},
		}),
		[],
	);

	useVscodeMessages(handlers());

	// 初期データ取得
	useEffect(() => {
		postMessage({ type: 'GET_CONFIG' });
		postMessage({ type: 'GET_TASKS' });
	}, [postMessage]);

	// アクション
	const createTask = useCallback(
		(params: { title: string; path: string[]; status?: string; metadata?: TaskMetadata }) => {
			postMessage({ type: 'CREATE_TASK', payload: params });
		},
		[postMessage],
	);

	const updateTask = useCallback(
		(params: { id: string; title?: string; path?: string[]; metadata?: TaskMetadata }) => {
			postMessage({ type: 'UPDATE_TASK', payload: params });
		},
		[postMessage],
	);

	const deleteTask = useCallback(
		(id: string) => {
			postMessage({ type: 'DELETE_TASK', payload: { id } });
		},
		[postMessage],
	);

	const changeTaskStatus = useCallback(
		(id: string, status: string) => {
			postMessage({ type: 'CHANGE_TASK_STATUS', payload: { id, status } });
		},
		[postMessage],
	);

	const refreshTasks = useCallback(() => {
		setState((prev) => ({ ...prev, isLoading: true }));
		postMessage({ type: 'GET_TASKS' });
	}, [postMessage]);

	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	// 設定を取得（なければデフォルト）
	const config = state.config ?? defaultConfig;

	// ステータスごとにタスクをグループ化
	const tasksByStatus = config.statuses.reduce(
		(acc, status) => {
			acc[status] = state.tasks.filter((task) => task.status === status);
			return acc;
		},
		{} as Record<string, TaskDto[]>,
	);

	// パス一覧を取得（ユニーク）
	const paths = Array.from(new Set(state.tasks.map((task) => task.path.join(' / ')))).map(
		(pathStr) => (pathStr === '' ? [] : pathStr.split(' / ')),
	);

	return {
		tasks: state.tasks,
		tasksByStatus,
		config,
		paths,
		isLoading: state.isLoading,
		error: state.error,
		actions: {
			createTask,
			updateTask,
			deleteTask,
			changeTaskStatus,
			refreshTasks,
			clearError,
		},
	};
}
