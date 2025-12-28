# MD Tasks - 技術原則（Constitution）

このドキュメントは、プロジェクト全体を通じて守るべき不変の原則を定義する。

---

## 基本方針

- **シンプルさを優先**: 複雑な実装より、シンプルで信頼性の高い実装を選ぶ
- **テスト駆動開発（TDD）**: ビジネスロジックは必ずテストを先に書く
- **型安全性**: TypeScriptの型システムを最大限活用する
- **明示的なエラーハンドリング**: 例外ではなくResult型で失敗を表現する

---

## 技術スタック

### 開発環境管理

| 項目 | 採用技術 |
|------|----------|
| 開発環境管理 | devbox（Nixベース） |

- **devbox**: Nixベースの開発環境管理ツール
- Node.js、pnpmなどの開発ツールはdevboxで管理
- `devbox.json` でパッケージバージョンを固定
- CI/CDでも同じ環境を再現可能

### ランタイム・言語

| 項目 | 採用技術 |
|------|----------|
| 言語 | TypeScript（strict mode） |
| ランタイム | Node.js 24 |
| パッケージマネージャ | pnpm |

### バージョン方針

- **最新版を優先**: 特に問題がない限り、全てのライブラリは最新版を使用する
- **定期的な更新**: 依存ライブラリは定期的に最新版へ更新する
- **破壊的変更への対応**: メジャーバージョンアップ時は変更内容を確認してから更新

### セマンティックバージョニング

プロジェクトのバージョン管理はセマンティックバージョニング（SemVer）に従う。

```
MAJOR.MINOR.PATCH（例: v1.2.3）

- MAJOR: 後方互換性のない変更
- MINOR: 後方互換性のある機能追加
- PATCH: 後方互換性のあるバグ修正
```

### リリースフロー

```
1. release/vX.X.X ブランチを作成
      ↓
2. CHANGELOG.md を更新
      ↓
3. package.json のバージョンを更新
      ↓
4. PRを作成してmainにマージ
      ↓
5. タグをリリース（vX.X.X）
      ↓
6. GitHub Actionsが自動でパッケージング・リリース
```

### プロジェクトスキャフォールディング

VSCode拡張の初期構築には公式推奨のツールを使用する。

- **Yeoman**: スキャフォールディングツール
- **VS Code Extension Generator**: VSCode拡張用ジェネレーター
- 参照: https://code.visualstudio.com/api/get-started/your-first-extension

### フレームワーク・ライブラリ

| 項目 | 採用技術 | 用途 |
|------|----------|------|
| WebView UI | React | ボードUIの構築 |
| CSSフレームワーク | Tailwind CSS v4 | スタイリング |
| UIコンポーネント | shadcn/ui | 再利用可能なUIコンポーネント |
| ビルドツール | Vite | バンドル・開発サーバー |
| テスト | Vitest | ユニットテスト・統合テスト |
| Linter/Formatter | Biome | コード品質・フォーマット |
| バリデーション | Zod | スキーマ定義・バリデーション |
| エラーハンドリング | neverthrow | Result型によるエラー管理 |
| ロギング | カスタムLogger | VSCode OutputChannel統合 |
| Markdownパース | remark + remark-gfm | AST生成、GFM対応 |
| フロントマター | gray-matter | YAMLフロントマターのパース |
| D&D | @dnd-kit/core | React用ドラッグ&ドロップ |

---

## アーキテクチャ

### クリーンアーキテクチャの採用

依存関係は内側から外側への一方向のみ許可する。

```
┌─────────────────────────────────────────────────────────┐
│ Bootstrap層                                              │
│  - エントリーポイント（activate関数）                      │
│  - 依存性注入（DI）                                       │
├─────────────────────────────────────────────────────────┤
│ Interface層                         Infrastructure層     │
│  - Adapter（Portの実装）            - Adapter（Portの実装）│
│  - Client（外部との通信）           - Client（外部連携）   │
│  - DTO変換、エラーログ出力          - ドメインエラー変換   │
├─────────────────────────────────────────────────────────┤
│ Application層                                            │
│  - ユースケース                                           │
│  - Port（インターフェース定義）                            │
├─────────────────────────────────────────────────────────┤
│ Domain層                                                 │
│  - エンティティ                                           │
│  - 値オブジェクト                                         │
│  - ドメインエラー定義                                     │
│  - Port（インターフェース定義）                            │
└─────────────────────────────────────────────────────────┘
```

### Port / Adapter / Client の定義

| 用語 | 意味 | 配置場所 |
|------|------|----------|
| **Port** | インターフェース（契約） | Domain層 / Application層 |
| **Adapter** | Portの実装クラス | Interface層 / Infrastructure層 |
| **Client** | 外部システムとの通信を担当 | Interface層 / Infrastructure層 |

```
Port（インターフェース）
  ↑ implements
Adapter（実装）
  ↓ uses
Client（外部システムラッパー）
  ↓ calls
外部システム（VSCode API, remark, ファイルシステム等）
```

### Port の種類と配置

ヘキサゴナルアーキテクチャにおけるPort分類：

