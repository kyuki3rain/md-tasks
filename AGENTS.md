# AGENTS.md - AIエージェント向けガイド

このドキュメントは、AIエージェントがこのプロジェクトで作業する際のガイドラインを提供する。

---

## プロジェクト概要

**Markdown Kanban** は、Markdownファイル内のTODOリスト（チェックボックス）をカンバンボード形式で表示・操作できるVSCode拡張機能。

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
| 言語 | TypeScript（strict mode） |
| ランタイム | Node.js 24 |
| パッケージマネージャ | pnpm |
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

## 開発コマンド

### 基本コマンド

```bash
# 依存関係のインストール
pnpm install

# ビルド（型チェック + Lint + コンパイル）
pnpm run compile

# 型チェックのみ
pnpm run check-types

# Lint
pnpm run lint

# Lint（自動修正）
pnpm run lint:fix

# フォーマット
pnpm run format
```

### テスト

```bash
# テスト実行
pnpm run test

# テスト（ウォッチモード）
pnpm run test:watch

# テスト（カバレッジ付き）
pnpm run test:coverage

# E2Eテスト
pnpm run test:e2e
```

### 開発モード

```bash
# ウォッチモード（Extension + WebView）
pnpm run watch

# WebViewのみ開発サーバー
cd src/webview && pnpm run dev
```

### パッケージング

```bash
# 本番ビルド
pnpm run package
```

---

## アーキテクチャ

クリーンアーキテクチャを採用。依存関係は内側から外側への一方向のみ許可。

```
src/
├── domain/           # ドメイン層（ビジネスルールの中核）
├── application/      # アプリケーション層（ユースケース）
├── interface/        # インターフェース層（外部リクエスト受付）
├── infrastructure/   # インフラストラクチャ層（外部システム連携）
├── bootstrap/        # ブートストラップ層（エントリーポイント、DI）
├── shared/           # 共有ユーティリティ
└── webview/          # WebView（React、別構成）
```

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

## 現在のステータス

- **バージョン**: 0.0.1（開発中）
- **状態**: Phase 1（基盤構築）完了
- **次のステップ**: Phase 2（ドメイン層の実装）へ

### 完了済みフェーズ

- ✅ Phase 1: 基盤構築
  - 開発環境セットアップ（pnpm, Biome, Vitest, TypeScript strict mode）
  - プロジェクト構造整備（クリーンアーキテクチャ）
  - 共有ユーティリティ（Logger, neverthrow, Zod）
  - WebView環境構築（Vite, React, Tailwind CSS v4, shadcn/ui）

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

---

## 注意事項

- `docs/CONSTITUTION.md` の技術原則は不変。変更が必要な場合はユーザーに確認すること
- 現在はサンプルコード状態。実装開始時にディレクトリ構造を整備する必要がある
- WebViewはExtension本体と別のビルド構成になる

---

## 関連リソース

- [VSCode Extension API](https://code.visualstudio.com/api)
- [React ドキュメント](https://react.dev/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [shadcn/ui ドキュメント](https://ui.shadcn.com/)
