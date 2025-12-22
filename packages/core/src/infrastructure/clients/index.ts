// Infrastructure Clients

export {
	type CreateTaskInfo,
	type FrontmatterConfig,
	MarkdownParseError,
	MarkdownTaskClient,
	type ParsedTask,
	type ParseResult,
	SerializerError,
	type TaskEdit,
} from './markdownTaskClient';
export { type FrontmatterResult, RemarkClient } from './remarkClient';
export { VscodeConfigClient, type VscodeConfigDeps } from './vscodeConfigClient';
export {
	DocumentEditError,
	type DocumentInfo,
	DocumentNotFoundError,
	NoActiveEditorError,
	VscodeDocumentClient,
	type VscodeDocumentDeps,
} from './vscodeDocumentClient';
