import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

suite('Configuration Tests', () => {
	// 各テスト前にExtensionをアクティベート＆設定をリセット
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		if (!extension.isActive) {
			await extension.activate();
		}

		// 設定をデフォルトにリセット
		const config = vscode.workspace.getConfiguration('mdTasks');
		await config.update('statuses', undefined, vscode.ConfigurationTarget.Global);
	});

	// 各テスト後に設定をクリーンアップ
	teardown(async () => {
		const config = vscode.workspace.getConfiguration('mdTasks');
		await config.update('statuses', undefined, vscode.ConfigurationTarget.Global);
	});

	test('デフォルト設定値が正しく読み込まれる', () => {
		const config = vscode.workspace.getConfiguration('mdTasks');

		// statuses のデフォルト値
		const statuses = config.get<string[]>('statuses');
		assert.deepStrictEqual(
			statuses,
			['todo', 'in-progress', 'done'],
			'Default statuses should be ["todo", "in-progress", "done"]',
		);

		// doneStatuses のデフォルト値
		const doneStatuses = config.get<string[]>('doneStatuses');
		assert.deepStrictEqual(doneStatuses, ['done'], 'Default doneStatuses should be ["done"]');

		// defaultStatus のデフォルト値
		const defaultStatus = config.get<string>('defaultStatus');
		assert.strictEqual(defaultStatus, 'todo', 'Default defaultStatus should be "todo"');

		// defaultDoneStatus のデフォルト値
		const defaultDoneStatus = config.get<string>('defaultDoneStatus');
		assert.strictEqual(defaultDoneStatus, 'done', 'Default defaultDoneStatus should be "done"');

		// sortBy のデフォルト値
		const sortBy = config.get<string>('sortBy');
		assert.strictEqual(sortBy, 'markdown', 'Default sortBy should be "markdown"');

		// syncCheckboxWithDone のデフォルト値
		const syncCheckboxWithDone = config.get<boolean>('syncCheckboxWithDone');
		assert.strictEqual(syncCheckboxWithDone, true, 'Default syncCheckboxWithDone should be true');
	});

	test('カスタム設定が反映される', async () => {
		// カスタム設定を適用
		const customStatuses = ['backlog', 'doing', 'review', 'done'];
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('statuses', customStatuses, vscode.ConfigurationTarget.Global);

		// 設定が反映されていることを確認（getConfigurationを再取得）
		const updatedStatuses = vscode.workspace.getConfiguration('mdTasks').get<string[]>('statuses');
		assert.deepStrictEqual(updatedStatuses, customStatuses, 'Custom statuses should be applied');

		// 設定のリセットはteardownで自動的に行われる
	});
});
