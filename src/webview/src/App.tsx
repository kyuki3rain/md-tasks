import { useVscodeApi } from './hooks/useVscodeApi';

function App() {
	const { postMessage } = useVscodeApi();

	const handleClick = () => {
		postMessage({ type: 'HELLO', payload: 'Hello from WebView!' });
	};

	return (
		<div className="min-h-screen bg-background p-4">
			<h1 className="text-2xl font-bold text-foreground mb-4">Markdown Kanban</h1>
			<p className="text-muted-foreground mb-4">
				Welcome to the Markdown Kanban board. This is a placeholder for the kanban UI.
			</p>
			<button
				type="button"
				onClick={handleClick}
				className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
			>
				Send Message to Extension
			</button>
		</div>
	);
}

export default App;
