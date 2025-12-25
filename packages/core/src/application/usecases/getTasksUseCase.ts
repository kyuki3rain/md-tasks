import type { Result } from 'neverthrow';
import type { Task } from '../../domain/entities/task';
import type { DocumentOperationError } from '../../domain/errors/documentOperationError';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
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
	async execute(): Promise<
		Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>
	> {
		return this.taskRepository.findAll();
	}

	/**
	 * 指定したパス配下のタスクを取得する
	 */
	async executeByPath(
		path: Path,
	): Promise<Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>> {
		return this.taskRepository.findByPath(path);
	}
}
