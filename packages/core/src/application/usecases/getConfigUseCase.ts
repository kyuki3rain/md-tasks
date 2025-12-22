import type { ConfigProvider, KanbanConfig } from '../../domain/ports/configProvider';

/**
 * 設定取得ユースケース
 */
export class GetConfigUseCase {
	constructor(private readonly configProvider: ConfigProvider) {}

	/**
	 * 設定を取得する
	 */
	async execute(): Promise<KanbanConfig> {
		return this.configProvider.getConfig();
	}

	/**
	 * 特定の設定項目を取得する
	 */
	async get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]> {
		return this.configProvider.get(key);
	}
}
