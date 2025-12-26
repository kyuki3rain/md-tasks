/**
 * MarkdownTaskClient 統合テスト
 *
 * このテストはMarkdownTaskClientの振る舞いを、実際のMarkdown文字列入力を使って
 * 検証する統合テストです。RemarkClientをモック化せず、実際のremark/gray-matter
 * ライブラリを使用してパース・シリアライズの動作を確認します。
 *
 * テストケースは docs/REQUIREMENTS.md の仕様に基づいて設計されています：
 * - タスクの認識（チェックボックス形式）
 * - パス（見出し階層からの抽出）
 * - メタデータ（子要素の key: value 形式）
 * - ステータス管理（決定ロジック、完了判定）
 * - フロントマター設定
 * - タスクID生成と重複検出
 * - 編集操作（更新・作成・削除）
 */
import { describe, expect, it } from 'vitest';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { generateTaskId } from '../../domain/valueObjects/taskId';
import { MarkdownTaskClient } from './markdownTaskClient';

describe('MarkdownTaskClient', () => {
	const client = new MarkdownTaskClient();

	describe('parse', () => {
		describe('チェックボックスの認識', () => {
			it('未完了のチェックボックスを認識する', () => {
				const markdown = '- [ ] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[0].isChecked).toBe(false);
			});

			it('完了のチェックボックスを認識する', () => {
				const markdown = '- [x] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[0].isChecked).toBe(true);
			});

			it('大文字のXも完了として認識する', () => {
				const markdown = '- [X] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].isChecked).toBe(true);
			});

			it('複数のチェックボックスを認識する', () => {
				const markdown = `- [ ] タスク1
- [x] タスク2
- [ ] タスク3`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(3);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[1].title).toBe('タスク2');
				expect(tasks[2].title).toBe('タスク3');
			});

			it('通常のリストはタスクとして認識しない', () => {
				const markdown = `- 通常のリスト
- [ ] タスク`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク');
			});
		});

		describe('見出し階層の解析（パス抽出）', () => {
			it('見出し配下のタスクにパスを設定する', () => {
				const markdown = `# 仕事
- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事']);
			});

			it('ネストした見出しのパスを正しく解析する', () => {
				const markdown = `# 仕事
## プロジェクトA
- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事', 'プロジェクトA']);
			});

			it('見出しレベルが飛んでも正しく解析する', () => {
				const markdown = `# 仕事
### 深いセクション
- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事', '深いセクション']);
			});

			it('見出しがない場合はルートパスになる', () => {
				const markdown = '- [ ] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.isRoot()).toBe(true);
			});

			it('異なる見出し配下のタスクは異なるパスを持つ', () => {
				const markdown = `# 仕事
- [ ] タスク1

# 個人
- [ ] タスク2`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事']);
				expect(tasks[1].path.segments).toEqual(['個人']);
			});
		});

		describe('子要素の解析（key: value形式）', () => {
			it('statusメタデータを認識する', () => {
				const markdown = `- [ ] タスク1
  - status: in-progress`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('in-progress');
			});

			it('複数のメタデータを認識する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
  - due: 2025-01-15`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('todo');
				expect(tasks[0].metadata.priority).toBe('high');
				expect(tasks[0].metadata.due).toBe('2025-01-15');
			});

			it('key: value形式でないリストは無視する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - これはメモです
  - priority high`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].metadata).not.toHaveProperty('これはメモです');
				expect(tasks[0].metadata).not.toHaveProperty('priority high');
			});

			it('空のkeyは無視する', () => {
				const markdown = `- [ ] タスク1
  - : 値だけ`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(Object.keys(tasks[0].metadata)).toHaveLength(0);
			});

			it('statusがない場合はチェック状態からデフォルトステータスを設定する', () => {
				const markdown = `- [ ] 未完了タスク
- [x] 完了タスク`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('todo');
				expect(tasks[1].status.value).toBe('done');
			});

			it('空のvalueは無視する', () => {
				const markdown = `- [ ] タスク1
  - note:`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				// 空のvalueはメタデータとして採用しない
				expect(tasks[0].metadata.note).toBeUndefined();
			});

			it('valueの前後の空白はトリムする', () => {
				const markdown = `- [ ] タスク1
  - status:   in-progress   `;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('in-progress');
			});
		});

		describe('引用・コードブロック内の除外', () => {
			it('引用内のチェックボックスは無視する', () => {
				const markdown = `- [ ] 通常のタスク

> - [ ] 引用内のチェックボックス`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('通常のタスク');
			});

			it('コードブロック内のチェックボックスは無視する', () => {
				const markdown = `- [ ] 通常のタスク

\`\`\`
- [ ] コードブロック内
\`\`\``;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('通常のタスク');
			});

			it('インラインコード内のチェックボックスは無視する', () => {
				const markdown = '- [ ] タスク `- [ ] インラインコード`';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク `- [ ] インラインコード`');
			});
		});

		describe('タスクタイトル内のMarkdown書式', () => {
			// NOTE: タイトルはrawなMarkdownとして保持される
			// UI側でMarkdownとしてレンダリングする
			it('太字を含むタスクタイトルはMarkdownとして保持される', () => {
				const markdown = '- [ ] **重要な**タスク';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].title).toBe('**重要な**タスク');
			});

			it('リンクを含むタスクタイトルはMarkdownとして保持される', () => {
				const markdown = '- [ ] [ドキュメント](https://example.com)を読む';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].title).toBe('[ドキュメント](https://example.com)を読む');
			});

			it('インラインコードを含むタスクタイトルはMarkdownとして保持される', () => {
				const markdown = '- [ ] `API`の修正';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].title).toBe('`API`の修正');
			});
		});

		describe('フロントマターのパース', () => {
			it('フロントマターからkanban設定を読み取る', () => {
				const markdown = `---
kanban:
  statuses:
    - todo
    - in-progress
    - done
  doneStatuses:
    - done
  defaultStatus: todo
  defaultDoneStatus: done
---

- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeDefined();
				expect(config?.statuses).toEqual(['todo', 'in-progress', 'done']);
				expect(config?.doneStatuses).toEqual(['done']);
				expect(config?.defaultStatus).toBe('todo');
				expect(config?.defaultDoneStatus).toBe('done');
			});

			it('フロントマターがなくてもパースできる', () => {
				const markdown = '- [ ] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeUndefined();
			});

			it('フロントマターにkanban設定がなくてもパースできる', () => {
				const markdown = `---
title: My Document
---

- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeUndefined();
			});

			it('フロントマターがある場合も正しい行番号を追跡する', () => {
				const markdown = `---
kanban:
  statuses:
    - todo
    - done
---

# 仕事
- [ ] タスク1`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].startLine).toBe(9);
			});
		});

		describe('タスクID生成', () => {
			it('パス + タイトルからタスクIDを生成する', () => {
				const markdown = `# 仕事
## プロジェクトA
- [ ] APIの実装`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].id).toBe(
					generateTaskId(Path.create(['仕事', 'プロジェクトA']), 'APIの実装'),
				);
			});

			it('ルートパスの場合はルートパスとタイトルからIDを生成する', () => {
				const markdown = '- [ ] タスク1';
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].id).toBe(generateTaskId(Path.create([]), 'タスク1'));
			});
		});

		describe('重複タスク検出', () => {
			it('同じパスに同じタイトルのタスクがある場合、警告を生成する', () => {
				const markdown = `# 仕事
- [ ] APIの実装
- [ ] APIの実装`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks, warnings } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(2);
				expect(warnings).toHaveLength(1);
				expect(warnings[0]).toContain('重複タスクを検出');
				expect(warnings[0]).toContain('APIの実装');
			});

			it('異なるパスの同じタイトルは重複とみなさない', () => {
				const markdown = `# 仕事
- [ ] タスク

# 個人
- [ ] タスク`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { warnings } = result._unsafeUnwrap();
				expect(warnings).toHaveLength(0);
			});
		});

		describe('行番号の追跡', () => {
			it('タスクの行番号を追跡する', () => {
				const markdown = `# 仕事
- [ ] タスク1
- [ ] タスク2`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].startLine).toBe(2);
				expect(tasks[1].startLine).toBe(3);
			});

			it('子要素を含むタスクの終了行を追跡する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
- [ ] タスク2`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].startLine).toBe(1);
				expect(tasks[0].endLine).toBe(3);
				expect(tasks[1].startLine).toBe(4);
			});
		});

		describe('見出しの抽出', () => {
			it('ファイル内の見出し一覧を抽出する', () => {
				const markdown = `# 仕事
## プロジェクトA
## プロジェクトB
# 個人`;
				const result = client.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { headings } = result._unsafeUnwrap();
				expect(headings).toHaveLength(4);
				expect(headings[0].segments).toEqual(['仕事']);
				expect(headings[1].segments).toEqual(['仕事', 'プロジェクトA']);
				expect(headings[2].segments).toEqual(['仕事', 'プロジェクトB']);
				expect(headings[3].segments).toEqual(['個人']);
			});
		});
	});

	describe('applyEdit', () => {
		describe('タスク更新', () => {
			it('タスクのタイトルを更新できる', () => {
				const markdown = `- [ ] 古いタイトル`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), '古いタイトル'),
					newTitle: '新しいタイトル',
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('新しいタイトル');
				expect(updated).not.toContain('古いタイトル');
			});

			it('タスクのステータスを更新できる', () => {
				const markdown = `- [ ] タスク1
  - status: todo`;
				const newStatus = Status.create('in-progress')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					newStatus,
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('status: in-progress');
			});

			it('ステータスがdoneになるとチェックボックスが更新される', () => {
				const markdown = `- [ ] タスク1`;
				const newStatus = Status.create('done')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					newStatus,
					doneStatuses: ['done'],
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('[x]');
			});

			it('ステータスがdoneでなくなるとチェックボックスが更新される', () => {
				const markdown = `- [x] タスク1
  - status: done`;
				const newStatus = Status.create('todo')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					newStatus,
					doneStatuses: ['done'],
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('[ ]');
			});

			it('statusメタデータがない場合は新規追加する', () => {
				const markdown = `- [ ] タスク1`;
				const newStatus = Status.create('in-progress')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					newStatus,
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('status: in-progress');
			});
		});

		describe('パス変更', () => {
			it('タスクのパスを変更できる（別の見出しに移動）', () => {
				const markdown = `# 仕事
- [ ] タスク1

# 個人`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
					newPath: Path.create(['個人']),
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// タスクが「仕事」から「個人」に移動している
				expect(updated).not.toMatch(/# 仕事[\s\S]*タスク1[\s\S]*# 個人/);
				expect(updated).toMatch(/# 個人[\s\S]*タスク1/);
			});

			it('タスクのパスを変更できる（ルートから見出し配下へ）', () => {
				const markdown = `- [ ] ルートタスク

# 仕事`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'ルートタスク'),
					newPath: Path.create(['仕事']),
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// タスクが「仕事」配下に移動している
				expect(updated).toMatch(/# 仕事[\s\S]*ルートタスク/);
			});

			it('タスクのパスを変更できる（見出し配下からルートへ）', () => {
				const markdown = `# 仕事
- [ ] タスク1`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
					newPath: Path.create([]),
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// タスクがルートに移動している（見出しの前にある）
				expect(updated).toMatch(/タスク1[\s\S]*# 仕事/);
			});

			it('パス変更と同時にステータスも変更できる', () => {
				const markdown = `# 仕事
- [ ] タスク1
  - status: todo

# 完了`;
				const newStatus = Status.create('done')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
					newPath: Path.create(['完了']),
					newStatus,
					doneStatuses: ['done'],
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// タスクが「完了」配下に移動し、ステータスも更新されている
				expect(updated).toMatch(/# 完了[\s\S]*\[x\] タスク1[\s\S]*status: done/);
			});

			it('パス変更と同時にタイトルも変更できる', () => {
				const markdown = `# 仕事
- [ ] 古いタイトル

# 個人`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), '古いタイトル'),
					newPath: Path.create(['個人']),
					newTitle: '新しいタイトル',
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toMatch(/# 個人[\s\S]*新しいタイトル/);
				expect(updated).not.toContain('古いタイトル');
			});

			it('存在しないパスへの変更はエラーになる', () => {
				const markdown = `# 仕事
- [ ] タスク1`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
					newPath: Path.create(['存在しない']),
				});

				expect(result.isErr()).toBe(true);
			});

			it('メタデータ付きタスクのパスを変更できる', () => {
				const markdown = `# 仕事
- [ ] タスク1
  - status: in-progress
  - priority: high

# 個人`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
					newPath: Path.create(['個人']),
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// タスクが「個人」配下に移動し、メタデータも保持されている
				expect(updated).toMatch(
					/# 個人[\s\S]*タスク1[\s\S]*status: in-progress[\s\S]*priority: high/,
				);
			});

			describe('ネスト階層の移動', () => {
				it('深いネストから浅いネストへ移動できる', () => {
					const markdown = `# プロジェクト
## フェーズ1
### タスク一覧
- [ ] 深いタスク

# 完了`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(
							Path.create(['プロジェクト', 'フェーズ1', 'タスク一覧']),
							'深いタスク',
						),
						newPath: Path.create(['完了']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/# 完了[\s\S]*深いタスク/);
					expect(updated).not.toMatch(/### タスク一覧[\s\S]*深いタスク[\s\S]*# 完了/);
				});

				it('浅いネストから深いネストへ移動できる', () => {
					const markdown = `# 仕事
- [ ] タスク1

## サブプロジェクト
### 詳細`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['仕事', 'サブプロジェクト', '詳細']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/### 詳細[\s\S]*タスク1/);
				});

				it('同じ親の別の子見出しへ移動できる', () => {
					const markdown = `# プロジェクト
## TODO
- [ ] タスク1

## 進行中`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['プロジェクト', 'TODO']), 'タスク1'),
						newPath: Path.create(['プロジェクト', '進行中']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/## 進行中[\s\S]*タスク1/);
					// TODOの直後にタスク1がないことを確認（TODOと進行中の間にタスク1がない）
					expect(updated).toMatch(/## TODO\n\n## 進行中/);
				});
			});

			describe('挿入位置', () => {
				it('移動先に既存タスクがある場合、最後に挿入される', () => {
					const markdown = `# 仕事
- [ ] タスク1

# 個人
- [ ] 既存タスク1
- [ ] 既存タスク2`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// 既存タスクの後にタスク1が追加されている
					expect(updated).toMatch(/既存タスク2[\s\S]*タスク1/);
				});

				it('移動先にタスクがない場合、見出し直後に挿入される', () => {
					const markdown = `# 仕事
- [ ] タスク1

# 個人

# その他`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// 「個人」と「その他」の間にタスクが挿入される
					expect(updated).toMatch(/# 個人[\s\S]*タスク1[\s\S]*# その他/);
				});

				it('ルートへ移動時、既存ルートタスクの後に挿入される', () => {
					const markdown = `- [ ] ルートタスク1
- [ ] ルートタスク2

# 仕事
- [ ] タスク1`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create([]),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// ルートタスクの後に追加される
					expect(updated).toMatch(/ルートタスク2[\s\S]*タスク1[\s\S]*# 仕事/);
				});

				it('ルートへ移動時、ルートタスクがなく見出しがある場合、見出しの前に挿入される', () => {
					const markdown = `# 仕事
- [ ] タスク1

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create([]),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// 見出しの前に挿入される
					expect(updated).toMatch(/^- \[ \] タスク1[\s\S]*# 仕事/m);
				});
			});

			describe('同時変更', () => {
				it('パス変更 + ステータス変更 + タイトル変更を同時に行える', () => {
					const markdown = `# TODO
- [ ] 古いタイトル
  - status: todo

# 完了`;
					const newStatus = Status.create('done')._unsafeUnwrap();
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['TODO']), '古いタイトル'),
						newPath: Path.create(['完了']),
						newStatus,
						newTitle: '新しいタイトル',
						doneStatuses: ['done'],
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/# 完了[\s\S]*\[x\] 新しいタイトル[\s\S]*status: done/);
					expect(updated).not.toContain('古いタイトル');
				});
			});

			describe('メタデータ保持', () => {
				it('複数のメタデータがすべて保持される', () => {
					const markdown = `# 仕事
- [ ] タスク1
  - status: in-progress
  - priority: high
  - due: 2025-01-15
  - assignee: user1

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toContain('status: in-progress');
					expect(updated).toContain('priority: high');
					expect(updated).toContain('due: 2025-01-15');
					expect(updated).toContain('assignee: user1');
				});
			});

			describe('エッジケース', () => {
				it('フロントマターがある場合も正しく移動できる', () => {
					const markdown = `---
kanban:
  statuses:
    - todo
    - done
---

# 仕事
- [ ] タスク1

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/# 個人[\s\S]*タスク1/);
					// フロントマターが保持されている
					expect(updated).toContain('kanban:');
				});

				it('複数のタスクがある見出しからの移動で、他のタスクは残る', () => {
					const markdown = `# 仕事
- [ ] タスク1
- [ ] タスク2
- [ ] タスク3

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク2'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// タスク1とタスク3は仕事配下に残っている
					expect(updated).toMatch(/# 仕事[\s\S]*タスク1[\s\S]*タスク3[\s\S]*# 個人/);
					// タスク2は個人配下に移動している
					expect(updated).toMatch(/# 個人[\s\S]*タスク2/);
				});

				it('移動元が見出し配下の最後のタスクの場合も正しく動作する', () => {
					const markdown = `# 仕事
- [ ] タスク1
- [ ] タスク2

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク2'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/# 仕事[\s\S]*タスク1[\s\S]*# 個人[\s\S]*タスク2/);
				});

				it('移動元が見出し配下の最初のタスクの場合も正しく動作する', () => {
					const markdown = `# 仕事
- [ ] タスク1
- [ ] タスク2

# 個人`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['個人']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					expect(updated).toMatch(/# 仕事[\s\S]*タスク2[\s\S]*# 個人[\s\S]*タスク1/);
				});

				it('同じパスへの移動は変更なしで成功する', () => {
					const markdown = `# 仕事
- [ ] タスク1`;
					const result = client.applyEdit(markdown, {
						taskId: generateTaskId(Path.create(['仕事']), 'タスク1'),
						newPath: Path.create(['仕事']),
					});

					expect(result.isOk()).toBe(true);
					const updated = result._unsafeUnwrap();
					// 変更なし（同じ内容）
					expect(updated).toMatch(/# 仕事[\s\S]*タスク1/);
				});
			});
		});

		describe('重複タスクの編集', () => {
			it('重複タスクがある場合は最初のタスクを更新する', () => {
				const markdown = `# 仕事
- [ ] APIの実装
- [ ] APIの実装`;
				const newStatus = Status.create('done')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create(['仕事']), 'APIの実装'),
					newStatus,
					doneStatuses: ['done'],
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				// 最初のタスクだけがチェック済みになる
				// status行が追加されるため、2番目のタスクは3行目以降
				expect(updated).toMatch(/- \[x\] APIの実装[\s\S]*- \[ \] APIの実装/);
			});
		});

		describe('タスク削除', () => {
			it('タスクを削除できる', () => {
				const markdown = `- [ ] タスク1
- [ ] タスク2`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					delete: true,
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).not.toContain('タスク1');
				expect(updated).toContain('タスク2');
			});

			it('子要素を含むタスクを削除できる', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
- [ ] タスク2`;
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), 'タスク1'),
					delete: true,
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).not.toContain('タスク1');
				expect(updated).not.toContain('priority: high');
				expect(updated).toContain('タスク2');
			});
		});

		describe('タスク作成', () => {
			it('ルートにタスクを作成できる', () => {
				const markdown = '';
				const status = Status.create('todo')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					create: {
						title: '新しいタスク',
						path: Path.create([]),
						status,
					},
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('[ ] 新しいタスク');
				expect(updated).toContain('status: todo');
			});

			it('見出し配下にタスクを作成できる', () => {
				const markdown = `# 仕事`;
				const status = Status.create('todo')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					create: {
						title: '新しいタスク',
						path: Path.create(['仕事']),
						status,
					},
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('[ ] 新しいタスク');
			});

			it('完了ステータスで作成するとチェックボックスがチェック済みになる', () => {
				const markdown = '';
				const status = Status.create('done')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					create: {
						title: '完了タスク',
						path: Path.create([]),
						status,
					},
					doneStatuses: ['done'],
				});

				expect(result.isOk()).toBe(true);
				const updated = result._unsafeUnwrap();
				expect(updated).toContain('[x] 完了タスク');
			});

			it('存在しない見出しにタスクを作成しようとするとエラー', () => {
				const markdown = '# 仕事';
				const status = Status.create('todo')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					create: {
						title: '新しいタスク',
						path: Path.create(['存在しない']),
						status,
					},
				});

				expect(result.isErr()).toBe(true);
			});
		});

		describe('エラーハンドリング', () => {
			it('存在しないタスクIDでエラー', () => {
				const markdown = '- [ ] タスク1';
				const result = client.applyEdit(markdown, {
					taskId: generateTaskId(Path.create([]), '存在しない'),
					newTitle: '新しいタイトル',
				});

				expect(result.isErr()).toBe(true);
			});

			it('タスクIDなしで更新/削除しようとするとエラー', () => {
				const markdown = '- [ ] タスク1';
				const newStatus = Status.create('done')._unsafeUnwrap();
				const result = client.applyEdit(markdown, {
					newStatus,
				});

				expect(result.isErr()).toBe(true);
			});
		});
	});
});
