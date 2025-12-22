import { describe, expect, it } from 'vitest';
import { InvalidStatusError } from '../errors/invalidStatusError';
import { Status } from './status';

describe('Status', () => {
	describe('create', () => {
		it('should create a Status with valid value', () => {
			const result = Status.create('todo');

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.value).toBe('todo');
			}
		});

		it('should create a Status with various valid values', () => {
			const validStatuses = ['todo', 'in-progress', 'done', 'blocked', 'review'];

			for (const statusValue of validStatuses) {
				const result = Status.create(statusValue);
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.value).toBe(statusValue);
				}
			}
		});

		it('should return InvalidStatusError for empty string', () => {
			const result = Status.create('');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(InvalidStatusError);
				expect(result.error.message).toContain('empty');
			}
		});

		it('should return InvalidStatusError for whitespace only', () => {
			const result = Status.create('   ');

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(InvalidStatusError);
			}
		});

		it('should trim whitespace from valid status', () => {
			const result = Status.create('  todo  ');

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.value).toBe('todo');
			}
		});

		it('should convert to lowercase', () => {
			const result = Status.create('TODO');

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.value).toBe('todo');
			}
		});
	});

	describe('equals', () => {
		it('should return true for same status values', () => {
			const status1 = Status.create('todo');
			const status2 = Status.create('todo');

			if (status1.isOk() && status2.isOk()) {
				expect(status1.value.equals(status2.value)).toBe(true);
			}
		});

		it('should return false for different status values', () => {
			const status1 = Status.create('todo');
			const status2 = Status.create('done');

			if (status1.isOk() && status2.isOk()) {
				expect(status1.value.equals(status2.value)).toBe(false);
			}
		});
	});

	describe('isDone', () => {
		it('should return true when status is in doneStatuses', () => {
			const result = Status.create('done');
			const doneStatuses = ['done', 'completed'];

			if (result.isOk()) {
				expect(result.value.isDone(doneStatuses)).toBe(true);
			}
		});

		it('should return false when status is not in doneStatuses', () => {
			const result = Status.create('todo');
			const doneStatuses = ['done', 'completed'];

			if (result.isOk()) {
				expect(result.value.isDone(doneStatuses)).toBe(false);
			}
		});
	});

	describe('toString', () => {
		it('should return the status value as string', () => {
			const result = Status.create('in-progress');

			if (result.isOk()) {
				expect(result.value.toString()).toBe('in-progress');
			}
		});
	});
});
