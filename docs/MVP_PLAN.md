# MVP実装計画（v0.1.0）

このドキュメントは、Markdown Kanban v0.1.0（MVP）を達成するための実装計画を定義する。

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

### Phase 1: 基盤構築

**目標**: 開発環境とアーキテクチャの基盤を整備する

#### 1.1 開発環境のセットアップ

- [ ] pnpmでの依存関係管理を確認
- [ ] Biomeの導入（ESLint/Prettierから移行）
- [ ] Vitestの導入
- [ ] tsconfig.jsonのstrict mode有効化

#### 1.2 プロジェクト構造の整備

- [ ] ディレクトリ構造の作成（domain, application, interface, infrastructure, bootstrap, shared, webview）
- [ ] 共有ユーティリティの設置（logger等）
- [ ] neverthrowの導入（Result型）
- [ ] Zodの導入（バリデーション）
- [ ] tslogの導入（ロギング）

#### 1.3 WebView環境の構築

- [ ] Viteプロジェクトの作成（webview/配下）
- [ ] Reactの設定
- [ ] Tailwind CSS v3の設定
- [ ] shadcn/uiの導入
- [ ] Extension ⇔ WebView通信の基盤実装

---

### Phase 2: ドメイン層の実装

**目標**: ビジネスロジックの中核をTDDで実装する

#### 2.1 エンティティ・値オブジェクト

- [ ] `Task` エンティティの定義
  - id, title, status, path, checkbox状態, メタデータ
- [ ] `Path` 値オブジェクトの定義
  - 見出し階層を表現
- [ ] `Status` 値オブジェクトの定義

#### 2.2 ドメインエラー

- [ ] `TaskParseError` の定義
- [ ] `InvalidStatusError` の定義
- [ ] `TaskNotFoundError` の定義

#### 2.3 ポートインターフェース

- [ ] `TaskRepository` ポートの定義（CRUD操作）
- [ ] `ConfigProvider` ポートの定義（設定取得）

---

### Phase 3: Markdownパーサーの実装

**目標**: Markdownファイルからタスクを抽出・更新する機能を実装

#### 3.1 パーサー実装

- [ ] チェックボックス行の認識
- [ ] 見出し階層の解析（パス抽出）
- [ ] 子要素の解析（`key: value`形式）
- [ ] 引用・コードブロック内の除外
- [ ] フロントマターのパース

#### 3.2 シリアライザー実装

- [ ] タスクの変更をMarkdownに反映
- [ ] ステータス変更時のチェックボックス連動
- [ ] 新規タスクの挿入
- [ ] タスクの削除

---

### Phase 4: アプリケーション層の実装

**目標**: ユースケースを実装する

#### 4.1 ユースケース

- [ ] `GetTasksUseCase` - タスク一覧取得
- [ ] `CreateTaskUseCase` - タスク作成
- [ ] `UpdateTaskUseCase` - タスク更新
- [ ] `DeleteTaskUseCase` - タスク削除
- [ ] `ChangeTaskStatusUseCase` - ステータス変更
- [ ] `GetConfigUseCase` - 設定取得

---

### Phase 5: インフラストラクチャ層の実装

**目標**: 外部システム（VSCode API、ファイルシステム）との連携を実装

#### 5.1 ポート実装

- [ ] `MarkdownTaskRepository` - Markdownファイルからのタスク操作
- [ ] `VscodeConfigProvider` - VSCode設定の取得
- [ ] `FrontmatterConfigProvider` - フロントマターからの設定取得

#### 5.2 クライアント実装

- [ ] `VscodeDocumentClient` - VSCodeドキュメント操作
- [ ] `WorkspaceEditClient` - WorkspaceEdit API操作

---

### Phase 6: インターフェース層の実装

**目標**: 外部からのリクエストを受け付け、ユースケースを呼び出す

#### 6.1 ポート実装

- [ ] `TaskController` - タスク操作のエントリーポイント
- [ ] `ConfigController` - 設定操作のエントリーポイント

#### 6.2 WebView通信クライアント

- [ ] `WebViewMessageDispatcher` - WebViewへのメッセージ送信
- [ ] `WebViewMessageHandler` - WebViewからのメッセージ受信

---

### Phase 7: WebView UIの実装

**目標**: カンバンボードUIをReactで実装する

#### 7.1 コンポーネント

- [ ] `KanbanBoard` - ボード全体
- [ ] `Column` - ステータスカラム
- [ ] `TaskCard` - タスクカード
- [ ] `TaskModal` - タスク作成・編集モーダル
- [ ] `PathBadge` - パスバッジ

#### 7.2 ドラッグ&ドロップ

- [ ] 列間のドラッグ&ドロップ実装
- [ ] ステータス変更の反映

#### 7.3 Extension通信

- [ ] カスタムフック `useVscodeApi` の実装
- [ ] メッセージ送受信の実装

---

### Phase 8: ブートストラップ層の実装

**目標**: アプリケーションのエントリーポイントと依存性注入を実装

#### 8.1 エントリーポイント

- [ ] `activate` 関数の実装
- [ ] `deactivate` 関数の実装

#### 8.2 依存性注入

- [ ] DIコンテナの構築
- [ ] 各層のインスタンス生成と注入

#### 8.3 コマンド登録

- [ ] `markdownKanban.openBoard` コマンドの登録
- [ ] エディタ右上のアクションボタン設定

#### 8.4 WebViewパネル

- [ ] WebViewPanelの生成
- [ ] Reactアプリのロード

---

### Phase 9: 設定機能の実装

**目標**: 設定の定義と読み込みを実装

#### 9.1 VSCode設定スキーマ

- [ ] `package.json` にconfiguration項目を追加
  - statuses, doneStatuses, defaultStatus, defaultDoneStatus
  - sortBy, syncCheckboxWithDone

#### 9.2 設定解決ロジック

- [ ] フロントマター → VSCode設定 → デフォルト の優先順位実装

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

1. Phase 1の開発環境セットアップから開始
2. TDDでドメイン層を実装
3. 各フェーズ完了後にレビュー・調整

---

## 関連ドキュメント

- [技術原則（CONSTITUTION.md）](./CONSTITUTION.md)
- [要件定義書（REQUIREMENTS.md）](./REQUIREMENTS.md)

---

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2025-01-XX | 初版作成 |
