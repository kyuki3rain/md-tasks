import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container, disposeContainer, getContainer } from './container';

// VSCode APIのモック
vi.mock('vscode', () => ({
	window: {
		activeTextEditor: undefined,
	},
	workspace: {
		openTextDocument: vi.fn(),
		applyEdit: vi.fn(),
		getConfiguration: vi.fn(() => ({
			get: vi.fn(),
		})),
	},
	WorkspaceEdit: vi.fn(),
	Range: vi.fn(),
}));

describe('Container', () => {
	let container: Container;

	beforeEach(() => {
		container = new Container();
	});

	describe('initialize', () => {
		it('初期化が正常に完了する', () => {
			expect(() => container.initialize()).not.toThrow();
		});

		it('初期化後にTaskControllerを取得できる', () => {
			container.initialize();
			const taskController = container.getTaskController();
			expect(taskController).toBeDefined();
		});

		it('初期化後にConfigControllerを取得できる', () => {
			container.initialize();
			const configController = container.getConfigController();
			expect(configController).toBeDefined();
		});
	});

	describe('createWebViewMessageHandler', () => {
		it('WebViewMessageHandlerを作成できる', () => {
			container.initialize();

			const postMessage = vi.fn();
			const handler = container.createWebViewMessageHandler({ postMessage });

			expect(handler).toBeDefined();
		});

		it('異なるpostMessage関数で複数のハンドラーを作成できる', () => {
			container.initialize();

			const postMessage1 = vi.fn();
			const postMessage2 = vi.fn();

			const handler1 = container.createWebViewMessageHandler({ postMessage: postMessage1 });
			const handler2 = container.createWebViewMessageHandler({ postMessage: postMessage2 });

			expect(handler1).toBeDefined();
			expect(handler2).toBeDefined();
			expect(handler1).not.toBe(handler2);
		});
	});
});

describe('getContainer / disposeContainer', () => {
	beforeEach(() => {
		disposeContainer();
	});

	it('getContainerは初期化されたコンテナを返す', () => {
		const container = getContainer();
		expect(container).toBeDefined();
		expect(container).toBeInstanceOf(Container);
	});

	it('複数回呼び出しても同じインスタンスを返す', () => {
		const container1 = getContainer();
		const container2 = getContainer();
		expect(container1).toBe(container2);
	});

	it('disposeContainer後は新しいインスタンスを返す', () => {
		const container1 = getContainer();
		disposeContainer();
		const container2 = getContainer();
		expect(container1).not.toBe(container2);
	});
});
