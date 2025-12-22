import { err, type Result } from 'neverthrow';
import type {
	ChangeTaskStatusUseCase,
	CreateTaskInput,
	CreateTaskUseCase,
	DeleteTaskUseCase,
	GetTasksUseCase,
	UpdateTaskInput,
	UpdateTaskUseCase,
} from '../../application/usecases';
import type { Task, TaskMetadata } from '../../domain/entities/task';
import type { InvalidStatusError } from '../../domain/errors/invalidStatusError';
import type { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import type { TaskDto } from '../types/messages';

/**
 * タスク作成リクエスト
 */
export interface CreateTaskDto {
	title: string;
	path: string[];
	status?: string;
	metadata?: TaskMetadata;
}

/**
 * タスク更新リクエスト
 */
export interface UpdateTaskDto {
	id: string;
	title?: string;
	path?: string[];
	metadata?: TaskMetadata;
}

/**
 * TaskController
 * タスク操作のエントリーポイント
 */
export class TaskController {
	constructor(
		private readonly getTasksUseCase: GetTasksUseCase,
		private readonly createTaskUseCase: CreateTaskUseCase,
		private readonly updateTaskUseCase: UpdateTaskUseCase,
		private readonly deleteTaskUseCase: DeleteTaskUseCase,
		private readonly changeTaskStatusUseCase: ChangeTaskStatusUseCase,
	) {}

	/**
	 * 全タスクを取得する
	 */
	async getTasks(): Promise<Result<TaskDto[], TaskParseError>> {
		const result = await this.getTasksUseCase.execute();
		return result.map((tasks) => tasks.map(this.toDto));
	}

	/**
	 * タスクを作成する
	 */
	async createTask(
		dto: CreateTaskDto,
	): Promise<Result<TaskDto, TaskNotFoundError | InvalidStatusError>> {
		// ステータスの変換
		let status: Status | undefined;
		if (dto.status !== undefined) {
			const statusResult = Status.create(dto.status);
			if (statusResult.isErr()) {
				return err(statusResult.error);
			}
			status = statusResult.value;
		}

		const input: CreateTaskInput = {
			title: dto.title,
			path: Path.create(dto.path),
			status,
			metadata: dto.metadata,
		};

		const result = await this.createTaskUseCase.execute(input);
		return result.map(this.toDto);
	}

	/**
	 * タスクを更新する
	 */
	async updateTask(
		dto: UpdateTaskDto,
	): Promise<Result<TaskDto, TaskNotFoundError | TaskParseError>> {
		const input: UpdateTaskInput = {
			id: dto.id,
			title: dto.title,
			path: dto.path ? Path.create(dto.path) : undefined,
			metadata: dto.metadata,
		};

		const result = await this.updateTaskUseCase.execute(input);
		return result.map(this.toDto);
	}

	/**
	 * タスクを削除する
	 */
	async deleteTask(id: string): Promise<Result<void, TaskNotFoundError>> {
		return this.deleteTaskUseCase.execute(id);
	}

	/**
	 * タスクのステータスを変更する
	 */
	async changeTaskStatus(
		id: string,
		newStatus: string,
	): Promise<Result<TaskDto, TaskNotFoundError | TaskParseError | InvalidStatusError>> {
		const statusResult = Status.create(newStatus);
		if (statusResult.isErr()) {
			return err(statusResult.error);
		}

		const result = await this.changeTaskStatusUseCase.execute(id, statusResult.value);
		return result.map(this.toDto);
	}

	/**
	 * TaskエンティティをDTOに変換する
	 */
	private toDto = (task: Task): TaskDto => {
		return {
			id: task.id,
			title: task.title,
			status: task.status.value,
			path: [...task.path.segments],
			isChecked: task.isChecked,
			metadata: task.metadata,
		};
	};
}
