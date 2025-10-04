# Change Log

All notable changes to the VSCode Sockpuppet extension.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-10-04

### Added
- **Full TextDocument Object Model** - Rich Python API mirroring VS Code's TextDocument interface
- **Position and Range Classes** - Complete helper methods for document manipulation
- **Event Subscription System** - Real-time event handling for editor, workspace, and window changes
- **Webview Support** - Create custom HTML panels with two-way communication
- **Workspace Edit API** - Atomic batch file modifications (create, delete, rename, edit)
- **Named Pipe/Unix Socket Communication** - Low-latency IPC replacing WebSocket
- **Extension Integration API** - Public API for other VS Code extensions to launch Python scripts
- **Terminal Management** - Create and control integrated terminals
- **Tab Management** - Access and control editor tabs and tab groups
- **File System Operations** - Read, write, and watch files programmatically
- **Configuration Access** - Read and modify VS Code settings
- **Diagnostics API** - Report problems and language server features
- **Progress Indicators** - Show progress notifications
- **Status Bar Items** - Create custom status bar elements
- **Type-Safe API** - Full TypeScript and Python type hints with TypedDict support
- **Comprehensive Documentation** - Auto-generated API docs on GitHub Pages

### Features
- Window operations (messages, dialogs, quick picks, input boxes)
- Editor manipulation (selections, text editing, decorations)
- Document access (read, write, search, validate)
- Workspace operations (folders, files, configuration)
- Event subscriptions (file changes, editor changes, etc.)
- Command execution (run any VS Code command)
- Python package with Pythonic API (snake_case, properties, context managers)

### Documentation
- Complete API reference at https://jnsquire.github.io/vscode-sockpuppet-python/
- Quick start guide and examples
- Extension integration guide for developers
- Comprehensive docstrings throughout

### Technical
- TypeScript extension with bundled output via esbuild
- Python 3.8+ support
- Cross-platform (Windows, macOS, Linux)
- MIT License

## [Unreleased]

### Planned
- Additional VS Code API coverage
- Performance optimizations
- Enhanced error handling
- More examples and tutorials