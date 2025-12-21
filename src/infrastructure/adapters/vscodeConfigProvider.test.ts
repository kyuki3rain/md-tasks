import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import type { VscodeConfigClient } from '../clients/vscodeConfigClient';
import { VscodeConfigProvider } from './vscodeConfigProvider';

const createMockConfigClient = (allSettings: Record<string, unknown> = {}): VscodeConfigClient =>
	({
		getAll: vi.fn().mockReturnValue(allSettings),
		get: vi.fn().mockImplementation((key: string) => allSettings[key]),
		getWithDefault: vi
			.fn()
			.mockImplementation((key: string, defaultValue: unknown) =>
				key in allSettings ? allSettings[key] : defaultValue,
			),
	}) as unknown as VscodeConfigClient;

describe('VscodeConfigProvider', () => {
	describe('getConfig', () => {
		it('VSCode設定から値を取得する', async () => {
			const configClient = createMockConfigClient({
				statuses: ['backlog', 'wip', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'backlog',
				defaultDoneStatus: 'done',
				sortBy: 'priority',
				syncCheckboxWithDone: false,
			});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.getConfig();

			expect(result).toEqual({
				statuses: ['backlog', 'wip', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'backlog',
				defaultDoneStatus: 'done',
				sortBy: 'priority',
				syncCheckboxWithDone: false,
			});
		});

		it('設定が未定義の場合はデフォルト値を使用する', async () => {
			const configClient = createMockConfigClient({});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.getConfig();

			expect(result).toEqual(DEFAULT_CONFIG);
		});

		it('一部の設定のみカスタマイズされている場合', async () => {
			const configClient = createMockConfigClient({
				statuses: ['custom-todo', 'custom-done'],
			});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.getConfig();

			expect(result.statuses).toEqual(['custom-todo', 'custom-done']);
			expect(result.doneStatuses).toEqual(DEFAULT_CONFIG.doneStatuses);
			expect(result.defaultStatus).toBe(DEFAULT_CONFIG.defaultStatus);
		});

		it('無効なsortBy値はデフォルトにフォールバック', async () => {
			const configClient = createMockConfigClient({
				sortBy: 'invalid-sort',
			});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.getConfig();

			expect(result.sortBy).toBe(DEFAULT_CONFIG.sortBy);
		});

		it('空文字列はデフォルト値にフォールバック', async () => {
			const configClient = createMockConfigClient({
				defaultStatus: '',
			});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.getConfig();

			expect(result.defaultStatus).toBe(DEFAULT_CONFIG.defaultStatus);
		});
	});

	describe('get', () => {
		it('特定の設定項目を取得する', async () => {
			const configClient = createMockConfigClient({
				statuses: ['custom'],
			});
			const provider = new VscodeConfigProvider(configClient);

			const result = await provider.get('statuses');

			expect(result).toEqual(['custom']);
		});
	});
});
