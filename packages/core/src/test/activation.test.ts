import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

/**
 * Extensionがアクティブになるまでポーリングで待機する
 * @param extension 待機対象のExtension
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param intervalMs ポーリング間隔（ミリ秒）
 */
async function waitForActivation(
	extension: vscode.Extension<unknown>,
	timeoutMs = 5000,
	intervalMs = 100,
): Promise<void> {
	const startTime = Date.now();
	while (!extension.isActive) {
		if (Date.now() - startTime > timeoutMs) {
			throw new Error(`Extension ${EXTENSION_ID} did not activate within ${timeoutMs}ms`);
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

suite('Extension Activation', () => {
	// 各テスト後にエディタをクリーンアップ
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('Markdownファイルを開くとExtensionがアクティベートされる', async () => {
		// Markdownファイルを作成して開く
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1',
		});
		await vscode.window.showTextDocument(doc);

		// Extensionを取得
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		// Extensionがアクティベートされるまでポーリングで待機
		await waitForActivation(extension);

		assert.strictEqual(
			extension.isActive,
			true,
			'Extension should be active after opening a Markdown file',
		);
	});

	test('アクティベート後に必要なコマンドが登録されている', async () => {
		// このテスト内でExtensionをアクティベートする（テストの独立性を保証）
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		await extension.activate();

		// 登録されているコマンド一覧を取得
		const commands = await vscode.commands.getCommands(true);

		// 必要なコマンドが登録されていることを確認
		assert.ok(
			commands.includes('mdTasks.openBoard'),
			'mdTasks.openBoard command should be registered',
		);
		assert.ok(
			commands.includes('mdTasks.openBoardFromEditor'),
			'mdTasks.openBoardFromEditor command should be registered',
		);
	});
});
