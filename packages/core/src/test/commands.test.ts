import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

suite('Command Tests', () => {
	// 各テスト前にExtensionをアクティベート
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		if (!extension.isActive) {
			await extension.activate();
		}
	});

	// 各テスト後にパネルをクリーンアップ
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('mdTasks.openBoard コマンドが実行できる', async () => {
		// Markdownファイルを開く
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1',
		});
		await vscode.window.showTextDocument(doc);

		// コマンド実行（エラーなく完了することを確認）
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('mdTasks.openBoard');
		}, 'mdTasks.openBoard command should execute without error');
	});

	test('mdTasks.openBoardFromEditor コマンドが実行できる', async () => {
		// Markdownファイルを開く
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 2',
		});
		await vscode.window.showTextDocument(doc);

		// コマンド実行（エラーなく完了することを確認）
		await assert.doesNotReject(async () => {
			await vscode.commands.executeCommand('mdTasks.openBoardFromEditor');
		}, 'mdTasks.openBoardFromEditor command should execute without error');
	});
});
