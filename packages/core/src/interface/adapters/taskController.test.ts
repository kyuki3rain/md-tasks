import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	ChangeTaskStatusUseCase,
	CreateTaskUseCase,
	DeleteTaskUseCase,
	GetTasksUseCase,
	UpdateTaskUseCase,
} from '../../application/usecases';
import { Task } from '../../domain/entities/task';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import { TaskParseError } from '../../domain/errors/taskParseError';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { TaskController } from './taskController';

describe('TaskController', () => {
	let mockGetTasksUseCase: GetTasksUseCase;
	let mockCreateTaskUseCase: CreateTaskUseCase;
	let mockUpdateTaskUseCase: UpdateTaskUseCase;
	let mockDeleteTaskUseCase: DeleteTaskUseCase;
	let mockChangeTaskStatusUseCase: ChangeTaskStatusUseCase;
	let controller: TaskController;

	const mockTask = Task.create({
		id: 'task-1',
		title: 'Test Task',
		status: Status.create('todo')._unsafeUnwrap(),
		path: Path.create(['Project']),
		isChecked: false,
		metadata: { priority: 'high' },
	});

	beforeEach(() => {
		mockGetTasksUseCase = {
			execute: vi.fn().mockResolvedValue(ok([mockTask])),
			executeByPath: vi.fn().mockResolvedValue(ok([mockTask])),
		} as unknown as GetTasksUseCase;

		mockCreateTaskUseCase = {
			execute: vi.fn().mockResolvedValue(ok(mockTask)),
		} as unknown as CreateTaskUseCase;

		mockUpdateTaskUseCase = {
			execute: vi.fn().mockResolvedValue(ok(mockTask)),
		} as unknown as UpdateTaskUseCase;

		mockDeleteTaskUseCase = {
			execute: vi.fn().mockResolvedValue(ok(undefined)),
		} as unknown as DeleteTaskUseCase;

		mockChangeTaskStatusUseCase = {
			execute: vi.fn().mockResolvedValue(ok(mockTask)),
		} as unknown as ChangeTaskStatusUseCase;

		controller = new TaskController(
			mockGetTasksUseCase,
			mockCreateTaskUseCase,
			mockUpdateTaskUseCase,
			mockDeleteTaskUseCase,
			mockChangeTaskStatusUseCase,
		);
	});

	describe('getTasks', () => {
		it('全タスクをDTO形式で取得できる', async () => {
			const result = await controller.getTasks();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0]).toEqual({
					id: 'task-1',
					title: 'Test Task',
					status: 'todo',
					path: ['Project'],
					isChecked: false,
					metadata: { priority: 'high' },
				});
			}
		});

		it('エラー時はエラーを返す', async () => {
			mockGetTasksUseCase.execute = vi
				.fn()
				.mockResolvedValue(err(new TaskParseError(1, 'Parse error')));

			const result = await controller.getTasks();

			expect(result.isErr()).toBe(true);
		});
	});

	describe('createTask', () => {
		it('タスクを作成してDTO形式で返す', async () => {
			const result = await controller.createTask({
				title: 'New Task',
				path: ['Project'],
			});

			expect(result.isOk()).toBe(true);
			expect(mockCreateTaskUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'New Task',
				}),
			);
		});

		it('ステータス付きでタスクを作成できる', async () => {
			await controller.createTask({
				title: 'New Task',
				path: ['Project'],
				status: 'in-progress',
			});

			expect(mockCreateTaskUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'New Task',
					status: expect.objectContaining({ _value: 'in-progress' }),
				}),
			);
		});

		it('無効なステータスの場合はエラーを返す', async () => {
			const result = await controller.createTask({
				title: 'New Task',
				path: ['Project'],
				status: '', // 空文字は無効
			});

			expect(result.isErr()).toBe(true);
		});
	});

	describe('updateTask', () => {
		it('タスクを更新してDTO形式で返す', async () => {
			const result = await controller.updateTask({
				id: 'task-1',
				title: 'Updated Task',
			});

			expect(result.isOk()).toBe(true);
			expect(mockUpdateTaskUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'task-1',
					title: 'Updated Task',
				}),
			);
		});

		it('パスを更新できる', async () => {
			await controller.updateTask({
				id: 'task-1',
				path: ['New', 'Path'],
			});

			expect(mockUpdateTaskUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'task-1',
					path: expect.objectContaining({ _segments: ['New', 'Path'] }),
				}),
			);
		});

		it('存在しないタスクの場合はエラーを返す', async () => {
			mockUpdateTaskUseCase.execute = vi
				.fn()
				.mockResolvedValue(err(new TaskNotFoundError('task-999')));

			const result = await controller.updateTask({
				id: 'task-999',
				title: 'Updated',
			});

			expect(result.isErr()).toBe(true);
		});
	});

	describe('deleteTask', () => {
		it('タスクを削除できる', async () => {
			const result = await controller.deleteTask('task-1');

			expect(result.isOk()).toBe(true);
			expect(mockDeleteTaskUseCase.execute).toHaveBeenCalledWith('task-1');
		});

		it('存在しないタスクの場合はエラーを返す', async () => {
			mockDeleteTaskUseCase.execute = vi
				.fn()
				.mockResolvedValue(err(new TaskNotFoundError('task-999')));

			const result = await controller.deleteTask('task-999');

			expect(result.isErr()).toBe(true);
		});
	});

	describe('changeTaskStatus', () => {
		it('タスクのステータスを変更できる', async () => {
			const result = await controller.changeTaskStatus('task-1', 'done');

			expect(result.isOk()).toBe(true);
			expect(mockChangeTaskStatusUseCase.execute).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ _value: 'done' }),
			);
		});

		it('無効なステータスの場合はエラーを返す', async () => {
			const result = await controller.changeTaskStatus('task-1', '');

			expect(result.isErr()).toBe(true);
		});

		it('存在しないタスクの場合はエラーを返す', async () => {
			mockChangeTaskStatusUseCase.execute = vi
				.fn()
				.mockResolvedValue(err(new TaskNotFoundError('task-999')));

			const result = await controller.changeTaskStatus('task-999', 'done');

			expect(result.isErr()).toBe(true);
		});
	});
});
