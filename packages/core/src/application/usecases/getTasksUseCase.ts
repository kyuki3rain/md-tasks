import type { Result } from 'neverthrow';
import type { Task } from '../../domain/entities/task';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';

/**
 * タスク一覧取得ユースケース
 */
export class GetTasksUseCase {
	constructor(private readonly taskRepository: TaskRepository) {}

	/**
	 * 全タスクを取得する
	 */
	async execute(): Promise<Result<Task[], TaskParseError>> {
		return this.taskRepository.findAll();
	}

	/**
	 * 指定したパス配下のタスクを取得する
	 */
	async executeByPath(path: Path): Promise<Result<Task[], TaskParseError>> {
		return this.taskRepository.findByPath(path);
	}
}
