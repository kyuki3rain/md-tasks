import { useCallback, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { MouseEvent, KeyboardEvent } from 'react';

interface MarkdownTextProps {
	children: string;
}

/** 許可する要素のみレンダリング（セキュリティ強化） */
const ALLOWED_ELEMENTS = ['p', 'strong', 'em', 'code', 'del', 'a'] as const;

/**
 * インラインMarkdownをレンダリングするコンポーネント
 *
 * 対応する記法:
 * - **bold** / __bold__
 * - *italic* / _italic_
 * - `code`
 * - ~~strikethrough~~
 * - [link](url)
 */
export function MarkdownText({ children }: MarkdownTextProps) {
	const handleLinkClick = useCallback((e: MouseEvent) => {
		e.stopPropagation();
	}, []);

	const handleLinkKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.stopPropagation();
			// Spaceキーのデフォルト動作（スクロール）を防止
			// Enterはリンクのデフォルト動作（遷移）を維持
			if (e.key === ' ') {
				e.preventDefault();
			}
		}
	}, []);

	const components: Components = useMemo(
		() => ({
			// <p>をインライン表示用の<span>に変換
			p: ({ children }) => <span>{children}</span>,
			// 太字
			strong: ({ children }) => <strong className="font-bold">{children}</strong>,
			// 斜体
			em: ({ children }) => <em className="italic">{children}</em>,
			// インラインコード
			code: ({ children }) => (
				<code className="px-1 py-0.5 rounded bg-muted text-sm font-mono">{children}</code>
			),
			// 打ち消し線
			del: ({ children }) => <del className="line-through">{children}</del>,
			// リンク
			a: ({ href, children }) => (
				<a
					href={href}
					onClick={handleLinkClick}
					onKeyDown={handleLinkKeyDown}
					className="text-primary underline hover:text-primary/80"
					target="_blank"
					rel="noopener noreferrer"
				>
					{children}
				</a>
			),
		}),
		[handleLinkClick, handleLinkKeyDown],
	);

	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			components={components}
			allowedElements={[...ALLOWED_ELEMENTS]}
			unwrapDisallowed
		>
			{children}
		</Markdown>
	);
}