| Port種類 | 定義場所 | 実装場所 | 役割 | 例 |
|---------|---------|---------|------|-----|
| **Driving Port（駆動側）** | Application層 | Interface層 | 外部→アプリを呼び出す入口 | TaskController |
| **Driven Port（被駆動側）** | Domain層 | Infrastructure層 | アプリ→外部を呼び出す出口 | TaskRepository, ConfigProvider |

```
┌──────────────────────────────────────────────────────────────┐
│                        Interface層                           │
│  Adapter: TaskController, WebViewMessageHandler              │
│          ↓ implements                                        │
├──────────────────────────────────────────────────────────────┤
│                       Application層                          │
│  Driving Port: ← 外部からの呼び出しを受ける                    │
│  UseCase: GetTasksUseCase, UpdateTaskUseCase                 │
│          ↓ uses                                              │
├──────────────────────────────────────────────────────────────┤
│                        Domain層                              │
│  Driven Port: → 外部リソースへアクセスする契約                  │
│  Port: TaskRepository, ConfigProvider                        │
│          ↑ implements                                        │
├──────────────────────────────────────────────────────────────┤
│                    Infrastructure層                          │
│  Adapter: MarkdownTaskRepository, VscodeConfigProvider       │
│          ↓ uses                                              │
│  Client: RemarkClient, VscodeDocumentClient                  │
└──────────────────────────────────────────────────────────────┘
```

#### 配置ルール

- **Client**: 外部システム・層境界ごとに1つ
  - Infrastructure: `remarkClient`, `vscodeFileClient` など
  - Interface: `webviewClient`, `commandDispatcher` など
- **Adapter**: Portごとに1つ（Clientに依存することもある）
  - `MarkdownTaskRepository` implements `TaskRepository`
  - `VscodeConfigProvider` implements `ConfigProvider`

### ディレクトリ構成

```
src/
├── domain/           # ドメイン層
│   ├── entities/     # エンティティ
│   ├── valueObjects/ # 値オブジェクト
│   ├── errors/       # ドメインエラー
│   └── ports/        # Port（インターフェース定義）
│
├── application/      # アプリケーション層
│   ├── usecases/     # ユースケース
│   └── ports/        # Port（インターフェース定義）
│
├── interface/        # インターフェース層
│   ├── adapters/     # Adapter（Portの実装）
│   └── clients/      # Client（WebView通信、dispatcher等）
│
├── infrastructure/   # インフラストラクチャ層
│   ├── adapters/     # Adapter（Portの実装）
│   └── clients/      # Client（remark, VSCode API等のラッパー）
│
├── bootstrap/        # ブートストラップ層
│   ├── extension.ts  # VSCode拡張エントリーポイント
│   └── di/           # 依存性注入
│
├── shared/           # 共有ユーティリティ（アーキテクチャ対象外）
│   └── logger/       # ロギング
│
└── webview/          # WebView（React、別構成）
    ├── components/
    ├── hooks/
    └── App.tsx
```

### 層の責務

#### Domain層
- ビジネスルールの中核
- 外部依存を持たない純粋なロジック
- 全てのドメインエラーを定義

#### Application層
- ユースケース（アプリケーションのビジネスロジック）
- ポートインターフェースの定義
- ドメイン層のみに依存

