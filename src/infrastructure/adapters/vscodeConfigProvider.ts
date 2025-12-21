import {
	type ConfigProvider,
	DEFAULT_CONFIG,
	type KanbanConfig,
} from '../../domain/ports/configProvider';
import type { VscodeConfigClient } from '../clients/vscodeConfigClient';

/**
 * VscodeConfigProvider
 * ConfigProviderポートのVSCode設定実装
 */
export class VscodeConfigProvider implements ConfigProvider {
	constructor(private readonly configClient: VscodeConfigClient) {}

	/**
	 * 設定を取得する
	 */
	async getConfig(): Promise<KanbanConfig> {
		const allSettings = this.configClient.getAll();

		return {
			statuses: this.resolveArray(allSettings.statuses, DEFAULT_CONFIG.statuses),
			doneStatuses: this.resolveArray(allSettings.doneStatuses, DEFAULT_CONFIG.doneStatuses),
			defaultStatus: this.resolveString(allSettings.defaultStatus, DEFAULT_CONFIG.defaultStatus),
			defaultDoneStatus: this.resolveString(
				allSettings.defaultDoneStatus,
				DEFAULT_CONFIG.defaultDoneStatus,
			),
			sortBy: this.resolveSortBy(allSettings.sortBy),
			syncCheckboxWithDone: this.resolveBoolean(
				allSettings.syncCheckboxWithDone,
				DEFAULT_CONFIG.syncCheckboxWithDone,
			),
		};
	}

	/**
	 * 特定の設定項目を取得する
	 */
	async get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]> {
		const config = await this.getConfig();
		return config[key];
	}

	private resolveArray(value: unknown, defaultValue: string[]): string[] {
		if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
			return value;
		}
		return defaultValue;
	}

	private resolveString(value: unknown, defaultValue: string): string {
		if (typeof value === 'string' && value.trim() !== '') {
			return value;
		}
		return defaultValue;
	}

	private resolveBoolean(value: unknown, defaultValue: boolean): boolean {
		if (typeof value === 'boolean') {
			return value;
		}
		return defaultValue;
	}

	private resolveSortBy(value: unknown): KanbanConfig['sortBy'] {
		const validValues: KanbanConfig['sortBy'][] = ['markdown', 'priority', 'due', 'alphabetical'];
		if (typeof value === 'string' && validValues.includes(value as KanbanConfig['sortBy'])) {
			return value as KanbanConfig['sortBy'];
		}
		return DEFAULT_CONFIG.sortBy;
	}
}
