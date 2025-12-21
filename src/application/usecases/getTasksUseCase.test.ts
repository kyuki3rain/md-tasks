import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { TaskParseError } from '../../domain/errors/taskParseError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { GetTasksUseCase } from './getTasksUseCase';

describe('GetTasksUseCase', () => {
	const createMockTaskRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPath: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		getAvailablePaths: vi.fn(),
		...overrides,
	});

	const createTask = (id: string, title: string, statusValue: string): Task => {
		const status = Status.create(statusValue)._unsafeUnwrap();
		const path = Path.create(['Project']);
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
		it('全タスクを取得できる', async () => {
			const tasks = [
				createTask('1', 'Task 1', 'todo'),
				createTask('2', 'Task 2', 'in-progress'),
				createTask('3', 'Task 3', 'done'),
			];

			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(ok(tasks)),
			});

			const useCase = new GetTasksUseCase(repository);
			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(3);
			expect(result._unsafeUnwrap()).toEqual(tasks);
		});

		it('タスクが存在しない場合は空配列を返す', async () => {
			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(ok([])),
			});

			const useCase = new GetTasksUseCase(repository);
			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(0);
		});

		it('パースエラーが発生した場合はエラーを返す', async () => {
			const parseError = new TaskParseError(10, 'Parse failed');
			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(err(parseError)),
			});

			const useCase = new GetTasksUseCase(repository);
			const result = await useCase.execute();

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe(parseError);
		});
	});

	describe('executeByPath', () => {
		it('指定したパス配下のタスクを取得できる', async () => {
			const path = Path.create(['Project', 'Feature A']);
			const tasks = [createTask('1', 'Task 1', 'todo'), createTask('2', 'Task 2', 'in-progress')];

			const repository = createMockTaskRepository({
				findByPath: vi.fn().mockResolvedValue(ok(tasks)),
			});

			const useCase = new GetTasksUseCase(repository);
			const result = await useCase.executeByPath(path);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toEqual(tasks);
			expect(repository.findByPath).toHaveBeenCalledWith(path);
		});

		it('パースエラーが発生した場合はエラーを返す', async () => {
			const path = Path.create(['Project']);
			const parseError = new TaskParseError(10, 'Parse failed');
			const repository = createMockTaskRepository({
				findByPath: vi.fn().mockResolvedValue(err(parseError)),
			});

			const useCase = new GetTasksUseCase(repository);
			const result = await useCase.executeByPath(path);

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe(parseError);
		});
	});
});
