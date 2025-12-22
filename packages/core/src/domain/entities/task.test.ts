import { describe, expect, it } from 'vitest';
import { Path } from '../valueObjects/path';
import { Status } from '../valueObjects/status';
import { Task, type TaskProps } from './task';

describe('Task', () => {
	const createValidTask = (overrides: Partial<TaskProps> = {}): Task => {
		const defaultProps: TaskProps = {
			id: 'task-1',
			title: 'タスクのタイトル',
			status: Status.create('todo')._unsafeUnwrap(),
			path: Path.create(['仕事', 'プロジェクトA']),
			isChecked: false,
			metadata: {},
		};
		return Task.create({ ...defaultProps, ...overrides });
	};

	describe('create', () => {
		it('should create a Task with all required properties', () => {
			const task = createValidTask();

			expect(task.id).toBe('task-1');
			expect(task.title).toBe('タスクのタイトル');
			expect(task.status.value).toBe('todo');
			expect(task.path.segments).toEqual(['仕事', 'プロジェクトA']);
			expect(task.isChecked).toBe(false);
		});

		it('should create a Task with metadata', () => {
			const task = createValidTask({
				metadata: {
					priority: 'high',
					due: '2025-01-15',
				},
			});

			expect(task.metadata.priority).toBe('high');
			expect(task.metadata.due).toBe('2025-01-15');
		});

		it('should create a checked Task', () => {
			const task = createValidTask({ isChecked: true });

			expect(task.isChecked).toBe(true);
		});

		it('should create a Task at root path', () => {
			const task = createValidTask({
				path: Path.create([]),
			});

			expect(task.path.isRoot()).toBe(true);
		});
	});

	describe('updateStatus', () => {
		it('should return a new Task with updated status', () => {
			const task = createValidTask();
			const newStatus = Status.create('in-progress')._unsafeUnwrap();

			const updatedTask = task.updateStatus(newStatus);

			expect(updatedTask.status.value).toBe('in-progress');
			expect(updatedTask.id).toBe(task.id);
			expect(task.status.value).toBe('todo'); // original unchanged
		});

		it('should update isChecked when status becomes done', () => {
			const task = createValidTask({ isChecked: false });
			const doneStatus = Status.create('done')._unsafeUnwrap();
			const doneStatuses = ['done', 'completed'];

			const updatedTask = task.updateStatus(doneStatus, doneStatuses);

			expect(updatedTask.status.value).toBe('done');
			expect(updatedTask.isChecked).toBe(true);
		});

		it('should update isChecked when status becomes not done', () => {
			const task = createValidTask({
				status: Status.create('done')._unsafeUnwrap(),
				isChecked: true,
			});
			const todoStatus = Status.create('todo')._unsafeUnwrap();
			const doneStatuses = ['done', 'completed'];

			const updatedTask = task.updateStatus(todoStatus, doneStatuses);

			expect(updatedTask.status.value).toBe('todo');
			expect(updatedTask.isChecked).toBe(false);
		});
	});

	describe('updateTitle', () => {
		it('should return a new Task with updated title', () => {
			const task = createValidTask();

			const updatedTask = task.updateTitle('新しいタイトル');

			expect(updatedTask.title).toBe('新しいタイトル');
			expect(task.title).toBe('タスクのタイトル'); // original unchanged
		});
	});

	describe('updatePath', () => {
		it('should return a new Task with updated path', () => {
			const task = createValidTask();
			const newPath = Path.create(['個人', '趣味']);

			const updatedTask = task.updatePath(newPath);

			expect(updatedTask.path.segments).toEqual(['個人', '趣味']);
			expect(task.path.segments).toEqual(['仕事', 'プロジェクトA']); // original unchanged
		});
	});

	describe('updateMetadata', () => {
		it('should return a new Task with updated metadata', () => {
			const task = createValidTask({
				metadata: { priority: 'low' },
			});

			const updatedTask = task.updateMetadata({ priority: 'high', due: '2025-02-01' });

			expect(updatedTask.metadata.priority).toBe('high');
			expect(updatedTask.metadata.due).toBe('2025-02-01');
		});
	});

	describe('toggleCheck', () => {
		it('should toggle isChecked from false to true', () => {
			const task = createValidTask({ isChecked: false });

			const updatedTask = task.toggleCheck();

			expect(updatedTask.isChecked).toBe(true);
		});

		it('should toggle isChecked from true to false', () => {
			const task = createValidTask({ isChecked: true });

			const updatedTask = task.toggleCheck();

			expect(updatedTask.isChecked).toBe(false);
		});
	});

	describe('isDone', () => {
		it('should return true when status is in doneStatuses', () => {
			const task = createValidTask({
				status: Status.create('done')._unsafeUnwrap(),
			});

			expect(task.isDone(['done', 'completed'])).toBe(true);
		});

		it('should return false when status is not in doneStatuses', () => {
			const task = createValidTask({
				status: Status.create('todo')._unsafeUnwrap(),
			});

			expect(task.isDone(['done', 'completed'])).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same id', () => {
			const task1 = createValidTask({ id: 'task-1' });
			const task2 = createValidTask({ id: 'task-1', title: '別のタイトル' });

			expect(task1.equals(task2)).toBe(true);
		});

		it('should return false for different id', () => {
			const task1 = createValidTask({ id: 'task-1' });
			const task2 = createValidTask({ id: 'task-2' });

			expect(task1.equals(task2)).toBe(false);
		});
	});
});
