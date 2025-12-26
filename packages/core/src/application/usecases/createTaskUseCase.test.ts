import { ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { generateTaskId } from '../../domain/valueObjects/taskId';
import { CreateTaskUseCase } from './createTaskUseCase';

describe('CreateTaskUseCase', () => {
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

	describe('execute', () => {
		it('新しいタスクを作成できる', async () => {
			const path = Path.create(['Project', 'Feature A']);
			const title = 'New Task';
			const expectedId = generateTaskId(path, title);

			const savedTask = Task.create({
				id: expectedId,
				title,
				status: Status.create('todo')._unsafeUnwrap(),
				path,
				isChecked: false,
				metadata: {},
			});

			const repository = createMockTaskRepository({
				save: vi.fn().mockResolvedValue(ok(savedTask)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new CreateTaskUseCase(repository, configProvider);
			const result = await useCase.execute({ title, path });

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.title).toBe(title);
			expect(task.path.equals(path)).toBe(true);
			expect(repository.save).toHaveBeenCalled();

			// saveに渡されたタスクのIDが正しい形式か確認
			const saveCall = (repository.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as Task;
			expect(saveCall.id).toBe(expectedId);
		});

		it('ステータスを指定してタスクを作成できる', async () => {
			const path = Path.create(['Project']);
			const title = 'Task with status';
			const status = Status.create('in-progress')._unsafeUnwrap();

			const savedTask = Task.create({
				id: generateTaskId(path, title),
				title,
				status,
				path,
				isChecked: false,
				metadata: {},
			});

			const repository = createMockTaskRepository({
				save: vi.fn().mockResolvedValue(ok(savedTask)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new CreateTaskUseCase(repository, configProvider);
			const result = await useCase.execute({ title, path, status });

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.status.value).toBe('in-progress');
		});

		it('ステータス未指定の場合はデフォルトステータスが使用される', async () => {
			const path = Path.create(['Project']);
			const title = 'Task without status';

			const savedTask = Task.create({
				id: generateTaskId(path, title),
				title,
				status: Status.create('todo')._unsafeUnwrap(),
				path,
				isChecked: false,
				metadata: {},
			});

			const repository = createMockTaskRepository({
				save: vi.fn().mockResolvedValue(ok(savedTask)),
			});
			const configProvider = createMockConfigProvider({
				getConfig: vi.fn().mockResolvedValue({
					...DEFAULT_CONFIG,
					defaultStatus: 'todo',
				}),
			});

			const useCase = new CreateTaskUseCase(repository, configProvider);
			const result = await useCase.execute({ title, path });

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.status.value).toBe('todo');
		});

		it('メタデータを指定してタスクを作成できる', async () => {
			const path = Path.create(['Project']);
			const title = 'Task with metadata';
			const metadata = { priority: 'high', assignee: 'alice' };

			const savedTask = Task.create({
				id: generateTaskId(path, title),
				title,
				status: Status.create('todo')._unsafeUnwrap(),
				path,
				isChecked: false,
				metadata,
			});

			const repository = createMockTaskRepository({
				save: vi.fn().mockResolvedValue(ok(savedTask)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new CreateTaskUseCase(repository, configProvider);
			const result = await useCase.execute({ title, path, metadata });

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.metadata).toEqual(metadata);
		});
	});
});
