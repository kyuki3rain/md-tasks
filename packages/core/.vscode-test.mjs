import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: '../../out/test/**/*.test.js',
	// 拡張機能のルートディレクトリを指定
	extensionDevelopmentPath: '../..',
});
