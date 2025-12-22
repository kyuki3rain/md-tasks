import type { Result } from 'neverthrow';
import { Task, type TaskMetadata } from '../../domain/entities/task';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';

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
	): Promise<Result<Task, TaskNotFoundError | NoActiveEditorError>> {
		const config = await this.configProvider.getConfig();

		// ステータスが指定されていない場合はデフォルトステータスを使用
		const status = input.status ?? Status.create(config.defaultStatus)._unsafeUnwrap();

		// IDを生成（パス + タイトル）
		const id = this.generateTaskId(input.path, input.title);

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

	/**
	 * タスクIDを生成する
	 */
	private generateTaskId(path: Path, title: string): string {
		const pathPart = path.segments.join('-').toLowerCase().replace(/\s+/g, '-');
		const titlePart = title.toLowerCase().replace(/\s+/g, '-');
		return pathPart ? `${pathPart}-${titlePart}` : titlePart;
	}
}
