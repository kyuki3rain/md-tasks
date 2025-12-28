import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from './index';

describe('Logger', () => {
	beforeEach(() => {
		// Reset Logger singleton before each test
		// @ts-expect-error accessing private property for testing
		Logger.instance = null;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

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
	});

	it('should log error messages', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.error('Error message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[ERROR]');
		expect(callArg).toContain('Error message');
	});

	it('should log warn messages using console.warn', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.warn('Warning message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[WARN]');
		expect(callArg).toContain('Warning message');
	});

	it('should log debug messages using console.debug', () => {
		const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.debug('Debug message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[DEBUG]');
		expect(callArg).toContain('Debug message');
	});

	it('should log trace messages using console.debug', () => {
		const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		const logger = Logger.initialize(undefined, 'trace');

		logger.trace('Trace message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[TRACE]');
		expect(callArg).toContain('Trace message');
	});

	it('should log silly messages using console.debug', () => {
		const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		const logger = Logger.initialize(undefined, 'silly');

		logger.silly('Silly message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[SILLY]');
		expect(callArg).toContain('Silly message');
	});

	it('should log fatal messages using console.error', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.fatal('Fatal message');

		expect(consoleSpy).toHaveBeenCalled();
		const callArg = consoleSpy.mock.calls[0][0] as string;
		expect(callArg).toContain('[FATAL]');
		expect(callArg).toContain('Fatal message');
	});

	it('should log info message without meta', () => {
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const logger = Logger.getInstance();

		logger.info('Info without meta');

		expect(consoleSpy).toHaveBeenCalled();
		const [message, meta] = consoleSpy.mock.calls[0];
		expect(message).toContain('[INFO]');
		expect(message).toContain('Info without meta');
		expect(meta).toBe('');
	});

	describe('log level filtering', () => {
		it('should not log debug messages when minLevel is info', () => {
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const logger = Logger.initialize(undefined, 'info');

			logger.debug('Debug message');

			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it('should not log trace messages when minLevel is debug', () => {
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const logger = Logger.initialize(undefined, 'debug');

			logger.trace('Trace message');

			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it('should not log silly messages when minLevel is trace', () => {
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
			const logger = Logger.initialize(undefined, 'trace');

			logger.silly('Silly message');

			expect(consoleSpy).not.toHaveBeenCalled();
		});
	});

	describe('OutputChannelTransport', () => {
		it('should use OutputChannelTransport when outputChannel is provided', () => {
			const mockAppendLine = vi.fn();
			const mockOutputChannel = {
				appendLine: mockAppendLine,
			} as unknown as import('vscode').OutputChannel;

			const logger = Logger.initialize(mockOutputChannel, 'debug');

			logger.info('Test with channel', { key: 'value' });

			expect(mockAppendLine).toHaveBeenCalled();
			const logLine = mockAppendLine.mock.calls[0][0] as string;
			expect(logLine).toContain('[INFO]');
			expect(logLine).toContain('Test with channel');
			expect(logLine).toContain('"key":"value"');
		});

		it('should log to OutputChannel without meta', () => {
			const mockAppendLine = vi.fn();
			const mockOutputChannel = {
				appendLine: mockAppendLine,
			} as unknown as import('vscode').OutputChannel;

			const logger = Logger.initialize(mockOutputChannel, 'debug');

			logger.info('Test without meta');

			expect(mockAppendLine).toHaveBeenCalled();
			const logLine = mockAppendLine.mock.calls[0][0] as string;
			expect(logLine).toContain('[INFO]');
			expect(logLine).toContain('Test without meta');
			expect(logLine).not.toContain('{');
		});
	});
});
