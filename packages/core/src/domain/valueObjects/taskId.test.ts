import { describe, expect, it } from 'vitest';
import { Path } from './path';
import { generateTaskId, TaskId } from './taskId';

describe('TaskId', () => {
	describe('generate', () => {
		it('同じpath+titleから同じIDを生成する（決定論的）', () => {
			const path = Path.create(['Project', 'Feature']);
			const title = 'Task 1';

			const id1 = TaskId.generate(path, title);
			const id2 = TaskId.generate(path, title);

			expect(id1.toString()).toBe(id2.toString());
		});

		it('異なるpathから異なるIDを生成する', () => {
			const path1 = Path.create(['Project', 'Feature A']);
			const path2 = Path.create(['Project', 'Feature B']);
			const title = 'Task 1';

			const id1 = TaskId.generate(path1, title);
			const id2 = TaskId.generate(path2, title);

			expect(id1.toString()).not.toBe(id2.toString());
		});

		it('異なるtitleから異なるIDを生成する', () => {
			const path = Path.create(['Project']);
			const title1 = 'Task 1';
			const title2 = 'Task 2';

			const id1 = TaskId.generate(path, title1);
			const id2 = TaskId.generate(path, title2);

			expect(id1.toString()).not.toBe(id2.toString());
		});

		it('タイトルに::が含まれていても正しくIDを生成する', () => {
			const path = Path.create(['Project']);
			const title = 'Task::with::colons';

			const id = TaskId.generate(path, title);

			// IDは12文字の16進数文字列
			expect(id.toString()).toMatch(/^[a-f0-9]{12}$/);
		});

		it('ルートパスでも正しくIDを生成する', () => {
			const path = Path.create([]);
			const title = 'Root Task';

			const id = TaskId.generate(path, title);

			expect(id.toString()).toMatch(/^[a-f0-9]{12}$/);
		});

		it('IDは12文字の16進数文字列', () => {
			const path = Path.create(['Test']);
			const title = 'Test Task';

			const id = TaskId.generate(path, title);

			expect(id.toString()).toHaveLength(12);
			expect(id.toString()).toMatch(/^[a-f0-9]+$/);
		});
	});

	describe('fromString', () => {
		it('既存のID文字列からTaskIdを復元できる', () => {
			const originalId = 'abc123def456';
			const taskId = TaskId.fromString(originalId);

			expect(taskId.toString()).toBe(originalId);
		});
	});

	describe('equals', () => {
		it('同じIDを持つTaskIdはequal', () => {
			const path = Path.create(['Project']);
			const title = 'Task';

			const id1 = TaskId.generate(path, title);
			const id2 = TaskId.generate(path, title);

			expect(id1.equals(id2)).toBe(true);
		});

		it('異なるIDを持つTaskIdはnot equal', () => {
			const path = Path.create(['Project']);

			const id1 = TaskId.generate(path, 'Task 1');
			const id2 = TaskId.generate(path, 'Task 2');

			expect(id1.equals(id2)).toBe(false);
		});
	});
});

describe('generateTaskId', () => {
	it('TaskId.generate().toString()と同じ結果を返す', () => {
		const path = Path.create(['Project', 'Feature']);
		const title = 'Test Task';

		const id1 = generateTaskId(path, title);
		const id2 = TaskId.generate(path, title).toString();

		expect(id1).toBe(id2);
	});
});
