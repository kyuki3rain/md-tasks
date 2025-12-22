import { describe, expect, it, vi } from 'vitest';
import { Logger } from './index';

describe('Logger', () => {
	it('should create a singleton instance', () => {
		const logger1 = Logger.getInstance();
		const logger2 = Logger.getInstance();
		expect(logger1).toBe(logger2);
	});

	it('should log info messages', () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.info('Test message', { key: 'value' });

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[INFO]');
		expect(callArg).toContain('Test message');

		consoleSpy.mockRestore();
	});

	it('should log error messages', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.error('Error message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[ERROR]');
		expect(callArg).toContain('Error message');

		consoleSpy.mockRestore();
	});
});
