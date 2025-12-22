import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { ChangeTaskStatusUseCase } from './changeTaskStatusUseCase';

describe('ChangeTaskStatusUseCase', () => {
	const createMockTaskRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPath: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		getAvailablePaths: vi.fn(),
		...overrides,
	});

	const createMockConfigProvider = (overrides: Partial<ConfigProvider> = {}): ConfigProvider => ({
		getConfig: vi.fn().mockResolvedValue(DEFAULT_CONFIG),
		get: vi.fn(),
		...overrides,
	});

	const createTask = (id: string, title: string, statusValue: string, isChecked = false): Task => {
		const status = Status.create(statusValue)._unsafeUnwrap();
		const path = Path.create(['Project']);
		return Task.create({
			id,
			title,
			status,
			path,
			isChecked,
			metadata: {},
		});
	};

	describe('execute', () => {
		it('タスクのステータスを変更できる', async () => {
			const existingTask = createTask('1', 'Task', 'todo', false);
			const newStatus = Status.create('in-progress')._unsafeUnwrap();

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockImplementation((task) => Promise.resolve(ok(task))),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);
			const result = await useCase.execute('1', newStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().status.value).toBe('in-progress');
		});

		it('ステータスをdoneに変更するとチェックボックスがtrueになる', async () => {
			const existingTask = createTask('1', 'Task', 'todo', false);
			const doneStatus = Status.create('done')._unsafeUnwrap();

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockImplementation((task) => Promise.resolve(ok(task))),
			});
			const configProvider = createMockConfigProvider({
				getConfig: vi.fn().mockResolvedValue({
					...DEFAULT_CONFIG,
					doneStatuses: ['done'],
					syncCheckboxWithDone: true,
				}),
			});

			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);
			const result = await useCase.execute('1', doneStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(true);
		});

		it('ステータスをdoneから別のステータスに変更するとチェックボックスがfalseになる', async () => {
			const existingTask = createTask('1', 'Task', 'done', true);
			const todoStatus = Status.create('todo')._unsafeUnwrap();

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockImplementation((task) => Promise.resolve(ok(task))),
			});
			const configProvider = createMockConfigProvider({
				getConfig: vi.fn().mockResolvedValue({
					...DEFAULT_CONFIG,
					doneStatuses: ['done'],
					syncCheckboxWithDone: true,
				}),
			});

			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);
			const result = await useCase.execute('1', todoStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(false);
		});

		it('syncCheckboxWithDoneがfalseの場合はチェックボックスを変更しない', async () => {
			const existingTask = createTask('1', 'Task', 'todo', false);
			const doneStatus = Status.create('done')._unsafeUnwrap();

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(ok(existingTask)),
				save: vi.fn().mockImplementation((task) => Promise.resolve(ok(task))),
			});
			const configProvider = createMockConfigProvider({
				getConfig: vi.fn().mockResolvedValue({
					...DEFAULT_CONFIG,
					doneStatuses: ['done'],
					syncCheckboxWithDone: false,
				}),
			});

			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);
			const result = await useCase.execute('1', doneStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(false);
		});

		it('存在しないタスクのステータスを変更しようとするとエラーを返す', async () => {
			const notFoundError = new TaskNotFoundError('non-existent');
			const newStatus = Status.create('in-progress')._unsafeUnwrap();

			const repository = createMockTaskRepository({
				findById: vi.fn().mockResolvedValue(err(notFoundError)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);
			const result = await useCase.execute('non-existent', newStatus);

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBeInstanceOf(TaskNotFoundError);
		});
	});
});
