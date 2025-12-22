import { err, ok, type Result } from 'neverthrow';
import { InvalidStatusError } from '../errors/invalidStatusError';

/**
 * ステータス値オブジェクト
 * タスクの状態を表現する（todo, in-progress, done など）
 */
export class Status {
	private constructor(private readonly _value: string) {}

	/**
	 * ステータスを作成する
	 * @param value ステータス値
	 * @returns Result<Status, InvalidStatusError>
	 */
	static create(value: string): Result<Status, InvalidStatusError> {
		const trimmed = value.trim().toLowerCase();

		if (trimmed === '') {
			return err(new InvalidStatusError(value));
		}

		return ok(new Status(trimmed));
	}

	/**
	 * ステータスの値を取得する
	 */
	get value(): string {
		return this._value;
	}

	/**
	 * 他のステータスと等しいかどうか
	 */
	equals(other: Status): boolean {
		return this._value === other._value;
	}

	/**
	 * 完了状態かどうかを判定する
	 * @param doneStatuses 完了扱いとするステータスのリスト
	 */
	isDone(doneStatuses: string[]): boolean {
		return doneStatuses.includes(this._value);
	}

	/**
	 * 文字列表現を取得する
	 */
	toString(): string {
		return this._value;
	}
}
