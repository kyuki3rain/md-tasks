# MVP実装計画（v0.1.0）

このドキュメントは、MD Tasks v0.1.0（MVP）を達成するための実装計画を定義する。

---

## 目標

**Markdownファイル内のTODOリストをカンバンボードとして表示・操作できる最小限の機能を実現する**

---

## MVPスコープ

### 対象機能

| 機能 | 説明 |
|------|------|
| タスク認識 | Markdownのチェックボックス（`- [ ]`/`- [x]`）をタスクとして認識 |
| パス解釈 | 見出し階層をパスとして解釈し、タスクのグルーピングに使用 |
| ステータス管理 | 子要素の`status: value`でステータスを管理 |
| 設定解決 | フロントマター → VSCode設定 → デフォルト の優先順位 |
| ボード表示 | WebViewパネルでカンバンボードを表示 |
| タスク操作 | 作成・編集・削除、列間ドラッグ&ドロップ |
| 同期 | エディタとボードの双方向同期 |

### 対象外（将来バージョン）

- 複数ファイルの横断表示
- 同一列内の並び替え
- フィルタ機能
- priority/due/assignee/tagsのメタデータ表示・編集

---

## アーキテクチャ概要

```
src/
├── domain/           # ドメイン層
├── application/      # アプリケーション層
├── interface/        # インターフェース層
├── infrastructure/   # インフラストラクチャ層
├── bootstrap/        # ブートストラップ層
├── shared/           # 共有ユーティリティ
└── webview/          # WebView（React）
```

詳細は [CONSTITUTION.md](./CONSTITUTION.md) を参照。

---

## 実装フェーズ

### Phase 1: 基盤構築 ✅

**目標**: 開発環境とアーキテクチャの基盤を整備する

#### 1.1 開発環境のセットアップ

- [x] devboxによる開発環境管理（Node.js 24, pnpm）
- [x] pnpmでの依存関係管理を確認
- [x] Biomeの導入（ESLint/Prettierから移行）
- [x] Vitestの導入
- [x] tsconfig.jsonのstrict mode有効化

#### 1.2 プロジェクト構造の整備

- [x] ディレクトリ構造の作成（domain, application, interface, infrastructure, bootstrap, shared, webview）
- [x] 共有ユーティリティの設置（logger等）
- [x] neverthrowの導入（Result型）
- [x] Zodの導入（バリデーション）
- [x] カスタムLoggerの実装（VSCode OutputChannel統合）

#### 1.3 WebView環境の構築

- [x] Viteプロジェクトの作成（webview/配下）
- [x] Reactの設定
- [x] Tailwind CSS v4の設定
- [x] shadcn/uiの導入
- [x] Extension ⇔ WebView通信の基盤実装

---

### Phase 2: ドメイン層の実装 ✅

**目標**: ビジネスロジックの中核をTDDで実装する

#### 2.1 エンティティ・値オブジェクト

- [x] `Task` エンティティの定義
  - id, title, status, path, checkbox状態, メタデータ
- [x] `Path` 値オブジェクトの定義
  - 見出し階層を表現、親子関係、プレフィックス判定
- [x] `Status` 値オブジェクトの定義
  - バリデーション、完了判定

#### 2.2 ドメインエラー

- [x] `TaskParseError` の定義
- [x] `InvalidStatusError` の定義
- [x] `TaskNotFoundError` の定義

#### 2.3 ポートインターフェース

- [x] `TaskRepository` ポートの定義（CRUD操作）
- [x] `ConfigProvider` ポートの定義（設定取得、KanbanConfig型）

#### 2.4 テスト

- [x] 57件のユニットテストを実装（Status, Path, Task）

---

### Phase 3: Markdownパーサーの実装 ✅

**目標**: Markdownファイルからタスクを抽出・更新する機能を実装

#### 3.1 パーサー実装

- [x] チェックボックス行の認識
- [x] 見出し階層の解析（パス抽出）
- [x] 子要素の解析（`key: value`形式）
- [x] 引用・コードブロック内の除外
- [x] フロントマターのパース

#### 3.2 タスクID生成・重複検出

- [x] タスクID生成（パス + タイトル）
- [x] 重複タスク検出
- [x] 重複時のWarning生成

#### 3.3 シリアライザー実装（部分編集）

