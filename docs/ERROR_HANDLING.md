# エラーハンドリング設計

このドキュメントでは、MD Tasksにおけるドメインエラーの種類、発生要因、およびハンドリング方針を定義する。

---

## エラー型一覧

| エラー型 | 説明 | 主な発生箇所 |
|---------|------|-------------|
| `NoActiveEditorError` | エディタが非アクティブ | TaskRepository |
| `TaskNotFoundError` | 指定IDのタスクが存在しない | TaskRepository.delete |
| `TaskParseError` | タスクのパースに失敗 | TaskRepository.findAll等 |
| `DocumentOperationError` | ドキュメント操作全般の失敗 | TaskRepository.save/delete |
| `InvalidStatusError` | 無効なステータス値 | Status値オブジェクト |

---

## エラー詳細

### NoActiveEditorError

**説明**: VSCodeでアクティブなテキストエディタが存在しない状態。

**発生要因**:
- WebViewパネルにフォーカスがある
- 全てのエディタが閉じられている
- サイドバーやターミナルにフォーカスがある

**発生箇所**:
- `VscodeDocumentClient.getCurrentDocumentText()`
- `VscodeDocumentClient.replaceDocumentText()`

**ハンドリング方針**:
- ユーザーへの通知は不要（正常な状態遷移の一つ）
- WebViewは最後に開いていたドキュメントのURIをキャッシュして対応

---

### TaskNotFoundError

**説明**: 指定されたIDのタスクがドキュメント内に存在しない。

**発生要因**:
- 既に削除されたタスクを操作しようとした
- 外部からドキュメントが編集され、タスクが消えた
- IDの指定ミス（通常は発生しない）

**発生箇所**:
- `TaskRepository.findById()`: 指定IDのタスクが見つからない
- `TaskRepository.delete()`: 削除対象のタスクが見つからない

**ハンドリング方針**:
- ユーザーに「タスクが見つかりません」と通知
- WebViewのタスク一覧を再読み込み

**注意**: `TaskRepository.save()`では発生しない。存在確認後に見つからなければ新規作成として処理する。

---

### TaskParseError

**説明**: Markdownドキュメントからタスクを抽出する際のパースエラー。

**発生要因**:
- Markdownの構文が不正
- 予期しないドキュメント構造

**発生箇所**:
- `TaskRepository.findAll()`
- `TaskRepository.findById()`
- `TaskRepository.findByPath()`
- `TaskRepository.getAvailablePaths()`

**ハンドリング方針**:
- ユーザーに「ドキュメントの解析に失敗しました」と通知
- 可能であれば行番号を含めてエラー箇所を特定

---

### DocumentOperationError

**説明**: ドキュメントの読み込み、パース、編集生成、書き込みのいずれかで発生した操作エラー。

**発生要因**:

| フェーズ | 要因 | 元のエラー |
|---------|------|-----------|
| 読み込み | ファイルが存在しない/開けない | `DocumentNotFoundError` |
| パース | Markdownの構文エラー | `MarkdownParseError` |
| 編集生成 | 見出しが見つからない、編集適用失敗 | `SerializerError` |
| 書き込み | ファイルへの書き込み失敗 | `DocumentEditError` |
| 書き込み | 書き込み中にファイルが消えた | `DocumentNotFoundError` |

**発生箇所**:
- `TaskRepository.save()`: タスクの作成・更新時
- `TaskRepository.delete()`: タスクの削除時

**ハンドリング方針**:
- ユーザーに「ドキュメントの操作に失敗しました: {詳細メッセージ}」と通知
- エラーメッセージに詳細な原因を含める（デバッグ用）

---

### InvalidStatusError

**説明**: ステータス値が無効（空文字列など）。

**発生要因**:
- 空のステータス値を指定
- 許可されていない文字を含むステータス

**発生箇所**:
- `Status.create()`

**ハンドリング方針**:
- バリデーションエラーとしてユーザーに通知

---

## エラーの伝播フロー

```text
Infrastructure層                    Domain層
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VscodeDocumentClient                TaskRepository Port
├─ NoActiveEditorError ──────────→ NoActiveEditorError
├─ DocumentNotFoundError ────────→ DocumentOperationError
└─ DocumentEditError ────────────→ DocumentOperationError

MarkdownTaskClient
├─ MarkdownParseError ───────────→ TaskParseError (findAll等)
│                                  DocumentOperationError (save/delete)
└─ SerializerError ──────────────→ DocumentOperationError
```

---

## レイヤー別の責務

### Infrastructure層 (Client)

- 外部システム固有のエラーをスロー
- エラーの詳細情報（メッセージ）を保持

### Infrastructure層 (Adapter)

- Client層のエラーをDomain層のエラーに変換
- 複数のClient層エラーを適切なDomain層エラーにマッピング

### Application層 (UseCase)

- Domain層のエラーをそのまま伝播
- 追加のビジネスロジックエラーがあれば定義

### Interface層 (Controller)

- エラーをユーザー向けメッセージに変換
- ログ出力

---

## 設計原則

1. **意味的正確性**: エラー型は実際に発生した事象を正確に表現する
2. **MECE**: エラー型は互いに排他的で、全ての事象をカバーする
3. **シンプルさ**: 必要以上に細分化しない
4. **デバッグ容易性**: エラーメッセージに詳細情報を含める
5. **レイヤー分離**: Infrastructure層のエラーはDomain層に直接露出しない
