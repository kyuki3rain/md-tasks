import { describe, expect, it, vi } from 'vitest';
import type { ConfigProvider, KanbanConfig } from '../../domain/ports/configProvider';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import { GetConfigUseCase } from './getConfigUseCase';

describe('GetConfigUseCase', () => {
	const createMockConfigProvider = (overrides: Partial<ConfigProvider> = {}): ConfigProvider => ({
		getConfig: vi.fn().mockResolvedValue(DEFAULT_CONFIG),
		get: vi.fn(),
		...overrides,
	});

	describe('execute', () => {
		it('設定を取得できる', async () => {
			const configProvider = createMockConfigProvider();

			const useCase = new GetConfigUseCase(configProvider);
			const result = await useCase.execute();

			expect(result).toEqual(DEFAULT_CONFIG);
		});

		it('カスタム設定を取得できる', async () => {
			const customConfig: KanbanConfig = {
				statuses: ['backlog', 'doing', 'review', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'backlog',
				defaultDoneStatus: 'done',
				sortBy: 'priority',
				syncCheckboxWithDone: false,
			};

			const configProvider = createMockConfigProvider({
				getConfig: vi.fn().mockResolvedValue(customConfig),
			});

			const useCase = new GetConfigUseCase(configProvider);
			const result = await useCase.execute();

			expect(result).toEqual(customConfig);
			expect(result.statuses).toEqual(['backlog', 'doing', 'review', 'done']);
		});
	});

	describe('get', () => {
		it('特定の設定項目を取得できる', async () => {
			const configProvider = createMockConfigProvider({
				get: vi.fn().mockResolvedValue(['todo', 'in-progress', 'done']),
			});

			const useCase = new GetConfigUseCase(configProvider);
			const result = await useCase.get('statuses');

			expect(result).toEqual(['todo', 'in-progress', 'done']);
			expect(configProvider.get).toHaveBeenCalledWith('statuses');
		});

		it('doneStatusesを取得できる', async () => {
			const configProvider = createMockConfigProvider({
				get: vi.fn().mockResolvedValue(['done', 'completed']),
			});

			const useCase = new GetConfigUseCase(configProvider);
			const result = await useCase.get('doneStatuses');

			expect(result).toEqual(['done', 'completed']);
		});
	});
});
