import {
	type ConfigProvider,
	DEFAULT_CONFIG,
	type KanbanConfig,
} from '../../domain/ports/configProvider';
import type { FrontmatterConfig, MarkdownTaskClient } from '../clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';

/**
 * FrontmatterConfigProvider
 * ConfigProviderポートのフロントマター実装
 * フロントマター → フォールバックプロバイダ → デフォルト の優先順位で設定を解決
 */
export class FrontmatterConfigProvider implements ConfigProvider {
	constructor(
		private readonly markdownClient: MarkdownTaskClient,
		private readonly documentClient: VscodeDocumentClient,
		private readonly fallbackProvider?: ConfigProvider,
	) {}

	/**
	 * 設定を取得する
	 */
	async getConfig(): Promise<KanbanConfig> {
		const frontmatterConfig = this.getFrontmatterConfig();
		const fallbackConfig = await this.getFallbackConfig();

		return {
			statuses: this.resolveArray(frontmatterConfig?.statuses, fallbackConfig.statuses),
			doneStatuses: this.resolveArray(frontmatterConfig?.doneStatuses, fallbackConfig.doneStatuses),
			defaultStatus: this.resolveString(
				frontmatterConfig?.defaultStatus,
				fallbackConfig.defaultStatus,
			),
			defaultDoneStatus: this.resolveString(
				frontmatterConfig?.defaultDoneStatus,
				fallbackConfig.defaultDoneStatus,
			),
			sortBy: this.resolveSortBy(frontmatterConfig?.sortBy, fallbackConfig.sortBy),
			syncCheckboxWithDone: this.resolveBoolean(
				frontmatterConfig?.syncCheckboxWithDone,
				fallbackConfig.syncCheckboxWithDone,
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

	private getFrontmatterConfig(): FrontmatterConfig | undefined {
		const textResult = this.documentClient.getActiveDocumentText();
		if (textResult.isErr()) {
			return undefined;
		}

		const parseResult = this.markdownClient.parse(textResult.value);
		if (parseResult.isErr()) {
			return undefined;
		}

		return parseResult.value.config;
	}

	private async getFallbackConfig(): Promise<KanbanConfig> {
		if (this.fallbackProvider) {
			return this.fallbackProvider.getConfig();
		}
		return DEFAULT_CONFIG;
	}

	private resolveArray(frontmatterValue: string[] | undefined, fallbackValue: string[]): string[] {
		if (Array.isArray(frontmatterValue) && frontmatterValue.length > 0) {
			return frontmatterValue;
		}
		return fallbackValue;
	}

	private resolveString(frontmatterValue: string | undefined, fallbackValue: string): string {
		if (typeof frontmatterValue === 'string' && frontmatterValue.trim() !== '') {
			return frontmatterValue;
		}
		return fallbackValue;
	}

	private resolveBoolean(frontmatterValue: boolean | undefined, fallbackValue: boolean): boolean {
		if (typeof frontmatterValue === 'boolean') {
			return frontmatterValue;
		}
		return fallbackValue;
	}

	private resolveSortBy(
		frontmatterValue: string | undefined,
		fallbackValue: KanbanConfig['sortBy'],
	): KanbanConfig['sortBy'] {
		const validValues: KanbanConfig['sortBy'][] = ['markdown', 'priority', 'due', 'alphabetical'];
		if (
			typeof frontmatterValue === 'string' &&
			validValues.includes(frontmatterValue as KanbanConfig['sortBy'])
		) {
			return frontmatterValue as KanbanConfig['sortBy'];
		}
		return fallbackValue;
	}
}
