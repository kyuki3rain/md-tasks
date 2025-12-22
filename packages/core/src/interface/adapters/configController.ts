import type { GetConfigUseCase } from '../../application/usecases';
import type { KanbanConfig } from '../../domain/ports/configProvider';

/**
 * ConfigController
 * 設定操作のエントリーポイント
 */
export class ConfigController {
	constructor(private readonly getConfigUseCase: GetConfigUseCase) {}

	/**
	 * 設定を取得する
	 */
	async getConfig(): Promise<KanbanConfig> {
		return this.getConfigUseCase.execute();
	}

	/**
	 * 特定の設定項目を取得する
	 */
	async get<K extends keyof KanbanConfig>(key: K): Promise<KanbanConfig[K]> {
		return this.getConfigUseCase.get(key);
	}
}
