import { ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import { TaskParseError } from '../../domain/errors/taskParseError';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import type { MarkdownTaskClient, ParseResult } from '../clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';
import { MarkdownTaskRepository } from './markdownTaskRepository';

// テスト用ヘルパー: 確実に成功するステータスを作成
const createStatus = (value: string): Status => {
	const result = Status.create(value);
	if (result.isErr()) {
		throw new Error(`Invalid status: ${value}`);
	}
	return result.value;
};

const createMockMarkdownTaskClient = (
	overrides: Partial<MarkdownTaskClient> = {},
): MarkdownTaskClient =>
	({
		parse: vi.fn().mockReturnValue(
			ok({
				tasks: [],
				headings: [],
				warnings: [],
			} satisfies ParseResult),
		),
		applyEdit: vi.fn().mockReturnValue(ok('# Test')),
		...overrides,
	}) as unknown as MarkdownTaskClient;

const createMockVscodeDocumentClient = (
	overrides: Partial<VscodeDocumentClient> = {},
): VscodeDocumentClient =>
	({
		getActiveDocumentText: vi.fn().mockReturnValue(ok('# Test')),
		getCurrentDocumentText: vi.fn().mockResolvedValue(ok('# Test')),
		replaceDocumentText: vi.fn().mockResolvedValue(ok(undefined)),
		...overrides,
	}) as unknown as VscodeDocumentClient;

const createMockTask = (overrides: Partial<Parameters<typeof Task.create>[0]> = {}): Task =>
	Task.create({
		id: 'Test::Task 1',
		title: 'Task 1',
		status: createStatus('todo'),
		path: Path.create(['Test']),
		isChecked: false,
		metadata: {},
		...overrides,
	});

describe('MarkdownTaskRepository', () => {
	describe('findAll', () => {
		it('全てのタスクを取得する', async () => {
			const parsedTasks = [
				{
					id: 'Test::Task 1',
					title: 'Task 1',
					status: createStatus('todo'),
					path: Path.create(['Test']),
					isChecked: false,
					metadata: {},
					startLine: 2,
					endLine: 3,
				},
				{
					id: 'Test::Task 2',
					title: 'Task 2',
					status: createStatus('done'),
					path: Path.create(['Test']),
					isChecked: true,
					metadata: {},
					startLine: 4,
					endLine: 5,
				},
			];

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: parsedTasks,
						headings: [],
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.findAll();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].title).toBe('Task 1');
				expect(result.value[1].title).toBe('Task 2');
			}
		});

		it('ドキュメントがない場合はエラーを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient();
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi.fn().mockResolvedValue({
					isErr: () => true,
					isOk: () => false,
					error: { message: 'No document' },
				}),
			});

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.findAll();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(TaskParseError);
			}
		});
	});

	describe('findById', () => {
		it('IDでタスクを取得する', async () => {
			const parsedTasks = [
				{
					id: 'Test::Task 1',
					title: 'Task 1',
					status: createStatus('todo'),
					path: Path.create(['Test']),
					isChecked: false,
					metadata: {},
					startLine: 2,
					endLine: 3,
				},
			];

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: parsedTasks,
						headings: [],
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.findById('Test::Task 1');

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.title).toBe('Task 1');
			}
		});

		it('タスクが見つからない場合はエラーを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [],
						headings: [],
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.findById('nonexistent');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(TaskNotFoundError);
			}
		});
	});

	describe('findByPath', () => {
		it('パスでタスクをフィルタリングする', async () => {
			const parsedTasks = [
				{
					id: 'Test::Task 1',
					title: 'Task 1',
					status: createStatus('todo'),
					path: Path.create(['Test']),
					isChecked: false,
					metadata: {},
					startLine: 2,
					endLine: 3,
				},
				{
					id: 'Other::Task 2',
					title: 'Task 2',
					status: createStatus('todo'),
					path: Path.create(['Other']),
					isChecked: false,
					metadata: {},
					startLine: 4,
					endLine: 5,
				},
			];

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: parsedTasks,
						headings: [],
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.findByPath(Path.create(['Test']));

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].title).toBe('Task 1');
			}
		});
	});

	describe('save', () => {
		it('新しいタスクを作成する', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [],
						headings: [Path.create(['Test'])],
						warnings: [],
					}),
				),
				applyEdit: vi.fn().mockReturnValue(ok('# Test\n- [ ] New Task\n  - status: todo')),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const newTask = createMockTask({ id: 'Test::New Task', title: 'New Task' });
			const result = await repository.save(newTask);

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ create: expect.any(Object) }),
			);
		});

		it('既存のタスクを更新する', async () => {
			const existingTask = {
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('todo'),
				path: Path.create(['Test']),
				isChecked: false,
				metadata: {},
				startLine: 2,
				endLine: 3,
			};

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [existingTask],
						headings: [],
						warnings: [],
					}),
				),
				applyEdit: vi.fn().mockReturnValue(ok('# Test\n- [x] Task 1\n  - status: done')),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('done'),
				isChecked: true,
			});
			const result = await repository.save(updatedTask);

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ taskId: 'Test::Task 1' }),
			);
		});
	});

	describe('delete', () => {
		it('タスクを削除する', async () => {
			const existingTask = {
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('todo'),
				path: Path.create(['Test']),
				isChecked: false,
				metadata: {},
				startLine: 2,
				endLine: 3,
			};

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [existingTask],
						headings: [],
						warnings: [],
					}),
				),
				applyEdit: vi.fn().mockReturnValue(ok('# Test')),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.delete('Test::Task 1');

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ taskId: 'Test::Task 1', delete: true }),
			);
		});

		it('タスクが見つからない場合はエラーを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [],
						headings: [],
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.delete('nonexistent');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(TaskNotFoundError);
			}
		});
	});

	describe('getAvailablePaths', () => {
		it('利用可能なパスを取得する', async () => {
			const headings = [Path.create(['Section 1']), Path.create(['Section 1', 'Subsection'])];

			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [],
						headings,
						warnings: [],
					}),
				),
			});
			const documentClient = createMockVscodeDocumentClient();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient);
			const result = await repository.getAvailablePaths();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].toString()).toBe('Section 1');
				expect(result.value[1].toString()).toBe('Section 1 / Subsection');
			}
		});
	});
});