#### Interface層
- 外部からのリクエストを受け付ける
- DTOを使ってユースケースを呼び出す
- エラーログの出力
- **adapters/**: Portの実装（ユースケース呼び出し等）
- **clients/**: dispatcher、WebView通信など

#### Infrastructure層
- ドメイン層で定義されたポートの実装
- 外部システムとの連携（VSCode API、ファイルシステム等）
- 外部エラーをドメインエラーに変換
- **adapters/**: Portの実装（Repository、Provider等）
- **clients/**: 外部システムごとのラッパー（remark、VSCode API等）

#### Bootstrap層
- アプリケーションのエントリーポイント
- 依存性注入（DI）の設定
- VSCode拡張のactivate/deactivate

#### Shared
- クリーンアーキテクチャの対象外
- ロギング等の横断的関心事

#### WebView
- React UIコンポーネント
- 標準hooks（useState, useReducer等）で状態管理
- Extension本体とはpostMessageで通信

---

## テスト戦略

### TDD（テスト駆動開発）

ビジネスロジック（Domain層・Application層）は必ずTDDで開発する。

1. **Red**: 期待する振る舞いをブラックボックス的に記述したテストを書く
2. **Green**: テストが通る最小限の実装を書く
3. **Refactor**: コードを整理する

### テストの種類と対象

| テスト種別 | 対象層 | 方針 |
|-----------|--------|------|
| ユニットテスト | Domain, Application | 必須、TDDで先に書く |
| 統合テスト | Interface, Infrastructure | 外部依存を含むテスト |
| E2Eテスト | 全体 | MVP時点では任意 |

### テストの原則

- **ビジネスロジックは入念にテスト**: Domain層・Application層の独自ロジックは全てテスト
- **外側はシンプルに**: Interface層・Infrastructure層は信頼性の高いシンプルな実装にとどめる
- **モック**: vitestのビルトイン（vi.fn, vi.mock）を使用
- **ポートのテスト**: テスト用のスタブ実装を注入

### カバレッジ目標

コードカバレッジの閾値を設定し、品質を維持する。

| 指標 | 閾値 |
|------|------|
| Statements | 80% |
| Branches | 70% |
| Functions | 85% |
| Lines | 80% |

---

## エラーハンドリング

### 基本原則

- **try-catchは外部関数呼び出しのみ**: ビジネスロジック内部ではtry-catchを使わない
- **Result型で管理**: neverthrowのResult型（Ok/Err）で成功・失敗を表現
- **ドメインエラー**: 全てのビジネスエラーはDomain層で定義
- **エラー変換**: Infrastructure層で外部エラーをドメインエラーに変換

### エラーの流れ

```
外部システムエラー
    ↓ Infrastructure層でキャッチ
ドメインエラーに変換
    ↓ Result.err() として返却
Application層でハンドリング
    ↓ Result型のまま返却
Interface層でログ出力・レスポンス変換
```

### コード例

```typescript
// Domain層: エラー定義
export class TaskNotFoundError extends Error {
  readonly _tag = "TaskNotFoundError";
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
  }
}

// Application層: Result型で返却
export const getTask = (taskId: string): Result<Task, TaskNotFoundError> => {
  const task = repository.find(taskId);
  if (!task) {
    return err(new TaskNotFoundError(taskId));
  }
  return ok(task);
};
```

---

## ロギング

### 実装

カスタムLoggerを使用し、VSCodeのOutputChannelに出力する。
実装は `src/shared/logger/` に配置。

### ログレベルと出力場所

| ログレベル | 出力場所 | 用途 |
|-----------|----------|------|
| error | Interface層 | エラー発生時 |
| info | Interface層のポート呼び出し | 主要な処理の記録 |
| debug | ユースケース入口/出口、インフラポート入口/出口 | デバッグ情報 |
| warn | 任意 | 警告 |
| silly/trace | 任意 | 詳細なデバッグ |

### ログ出力ルール

```typescript
// Interface層: info + error
logger.info("Processing request", { action: "createTask" });
logger.error("Request failed", { error });

// Application層（ユースケース）: debug（入口/出口）
logger.debug("UseCase:CreateTask - start", { input });
logger.debug("UseCase:CreateTask - end", { result });

// Infrastructure層（ポート実装）: debug（入口/出口）
logger.debug("Port:TaskRepository.save - start", { task });
logger.debug("Port:TaskRepository.save - end", { success: true });
```

---

## バリデーション

### Zodの積極活用

- 外部入力のバリデーション
- DTOのスキーマ定義
- 設定ファイルのパース
- フロントマターのパース

### 例

```typescript
import { z } from "zod";

export const TaskSchema = z.object({
  title: z.string().min(1),
  status: z.string(),
  path: z.array(z.string()),
});

export type TaskDTO = z.infer<typeof TaskSchema>;
```

---

## コーディング規約

### 全般

- Biomeの設定に従う
- TypeScript strict modeを有効化
- 明示的な型アノテーションを推奨（推論に頼りすぎない）

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル名 | camelCase（コンポーネントはPascalCase） | `createTask.ts`, `TaskCard.tsx` |
| クラス | PascalCase | `TaskRepository` |
| インターフェース | PascalCase（I接頭辞なし） | `TaskRepository` |
| 型 | PascalCase | `Task`, `TaskDTO` |
| 関数 | camelCase | `createTask` |
| 変数 | camelCase | `taskList` |
| 定数 | UPPER_SNAKE_CASE | `DEFAULT_STATUS` |
| エラークラス | PascalCase + Error | `TaskNotFoundError` |

### インポート順序

1. Node.js組み込みモジュール
2. 外部ライブラリ
3. 内部モジュール（domain → application → interface → infrastructure → shared）
4. 相対インポート

---

## WebView（React）

### 構成

- クリーンアーキテクチャとは別構成（シンプルに保つ）
- 標準hooks（useState, useReducer）で状態管理
- 複雑になったら後からzustand等を検討

### スタイリング

- **Tailwind CSS v4**: ユーティリティファーストのCSSフレームワーク
  - `@tailwindcss/vite` プラグインを使用（PostCSS不要）
  - CSS変数はoklch形式
- **shadcn/ui**: カスタマイズ可能なUIコンポーネント集
  - コンポーネントは直接プロジェクトにコピーされる方式
  - 必要なコンポーネントのみ追加

### Extension ⇔ WebView通信

- postMessageで通信
- Extension側: Interface層のclientとして実装
- WebView側: カスタムhooksで抽象化

---

## 依存関係のルール

### 許可される依存方向

```
Bootstrap → Interface, Infrastructure, Application, Domain, Shared
Interface → Application, Domain, Shared
Infrastructure → Domain, Shared
Application → Domain
Domain → （なし、純粋）
Shared → （外部ライブラリのみ）
```

### 禁止される依存

- Domain層から他の層への依存
- Application層からInterface/Infrastructure層への依存
- 循環依存

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-01-XX | 初版作成 |