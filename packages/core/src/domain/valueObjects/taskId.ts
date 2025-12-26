import { createHash } from 'node:crypto';
import type { Path } from './path';

/**
 * タスクID値オブジェクト
 *
 * path + title からSHA-256ハッシュを計算し、先頭12文字を使用
 * これにより以下の問題を解決:
 * - 同じpath/titleでのIDコリジョン: ハッシュは決定論的なので同一入力は同一ID
 * - タイトルに::が含まれる場合: デリミタに依存しないため問題なし
 * - 重複検出: IDを直接比較可能（ナイーブなsplitが不要）
 */
export class TaskId {
	private constructor(private readonly value: string) {}

	/**
	 * path + titleからTaskIdを生成
	 */
	static generate(path: Path, title: string): TaskId {
		const input = `${path.toString()}::${title}`;
		const hash = createHash('sha256').update(input).digest('hex');
		return new TaskId(hash.substring(0, 12));
	}

	/**
	 * 既存のID文字列からTaskIdを復元
	 */
	static fromString(id: string): TaskId {
		return new TaskId(id);
	}

	toString(): string {
		return this.value;
	}

	equals(other: TaskId): boolean {
		return this.value === other.value;
	}
}

/**
 * タスクIDを生成するヘルパー関数
 */
export function generateTaskId(path: Path, title: string): string {
	return TaskId.generate(path, title).toString();
}