- [x] 操作の都度、最新Markdownを再パース
- [x] パス + タイトルでタスクノードを特定
- [x] 該当箇所のみを編集（WorkspaceEdit API連携は Phase 5）
- [x] ステータス変更時のチェックボックス連動
- [x] 新規タスクの挿入（パス配下の末尾）
- [x] タスクの削除

#### 3.4 設計方針

- ASTは保持しない（操作の都度パース）
- 元のMarkdown構造を保持（タスク以外の部分は変更しない）
- 外部編集との競合は「Last Write Wins」で解決

#### 3.5 テスト

- [x] 48件の統合テストを実装（MarkdownTaskClient）

---

### Phase 4: アプリケーション層の実装 ✅

**目標**: ユースケースを実装する

#### 4.1 ユースケース

- [x] `GetTasksUseCase` - タスク一覧取得
- [x] `CreateTaskUseCase` - タスク作成
- [x] `UpdateTaskUseCase` - タスク更新
- [x] `DeleteTaskUseCase` - タスク削除
- [x] `ChangeTaskStatusUseCase` - ステータス変更
- [x] `GetConfigUseCase` - 設定取得

#### 4.2 テスト

- [x] 25件のユニットテストを実装（計133件）

---

### Phase 5: インフラストラクチャ層の実装 ✅

**目標**: 外部システム（VSCode API、ファイルシステム）との連携を実装

#### 5.1 Client実装（外部システムラッパー）

- [x] `RemarkClient` - remark/AST操作のラッパー（Phase 3で実装済み）
- [x] `MarkdownTaskClient` - Markdownパース・編集（Phase 3で実装済み）
- [x] `VscodeDocumentClient` - VSCodeドキュメント操作（WorkspaceEdit API含む）
- [x] `VscodeConfigClient` - VSCode設定APIのラッパー

#### 5.2 Adapter実装（Portの実装）

- [x] `MarkdownTaskRepository` - TaskRepositoryの実装（MarkdownTaskClientを使用）
- [x] `VscodeConfigProvider` - ConfigProviderの実装（VSCode設定）
- [x] `FrontmatterConfigProvider` - ConfigProviderの実装（フロントマター）

#### 5.3 テスト

- [x] 38件のユニットテストを追加（計171件）

---

### Phase 6: インターフェース層の実装 ✅

**目標**: 外部からのリクエストを受け付け、ユースケースを呼び出す

#### 6.1 Client実装（外部通信）

- [x] `WebViewMessageClient` - WebViewへのメッセージ送受信

#### 6.2 Adapter実装（Portの実装）

- [x] `TaskController` - タスク操作のエントリーポイント
- [x] `ConfigController` - 設定操作のエントリーポイント
- [x] `WebViewMessageHandler` - WebViewからのメッセージハンドリング

#### 6.3 型定義

- [x] メッセージ型（Extension ⇔ WebView間の通信プロトコル）
- [x] TaskDto（タスクのデータ転送オブジェクト）

#### 6.4 テスト

- [x] 35件のユニットテストを追加（計206件）

---

### Phase 7: WebView UIの実装 ✅

**目標**: カンバンボードUIをReactで実装する

#### 7.1 コンポーネント

- [x] `KanbanBoard` - ボード全体
- [x] `Column` - ステータスカラム
- [x] `TaskCard` - タスクカード
- [x] `TaskModal` - タスク作成・編集モーダル
- [x] `PathBadge` - パスバッジ

#### 7.2 ドラッグ&ドロップ

- [x] 列間のドラッグ&ドロップ実装（@dnd-kit/core使用）
- [x] ステータス変更の反映

#### 7.3 Extension通信

- [x] カスタムフック `useVscodeApi` の実装（型安全化）
- [x] カスタムフック `useKanban` の実装（状態管理）
- [x] メッセージ送受信の実装

---

### Phase 8: ブートストラップ層の実装 ✅

**目標**: アプリケーションのエントリーポイントと依存性注入を実装

#### 8.1 エントリーポイント

- [x] `activate` 関数の実装
- [x] `deactivate` 関数の実装

#### 8.2 依存性注入

- [x] DIコンテナの構築
- [x] 各層のインスタンス生成と注入

#### 8.3 コマンド登録

- [x] `mdTasks.openBoard` コマンドの登録
- [x] エディタ右上のアクションボタン設定

#### 8.4 WebViewパネル

- [x] WebViewPanelの生成
- [x] Reactアプリのロード

#### 8.5 テスト

- [x] 14件のユニットテストを追加（計220件）

