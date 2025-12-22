/**
 * タスクのパースに失敗した場合のエラー
 */
export class TaskParseError extends Error {
	readonly _tag = 'TaskParseError';

	constructor(
		public readonly lineNumber: number,
		public readonly reason: string,
	) {
		super(`Failed to parse task at line ${lineNumber}: ${reason}`);
		this.name = 'TaskParseError';
	}
}
