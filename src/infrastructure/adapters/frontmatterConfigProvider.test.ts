import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigProvider, KanbanConfig } from '../../domain/ports/configProvider';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import type { MarkdownTaskClient, ParseResult } from '../clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';
import { DocumentNotFoundError } from '../clients/vscodeDocumentClient';
import { FrontmatterConfigProvider } from './frontmatterConfigProvider';

const createMockMarkdownClient = (config?: ParseResult['config']): MarkdownTaskClient =>
	({
		parse: vi.fn().mockReturnValue(
			ok({
				tasks: [],
				headings: [],
				warnings: [],
				config,
			} satisfies ParseResult),
		),
	}) as unknown as MarkdownTaskClient;

const createMockDocumentClient = (text?: string): VscodeDocumentClient =>
	({
		getActiveDocumentText: vi
			.fn()
			.mockReturnValue(text !== undefined ? ok(text) : err(new DocumentNotFoundError())),
	}) as unknown as VscodeDocumentClient;

const createMockFallbackProvider = (config: KanbanConfig): ConfigProvider => ({
	getConfig: vi.fn().mockResolvedValue(config),
	get: vi.fn().mockImplementation(async <K extends keyof KanbanConfig>(key: K) => config[key]),
});

describe('FrontmatterConfigProvider', () => {
	describe('getConfig', () => {
		it('フロントマターから設定を取得する', async () => {
			const markdownClient = createMockMarkdownClient({
				statuses: ['backlog', 'doing', 'done'],
				doneStatuses: ['done'],
				defaultStatus: 'backlog',
				defaultDoneStatus: 'done',
				sortBy: 'priority',
				syncCheckboxWithDone: false,
			});
			const documentClient = createMockDocumentClient(
				'---\nkanban:\n  statuses: [backlog, doing, done]\n---',
			);
			const provider = new FrontmatterConfigProvider(markdownClient, documentClient);

			const result = await provider.getConfig();

			expect(result.statuses).toEqual(['backlog', 'doing', 'done']);
			expect(result.sortBy).toBe('priority');
			expect(result.syncCheckboxWithDone).toBe(false);
		});

		it('フロントマターがない場合はデフォルト設定を使用する', async () => {
			const markdownClient = createMockMarkdownClient(undefined);
			const documentClient = createMockDocumentClient('# No frontmatter');
			const provider = new FrontmatterConfigProvider(markdownClient, documentClient);

			const result = await provider.getConfig();

			expect(result).toEqual(DEFAULT_CONFIG);
		});

		it('フロントマターの一部のみ設定されている場合はデフォルトにフォールバック', async () => {
			const markdownClient = createMockMarkdownClient({
				statuses: ['custom1', 'custom2'],
			});
			const documentClient = createMockDocumentClient(
				'---\nkanban:\n  statuses: [custom1, custom2]\n---',
			);
			const provider = new FrontmatterConfigProvider(markdownClient, documentClient);

			const result = await provider.getConfig();

			expect(result.statuses).toEqual(['custom1', 'custom2']);
			expect(result.doneStatuses).toEqual(DEFAULT_CONFIG.doneStatuses);
			expect(result.defaultStatus).toBe(DEFAULT_CONFIG.defaultStatus);
		});

		it('フォールバックプロバイダが設定されている場合はそれを使用する', async () => {
			const markdownClient = createMockMarkdownClient({
				statuses: ['from-frontmatter'],
			});
			const documentClient = createMockDocumentClient(
				'---\nkanban:\n  statuses: [from-frontmatter]\n---',
			);
			const fallbackConfig: KanbanConfig = {
				...DEFAULT_CONFIG,
				doneStatuses: ['completed'],
				defaultStatus: 'new',
			};
			const fallbackProvider = createMockFallbackProvider(fallbackConfig);
			const provider = new FrontmatterConfigProvider(
				markdownClient,
				documentClient,
				fallbackProvider,
			);

			const result = await provider.getConfig();

			expect(result.statuses).toEqual(['from-frontmatter']);
			expect(result.doneStatuses).toEqual(['completed']);
			expect(result.defaultStatus).toBe('new');
		});

		it('ドキュメントがない場合はフォールバック設定を使用する', async () => {
			const markdownClient = createMockMarkdownClient();
			const documentClient = createMockDocumentClient(); // エラーを返す
			const fallbackConfig: KanbanConfig = {
				...DEFAULT_CONFIG,
				statuses: ['fallback-status'],
			};
			const fallbackProvider = createMockFallbackProvider(fallbackConfig);
			const provider = new FrontmatterConfigProvider(
				markdownClient,
				documentClient,
				fallbackProvider,
			);

			const result = await provider.getConfig();

			expect(result.statuses).toEqual(['fallback-status']);
		});

		it('無効なsortBy値はフォールバック値を使用する', async () => {
			const markdownClient = createMockMarkdownClient({
				sortBy: 'invalid-sort',
			});
			const documentClient = createMockDocumentClient('---\nkanban:\n  sortBy: invalid\n---');
			const provider = new FrontmatterConfigProvider(markdownClient, documentClient);

			const result = await provider.getConfig();

			expect(result.sortBy).toBe(DEFAULT_CONFIG.sortBy);
		});
	});

	describe('get', () => {
		it('特定の設定項目を取得する', async () => {
			const markdownClient = createMockMarkdownClient({
				statuses: ['custom'],
			});
			const documentClient = createMockDocumentClient('---\nkanban:\n  statuses: [custom]\n---');
			const provider = new FrontmatterConfigProvider(markdownClient, documentClient);

			const result = await provider.get('statuses');

			expect(result).toEqual(['custom']);
		});
	});
});
