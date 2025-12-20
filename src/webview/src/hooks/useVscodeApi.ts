import { useCallback, useEffect, useState } from 'react';

export interface VscodeMessage {
	type: string;
	payload?: unknown;
}

interface VscodeApi {
	postMessage: (message: VscodeMessage) => void;
	getState: () => unknown;
	setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VscodeApi;

let vscodeApi: VscodeApi | null = null;

function getVscodeApi(): VscodeApi {
	if (!vscodeApi) {
		try {
			vscodeApi = acquireVsCodeApi();
		} catch {
			// Development mode fallback
			vscodeApi = {
				postMessage: (message) => {
					console.log('[WebView → Extension]', message);
				},
				getState: () => null,
				setState: (state) => {
					console.log('[WebView State]', state);
				},
			};
		}
	}
	return vscodeApi;
}

export function useVscodeApi() {
	const api = getVscodeApi();

	const postMessage = useCallback(
		(message: VscodeMessage) => {
			api.postMessage(message);
		},
		[api],
	);

	const getState = useCallback(() => {
		return api.getState();
	}, [api]);

	const setState = useCallback(
		(state: unknown) => {
			api.setState(state);
		},
		[api],
	);

	return { postMessage, getState, setState };
}

export function useVscodeMessage<T = unknown>(messageType: string, handler: (payload: T) => void) {
	useEffect(() => {
		const handleMessage = (event: MessageEvent<VscodeMessage>) => {
			const message = event.data;
			if (message.type === messageType) {
				handler(message.payload as T);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [messageType, handler]);
}

export function useVscodeMessages(handlers: Record<string, (payload: unknown) => void>) {
	const [lastMessage, setLastMessage] = useState<VscodeMessage | null>(null);

	useEffect(() => {
		const handleMessage = (event: MessageEvent<VscodeMessage>) => {
			const message = event.data;
			setLastMessage(message);

			const handler = handlers[message.type];
			if (handler) {
				handler(message.payload);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [handlers]);

	return lastMessage;
}
