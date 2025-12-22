import type { Path } from '../valueObjects/path';
import type { Status } from '../valueObjects/status';

/**
 * タスクのメタデータ
 */
export type TaskMetadata = Record<string, string>;

/**
 * タスク作成時のプロパティ
 */
export interface TaskProps {
	id: string;
	title: string;
	status: Status;
	path: Path;
	isChecked: boolean;
	metadata: TaskMetadata;
}

/**
 * タスクエンティティ
 * Markdownのチェックボックスを表現する
 */
export class Task {
	private constructor(
		private readonly _id: string,
		private readonly _title: string,
		private readonly _status: Status,
		private readonly _path: Path,
		private readonly _isChecked: boolean,
		private readonly _metadata: TaskMetadata,
	) {}

	/**
	 * タスクを作成する
	 */
	static create(props: TaskProps): Task {
		return new Task(props.id, props.title, props.status, props.path, props.isChecked, {
			...props.metadata,
		});
	}

	get id(): string {
		return this._id;
	}

	get title(): string {
		return this._title;
	}

	get status(): Status {
		return this._status;
	}

	get path(): Path {
		return this._path;
	}

	get isChecked(): boolean {
		return this._isChecked;
	}

	get metadata(): TaskMetadata {
		return { ...this._metadata };
	}

	/**
	 * ステータスを更新する
	 * @param newStatus 新しいステータス
	 * @param doneStatuses 完了扱いとするステータスのリスト（チェックボックス連動用）
	 */
	updateStatus(newStatus: Status, doneStatuses?: string[]): Task {
		let newIsChecked = this._isChecked;

		if (doneStatuses) {
			newIsChecked = newStatus.isDone(doneStatuses);
		}

		return new Task(this._id, this._title, newStatus, this._path, newIsChecked, {
			...this._metadata,
		});
	}

	/**
	 * タイトルを更新する
	 */
	updateTitle(newTitle: string): Task {
		return new Task(this._id, newTitle, this._status, this._path, this._isChecked, {
			...this._metadata,
		});
	}

	/**
	 * パスを更新する
	 */
	updatePath(newPath: Path): Task {
		return new Task(this._id, this._title, this._status, newPath, this._isChecked, {
			...this._metadata,
		});
	}

	/**
	 * メタデータを更新する
	 */
	updateMetadata(newMetadata: TaskMetadata): Task {
		return new Task(this._id, this._title, this._status, this._path, this._isChecked, {
			...newMetadata,
		});
	}

	/**
	 * チェック状態をトグルする
	 */
	toggleCheck(): Task {
		return new Task(this._id, this._title, this._status, this._path, !this._isChecked, {
			...this._metadata,
		});
	}

	/**
	 * 完了状態かどうか
	 */
	isDone(doneStatuses: string[]): boolean {
		return this._status.isDone(doneStatuses);
	}

	/**
	 * 他のタスクと同一かどうか（IDで判定）
	 */
	equals(other: Task): boolean {
		return this._id === other._id;
	}
}
