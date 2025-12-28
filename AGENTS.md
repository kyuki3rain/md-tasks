# AGENTS.md - AIエージェント向けガイド

このドキュメントは、AIエージェントがこのプロジェクトで作業する際のガイドラインを提供する。

---

## プロジェクト概要

**MD Tasks** は、Markdownファイル内のTODOリスト（チェックボックス）をカンバンボード形式で表示・操作できるVSCode拡張機能。

### 主な特徴

- Markdownの標準記法を尊重（素のMarkdownとしても可読性を維持）
- 見出し階層を「パス」として解釈し、タスクのグルーピングに使用
- WebViewパネルでカンバンボードを表示
- エディタとボードの双方向同期

---

## ドキュメント構成

| ドキュメント | 説明 | パス |
|-------------|------|------|
| 技術原則 | 不変の技術原則・アーキテクチャ・コーディング規約 | [docs/CONSTITUTION.md](./docs/CONSTITUTION.md) |
| 要件定義書 | 機能要件・UI仕様・設定項目 | [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) |
| MVP実装計画 | v0.1.0達成のための実装計画・フェーズ定義 | [docs/MVP_PLAN.md](./docs/MVP_PLAN.md) |

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| 開発環境管理 | devbox（Nixベース） |
| 言語 | TypeScript（strict mode） |
| ランタイム | Node.js 24 |
| パッケージマネージャ | pnpm (workspace) |
| WebView UI | React |
| CSSフレームワーク | Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui |
| ビルドツール | Vite |
| テスト | Vitest |
| Linter/Formatter | Biome |
| バリデーション | Zod |
| エラーハンドリング | neverthrow（Result型） |
| ロギング | カスタムLogger（VSCode OutputChannel統合） |

---

## 開発環境セットアップ

このプロジェクトは **devbox** を使用して開発環境を管理する。devboxはNixベースのパッケージマネージャで、Node.jsやpnpmを含む開発ツールをプロジェクトごとに隔離して管理できる。

### 前提条件

- devboxがインストールされていること

### devboxのインストール（未インストールの場合）

```bash
curl -fsSL https://get.jetify.com/devbox | bash
```

### ゼロからの環境構築手順

```bash
# 1. devbox環境をセットアップ（pnpm, Node.js 24をインストール）
devbox install

# 2. 依存関係のインストール
devbox run setup
```

これで開発準備が完了する。

---

## 開発コマンド

全てのコマンドは `devbox run <command>` で実行する。devbox shellに入っている場合は `pnpm run <command>` でも可。

### 基本コマンド

| コマンド | 説明 |
|---------|------|
| `devbox run setup` | 依存関係のインストール（pnpm install） |
| `devbox run compile` | ビルド（型チェック + Lint + コンパイル） |
| `devbox run check-types` | 型チェックのみ |
| `devbox run lint` | Lint |
| `devbox run lint:fix` | Lint（自動修正） |
| `devbox run format` | フォーマット |
| `devbox run ci` | CI用チェック（型チェック + Lint + テスト） |

### テスト

| コマンド | 説明 |
|---------|------|
| `devbox run test` | テスト実行 |
| `devbox run test:watch` | テスト（ウォッチモード） |
| `devbox run test:coverage` | テスト（カバレッジ付き） |
| `devbox run test:e2e` | E2Eテスト |

### 開発モード

| コマンド | 説明 |
|---------|------|
| `devbox run watch` | ウォッチモード（Extension + WebView） |
| `devbox run watch:webview` | WebViewのみウォッチモード |

### パッケージング

| コマンド | 説明 |
|---------|------|
| `devbox run package` | 本番ビルド |

### devbox shellを使う場合

```bash
# devbox shellに入る
devbox shell

# shell内では通常のpnpmコマンドが使える
pnpm run test
pnpm run compile
```

---

## アーキテクチャ

pnpm workspaceを使った2パッケージ構成。クリーンアーキテクチャを採用し、依存関係は内側から外側への一方向のみ許可。

