import { cn } from '../../lib/utils';

interface PathBadgeProps {
	path: string[];
	className?: string;
}

/**
 * パスをバッジとして表示するコンポーネント
 */
export function PathBadge({ path, className }: PathBadgeProps) {
	if (path.length === 0) {
		return null;
	}

	const pathString = path.join(' / ');

	return (
		<span
			className={cn(
				'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
				'bg-muted text-muted-foreground',
				'truncate max-w-full',
				className,
			)}
			title={pathString}
		>
			{pathString}
		</span>
	);
}
