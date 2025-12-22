import type { Result } from 'neverthrow';
import type { Task } from '../../domain/entities/task';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Status } from '../../domain/valueObjects/status';

/**
 * タスクステータス変更ユースケース
 */
export class ChangeTaskStatusUseCase {
	constructor(
		private readonly taskRepository: TaskRepository,
		private readonly configProvider: ConfigProvider,
	) {}

	/**
	 * タスクのステータスを変更する
	 */
	async execute(
		id: string,
		newStatus: Status,
	): Promise<Result<Task, TaskNotFoundError | TaskParseError>> {
		// 設定を取得
		const config = await this.configProvider.getConfig();

		// タスクを取得
		const findResult = await this.taskRepository.findById(id);
		if (findResult.isErr()) {
			return findResult;
		}

		const task = findResult.value;

		// ステータスを更新（チェックボックス連動の判定付き）
		const doneStatuses = config.syncCheckboxWithDone ? config.doneStatuses : undefined;
		const updatedTask = task.updateStatus(newStatus, doneStatuses);

		// 保存
		return this.taskRepository.save(updatedTask);
	}
}
