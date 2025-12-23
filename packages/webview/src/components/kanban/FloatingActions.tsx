import { RotateCcw, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FloatingActionsProps {
	isDirty: boolean;
	onSave: () => void;
	onRevert: () => void;
}

/**
 * フローティングアクションボタン
 * ドキュメントに未保存の変更がある場合に表示される
 */
export function FloatingActions({ isDirty, onSave, onRevert }: FloatingActionsProps) {
	if (!isDirty) {
		return null;
	}

	return (
		<div className="fixed bottom-6 right-6 flex gap-2 z-50">
			<button
				type="button"
				onClick={onRevert}
				className={cn(
					'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg',
					'bg-secondary text-secondary-foreground',
					'hover:bg-secondary/80 transition-colors',
					'text-sm font-medium',
				)}
				title="変更を破棄"
			>
				<RotateCcw className="h-4 w-4" />
				Discard
			</button>
			<button
				type="button"
				onClick={onSave}
				className={cn(
					'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg',
					'bg-primary text-primary-foreground',
					'hover:bg-primary/90 transition-colors',
					'text-sm font-medium',
				)}
				title="変更を保存"
			>
				<Save className="h-4 w-4" />
				Save
			</button>
		</div>
	);
}
