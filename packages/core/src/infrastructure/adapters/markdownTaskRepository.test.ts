import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { DocumentOperationError } from '../../domain/errors/documentOperationError';
import { NoActiveEditorError as DomainNoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import { TaskNotFoundError } from '../../domain/errors/taskNotFoundError';
import { TaskParseError } from '../../domain/errors/taskParseError';
import type { ConfigProvider, KanbanConfig } from '../../domain/ports/configProvider';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import type {
	MarkdownTaskClient,
	ParseResult,
	SerializerError,
} from '../clients/markdownTaskClient';
import { MarkdownParseError } from '../clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../clients/vscodeDocumentClient';
import {
	DocumentEditError,
	DocumentNotFoundError,
	NoActiveEditorError,
} from '../clients/vscodeDocumentClient';
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

const createMockConfigProvider = (overrides: Partial<KanbanConfig> = {}): ConfigProvider => {
	const config: KanbanConfig = {
		statuses: ['todo', 'in-progress', 'done'],
		doneStatuses: ['done'],
		defaultStatus: 'todo',
		defaultDoneStatus: 'done',
		sortBy: 'markdown',
		syncCheckboxWithDone: true,
		...overrides,
	};
	return {
		getConfig: vi.fn().mockResolvedValue(config),
		get: vi.fn().mockImplementation((key: keyof KanbanConfig) => Promise.resolve(config[key])),
	};
};

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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentNotFoundError('No document'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.findAll();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});

		it('アクティブなエディタがない場合はNoActiveEditorErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient();
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.findAll();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('パースエラーの場合はTaskParseErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(err(new MarkdownParseError('Invalid markdown'))),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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

		it('タスクのパスを変更する', async () => {
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
						headings: [Path.create(['Test']), Path.create(['Other'])],
						warnings: [],
					}),
				),
				applyEdit: vi.fn().mockReturnValue(ok('# Other\n- [ ] Task 1\n  - status: todo')),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('todo'),
				path: Path.create(['Other']),
			});
			const result = await repository.save(updatedTask);

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					taskId: 'Test::Task 1',
					newPath: expect.objectContaining({ segments: ['Other'] }),
				}),
			);
		});

		it('パスが変更されていない場合はnewPathを渡さない', async () => {
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('done'),
				path: Path.create(['Test']), // 同じパス
			});
			const result = await repository.save(updatedTask);

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					taskId: 'Test::Task 1',
					newPath: undefined,
				}),
			);
		});

		it('ステータスをdoneに変更するとdoneStatusesがapplyEditに渡される', async () => {
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
			const configProvider = createMockConfigProvider({ doneStatuses: ['done', 'completed'] });

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
				expect.objectContaining({
					taskId: 'Test::Task 1',
					newStatus: expect.objectContaining({ value: 'done' }),
					doneStatuses: ['done', 'completed'],
				}),
			);
		});

		it('syncCheckboxWithDoneがfalseの場合はdoneStatusesを渡さない', async () => {
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
				applyEdit: vi.fn().mockReturnValue(ok('# Test\n- [ ] Task 1\n  - status: done')),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider({ syncCheckboxWithDone: false });

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('done'),
				isChecked: false,
			});
			const result = await repository.save(updatedTask);

			expect(result.isOk()).toBe(true);
			expect(markdownClient.applyEdit).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					taskId: 'Test::Task 1',
					doneStatuses: undefined,
				}),
			);
		});

		it('in-progressからdoneへの変更でもdoneStatusesが渡される', async () => {
			const existingTask = {
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('in-progress'),
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
				expect.objectContaining({
					taskId: 'Test::Task 1',
					doneStatuses: ['done'],
				}),
			);
		});

		it('ドキュメント書き込みが失敗した場合はDocumentOperationErrorを返す', async () => {
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
			const documentClient = createMockVscodeDocumentClient({
				replaceDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentEditError('編集に失敗しました'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('done'),
			});
			const result = await repository.save(updatedTask);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('編集に失敗しました');
			}
		});

		it('ドキュメントが見つからない場合はDocumentOperationErrorを返す', async () => {
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentNotFoundError('ドキュメントが見つかりません'))),
			});
			const markdownClient = createMockMarkdownTaskClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const task = createMockTask();
			const result = await repository.save(task);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('ドキュメントが見つかりません');
			}
		});

		it('アクティブなエディタがない場合はNoActiveEditorErrorを返す', async () => {
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const markdownClient = createMockMarkdownTaskClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const task = createMockTask();
			const result = await repository.save(task);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('replaceDocumentTextがNoActiveEditorErrorを返す場合はNoActiveEditorErrorを返す', async () => {
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
			const documentClient = createMockVscodeDocumentClient({
				replaceDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const updatedTask = createMockTask({
				id: 'Test::Task 1',
				title: 'Task 1',
				status: createStatus('done'),
			});
			const result = await repository.save(updatedTask);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('パースエラーの場合はDocumentOperationErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(err(new MarkdownParseError('Invalid markdown'))),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const task = createMockTask();
			const result = await repository.save(task);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});

		it('編集生成が失敗した場合はDocumentOperationErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(
					ok({
						tasks: [],
						headings: [],
						warnings: [],
					}),
				),
				applyEdit: vi.fn().mockReturnValue(
					err({
						message: '見出しが見つかりません: Test',
						_tag: 'SerializerError',
					} as SerializerError),
				),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const task = createMockTask();
			const result = await repository.save(task);

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('見出しが見つかりません: Test');
			}
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('nonexistent');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(TaskNotFoundError);
			}
		});

		it('ドキュメント書き込みが失敗した場合はDocumentOperationErrorを返す', async () => {
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
			const documentClient = createMockVscodeDocumentClient({
				replaceDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentEditError('編集に失敗しました'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('編集に失敗しました');
			}
		});

		it('ドキュメントが見つからない場合はDocumentOperationErrorを返す', async () => {
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentNotFoundError('ドキュメントが見つかりません'))),
			});
			const markdownClient = createMockMarkdownTaskClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('ドキュメントが見つかりません');
			}
		});

		it('アクティブなエディタがない場合はNoActiveEditorErrorを返す', async () => {
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const markdownClient = createMockMarkdownTaskClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('replaceDocumentTextがNoActiveEditorErrorを返す場合はNoActiveEditorErrorを返す', async () => {
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
			const documentClient = createMockVscodeDocumentClient({
				replaceDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('パースエラーの場合はDocumentOperationErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(err(new MarkdownParseError('Invalid markdown'))),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});

		it('編集生成が失敗した場合はDocumentOperationErrorを返す', async () => {
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
				applyEdit: vi
					.fn()
					.mockReturnValue(
						err({ message: '削除に失敗しました', _tag: 'SerializerError' } as SerializerError),
					),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.delete('Test::Task 1');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
				expect(result.error.message).toBe('削除に失敗しました');
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
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.getAvailablePaths();

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0].toString()).toBe('Section 1');
				expect(result.value[1].toString()).toBe('Section 1 / Subsection');
			}
		});

		it('ドキュメントがない場合はエラーを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient();
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new DocumentNotFoundError('No document'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.getAvailablePaths();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DocumentOperationError);
			}
		});

		it('アクティブなエディタがない場合はNoActiveEditorErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient();
			const documentClient = createMockVscodeDocumentClient({
				getCurrentDocumentText: vi
					.fn()
					.mockResolvedValue(err(new NoActiveEditorError('No active editor'))),
			});
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.getAvailablePaths();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(DomainNoActiveEditorError);
			}
		});

		it('パースエラーの場合はTaskParseErrorを返す', async () => {
			const markdownClient = createMockMarkdownTaskClient({
				parse: vi.fn().mockReturnValue(err(new MarkdownParseError('Invalid markdown'))),
			});
			const documentClient = createMockVscodeDocumentClient();
			const configProvider = createMockConfigProvider();

			const repository = new MarkdownTaskRepository(markdownClient, documentClient, configProvider);
			const result = await repository.getAvailablePaths();

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(TaskParseError);
			}
		});
	});
});
