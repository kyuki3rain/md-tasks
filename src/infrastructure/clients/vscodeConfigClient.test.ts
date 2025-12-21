import { describe, expect, it, vi } from 'vitest';
import { VscodeConfigClient, type VscodeConfigDeps } from './vscodeConfigClient';

const createMockDeps = (configValues: Record<string, unknown> = {}): VscodeConfigDeps => ({
	getConfiguration: vi.fn().mockReturnValue({
		get: vi.fn().mockImplementation((key: string, defaultValue?: unknown) => {
			return key in configValues ? configValues[key] : defaultValue;
		}),
	}),
});

describe('VscodeConfigClient', () => {
	describe('get', () => {
		it('設定値を取得する', () => {
			const deps = createMockDeps({
				statuses: ['todo', 'in-progress', 'done'],
			});
			const client = new VscodeConfigClient(deps);

			const result = client.get<string[]>('statuses');

			expect(result).toEqual(['todo', 'in-progress', 'done']);
		});

		it('設定値が存在しない場合はundefinedを返す', () => {
			const deps = createMockDeps({});
			const client = new VscodeConfigClient(deps);

			const result = client.get<string[]>('nonexistent');

			expect(result).toBeUndefined();
		});
	});

	describe('getWithDefault', () => {
		it('設定値を取得する', () => {
			const deps = createMockDeps({
				statuses: ['custom-status'],
			});
			const client = new VscodeConfigClient(deps);

			const result = client.getWithDefault('statuses', ['todo']);

			expect(result).toEqual(['custom-status']);
		});

		it('設定値が存在しない場合はデフォルト値を返す', () => {
			const deps = createMockDeps({});
			const client = new VscodeConfigClient(deps);

			const result = client.getWithDefault('statuses', ['default']);

			expect(result).toEqual(['default']);
		});
	});

	describe('getAll', () => {
		it('全ての設定を取得する', () => {
			const deps = createMockDeps({
				statuses: ['todo', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'todo',
				defaultDoneStatus: 'done',
				sortBy: 'markdown',
				syncCheckboxWithDone: true,
			});
			const client = new VscodeConfigClient(deps);

			const result = client.getAll();

			expect(result).toEqual({
				statuses: ['todo', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'todo',
				defaultDoneStatus: 'done',
				sortBy: 'markdown',
				syncCheckboxWithDone: true,
			});
		});

		it('未設定の項目はundefinedになる', () => {
			const deps = createMockDeps({
				statuses: ['todo'],
			});
			const client = new VscodeConfigClient(deps);

			const result = client.getAll();

			expect(result.statuses).toEqual(['todo']);
			expect(result.doneStatuses).toBeUndefined();
		});
	});
});
