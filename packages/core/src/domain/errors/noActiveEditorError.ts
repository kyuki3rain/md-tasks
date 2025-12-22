/**
 * アクティブなエディタがないエラー
 * これは正常な状態遷移の一つ（WebViewにフォーカスがある場合など）
 */
export class NoActiveEditorError extends Error {
	readonly _tag = 'NoActiveEditorError';

	constructor(message = 'Markdownファイルを開いてください') {
		super(message);
		this.name = 'NoActiveEditorError';
	}
}
