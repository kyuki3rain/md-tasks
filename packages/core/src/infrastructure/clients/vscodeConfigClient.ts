import type * as vscode from 'vscode';

/**
 * VSCode設定取得の依存性インターフェース
 * テスト時にモック可能にするため
 */
export interface VscodeConfigDeps {
	getConfiguration(section?: string): vscode.WorkspaceConfiguration;
}

/**
 * VscodeConfigClient
 * VSCode設定APIのラッパー
 */
export class VscodeConfigClient {
	private static readonly CONFIG_SECTION = 'mdTasks';

	constructor(private readonly deps: VscodeConfigDeps) {}

	/**
	 * 設定値を取得する
	 */
	get<T>(key: string): T | undefined {
		const config = this.deps.getConfiguration(VscodeConfigClient.CONFIG_SECTION);
		return config.get<T>(key);
	}

	/**
	 * 設定値を取得する（デフォルト値付き）
	 */
	getWithDefault<T>(key: string, defaultValue: T): T {
		const config = this.deps.getConfiguration(VscodeConfigClient.CONFIG_SECTION);
		return config.get<T>(key, defaultValue);
	}

	/**
	 * 全設定を取得する
	 */
	getAll(): Record<string, unknown> {
		const config = this.deps.getConfiguration(VscodeConfigClient.CONFIG_SECTION);
		return {
			statuses: config.get('statuses'),
			doneStatuses: config.get('doneStatuses'),
			defaultStatus: config.get('defaultStatus'),
			defaultDoneStatus: config.get('defaultDoneStatus'),
			sortBy: config.get('sortBy'),
			syncCheckboxWithDone: config.get('syncCheckboxWithDone'),
		};
	}
}
