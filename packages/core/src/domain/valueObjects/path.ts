/**
 * パス値オブジェクト
 * Markdownの見出し階層を表現する
 */
export class Path {
	private static readonly SEPARATOR = ' / ';
	private static readonly ROOT_LABEL = '（ルート）';

	private constructor(private readonly _segments: readonly string[]) {}

	/**
	 * セグメント配列からPathを作成する
	 */
	static create(segments: string[]): Path {
		return new Path([...segments]);
	}

	/**
	 * 文字列からPathを作成する
	 * @param pathString パス文字列（例: "仕事 / プロジェクトA"）
	 */
	static fromString(pathString: string): Path {
		if (pathString.trim() === '') {
			return new Path([]);
		}

		const segments = pathString
			.split('/')
			.map((s) => s.trim())
			.filter((s) => s !== '');

		return new Path(segments);
	}

	/**
	 * セグメント配列を取得する
	 */
	get segments(): readonly string[] {
		return this._segments;
	}

	/**
	 * ルートパスかどうか
	 */
	isRoot(): boolean {
		return this._segments.length === 0;
	}

	/**
	 * パスの深さ（セグメント数）を取得する
	 */
	depth(): number {
		return this._segments.length;
	}

	/**
	 * 親パスを取得する
	 */
	parent(): Path {
		if (this.isRoot()) {
			return this;
		}
		return new Path(this._segments.slice(0, -1));
	}

	/**
	 * 子パスを作成する
	 */
	child(segment: string): Path {
		return new Path([...this._segments, segment]);
	}

	/**
	 * 他のパスと等しいかどうか
	 */
	equals(other: Path): boolean {
		if (this._segments.length !== other._segments.length) {
			return false;
		}
		return this._segments.every((segment, index) => segment === other._segments[index]);
	}

	/**
	 * 指定したパスで始まるかどうか
	 */
	startsWith(prefix: Path): boolean {
		if (prefix._segments.length > this._segments.length) {
			return false;
		}
		return prefix._segments.every((segment, index) => segment === this._segments[index]);
	}

	/**
	 * 文字列表現を取得する
	 */
	toString(): string {
		if (this.isRoot()) {
			return Path.ROOT_LABEL;
		}
		return this._segments.join(Path.SEPARATOR);
	}

	/**
	 * 最後のセグメントを取得する
	 */
	last(): string | undefined {
		return this._segments[this._segments.length - 1];
	}
}
