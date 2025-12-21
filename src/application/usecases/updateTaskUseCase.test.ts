import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { UpdateTaskUseCase } from './updateTaskUseCase';

describe('UpdateTaskUseCase', () => {
	const createMockTaskRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPath: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		getAvailablePaths: vi.fn(),
		...overrides,
	});

	const createTask = (
		id: string,
		title: string,
		statusValue: string,
		pathSegments: string[] = ['Project'],
	): Task => {
		const status = Status.create(statusValue)._unsafeUnwrap();
		const path = Path.create(pathSegments);
		return Task.create({
			id,
			title,
			status,
			path,
			isChecked: false,
			metadata: {},
		});
	};

	describe('execute', () => {
		it('タスクのタイトルを更新できる', async () => {
			const existingTask = createTask('1', 'Old Title', 'todo');
			const updatedTask = existingTask.updateTitle('New Title');

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockResolvedValue(ok(updatedTask)),
			});

			const useCase = new UpdateTaskUseCase(repository);
			const result = await useCase.execute({
				id: '1',
				title: 'New Title',
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().title).toBe('New Title');
		});

		it('タスクのメタデータを更新できる', async () => {
			const existingTask = createTask('1', 'Task', 'todo');
			const newMetadata = { priority: 'high', assignee: 'bob' };
			const updatedTask = existingTask.updateMetadata(newMetadata);

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockResolvedValue(ok(updatedTask)),
			});

			const useCase = new UpdateTaskUseCase(repository);
			const result = await useCase.execute({
				id: '1',
				metadata: newMetadata,
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().metadata).toEqual(newMetadata);
		});

		it('タスクのパスを更新できる', async () => {
			const existingTask = createTask('1', 'Task', 'todo', ['Project', 'Old']);
			const newPath = Path.create(['Project', 'New']);
			const updatedTask = existingTask.updatePath(newPath);

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockResolvedValue(ok(updatedTask)),
			});

			const useCase = new UpdateTaskUseCase(repository);
			const result = await useCase.execute({
				id: '1',
				path: newPath,
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().path.equals(newPath)).toBe(true);
		});

		it('存在しないタスクを更新しようとするとエラーを返す', async () => {
			const notFoundError = new TaskNotFoundError('non-existent');
			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(err(notFoundError)),
			});

			const useCase = new UpdateTaskUseCase(repository);
			const result = await useCase.execute({
				id: 'non-existent',
				title: 'New Title',
			});

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBeInstanceOf(TaskNotFoundError);
		});

		it('複数のフィールドを同時に更新できる', async () => {
			const existingTask = createTask('1', 'Old Title', 'todo', ['Old', 'Path']);
			const newPath = Path.create(['New', 'Path']);
			const newMetadata = { priority: 'low' };

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockImplementation((task) => Promise.resolve(ok(task))),
			});

			const useCase = new UpdateTaskUseCase(repository);
			const result = await useCase.execute({
				id: '1',
				title: 'New Title',
				path: newPath,
				metadata: newMetadata,
			});

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.title).toBe('New Title');
			expect(task.path.equals(newPath)).toBe(true);
			expect(task.metadata).toEqual(newMetadata);
		});
	});
});
