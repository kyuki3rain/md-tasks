const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const watch = process.argv.includes('--watch');

// このファイルがあるディレクトリ（packages/core）を基準にパスを解決
const coreDir = __dirname;
const rootDir = path.resolve(coreDir, '../..');

async function main() {
	// テストファイルを検索（Node.js 22+ のネイティブglob）
	const testFiles = fs.globSync(path.join(coreDir, 'src/test/**/*.test.ts'));

	const ctx = await esbuild.context({
		entryPoints: testFiles,
		bundle: true,
		format: 'cjs',  // CommonJS出力（VSCode E2Eテストランナー用）
		platform: 'node',
		outdir: path.join(rootDir, 'out/test'),
		outbase: path.join(coreDir, 'src/test'),
		external: ['vscode', 'mocha'],  // VSCodeとMochaは外部依存
		sourcemap: true,
		logLevel: 'info',
	});

	if (watch) {
		await ctx.watch();
		console.log('Watching for changes...');
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
