import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TaskDto } from '../../types';
import { PathBadge } from './PathBadge';

interface TaskCardProps {
	task: TaskDto;
	onClick?: (task: TaskDto) => void;
	isDragging?: boolean;
}

/**
 * タスクカードコンポーネント
 */
export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: task.id,
		data: { task },
	});

	const style = {
		transform: CSS.Translate.toString(transform),
	};

	const handleClick = () => {
		onClick?.(task);
	};

	return (
		<button
			ref={setNodeRef}
			type="button"
			style={style}
			className={cn(
				'group relative w-full text-left bg-card border border-border rounded-lg p-3 shadow-sm',
				'hover:shadow-md hover:border-primary/50 transition-all duration-200',
				'cursor-pointer select-none',
				isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
			)}
			onClick={handleClick}
		>
			{/* ドラッグハンドル */}
			<span
				{...attributes}
				{...listeners}
				className={cn(
					'absolute left-1 top-1/2 -translate-y-1/2 p-1',
					'opacity-0 group-hover:opacity-100 transition-opacity',
					'cursor-grab active:cursor-grabbing',
					'text-muted-foreground hover:text-foreground',
				)}
				onPointerDown={(e) => {
					e.stopPropagation();
					listeners?.onPointerDown?.(e);
				}}
			>
				<GripVertical className="h-4 w-4" />
			</span>

			{/* タスク内容 */}
			<span className="block pl-4">
				{/* タイトル */}
				<span
					className={cn(
						'block text-sm font-medium text-foreground break-words',
						task.isChecked && 'line-through text-muted-foreground',
					)}
				>
					{task.title}
				</span>

				{/* パスバッジ */}
				{task.path.length > 0 && (
					<span className="block mt-2">
						<PathBadge path={task.path} />
					</span>
				)}
			</span>
		</button>
	);
}

/**
 * ドラッグ中のオーバーレイ用タスクカード
 */
export function TaskCardOverlay({ task }: { task: TaskDto }) {
	return (
		<div
			className={cn(
				'bg-card border border-primary rounded-lg p-3 shadow-xl',
				'cursor-grabbing rotate-3 scale-105',
			)}
		>
			<div className="pl-4">
				<p className="text-sm font-medium text-foreground break-words">{task.title}</p>
				{task.path.length > 0 && (
					<div className="mt-2">
						<PathBadge path={task.path} />
					</div>
				)}
			</div>
		</div>
	);
}
