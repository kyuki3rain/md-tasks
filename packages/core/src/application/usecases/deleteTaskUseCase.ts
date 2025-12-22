import type { Result } from 'neverthrow';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskRepository } from '../../domain/ports/taskRepository';

/**
 * タスク削除ユースケース
 */
export class DeleteTaskUseCase {
	constructor(private readonly taskRepository: TaskRepository) {}

	/**
	 * タスクを削除する
	 */
	async execute(id: string): Promise<Result<void, TaskNotFoundError>> {
		return this.taskRepository.delete(id);
	}
}
