import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import { TaskParseError } from '../../domain/errors/taskParseError';
import type { KanbanConfig } from '../../domain/ports/configProvider';
import type { WebViewMessageClient } from '../clients/webViewMessageClient';
import type { TaskDto, WebViewToExtensionMessage } from '../types/messages';
import type { ConfigController } from './configController';
import type { TaskController } from './taskController';
import { WebViewMessageHandler } from './webViewMessageHandler';

describe('WebViewMessageHandler', () => {
	let mockTaskController: TaskController;
	let mockConfigController: ConfigController;
	let mockMessageClient: WebViewMessageClient;
	let handler: WebViewMessageHandler;

	const mockTaskDto: TaskDto = {
		id: 'task-1',
		title: 'Test Task',
		status: 'todo',
		path: ['Project'],
		isChecked: false,
		metadata: {},
	};

	const mockConfig: KanbanConfig = {
		statuses: ['todo', 'in-progress', 'done'],
		doneStatuses: ['done'],
		defaultStatus: 'todo',
		defaultDoneStatus: 'done',
		sortBy: 'markdown',
		syncCheckboxWithDone: true,
	};

	beforeEach(() => {
		mockTaskController = {
			getTasks: vi.fn().mockResolvedValue(ok([mockTaskDto])),
			createTask: vi.fn().mockResolvedValue(ok(mockTaskDto)),
			updateTask: vi.fn().mockResolvedValue(ok(mockTaskDto)),
			deleteTask: vi.fn().mockResolvedValue(ok(undefined)),
			changeTaskStatus: vi.fn().mockResolvedValue(ok(mockTaskDto)),
		} as unknown as TaskController;

		mockConfigController = {
			getConfig: vi.fn().mockResolvedValue(mockConfig),
			get: vi.fn(),
		} as unknown as ConfigController;

		mockMessageClient = {
			postMessage: vi.fn(),
			sendTasksUpdated: vi.fn(),
			sendConfigUpdated: vi.fn(),
			sendError: vi.fn(),
		} as unknown as WebViewMessageClient;

		handler = new WebViewMessageHandler(
			mockTaskController,
			mockConfigController,
			mockMessageClient,
		);
	});

	describe('handleMessage', () => {
		describe('GET_TASKS', () => {
			it('タスク一覧を取得して送信する', async () => {
				const message: WebViewToExtensionMessage = { type: 'GET_TASKS' };

				await handler.handleMessage(message);

				expect(mockTaskController.getTasks).toHaveBeenCalled();
				expect(mockMessageClient.sendTasksUpdated).toHaveBeenCalledWith([mockTaskDto]);
			});

			it('エラー時はエラーメッセージを送信する', async () => {
				mockTaskController.getTasks = vi
					.fn()
					.mockResolvedValue(err(new TaskParseError(1, 'Parse error')));
				const message: WebViewToExtensionMessage = { type: 'GET_TASKS' };

				await handler.handleMessage(message);

				expect(mockMessageClient.sendError).toHaveBeenCalledWith(
					'Failed to parse task at line 1: Parse error',
					'TaskParseError',
				);
			});
		});

		describe('CREATE_TASK', () => {
			it('タスクを作成する（成功時はメッセージを送信しない）', async () => {
				const message: WebViewToExtensionMessage = {
					type: 'CREATE_TASK',
					payload: {
						title: 'New Task',
						path: ['Project'],
					},
				};

				await handler.handleMessage(message);

				expect(mockTaskController.createTask).toHaveBeenCalledWith({
					title: 'New Task',
					path: ['Project'],
					status: undefined,
					metadata: undefined,
				});
				// 成功時はメッセージを送信しない（ドキュメント変更イベントでTASKS_UPDATEDが送信される）
				expect(mockMessageClient.sendTasksUpdated).not.toHaveBeenCalled();
			});

			it('ステータス付きでタスクを作成できる', async () => {
				const message: WebViewToExtensionMessage = {
					type: 'CREATE_TASK',
					payload: {
						title: 'New Task',
						path: ['Project'],
						status: 'in-progress',
					},
				};

				await handler.handleMessage(message);

				expect(mockTaskController.createTask).toHaveBeenCalledWith({
					title: 'New Task',
					path: ['Project'],
					status: 'in-progress',
					metadata: undefined,
				});
			});
		});

		describe('UPDATE_TASK', () => {
			it('タスクを更新する（成功時はメッセージを送信しない）', async () => {
				const message: WebViewToExtensionMessage = {
					type: 'UPDATE_TASK',
					payload: {
						id: 'task-1',
						title: 'Updated Task',
					},
				};

				await handler.handleMessage(message);

				expect(mockTaskController.updateTask).toHaveBeenCalledWith({
					id: 'task-1',
					title: 'Updated Task',
					path: undefined,
					metadata: undefined,
				});
				// 成功時はメッセージを送信しない（ドキュメント変更イベントでTASKS_UPDATEDが送信される）
				expect(mockMessageClient.sendTasksUpdated).not.toHaveBeenCalled();
			});

			it('エラー時はエラーメッセージを送信する', async () => {
				mockTaskController.updateTask = vi
					.fn()
					.mockResolvedValue(err(new TaskNotFoundError('task-1')));
				const message: WebViewToExtensionMessage = {
					type: 'UPDATE_TASK',
					payload: { id: 'task-1', title: 'Updated' },
				};

				await handler.handleMessage(message);

				expect(mockMessageClient.sendError).toHaveBeenCalledWith(
					'Task not found: task-1',
					'TaskNotFoundError',
				);
			});
		});

		describe('DELETE_TASK', () => {
			it('タスクを削除する（成功時はメッセージを送信しない）', async () => {
				const message: WebViewToExtensionMessage = {
					type: 'DELETE_TASK',
					payload: { id: 'task-1' },
				};

				await handler.handleMessage(message);

				expect(mockTaskController.deleteTask).toHaveBeenCalledWith('task-1');
				// 成功時はメッセージを送信しない（ドキュメント変更イベントでTASKS_UPDATEDが送信される）
				expect(mockMessageClient.sendTasksUpdated).not.toHaveBeenCalled();
			});
		});

		describe('CHANGE_TASK_STATUS', () => {
			it('タスクのステータスを変更する（成功時はメッセージを送信しない）', async () => {
				const message: WebViewToExtensionMessage = {
					type: 'CHANGE_TASK_STATUS',
					payload: {
						id: 'task-1',
						status: 'done',
					},
				};

				await handler.handleMessage(message);

				expect(mockTaskController.changeTaskStatus).toHaveBeenCalledWith('task-1', 'done');
				// 成功時はメッセージを送信しない（ドキュメント変更イベントでTASKS_UPDATEDが送信される）
				expect(mockMessageClient.sendTasksUpdated).not.toHaveBeenCalled();
			});
		});

		describe('GET_CONFIG', () => {
			it('設定を取得して送信する', async () => {
				const message: WebViewToExtensionMessage = { type: 'GET_CONFIG' };

				await handler.handleMessage(message);

				expect(mockConfigController.getConfig).toHaveBeenCalled();
				expect(mockMessageClient.sendConfigUpdated).toHaveBeenCalledWith(mockConfig);
			});
		});
	});
});
