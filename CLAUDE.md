# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供する。

## クイックスタート

詳細なプロジェクト情報は [@AGENTS.md](./AGENTS.md) を参照。

## プロジェクト概要

Markdown Kanban - Markdownファイル内のTODOリストをカンバンボード形式で表示・操作するVSCode拡張機能。

## 重要なドキュメント

- [@AGENTS.md](./AGENTS.md) - AIエージェント向け総合ガイド
- [docs/CONSTITUTION.md](./docs/CONSTITUTION.md) - 技術原則（不変）
- [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) - 要件定義書
- [docs/MVP_PLAN.md](./docs/MVP_PLAN.md) - MVP実装計画

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# コンパイル
pnpm run compile

# テスト実行
pnpm run test

# 型チェック
pnpm run check-types

# Lint
pnpm run lint
```

## アーキテクチャ

クリーンアーキテクチャ採用。詳細は [@AGENTS.md](./AGENTS.md) を参照。

## 開発時の注意

1. TDDを遵守（Domain層・Application層）
2. Result型でエラー管理（neverthrow）
3. 依存方向: Domain → Application → Interface/Infrastructure → Bootstrap
4. CONSTITUTIONの技術原則は不変
