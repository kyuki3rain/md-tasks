import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetConfigUseCase } from '../../application/usecases';
import type { KanbanConfig } from '../../domain/ports/configProvider';
import { ConfigController } from './configController';

describe('ConfigController', () => {
	let mockGetConfigUseCase: GetConfigUseCase;
	let controller: ConfigController;

	const mockConfig: KanbanConfig = {
		statuses: ['todo', 'in-progress', 'done'],
		doneStatuses: ['done'],
		defaultStatus: 'todo',
		defaultDoneStatus: 'done',
		sortBy: 'markdown',
		syncCheckboxWithDone: true,
	};

	beforeEach(() => {
		mockGetConfigUseCase = {
			execute: vi.fn().mockResolvedValue(mockConfig),
			get: vi.fn().mockImplementation((key: keyof KanbanConfig) => {
				return Promise.resolve(mockConfig[key]);
			}),
		} as unknown as GetConfigUseCase;

		controller = new ConfigController(mockGetConfigUseCase);
	});

	describe('getConfig', () => {
		it('設定を取得できる', async () => {
			const result = await controller.getConfig();

			expect(result).toEqual(mockConfig);
			expect(mockGetConfigUseCase.execute).toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('特定の設定項目を取得できる', async () => {
			const statuses = await controller.get('statuses');

			expect(statuses).toEqual(['todo', 'in-progress', 'done']);
			expect(mockGetConfigUseCase.get).toHaveBeenCalledWith('statuses');
		});

		it('doneStatusesを取得できる', async () => {
			const doneStatuses = await controller.get('doneStatuses');

			expect(doneStatuses).toEqual(['done']);
		});

		it('sortByを取得できる', async () => {
			const sortBy = await controller.get('sortBy');

			expect(sortBy).toBe('markdown');
		});
	});
});
