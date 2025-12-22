import { err, type Result } from 'neverthrow';
import type { Task, TaskMetadata } from '../../domain/entities/task';
import type { InvalidStatusError } from '../../domain/errors/invalidStatusError';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';

/**
 * タスク更新の入力
 */
export interface UpdateTaskInput {
	id: string;
	title?: string;
	path?: Path;
	status?: string;
	metadata?: TaskMetadata;
}

/**
 * タスク更新ユースケース
 */
export class UpdateTaskUseCase {
	constructor(
		private readonly taskRepository: TaskRepository,
		private readonly configProvider: ConfigProvider,
	) {}

	/**
	 * タスクを更新する
	 */
	async execute(
		input: UpdateTaskInput,
	): Promise<
		Result<Task, TaskNotFoundError | TaskParseError | NoActiveEditorError | InvalidStatusError>
	> {
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

		// ステータスを更新
		if (input.status !== undefined) {
			const statusResult = Status.create(input.status);
			if (statusResult.isErr()) {
				return err(statusResult.error);
			}

			// 設定を取得（チェックボックス連動の判定用）
			const config = await this.configProvider.getConfig();
			const doneStatuses = config.syncCheckboxWithDone ? config.doneStatuses : undefined;
			task = task.updateStatus(statusResult.value, doneStatuses);
		}

		// メタデータを更新
		if (input.metadata !== undefined) {
			task = task.updateMetadata(input.metadata);
		}

		// 保存
		return this.taskRepository.save(task);
	}
}
