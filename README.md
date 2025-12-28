# MD Tasks

MarkdownファイルのTODOリスト（チェックボックス）をカンバンボード形式で表示・操作できるVSCode拡張機能です。

![Kanban Board](docs/images/kanban-board.png)

## 特徴

- **Markdown標準記法を尊重**: 素のMarkdownとしても可読性を維持
- **見出し階層をパスとして解釈**: タスクのグルーピングに使用
- **双方向同期**: エディタとボードがリアルタイムで同期
- **ドラッグ&ドロップ**: カード移動でステータスを変更
- **VSCode標準のUndo/Redo対応**: 安心して編集可能

## インストール

### マーケットプレイスから

VSCode拡張機能マーケットプレイスで「MD Tasks」を検索してインストール。

### VSIXファイルから

1. [Releases](https://github.com/kyuki3rain/md-tasks/releases)からVSIXファイルをダウンロード
2. VSCodeで `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. ダウンロードしたVSIXファイルを選択

## 使い方

1. Markdownファイルを開く
2. エディタ右上のカンバンアイコンをクリック、または `Ctrl+Shift+P` → `Open Kanban Board`
3. カンバンボードが表示される

### タスクの作成

各カラム下部の「+」ボタンからタスクを作成できます。

### タスクの編集

タスクカードをクリックすると編集モーダルが開きます。

### ステータスの変更

タスクカードをドラッグ&ドロップで別のカラムに移動すると、ステータスが変更されます。

## Markdownの書式

### 基本的なタスク

```markdown
- [ ] 未完了タスク
- [x] 完了タスク
```

### 見出しによるグルーピング

見出しの階層構造がタスクの「パス」になります。

```markdown
# 仕事
## プロジェクトA
- [ ] APIの実装        <!-- パス: 仕事 / プロジェクトA -->

## プロジェクトB
- [ ] 要件定義         <!-- パス: 仕事 / プロジェクトB -->

# 個人
- [ ] 部屋の掃除       <!-- パス: 個人 -->
```

### メタデータ（子要素）

タスクの子要素として `key: value` 形式でメタデータを記述できます。

```markdown
- [ ] APIの実装
  - status: in-progress
  - priority: high
  - due: 2025-01-15
```

## 設定

### 設定の優先順位

1. フロントマター（ファイル固有）
2. VSCode設定（ワークスペース or ユーザー）
3. ビルトインデフォルト

### フロントマター

ファイルの先頭にYAML形式で設定を記述できます。

```yaml
---
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
```

### VSCode設定

| 設定項目 | 説明 | デフォルト |
|---------|------|-----------|
| `mdTasks.statuses` | ステータス一覧（カラムの表示順） | `["todo", "in-progress", "done"]` |
| `mdTasks.doneStatuses` | 完了扱いとするステータス | `["done"]` |
| `mdTasks.defaultStatus` | デフォルトステータス（`[ ]` の時） | `"todo"` |
| `mdTasks.defaultDoneStatus` | デフォルト完了ステータス（`[x]` の時） | `"done"` |
| `mdTasks.sortBy` | タスクのソート順 | `"markdown"` |
| `mdTasks.syncCheckboxWithDone` | 完了ステータス変更時にチェックボックスも連動 | `true` |

#### ソート順オプション

- `markdown`: ファイル内の出現順
- `priority`: 優先度順
- `due`: 期限順
- `alphabetical`: アルファベット順

### 設定例

```jsonc
// .vscode/settings.json
{
  "mdTasks.statuses": ["backlog", "todo", "in-progress", "review", "done"],
  "mdTasks.doneStatuses": ["done"],
  "mdTasks.sortBy": "priority"
}
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。
