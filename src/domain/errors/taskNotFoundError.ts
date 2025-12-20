/**
 * タスクが見つからない場合のエラー
 */
export class TaskNotFoundError extends Error {
	readonly _tag = 'TaskNotFoundError';

	constructor(public readonly taskId: string) {
		super(`Task not found: ${taskId}`);
		this.name = 'TaskNotFoundError';
	}
}
