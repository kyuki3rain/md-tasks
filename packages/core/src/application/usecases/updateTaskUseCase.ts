import type { Result } from 'neverthrow';
import type { Task, TaskMetadata } from '../../domain/entities/task';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';

/**
 * タスク更新の入力
 */
export interface UpdateTaskInput {
	id: string;
	title?: string;
	path?: Path;
	metadata?: TaskMetadata;
}

/**
 * タスク更新ユースケース
 */
export class UpdateTaskUseCase {
	constructor(private readonly taskRepository: TaskRepository) {}

	/**
	 * タスクを更新する
	 */
	async execute(
		input: UpdateTaskInput,
	): Promise<Result<Task, TaskNotFoundError | TaskParseError | NoActiveEditorError>> {
		// タスクを取得
		const findResult = await this.taskRepository.findById(input.id);
		if (findResult.isErr()) {
			return findResult;
		}

		let task = findResult.value;

		// タイトルを更新
		if (input.title !== undefined) {
			task = task.updateTitle(input.title);
		}

		// パスを更新
		if (input.path !== undefined) {
			task = task.updatePath(input.path);
		}

		// メタデータを更新
		if (input.metadata !== undefined) {
			task = task.updateMetadata(input.metadata);
		}

		// 保存
		return this.taskRepository.save(task);
	}
}
