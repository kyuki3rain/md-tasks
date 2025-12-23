import { Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { TaskDto, TaskMetadata } from '../../types';

interface TaskModalProps {
	isOpen: boolean;
	task?: TaskDto | null;
	defaultStatus?: string;
	statuses: string[];
	paths: string[][];
	onClose: () => void;
	onSave: (data: {
		title: string;
		status: string;
		path: string[];
		metadata?: TaskMetadata;
	}) => void;
	onDelete?: (id: string) => void;
}

/**
 * タスク作成・編集モーダル
 */
export function TaskModal({
	isOpen,
	task,
	defaultStatus,
	statuses,
	paths,
	onClose,
	onSave,
	onDelete,
}: TaskModalProps) {
	const [title, setTitle] = useState('');
	const [status, setStatus] = useState(defaultStatus ?? statuses[0] ?? 'todo');
	const [selectedPath, setSelectedPath] = useState<string>('');
	const titleInputRef = useRef<HTMLInputElement>(null);

	const isEditMode = !!task;

	// パス選択肢を準備
	const pathOptions = [
		{ value: '', label: '(root)' },
		...paths
			.filter((p) => p.length > 0)
			.map((p) => ({
				value: p.join(' / '),
				label: p.join(' / '),
			})),
	];

	// タスクデータで初期化
	useEffect(() => {
		if (isOpen) {
			if (task) {
				setTitle(task.title);
				setStatus(task.status);
				setSelectedPath(task.path.join(' / '));
			} else {
				setTitle('');
				setStatus(defaultStatus ?? statuses[0] ?? 'todo');
				setSelectedPath('');
			}
			// フォーカス
			setTimeout(() => titleInputRef.current?.focus(), 100);
		}
	}, [isOpen, task, defaultStatus, statuses]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		const path = selectedPath ? selectedPath.split(' / ') : [];
		onSave({
			title: title.trim(),
			status,
			path,
		});
		onClose();
	};

	const handleDelete = () => {
		if (task && onDelete) {
			onDelete(task.id);
			onClose();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Modal wrapper needs keyboard handler
		<div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
			{/* オーバーレイ */}
			<button
				type="button"
				className="absolute inset-0 bg-black/50 cursor-default"
				onClick={onClose}
				aria-label="Close modal"
			/>

			{/* モーダル */}
			<div
				className={cn(
					'relative z-10 w-full max-w-md mx-4',
					'bg-card border border-border rounded-lg shadow-xl',
				)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				{/* ヘッダー */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border">
					<h2 id="modal-title" className="text-lg font-semibold text-foreground">
						{isEditMode ? 'Edit Task' : 'New Task'}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* フォーム */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					{/* タイトル */}
					<div className="space-y-2">
						<label htmlFor="title" className="block text-sm font-medium text-foreground">
							Title
						</label>
						<input
							ref={titleInputRef}
							id="title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Enter task title..."
							className={cn(
								'w-full px-3 py-2 rounded-md',
								'bg-background border border-input',
								'text-foreground placeholder:text-muted-foreground',
								'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
							)}
							required
						/>
					</div>

					{/* ステータス */}
					<div className="space-y-2">
						<label htmlFor="status" className="block text-sm font-medium text-foreground">
							Status
						</label>
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className={cn(
								'w-full px-3 py-2 rounded-md',
								'bg-background border border-input',
								'text-foreground',
								'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
							)}
						>
							{statuses.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
					</div>

					{/* パス */}
					<div className="space-y-2">
						<label htmlFor="path" className="block text-sm font-medium text-foreground">
							Path
						</label>
						<select
							id="path"
							value={selectedPath}
							onChange={(e) => setSelectedPath(e.target.value)}
							className={cn(
								'w-full px-3 py-2 rounded-md',
								'bg-background border border-input',
								'text-foreground',
								'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
							)}
						>
							{pathOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					{/* アクションボタン */}
					<div className="flex items-center justify-between pt-4">
						{/* 削除ボタン（編集モードのみ） */}
						<div>
							{isEditMode && onDelete && (
								<button
									type="button"
									onClick={handleDelete}
									className={cn(
										'flex items-center gap-2 px-3 py-2 rounded-md',
										'text-sm text-destructive',
										'hover:bg-destructive/10 transition-colors',
									)}
								>
									<Trash2 className="h-4 w-4" />
									Delete
								</button>
							)}
						</div>

						{/* 保存・キャンセルボタン */}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onClose}
								className={cn(
									'px-4 py-2 rounded-md',
									'text-sm text-muted-foreground',
									'hover:bg-muted transition-colors',
								)}
							>
								Cancel
							</button>
							<button
								type="submit"
								className={cn(
									'px-4 py-2 rounded-md',
									'text-sm font-medium',
									'bg-primary text-primary-foreground',
									'hover:bg-primary/90 transition-colors',
								)}
							>
								{isEditMode ? 'Update' : 'Create'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
