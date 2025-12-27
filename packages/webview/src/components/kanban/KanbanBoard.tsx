import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useKanban } from '../../hooks/useVscodeApi';
import { cn } from '../../lib/utils';
import type { TaskDto, TaskMetadata } from '../../types';
import { Column } from './Column';
import { FloatingActions } from './FloatingActions';
import { TaskCardOverlay } from './TaskCard';
import { TaskModal } from './TaskModal';

interface ModalState {
	isOpen: boolean;
	task: TaskDto | null;
	defaultStatus: string | null;
}

/**
 * カンバンボードコンポーネント
 */
export function KanbanBoard() {
	const { tasksByStatus, config, paths, isLoading, error, isDirty, actions } = useKanban();

	const [activeTask, setActiveTask] = useState<TaskDto | null>(null);
	const [modal, setModal] = useState<ModalState>({
		isOpen: false,
		task: null,
		defaultStatus: null,
	});

	// ドラッグセンサー設定
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	// ドラッグ開始
	const handleDragStart = useCallback((event: DragStartEvent) => {
		const { active } = event;
		setActiveTask(active.data.current?.task ?? null);
	}, []);

	// ドラッグ終了（ステータス変更）
	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			setActiveTask(null);

			if (!over) return;

			const taskId = active.id as string;
			const newStatus = over.id as string;
			const task = active.data.current?.task as TaskDto | undefined;

			// ステータスが変わった場合のみ更新
			if (task && task.status !== newStatus) {
				actions.changeTaskStatus(taskId, newStatus);
			}
		},
		[actions],
	);

	// タスクカードクリック（編集モーダルを開く）
	const handleTaskClick = useCallback((task: TaskDto) => {
		setModal({
			isOpen: true,
			task,
			defaultStatus: null,
		});
	}, []);

	// 追加ボタンクリック（新規作成モーダルを開く）
	const handleAddTask = useCallback((status: string) => {
		setModal({
			isOpen: true,
			task: null,
			defaultStatus: status,
		});
	}, []);

	// モーダルを閉じる
	const handleCloseModal = useCallback(() => {
		setModal({
			isOpen: false,
			task: null,
			defaultStatus: null,
		});
	}, []);

	// タスクを保存
	const handleSaveTask = useCallback(
		(data: { title: string; status: string; path: string[]; metadata?: TaskMetadata }) => {
			if (modal.task) {
				// 編集（ステータスも含めて一括更新）
				actions.updateTask({
					id: modal.task.id,
					title: data.title,
					path: data.path,
					status: data.status,
					metadata: data.metadata,
				});
			} else {
				// 新規作成
				actions.createTask({
					title: data.title,
					path: data.path,
					status: data.status,
					metadata: data.metadata,
				});
			}
		},
		[modal.task, actions],
	);

	// タスクを削除
	const handleDeleteTask = useCallback(
		(id: string) => {
			actions.deleteTask(id);
		},
		[actions],
	);

	// ローディング表示
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex flex-col items-center gap-4 text-muted-foreground">
					<Loader2 className="h-8 w-8 animate-spin" />
					<p className="text-sm">Loading tasks...</p>
				</div>
			</div>
		);
	}

	// エラー表示
	if (error) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex flex-col items-center gap-4 text-destructive">
					<AlertCircle className="h-8 w-8" />
					<p className="text-sm">{error}</p>
					<button
						type="button"
						onClick={() => {
							actions.clearError();
							actions.refreshTasks();
						}}
						className={cn(
							'flex items-center gap-2 px-4 py-2 rounded-md',
							'text-sm font-medium',
							'bg-primary text-primary-foreground',
							'hover:bg-primary/90 transition-colors',
						)}
					>
						<RefreshCw className="h-4 w-4" />
						Retry
					</button>
				</div>
			</div>
		);
	}

	return (
		<>
			<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<div className="flex gap-4 p-4 h-full overflow-x-auto">
					{config.statuses.map((status) => (
						<Column
							key={status}
							status={status}
							tasks={tasksByStatus[status] ?? []}
							isDone={config.doneStatuses.includes(status)}
							onTaskClick={handleTaskClick}
							onAddTask={handleAddTask}
						/>
					))}
				</div>

				{/* ドラッグオーバーレイ */}
				<DragOverlay dropAnimation={null}>
					{activeTask && <TaskCardOverlay task={activeTask} />}
				</DragOverlay>
			</DndContext>

			{/* タスクモーダル */}
			<TaskModal
				isOpen={modal.isOpen}
				task={modal.task}
				defaultStatus={modal.defaultStatus ?? config.defaultStatus}
				statuses={config.statuses}
				paths={paths}
				onClose={handleCloseModal}
				onSave={handleSaveTask}
				onDelete={modal.task ? handleDeleteTask : undefined}
			/>

			{/* フローティングアクションボタン */}
			<FloatingActions
				isDirty={isDirty}
				onSave={actions.saveDocument}
				onRevert={actions.revertDocument}
			/>
		</>
	);
}
