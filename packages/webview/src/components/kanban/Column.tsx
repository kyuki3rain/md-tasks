import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TaskDto } from '../../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
	status: string;
	tasks: TaskDto[];
	isDone?: boolean;
	onTaskClick?: (task: TaskDto) => void;
	onAddTask?: (status: string) => void;
	activeId?: string | null;
}

/**
 * カラムコンポーネント（ステータスごとのタスク一覧）
 */
export function Column({ status, tasks, isDone, onTaskClick, onAddTask, activeId }: ColumnProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: status,
		data: { status },
	});

	const handleAddClick = () => {
		onAddTask?.(status);
	};

	return (
		<div
			className={cn(
				'flex flex-col min-w-[280px] max-w-[320px] h-full',
				'bg-muted/30 rounded-lg border border-border',
			)}
		>
			{/* カラムヘッダー */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<div className="flex items-center gap-2">
					<h2
						className={cn(
							'text-sm font-semibold uppercase tracking-wide',
							isDone ? 'text-green-600 dark:text-green-400' : 'text-foreground',
						)}
					>
						{status}
					</h2>
					<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
						{tasks.length}
					</span>
				</div>
			</div>

			{/* タスクリスト */}
			<div
				ref={setNodeRef}
				className={cn(
					'flex-1 p-2 overflow-y-auto space-y-2',
					'transition-colors duration-200',
					isOver && 'bg-primary/10 ring-2 ring-primary ring-inset',
				)}
			>
				{tasks.map((task) => (
					<TaskCard
						key={task.id}
						task={task}
						onClick={onTaskClick}
						isDragging={activeId === task.id}
					/>
				))}

				{/* 空状態 */}
				{tasks.length === 0 && !isOver && (
					<div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
						No tasks
					</div>
				)}

				{/* ドロップインジケーター */}
				{isOver && (
					<div className="h-16 border-2 border-dashed border-primary rounded-lg bg-primary/5" />
				)}
			</div>

			{/* 追加ボタン */}
			<div className="p-2 border-t border-border">
				<button
					type="button"
					onClick={handleAddClick}
					className={cn(
						'w-full flex items-center justify-center gap-2',
						'px-3 py-2 rounded-md',
						'text-sm text-muted-foreground',
						'hover:bg-muted hover:text-foreground',
						'transition-colors duration-200',
					)}
				>
					<Plus className="h-4 w-4" />
					Add task
				</button>
			</div>
		</div>
	);
}
