import type * as vscode from 'vscode';

export type LogLevel = 'silly' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerTransport {
	log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}

class OutputChannelTransport implements LoggerTransport {
	constructor(private outputChannel: vscode.OutputChannel) {}

	log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
		this.outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
	}
}

class ConsoleTransport implements LoggerTransport {
	log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
		const timestamp = new Date().toISOString();
		const logFn =
			level === 'error' || level === 'fatal'
				? console.error
				: level === 'warn'
					? console.warn
					: level === 'debug' || level === 'trace' || level === 'silly'
						? console.debug
						: console.log;
		logFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta ?? '');
	}
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	silly: 0,
	trace: 1,
	debug: 2,
	info: 3,
	warn: 4,
	error: 5,
	fatal: 6,
};

export class Logger {
	private static instance: Logger | null = null;
	private transport: LoggerTransport;
	private minLevel: LogLevel;

	private constructor(transport: LoggerTransport, minLevel: LogLevel = 'debug') {
		this.transport = transport;
		this.minLevel = minLevel;
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
	}

	static initialize(outputChannel?: vscode.OutputChannel, minLevel: LogLevel = 'debug'): Logger {
		const transport = outputChannel
			? new OutputChannelTransport(outputChannel)
			: new ConsoleTransport();
		Logger.instance = new Logger(transport, minLevel);
		return Logger.instance;
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(new ConsoleTransport(), 'debug');
		}
		return Logger.instance;
	}

	silly(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('silly')) {
			this.transport.log('silly', message, meta);
		}
	}

	trace(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('trace')) {
			this.transport.log('trace', message, meta);
		}
	}

	debug(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('debug')) {
			this.transport.log('debug', message, meta);
		}
	}

	info(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('info')) {
			this.transport.log('info', message, meta);
		}
	}

	warn(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('warn')) {
			this.transport.log('warn', message, meta);
		}
	}

	error(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('error')) {
			this.transport.log('error', message, meta);
		}
	}

	fatal(message: string, meta?: Record<string, unknown>): void {
		if (this.shouldLog('fatal')) {
			this.transport.log('fatal', message, meta);
		}
	}
}

export const logger = Logger.getInstance();
