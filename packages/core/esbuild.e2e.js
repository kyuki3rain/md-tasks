const esbuild = require("esbuild");
const fs = require("node:fs");

const watch = process.argv.includes('--watch');

async function main() {
	// テストファイルを検索（Node.js 22+ のネイティブglob）
	const testFiles = fs.globSync('src/test/**/*.test.ts');

	const ctx = await esbuild.context({
		entryPoints: testFiles,
		bundle: true,
		format: 'cjs',  // CommonJS出力（VSCode E2Eテストランナー用）
		platform: 'node',
		outdir: '../../out/test',
		outbase: 'src/test',
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
