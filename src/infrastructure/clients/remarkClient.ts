import matter from 'gray-matter';
import type { Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';

/**
 * フロントマター抽出結果
 */
export interface FrontmatterResult {
	/** フロントマターを除いたコンテンツ */
	content: string;
	/** フロントマターのデータ */
	data: Record<string, unknown>;
}

/**
 * RemarkClient
 * remarkライブラリとgray-matterのラッパー
 */
export class RemarkClient {
	private readonly processor = remark().use(remarkGfm);

	/**
	 * MarkdownをASTにパースする
	 */
	parseToAst(content: string): Root {
		return this.processor.parse(content) as Root;
	}

	/**
	 * フロントマターを抽出する
	 */
	parseFrontmatter(markdown: string): FrontmatterResult {
		const { content, data } = matter(markdown);
		return { content, data };
	}

	/**
	 * フロントマターの行数を計算
	 */
	countFrontmatterLines(original: string, content: string): number {
		if (original === content) {
			return 0;
		}
		const frontmatter = original.slice(0, original.length - content.length);
		return frontmatter.split('\n').length - 1;
	}
}
