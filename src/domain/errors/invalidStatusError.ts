/**
 * ステータスが無効な場合のエラー
 */
export class InvalidStatusError extends Error {
	readonly _tag = 'InvalidStatusError';

	constructor(
		public readonly invalidValue: string,
		message?: string,
	) {
		super(message ?? `Invalid status: "${invalidValue}" - status cannot be empty`);
		this.name = 'InvalidStatusError';
	}
}
