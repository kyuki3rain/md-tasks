import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { DeleteTaskUseCase } from './deleteTaskUseCase';

describe('DeleteTaskUseCase', () => {
	const createMockTaskRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPath: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		getAvailablePaths: vi.fn(),
		...overrides,
	});

	describe('execute', () => {
		it('タスクを削除できる', async () => {
			const repository = createMockTaskRepository({
				delete: vi.fn().mockResolvedValue(ok(undefined)),
			});

			const useCase = new DeleteTaskUseCase(repository);
			const result = await useCase.execute('task-1');

			expect(result.isOk()).toBe(true);
			expect(repository.delete).toHaveBeenCalledWith('task-1');
		});

		it('存在しないタスクを削除しようとするとエラーを返す', async () => {
			const notFoundError = new TaskNotFoundError('non-existent');
			const repository = createMockTaskRepository({
				delete: vi.fn().mockResolvedValue(err(notFoundError)),
			});

			const useCase = new DeleteTaskUseCase(repository);
			const result = await useCase.execute('non-existent');

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBeInstanceOf(TaskNotFoundError);
		});
	});
});
