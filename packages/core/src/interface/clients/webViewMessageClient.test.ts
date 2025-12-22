import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionToWebViewMessage, TaskDto } from '../types/messages';
import { WebViewMessageClient, type WebViewMessageDeps } from './webViewMessageClient';

describe('WebViewMessageClient', () => {
	let deps: WebViewMessageDeps;
	let client: WebViewMessageClient;

	const mockTask: TaskDto = {
		id: 'task-1',
		title: 'Test Task',
		status: 'todo',
		path: ['Project', 'Feature'],
		isChecked: false,
		metadata: {},
	};

	beforeEach(() => {
		deps = {
			postMessage: vi.fn(),
		};
		client = new WebViewMessageClient(deps);
	});

	describe('postMessage', () => {
		it('メッセージを送信できる', () => {
			const message: ExtensionToWebViewMessage = {
				type: 'TASKS_UPDATED',
				payload: { tasks: [mockTask] },
			};

			client.postMessage(message);

			expect(deps.postMessage).toHaveBeenCalledWith(message);
		});
	});

	describe('sendTasksUpdated', () => {
		it('タスク一覧更新メッセージを送信できる', () => {
			const tasks: TaskDto[] = [mockTask];

			client.sendTasksUpdated(tasks);

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'TASKS_UPDATED',
				payload: { tasks },
			});
		});

		it('空のタスク一覧を送信できる', () => {
			client.sendTasksUpdated([]);

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'TASKS_UPDATED',
				payload: { tasks: [] },
			});
		});
	});

	describe('sendTaskCreated', () => {
		it('タスク作成成功メッセージを送信できる', () => {
			client.sendTaskCreated(mockTask);

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'TASK_CREATED',
				payload: { task: mockTask },
			});
		});
	});

	describe('sendTaskUpdated', () => {
		it('タスク更新成功メッセージを送信できる', () => {
			client.sendTaskUpdated(mockTask);

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'TASK_UPDATED',
				payload: { task: mockTask },
			});
		});
	});

	describe('sendTaskDeleted', () => {
		it('タスク削除成功メッセージを送信できる', () => {
			client.sendTaskDeleted('task-1');

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'TASK_DELETED',
				payload: { id: 'task-1' },
			});
		});
	});

	describe('sendConfigUpdated', () => {
		it('設定更新メッセージを送信できる', () => {
			const config = {
				statuses: ['todo', 'in-progress', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'todo',
				defaultDoneStatus: 'done',
				sortBy: 'markdown' as const,
				syncCheckboxWithDone: true,
			};

			client.sendConfigUpdated(config);

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'CONFIG_UPDATED',
				payload: { config },
			});
		});
	});

	describe('sendError', () => {
		it('エラーメッセージを送信できる', () => {
			client.sendError('Something went wrong');

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'ERROR',
				payload: { message: 'Something went wrong' },
			});
		});

		it('エラーコード付きでエラーメッセージを送信できる', () => {
			client.sendError('Task not found', 'TASK_NOT_FOUND');

			expect(deps.postMessage).toHaveBeenCalledWith({
				type: 'ERROR',
				payload: { message: 'Task not found', code: 'TASK_NOT_FOUND' },
			});
		});
	});
});