---

### Phase 9: 設定機能の実装 ✅

**目標**: 設定の定義と読み込みを実装

#### 9.1 VSCode設定スキーマ

- [x] `package.json` にconfiguration項目を追加
  - statuses, doneStatuses, defaultStatus, defaultDoneStatus
  - sortBy, syncCheckboxWithDone

#### 9.2 設定解決ロジック

- [x] フロントマター → VSCode設定 → デフォルト の優先順位実装

#### 9.3 テスト

- [x] 5件のユニットテストを追加（計225件）

---

### Phase 10: 統合とテスト

**目標**: 全体の統合とテストを完了する

#### 10.1 統合テスト

- [ ] パーサー + シリアライザーの統合テスト
- [ ] ユースケースの統合テスト

#### 10.2 動作確認

- [ ] エンドツーエンドの動作確認
- [ ] エッジケースの確認

#### 10.3 ドキュメント

- [ ] README.mdの更新
- [ ] CHANGELOG.mdの更新

---

## マイルストーン

| マイルストーン | 完了基準 |
|--------------|---------|
| M1: 基盤完了 | Phase 1完了、開発環境が整備されている |
| M2: パース完了 | Phase 2-3完了、Markdownからタスクを読み取れる |
| M3: ロジック完了 | Phase 4-6完了、ユースケースが動作する |
| M4: UI完了 | Phase 7完了、カンバンボードが表示される |
| M5: MVP完了 | Phase 8-10完了、全機能が動作する |

---

## 技術的決定事項

### 採用するライブラリ

| 用途 | ライブラリ | 理由 |
|------|-----------|------|
| Markdownパース | remark + remark-gfm | 標準的なMarkdownパーサー、GFM対応 |
| フロントマターパース | gray-matter | 定番ライブラリ |
| D&D | @dnd-kit/core | React用モダンD&Dライブラリ |

### WebView ⇔ Extension通信

```typescript
// Extension → WebView
webview.postMessage({ type: 'TASKS_UPDATED', payload: tasks });

// WebView → Extension
vscode.postMessage({ type: 'UPDATE_TASK', payload: { id, status } });
```

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| Markdownパースの複雑さ | remarkを活用し、自前実装を最小限に |
| WebView通信の同期問題 | 楽観的更新 + エラー時ロールバック |
| パフォーマンス（大量タスク） | 仮想化は将来バージョンで対応 |

---

## 次のステップ

1. ~~Phase 1の開発環境セットアップから開始~~ ✅
2. ~~TDDでドメイン層を実装~~ ✅
3. ~~Phase 3: Markdownパーサーの実装~~ ✅
4. ~~Phase 4: アプリケーション層の実装~~ ✅
5. ~~Phase 5: インフラストラクチャ層の実装~~ ✅
6. ~~Phase 6: インターフェース層の実装~~ ✅
7. ~~Phase 7: WebView UIの実装~~ ✅
8. ~~Phase 8: ブートストラップ層の実装~~ ✅
9. ~~Phase 9: 設定機能の実装~~ ✅
10. Phase 10: 統合とテスト
11. 各フェーズ完了後にレビュー・調整

---

## 関連ドキュメント

- [技術原則（CONSTITUTION.md）](./CONSTITUTION.md)
- [要件定義書（REQUIREMENTS.md）](./REQUIREMENTS.md)

---

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2025-01-XX | 初版作成 |
| 2025-01-XX | Phase 1, 2 完了。Phase 3 詳細化（タスクID生成、重複検出、部分編集方針） |
| 2025-01-XX | Phase 3 完了。MarkdownParser、MarkdownSerializer実装（計42件のテスト） |
| 2025-01-XX | Phase 4 完了。6つのユースケース実装（計133件のテスト） |
| 2025-01-XX | Phase 5 完了。インフラストラクチャ層のアダプター実装（計171件のテスト） |
| 2025-01-XX | Phase 6 完了。インターフェース層の実装（計206件のテスト） |
| 2025-01-XX | Phase 7 完了。WebView UIの実装（KanbanBoard, Column, TaskCard, TaskModal, PathBadge, D&D） |
| 2025-12-21 | Phase 8 完了。ブートストラップ層の実装（DIコンテナ、KanbanPanelProvider、計220件のテスト） |
| 2025-12-21 | Phase 9 完了。設定機能の実装（VSCode設定スキーマ、設定解決ロジック、計225件のテスト） |
