# Changelog

All notable changes to the "markdown-kanban" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-29

### Added

- **Kanban Board View**: Display TODO lists from Markdown files as a Kanban board
- **Drag & Drop**: Change task status by dragging cards between columns
- **Task Management**: Create, edit, and delete tasks directly from the board
- **Path Grouping**: Organize tasks by heading hierarchy (e.g., `Project > Feature > Task`)
- **Markdown Rendering**: Render links, code, and other Markdown formatting in task names
- **Sorting Options**: Sort tasks by file order, priority, due date, or alphabetically
- **Configuration**: Support for VSCode settings and frontmatter configuration
  - `statuses`: Customize status columns
  - `doneStatuses`: Define which statuses mark tasks as complete
  - `defaultStatus` / `defaultDoneStatus`: Set default statuses
  - `sortBy`: Choose default sort order
  - `syncCheckboxWithDone`: Auto-sync checkbox state with done status
- **Save/Discard UI**: Floating buttons to save or discard unsaved changes
- **Editor Integration**: Open board from editor title bar button

### Technical

- Clean Architecture with Domain/Application/Infrastructure/Interface layers
- pnpm workspace with core (extension) and webview (React) packages
- TypeScript strict mode with Zod validation
- neverthrow Result type for error handling
- 225+ unit tests with 85%+ branch coverage
- GitHub Actions CI/CD pipeline
- devbox development environment