```
md-tasks/
├── packages/
│   ├── core/              # Extension本体（@md-tasks/core）
│   │   ├── src/
│   │   │   ├── domain/           # ドメイン層（ビジネスルールの中核）
│   │   │   │   └── ports/        # Port（インターフェース定義）
│   │   │   ├── application/      # アプリケーション層（ユースケース）
│   │   │   │   └── ports/        # Port（インターフェース定義）
│   │   │   ├── interface/        # インターフェース層（外部リクエスト受付）
│   │   │   │   ├── adapters/     # Adapter（Portの実装）
│   │   │   │   └── clients/      # Client（WebView通信等）
│   │   │   ├── infrastructure/   # インフラストラクチャ層（外部システム連携）
│   │   │   │   ├── adapters/     # Adapter（Portの実装）
│   │   │   │   └── clients/      # Client（remark, VSCode API等のラッパー）
│   │   │   ├── bootstrap/        # ブートストラップ層（エントリーポイント、DI）
│   │   │   └── shared/           # 共有ユーティリティ
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── webview/           # WebView（@md-tasks/webview）
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
├── package.json           # ルート（VSCode extension メタデータ）
└── pnpm-workspace.yaml
```

### Port / Adapter / Client

| 用語 | 意味 | 配置場所 |
|------|------|----------|
| **Port** | インターフェース（契約） | Domain層 / Application層 |
| **Adapter** | Portの実装 | Interface層 / Infrastructure層 |
| **Client** | 外部システムのラッパー | Interface層 / Infrastructure層 |

- **Client**: 外部システムごとに1つ（AdapterはClientに依存することもある）
- **Adapter**: Portごとに1つ

詳細は [docs/CONSTITUTION.md](./docs/CONSTITUTION.md) を参照。

---

## 開発ガイドライン

### 必須事項

1. **TDDを遵守**: Domain層・Application層のビジネスロジックは必ずテストを先に書く
2. **Result型でエラー管理**: try-catchはインフラ層の外部呼び出しのみ。ビジネスロジック内ではneverthrowのResult型を使用
3. **型安全性**: TypeScript strict modeを有効化し、明示的な型アノテーションを推奨
4. **依存方向の遵守**: 内側の層から外側の層への依存は禁止

### コーディング規約

- Biomeの設定に従う
- ファイル名: camelCase（コンポーネントはPascalCase）
- クラス/型/インターフェース: PascalCase
- 関数/変数: camelCase
- 定数: UPPER_SNAKE_CASE
- エラークラス: PascalCase + Error接尾辞

### ログ出力ルール

| 層 | ログレベル | 用途 |
|---|-----------|------|
| Interface層 | info, error | 主要な処理の記録、エラー発生時 |
| Application層 | debug | ユースケース入口/出口 |
| Infrastructure層 | debug | ポート入口/出口 |

---

## よくある作業

### 新機能の実装

1. まず [docs/MVP_PLAN.md](./docs/MVP_PLAN.md) で該当フェーズを確認
2. Domain層から実装開始（TDDで）
3. Application層 → Infrastructure層 → Interface層 の順で実装
4. WebView側の変更が必要な場合は最後に実装

### バグ修正

1. まずテストで再現
2. テストがパスするよう修正
3. リファクタリング

### 設定の追加

1. [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) の設定セクションを確認
2. `package.json` のconfiguration項目を更新
3. ConfigProviderポートを更新

### カバレッジ分析

品質チェックやリファクタリング時にカバレッジを確認する。

```bash
pnpm run test:coverage
```

- レポート出力先: `packages/core/coverage/`
- HTMLレポート: `packages/core/coverage/index.html` をブラウザで開く
- 閾値: statements 80%, branches 70%, functions 85%, lines 80%

### Issue/PR本文記述

Issue や PR の本文でコード例を示す際、コードブロックが二重になることでMarkdownの整形が崩れる場合がある。これを防ぐため、PRの本文全体を示すコードブロックには **4つのバッククォート** を使用する。

````markdown
本文全体のコードブロックのみ、**4つのバッククォート** を使

```typescript
// 本文中のコードブロックは3つのバッククォートを使用
const example = "inner code block uses 3 backticks";
```
````

この規約により、内側の3つのバッククォートと外側が干渉せず、正しく表示される。

---

## 注意事項

- `docs/CONSTITUTION.md` の技術原則は不変。変更が必要な場合はユーザーに確認すること
- pnpm workspaceを使用。`packages/core`（Extension本体）と`packages/webview`（WebView UI）の2パッケージ構成
- WebViewはExtension本体と別のビルド構成。ビルド出力はルートの`dist/`に配置される

---

## 関連リソース

- [VSCode Extension API](https://code.visualstudio.com/api)
- [React ドキュメント](https://react.dev/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [shadcn/ui ドキュメント](https://ui.shadcn.com/)
