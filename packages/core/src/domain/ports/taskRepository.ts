import type { Result } from 'neverthrow';
import type { Task } from '../entities/task';
import type { DocumentOperationError } from '../errors/documentOperationError';
import type { NoActiveEditorError } from '../errors/noActiveEditorError';
import type { TaskNotFoundError } from '../errors/taskNotFoundError';
import type { TaskParseError } from '../errors/taskParseError';
import type { Path } from '../valueObjects/path';

/**
 * タスクリポジトリポート
 * タスクのCRUD操作を定義する
 */
export interface TaskRepository {
	/**
	 * 全タスクを取得する
	 */
	findAll(): Promise<Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>>;

	/**
	 * IDでタスクを取得する
	 */
	findById(
		id: string,
	): Promise<
		Result<Task, TaskNotFoundError | TaskParseError | NoActiveEditorError | DocumentOperationError>
	>;

	/**
	 * パスでタスクをフィルタリングして取得する
	 */
	findByPath(
		path: Path,
	): Promise<Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>>;

	/**
	 * タスクを保存する（作成または更新）
	 */
	save(task: Task): Promise<Result<Task, NoActiveEditorError | DocumentOperationError>>;

	/**
	 * タスクを削除する
	 */
	delete(
		id: string,
	): Promise<Result<void, TaskNotFoundError | NoActiveEditorError | DocumentOperationError>>;

	/**
	 * 利用可能なパス（見出し階層）を全て取得する
	 */
	getAvailablePaths(): Promise<
		Result<Path[], TaskParseError | NoActiveEditorError | DocumentOperationError>
	>;
}
