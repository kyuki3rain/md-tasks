import { describe, expect, it } from 'vitest';
import { Path } from './path';

describe('Path', () => {
	describe('create', () => {
		it('should create a Path from segments array', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);

			expect(path.segments).toEqual(['仕事', 'プロジェクトA']);
		});

		it('should create an empty Path (root level)', () => {
			const path = Path.create([]);

			expect(path.segments).toEqual([]);
			expect(path.isRoot()).toBe(true);
		});

		it('should create a single-level Path', () => {
			const path = Path.create(['仕事']);

			expect(path.segments).toEqual(['仕事']);
		});

		it('should create a deep nested Path', () => {
			const segments = ['仕事', 'プロジェクトA', 'フェーズ1', 'タスク'];
			const path = Path.create(segments);

			expect(path.segments).toEqual(segments);
			expect(path.depth()).toBe(4);
		});
	});

	describe('fromString', () => {
		it('should parse path string with default separator', () => {
			const path = Path.fromString('仕事 / プロジェクトA');

			expect(path.segments).toEqual(['仕事', 'プロジェクトA']);
		});

		it('should parse single segment', () => {
			const path = Path.fromString('仕事');

			expect(path.segments).toEqual(['仕事']);
		});

		it('should handle empty string as root', () => {
			const path = Path.fromString('');

			expect(path.isRoot()).toBe(true);
		});

		it('should trim whitespace from segments', () => {
			const path = Path.fromString('  仕事  /  プロジェクトA  ');

			expect(path.segments).toEqual(['仕事', 'プロジェクトA']);
		});

		it('should filter empty segments', () => {
			const path = Path.fromString('仕事 /  / プロジェクトA');

			expect(path.segments).toEqual(['仕事', 'プロジェクトA']);
		});
	});

	describe('isRoot', () => {
		it('should return true for empty path', () => {
			const path = Path.create([]);

			expect(path.isRoot()).toBe(true);
		});

		it('should return false for non-empty path', () => {
			const path = Path.create(['仕事']);

			expect(path.isRoot()).toBe(false);
		});
	});

	describe('depth', () => {
		it('should return 0 for root path', () => {
			const path = Path.create([]);

			expect(path.depth()).toBe(0);
		});

		it('should return correct depth', () => {
			const path = Path.create(['仕事', 'プロジェクトA', 'フェーズ1']);

			expect(path.depth()).toBe(3);
		});
	});

	describe('parent', () => {
		it('should return parent path', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);
			const parent = path.parent();

			expect(parent.segments).toEqual(['仕事']);
		});

		it('should return root for single-level path', () => {
			const path = Path.create(['仕事']);
			const parent = path.parent();

			expect(parent.isRoot()).toBe(true);
		});

		it('should return root for root path', () => {
			const path = Path.create([]);
			const parent = path.parent();

			expect(parent.isRoot()).toBe(true);
		});
	});

	describe('child', () => {
		it('should create child path', () => {
			const path = Path.create(['仕事']);
			const child = path.child('プロジェクトA');

			expect(child.segments).toEqual(['仕事', 'プロジェクトA']);
		});

		it('should create child from root', () => {
			const root = Path.create([]);
			const child = root.child('仕事');

			expect(child.segments).toEqual(['仕事']);
		});
	});

	describe('equals', () => {
		it('should return true for equal paths', () => {
			const path1 = Path.create(['仕事', 'プロジェクトA']);
			const path2 = Path.create(['仕事', 'プロジェクトA']);

			expect(path1.equals(path2)).toBe(true);
		});

		it('should return false for different paths', () => {
			const path1 = Path.create(['仕事', 'プロジェクトA']);
			const path2 = Path.create(['仕事', 'プロジェクトB']);

			expect(path1.equals(path2)).toBe(false);
		});

		it('should return false for different depths', () => {
			const path1 = Path.create(['仕事']);
			const path2 = Path.create(['仕事', 'プロジェクトA']);

			expect(path1.equals(path2)).toBe(false);
		});
	});

	describe('startsWith', () => {
		it('should return true when path starts with prefix', () => {
			const path = Path.create(['仕事', 'プロジェクトA', 'タスク']);
			const prefix = Path.create(['仕事', 'プロジェクトA']);

			expect(path.startsWith(prefix)).toBe(true);
		});

		it('should return true for same path', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);
			const prefix = Path.create(['仕事', 'プロジェクトA']);

			expect(path.startsWith(prefix)).toBe(true);
		});

		it('should return true for root prefix', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);
			const root = Path.create([]);

			expect(path.startsWith(root)).toBe(true);
		});

		it('should return false when path does not start with prefix', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);
			const prefix = Path.create(['個人']);

			expect(path.startsWith(prefix)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return formatted path string', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);

			expect(path.toString()).toBe('仕事 / プロジェクトA');
		});

		it('should return (root) for empty path', () => {
			const path = Path.create([]);

			expect(path.toString()).toBe('（ルート）');
		});

		it('should handle single segment', () => {
			const path = Path.create(['仕事']);

			expect(path.toString()).toBe('仕事');
		});
	});

	describe('last', () => {
		it('should return last segment', () => {
			const path = Path.create(['仕事', 'プロジェクトA']);

			expect(path.last()).toBe('プロジェクトA');
		});

		it('should return undefined for root', () => {
			const path = Path.create([]);

			expect(path.last()).toBeUndefined();
		});
	});
});
