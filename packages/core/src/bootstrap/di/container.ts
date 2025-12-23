import * as vscode from 'vscode';
import {
	ChangeTaskStatusUseCase,
	CreateTaskUseCase,
	DeleteTaskUseCase,
	GetConfigUseCase,
	GetTasksUseCase,
	RevertDocumentUseCase,
	SaveDocumentUseCase,
	UpdateTaskUseCase,
} from '../../application/usecases';
import {
	FrontmatterConfigProvider,
	MarkdownTaskRepository,
	VscodeConfigProvider,
	VscodeDocumentService,
} from '../../infrastructure/adapters';
import {
	MarkdownTaskClient,
	RemarkClient,
	VscodeConfigClient,
	VscodeDocumentClient,
} from '../../infrastructure/clients';
import {
	ConfigController,
	DocumentController,
	TaskController,
	WebViewMessageHandler,
} from '../../interface/adapters';
import { WebViewMessageClient } from '../../interface/clients';
import type { WebViewMessageDeps } from '../../interface/clients/webViewMessageClient';

/**
 * アプリケーションのDIコンテナ
 * 各層のインスタンスを生成し、依存性を注入する
 */
export class Container {
	// Clients
	private remarkClient!: RemarkClient;
	private markdownTaskClient!: MarkdownTaskClient;
	private vscodeDocumentClient!: VscodeDocumentClient;
	private vscodeConfigClient!: VscodeConfigClient;

	// Adapters (Repositories & Providers & Services)
	private markdownTaskRepository!: MarkdownTaskRepository;
	private vscodeConfigProvider!: VscodeConfigProvider;
	private frontmatterConfigProvider!: FrontmatterConfigProvider;
	private vscodeDocumentService!: VscodeDocumentService;

	// Use Cases
	private getTasksUseCase!: GetTasksUseCase;
	private createTaskUseCase!: CreateTaskUseCase;
	private updateTaskUseCase!: UpdateTaskUseCase;
	private deleteTaskUseCase!: DeleteTaskUseCase;
	private changeTaskStatusUseCase!: ChangeTaskStatusUseCase;
	private getConfigUseCase!: GetConfigUseCase;
	private saveDocumentUseCase!: SaveDocumentUseCase;
	private revertDocumentUseCase!: RevertDocumentUseCase;

	// Controllers
	private taskController!: TaskController;
	private configController!: ConfigController;
	private documentController!: DocumentController;

	/**
	 * コンテナを初期化する
	 */
	initialize(): void {
		this.initializeClients();
		this.initializeAdapters();
		this.initializeUseCases();
		this.initializeControllers();
	}

	/**
	 * Clientsを初期化
	 */
	private initializeClients(): void {
		// RemarkClient
		this.remarkClient = new RemarkClient();

		// MarkdownTaskClient
		this.markdownTaskClient = new MarkdownTaskClient(this.remarkClient);

		// VscodeDocumentClient
		this.vscodeDocumentClient = new VscodeDocumentClient({
			getActiveTextEditor: () => vscode.window.activeTextEditor,
			openTextDocument: (uri) => vscode.workspace.openTextDocument(uri),
			applyEdit: (edit) => vscode.workspace.applyEdit(edit),
			createWorkspaceEdit: () => new vscode.WorkspaceEdit(),
			createRange: (startLine, startCharacter, endLine, endCharacter) =>
				new vscode.Range(startLine, startCharacter, endLine, endCharacter),
			readFile: (uri) => vscode.workspace.fs.readFile(uri),
		});

		// VscodeConfigClient
		this.vscodeConfigClient = new VscodeConfigClient({
			getConfiguration: (section) => vscode.workspace.getConfiguration(section),
		});
	}

	/**
	 * Adaptersを初期化
	 */
	private initializeAdapters(): void {
		// MarkdownTaskRepository
		this.markdownTaskRepository = new MarkdownTaskRepository(
			this.markdownTaskClient,
			this.vscodeDocumentClient,
		);

		// VscodeConfigProvider
		this.vscodeConfigProvider = new VscodeConfigProvider(this.vscodeConfigClient);

		// FrontmatterConfigProvider（VSCode設定をフォールバックに使用）
		this.frontmatterConfigProvider = new FrontmatterConfigProvider(
			this.markdownTaskClient,
			this.vscodeDocumentClient,
			this.vscodeConfigProvider,
		);

		// VscodeDocumentService
		this.vscodeDocumentService = new VscodeDocumentService(this.vscodeDocumentClient);
	}

	/**
	 * Use Casesを初期化
	 */
	private initializeUseCases(): void {
		// GetTasksUseCase
		this.getTasksUseCase = new GetTasksUseCase(this.markdownTaskRepository);

		// CreateTaskUseCase
		this.createTaskUseCase = new CreateTaskUseCase(
			this.markdownTaskRepository,
			this.frontmatterConfigProvider,
		);

		// UpdateTaskUseCase
		this.updateTaskUseCase = new UpdateTaskUseCase(
			this.markdownTaskRepository,
			this.frontmatterConfigProvider,
		);

		// DeleteTaskUseCase
		this.deleteTaskUseCase = new DeleteTaskUseCase(this.markdownTaskRepository);

		// ChangeTaskStatusUseCase
		this.changeTaskStatusUseCase = new ChangeTaskStatusUseCase(
			this.markdownTaskRepository,
			this.frontmatterConfigProvider,
		);

		// GetConfigUseCase
		this.getConfigUseCase = new GetConfigUseCase(this.frontmatterConfigProvider);

		// SaveDocumentUseCase
		this.saveDocumentUseCase = new SaveDocumentUseCase(this.vscodeDocumentService);

		// RevertDocumentUseCase
		this.revertDocumentUseCase = new RevertDocumentUseCase(this.vscodeDocumentService);
	}

	/**
	 * Controllersを初期化
	 */
	private initializeControllers(): void {
		// TaskController
		this.taskController = new TaskController(
			this.getTasksUseCase,
			this.createTaskUseCase,
			this.updateTaskUseCase,
			this.deleteTaskUseCase,
			this.changeTaskStatusUseCase,
		);

		// ConfigController
		this.configController = new ConfigController(this.getConfigUseCase);

		// DocumentController
		this.documentController = new DocumentController(
			this.saveDocumentUseCase,
			this.revertDocumentUseCase,
		);
	}

	/**
	 * WebViewMessageHandlerを作成する
	 * WebViewパネルごとに異なるpostMessage関数を使用するため、ファクトリメソッドとして提供
	 */
	createWebViewMessageHandler(messageDeps: WebViewMessageDeps): WebViewMessageHandler {
		const messageClient = new WebViewMessageClient(messageDeps);
		return new WebViewMessageHandler(
			this.taskController,
			this.configController,
			messageClient,
			this.documentController,
		);
	}

	/**
	 * TaskControllerを取得
	 */
	getTaskController(): TaskController {
		return this.taskController;
	}

	/**
	 * ConfigControllerを取得
	 */
	getConfigController(): ConfigController {
		return this.configController;
	}

	/**
	 * VscodeDocumentClientを取得
	 */
	getVscodeDocumentClient(): VscodeDocumentClient {
		return this.vscodeDocumentClient;
	}
}

/**
 * グローバルコンテナインスタンス
 */
let container: Container | undefined;

/**
 * コンテナを取得する
 */
export function getContainer(): Container {
	if (!container) {
		container = new Container();
		container.initialize();
	}
	return container;
}

/**
 * コンテナを破棄する
 */
export function disposeContainer(): void {
	container = undefined;
}
