import type { Result } from 'neverthrow';
import { Task, type TaskMetadata } from '../../domain/entities/task';
import type { DocumentOperationError } from '../../domain/errors/documentOperationError';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { generateTaskId } from '../../domain/valueObjects/taskId';

/**
 * タスク作成の入力
 */
export interface CreateTaskInput {
	title: string;
	path: Path;
	status?: Status;
	metadata?: TaskMetadata;
}

/**
 * タスク作成ユースケース
 */
export class CreateTaskUseCase {
	constructor(
		private readonly taskRepository: TaskRepository,
		private readonly configProvider: ConfigProvider,
	) {}

	/**
	 * 新しいタスクを作成する
	 */
	async execute(
		input: CreateTaskInput,
	): Promise<Result<Task, NoActiveEditorError | DocumentOperationError>> {
		const config = await this.configProvider.getConfig();

		// ステータスが指定されていない場合はデフォルトステータスを使用
		const status = input.status ?? Status.create(config.defaultStatus)._unsafeUnwrap();

		// IDを生成（パス + タイトルのハッシュ）
		const id = generateTaskId(input.path, input.title);

		// タスクを作成
		const task = Task.create({
			id,
			title: input.title,
			status,
			path: input.path,
			isChecked: false,
			metadata: input.metadata ?? {},
		});

		// リポジトリに保存
		return this.taskRepository.save(task);
	}
}
