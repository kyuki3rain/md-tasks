/**
 * カンバン設定
 */
export interface KanbanConfig {
	/**
	 * ステータス一覧（カラムの表示順）
	 */
	statuses: string[];

	/**
	 * 完了扱いとするステータス
	 */
	doneStatuses: string[];

	/**
	 * デフォルトステータス（[ ] の時、status未指定時に使用）
	 */
	defaultStatus: string;

	/**
	 * デフォルト完了ステータス（[x] の時、status未指定時に使用）
	 */
	defaultDoneStatus: string;

	/**
	 * ソート順
	 */
	sortBy: 'markdown' | 'priority' | 'due' | 'alphabetical';

	/**
	 * Done時にチェックボックスも連動させるか
	 */
	syncCheckboxWithDone: boolean;
}

/**
 * デフォルト設定値
 */
export const DEFAULT_CONFIG: KanbanConfig = {
	statuses: ['todo', 'in-progress', 'done'],
	doneStatuses: ['done'],
	defaultStatus: 'todo',
	defaultDoneStatus: 'done',
	sortBy: 'markdown',
	syncCheckboxWithDone: true,
};

/**
 * 設定プロバイダポート
 * 設定の取得を定義する
 */
export interface ConfigProvider {
	/**
	 * 設定を取得する
	 * フロントマター → VSCode設定 → デフォルト の優先順位で解決する
	 */
	getConfig(): Promise<KanbanConfig>;

	/**
	 * 特定の設定項目を取得する
	 */
	get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]>;
}
