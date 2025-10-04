# VS Code API Implementation Checklist

This document tracks the implementation status of VS Code APIs that can be exposed through the VSCode Sockpuppet Python package.

**Legend:**
- ✅ Implemented
- ⚠️ Partially Implemented
- ❌ Not Implemented
- 🚫 Cannot Implement (requires package.json or compile-time registration)

## Core Interfaces

### Window Operations

#### Messages & Dialogs
- ✅ `window.showInformationMessage()` - Show info messages
- ✅ `window.showWarningMessage()` - Show warning messages
- ✅ `window.showErrorMessage()` - Show error messages
- ✅ `window.showQuickPick()` - Show quick pick menus
- ✅ `window.showInputBox()` - Show input boxes
- ✅ `window.showOpenDialog()` - Show file open dialogs
- ✅ `window.showSaveDialog()` - Show file save dialogs
- ✅ `window.showWorkspaceFolderPick()` - Pick workspace folders

#### Editors
- ⚠️ `window.activeTextEditor` - Currently active text editor (read-only support)
- ✅ `window.visibleTextEditors` - All visible editors
- ✅ `window.showTextDocument()` - Show document in editor
- ✅ `window.createTextEditorDecorationType()` - Create editor decorations
- ✅ TextEditor operations:
  - ✅ `edit()` - Apply text edits with EditBuilder
  - ✅ `insertSnippet()` - Insert snippets with placeholders
  - ✅ `setDecorations()` - Apply decorations
  - ✅ `revealRange()` - Scroll to range with reveal types
  - ❌ `show()` - Show editor
  - ❌ `hide()` - Hide editor
  - ✅ `selection` - Get/set primary selection
  - ✅ `selections` - Get/set all selections (multi-cursor)
  - ✅ `options` - Get/set editor options (tabSize, insertSpaces)
  - ✅ `visibleRanges` - Get visible ranges in viewport
  - ✅ `viewColumn` - Get editor column position

#### Output & Terminals
- ✅ `window.createOutputChannel()` - Create output channels
- ✅ `window.createTerminal()` - Create terminals (returns Terminal object)
- ✅ `window.onDidOpenTerminal` - Terminal opened event
- ✅ `window.onDidCloseTerminal` - Terminal closed event
- ✅ `window.onDidChangeTerminalState` - Terminal state changed
- ✅ Terminal operations:
  - ✅ `sendText()` - Send text to terminal
  - ✅ `show()` - Show terminal
  - ✅ `hide()` - Hide terminal
  - ✅ `dispose()` - Dispose terminal

#### Status Bar
- ✅ `window.createStatusBarItem()` - Create status bar items
- ✅ StatusBarItem operations:
  - ✅ `show()` - Show item
  - ✅ `hide()` - Hide item
  - ✅ `dispose()` - Dispose item
  - ✅ Set text, tooltip, command, color, backgroundColor, etc.

#### Progress
- ✅ `window.withProgress()` - Show progress indicator
- ✅ Progress locations:
  - ✅ `ProgressLocation.Notification` - In notification
  - ✅ `ProgressLocation.Window` - In window
  - ✅ `ProgressLocation.SourceControl` - In source control

#### Webviews
- ⚠️ `window.createWebviewPanel()` - Create webview panels (basic support)
- ❌ `window.registerWebviewViewProvider()` - Register webview views
- ⚠️ Webview operations:
  - ⚠️ `postMessage()` - Send messages to webview
  - ⚠️ `onDidReceiveMessage` - Receive messages from webview
  - ✅ `asWebviewUri()` - Convert file URIs
  - ❌ `dispose()` - Dispose webview

#### Window State & Events
- ✅ `window.state` - Window state (focused, active)
- ✅ `window.onDidChangeActiveTextEditor` - Active editor changed
- ✅ `window.onDidChangeVisibleTextEditors` - Visible editors changed
- ✅ `window.onDidChangeTextEditorSelection` - Selection changed
- ✅ `window.onDidChangeTextEditorVisibleRanges` - Visible ranges changed
- ✅ `window.onDidChangeTextEditorOptions` - Editor options changed
- ✅ `window.onDidChangeTextEditorViewColumn` - View column changed
- ✅ `window.onDidChangeWindowState` - Window state changed

### Workspace Operations

#### Files & Folders
- ✅ `workspace.workspaceFolders` - Workspace folders
- ✅ `workspace.rootPath` - Root path (deprecated but supported)
- ✅ `workspace.name` - Workspace name
- ❌ `workspace.workspaceFile` - Workspace file URI
- ❌ `workspace.updateWorkspaceFolders()` - Modify workspace folders
- ✅ `workspace.getWorkspaceFolder()` - Get folder for URI
- ✅ `workspace.asRelativePath()` - Convert to relative path
- ✅ `workspace.findFiles()` - Find files by glob pattern
- ❌ `workspace.save()` - Save single file
- ✅ `workspace.saveAll()` - Save all files

#### Text Documents
- ✅ `workspace.textDocuments` - All open text documents
- ✅ `workspace.openTextDocument()` - Open/create documents
- ✅ `workspace.applyEdit()` - Apply workspace edits
- ✅ `workspace.createFileSystemWatcher()` - Watch file changes

#### Configuration
- ✅ `workspace.getConfiguration()` - Get configuration
- ✅ `workspace.onDidChangeConfiguration` - Configuration changed event
- ✅ Configuration operations:
  - ✅ `get()` - Get setting value
  - ✅ `update()` - Update setting
  - ✅ `inspect()` - Inspect setting details
  - ✅ `has()` - Check if setting exists

#### Events
- ✅ `workspace.onDidOpenTextDocument` - Document opened
- ✅ `workspace.onDidCloseTextDocument` - Document closed
- ✅ `workspace.onDidSaveTextDocument` - Document saved
- ✅ `workspace.onDidChangeTextDocument` - Document content changed
- ✅ `workspace.onDidChangeWorkspaceFolders` - Folders changed
- ❌ `workspace.onWillSaveTextDocument` - Before save (can modify)
- ✅ `workspace.onDidCreateFiles` - Files created
- ✅ `workspace.onDidDeleteFiles` - Files deleted
- ✅ `workspace.onDidRenameFiles` - Files renamed
- ❌ `workspace.onWillCreateFiles` - Before create (can prevent)
- ❌ `workspace.onWillDeleteFiles` - Before delete (can prevent)
- ❌ `workspace.onWillRenameFiles` - Before rename (can prevent)

#### File System
- ✅ `workspace.fs` - File system API
  - ✅ `readFile()` - Read file
  - ✅ `writeFile()` - Write file
  - ✅ `delete()` - Delete file
  - ✅ `rename()` - Rename file
  - ✅ `copy()` - Copy file
  - ✅ `createDirectory()` - Create directory
  - ✅ `readDirectory()` - Read directory
  - ✅ `stat()` - Get file stats

#### Clipboard
- ✅ `env.clipboard.readText()` - Read clipboard text
- ✅ `env.clipboard.writeText()` - Write clipboard text

### Text Document API

#### TextDocument Properties
- ✅ `uri` - Document URI
- ✅ `fileName` - File path
- ✅ `languageId` - Language identifier
- ✅ `version` - Version number
- ✅ `isDirty` - Has unsaved changes
- ✅ `isClosed` - Is closed
- ✅ `lineCount` - Number of lines
- ✅ `eol` - End of line sequence
- ✅ `isUntitled` - Is untitled
- ✅ `encoding` - File encoding

#### TextDocument Methods
- ✅ `save()` - Save document
- ✅ `getText()` - Get text content
- ✅ `lineAt()` - Get line at index/position
- ✅ `offsetAt()` - Position to offset
- ✅ `positionAt()` - Offset to position
- ✅ `getWordRangeAtPosition()` - Get word range
- ✅ `validateRange()` - Validate range
- ✅ `validatePosition()` - Validate position

#### TextLine Properties
- ✅ `lineNumber` - Line number
- ✅ `text` - Line text
- ✅ `range` - Line range
- ✅ `rangeIncludingLineBreak` - Range with line break
- ✅ `firstNonWhitespaceCharacterIndex` - First non-whitespace
- ✅ `isEmptyOrWhitespace` - Is empty/whitespace

### Commands

#### Command Execution
- 🚫 `commands.registerCommand()` - Register commands (requires package.json)
- 🚫 `commands.registerTextEditorCommand()` - Register text editor commands
- ✅ `commands.executeCommand()` - Execute commands
- ✅ `commands.getCommands()` - List all commands

### Environment

#### Environment Properties
- ✅ `env.appName` - Application name (via workspace.env.app_name)
- ✅ `env.appRoot` - Application root (via workspace.env.app_root)
- ✅ `env.language` - UI language (via workspace.env.language)
- ✅ `env.machineId` - Machine identifier (via workspace.env.machine_id)
- ✅ `env.sessionId` - Session identifier (via workspace.env.session_id)
- ✅ `env.uriScheme` - URI scheme (via workspace.env.uri_scheme)
- ✅ `env.shell` - Default shell (via workspace.env.shell)
- ✅ `env.uiKind` - UI kind (via workspace.env.ui_kind)

#### Environment Methods
- ✅ `env.openExternal()` - Open external URI
- ❌ `env.asExternalUri()` - Convert to external URI

## Language Features (Provider-based)

These require provider registration and typically need package.json contributions:

### Code Intelligence
- 🚫 `languages.registerCompletionItemProvider()` - Completions
- 🚫 `languages.registerHoverProvider()` - Hover information
- 🚫 `languages.registerSignatureHelpProvider()` - Signature help
- 🚫 `languages.registerDefinitionProvider()` - Go to definition
- 🚫 `languages.registerDeclarationProvider()` - Go to declaration
- 🚫 `languages.registerTypeDefinitionProvider()` - Go to type definition
- 🚫 `languages.registerImplementationProvider()` - Go to implementation
- 🚫 `languages.registerReferencesProvider()` - Find references
- 🚫 `languages.registerDocumentHighlightProvider()` - Document highlights
- 🚫 `languages.registerDocumentSymbolProvider()` - Document symbols
- 🚫 `languages.registerWorkspaceSymbolProvider()` - Workspace symbols

### Code Actions
- 🚫 `languages.registerCodeActionsProvider()` - Code actions
- 🚫 `languages.registerCodeLensProvider()` - Code lenses
- 🚫 `languages.registerDocumentLinkProvider()` - Document links

### Formatting
- 🚫 `languages.registerDocumentFormattingEditProvider()` - Format document
- 🚫 `languages.registerDocumentRangeFormattingEditProvider()` - Format range
- 🚫 `languages.registerOnTypeFormattingEditProvider()` - Format on type

### Refactoring
- 🚫 `languages.registerRenameProvider()` - Rename symbol
- 🚫 `languages.registerFoldingRangeProvider()` - Folding ranges
- 🚫 `languages.registerSelectionRangeProvider()` - Selection ranges

### Diagnostics
- ✅ `languages.createDiagnosticCollection()` - Create diagnostics
- ✅ DiagnosticCollection operations:
  - ✅ `set()` - Set diagnostics
  - ✅ `delete()` - Delete diagnostics
  - ✅ `clear()` - Clear all
  - ⚠️ `forEach()` - Iterate diagnostics (not implemented)
  - ⚠️ `get()` - Get diagnostics (not implemented)
  - ⚠️ `has()` - Check if has diagnostics (not implemented)
  - ✅ `dispose()` - Dispose collection

### Other Language Features
- 🚫 `languages.registerColorProvider()` - Color picker
- 🚫 `languages.registerInlayHintsProvider()` - Inlay hints
- 🚫 `languages.registerCallHierarchyProvider()` - Call hierarchy
- 🚫 `languages.registerTypeHierarchyProvider()` - Type hierarchy
- 🚫 `languages.registerLinkedEditingRangeProvider()` - Linked editing
- 🚫 `languages.registerDocumentSemanticTokensProvider()` - Semantic tokens
- 🚫 `languages.setLanguageConfiguration()` - Language configuration

## Extensions

### Extension API
- ❌ `extensions.getExtension()` - Get extension by ID
- ❌ `extensions.all` - All extensions
- ❌ `extensions.onDidChange` - Extensions changed
- ❌ Extension operations:
  - ❌ `activate()` - Activate extension
  - ❌ `exports` - Extension exports

## Testing

### Test API
- 🚫 `tests.createTestController()` - Create test controller
- 🚫 Test controller operations (all require package.json contributions)

## Debugging

### Debug API
- 🚫 `debug.startDebugging()` - Start debugging
- 🚫 `debug.registerDebugConfigurationProvider()` - Debug configs
- 🚫 `debug.registerDebugAdapterDescriptorFactory()` - Debug adapters
- 🚫 All debug events and operations

## Source Control

### SCM API
- 🚫 `scm.createSourceControl()` - Create source control
- 🚫 All SCM operations (require package.json contributions)

## Tasks

### Task API
- ❌ `tasks.registerTaskProvider()` - Register task provider (🚫 requires package.json)
- ❌ `tasks.fetchTasks()` - Fetch available tasks
- ❌ `tasks.executeTask()` - Execute task
- ❌ `tasks.taskExecutions` - Active task executions
- ❌ `tasks.onDidStartTask` - Task started
- ❌ `tasks.onDidEndTask` - Task ended
- ❌ `tasks.onDidStartTaskProcess` - Task process started
- ❌ `tasks.onDidEndTaskProcess` - Task process ended

## Notebooks

### Notebook API
- ❌ `notebooks.createNotebookController()` - Create controller
- ❌ `workspace.notebookDocuments` - All notebooks
- ❌ `window.activeNotebookEditor` - Active notebook
- ❌ `window.visibleNotebookEditors` - Visible notebooks
- ❌ Notebook events:
  - ❌ `onDidOpenNotebookDocument`
  - ❌ `onDidCloseNotebookDocument`
  - ❌ `onDidSaveNotebookDocument`
  - ❌ `onDidChangeNotebookDocument`

## Comments

### Comment API
- 🚫 `comments.createCommentController()` - Create comment threads
- 🚫 All comment operations (require package.json contributions)

## Authentication

### Auth API
- ❌ `authentication.getSession()` - Get auth session
- ❌ `authentication.onDidChangeSessions` - Sessions changed
- 🚫 `authentication.registerAuthenticationProvider()` - Register provider

## Language Models (Copilot/AI)

### Language Model API
- ❌ `lm.selectChatModels()` - Select chat models
- ❌ `lm.sendRequest()` - Send chat request
- ❌ `lm.registerTool()` - Register LM tool
- ❌ `lm.invokeTool()` - Invoke LM tool
- 🚫 `lm.registerLanguageModelChatProvider()` - Register provider

## Chat Participants

### Chat API
- 🚫 `chat.createChatParticipant()` - Create chat participant
- 🚫 All chat operations (require package.json contributions)

## Custom Editors

### Custom Editor API
- 🚫 `window.registerCustomEditorProvider()` - Register custom editors
- 🚫 `window.registerWebviewPanelSerializer()` - Serialize webviews

## File Decorations

### Decoration API
- ❌ `window.registerFileDecorationProvider()` - Register decorator
- ❌ FileDecoration operations:
  - ❌ Set badge, color, tooltip
  - ❌ Propagate to parents

## Tree Views

### Tree View API
- 🚫 `window.createTreeView()` - Create tree views
- 🚫 `window.registerTreeDataProvider()` - Register provider
- 🚫 All tree operations (require package.json contributions)

## URI Handlers

### URI Handler API
- 🚫 `window.registerUriHandler()` - Handle custom URIs

## Telemetry

### Telemetry API
- ❌ `env.createTelemetryLogger()` - Create logger
- ❌ TelemetryLogger operations:
  - ❌ `logUsage()` - Log usage
  - ❌ `logError()` - Log error

## Tab Groups

### Tab Group API
- ✅ `window.tabGroups` - Tab groups (accessible via window.tab_groups)
- ✅ `window.tabGroups.all` - All tab groups (via get_all())
- ✅ `window.tabGroups.activeTabGroup` - Active group (via get_active_tab_group())
- ✅ `window.tabGroups.onDidChangeTabGroups` - Groups changed (via on_did_change_tab_groups())
- ✅ `window.tabGroups.onDidChangeTabs` - Tabs changed (via on_did_change_tabs())
- ✅ Tab operations:
  - ✅ Close tabs (close_tab())
  - ✅ Close tab groups (close_group())
  - ⚠️ Move tabs (not implemented)
  - ⚠️ Pin/unpin tabs (not implemented)

## Localization

### L10n API
- ❌ `l10n.t()` - Translate strings
- ❌ `l10n.bundle` - Translation bundle

## Implementation Priority Recommendations

### High Priority (Most Useful)
1. ✅ **Quick Pick & Input Box** - Common UI patterns (COMPLETED)
2. ✅ **TextEditor Edit Operations** - Core editing functionality (COMPLETED)
3. ✅ **File System API** - File operations without shell commands (COMPLETED)
4. ✅ **Command Execution** - Run VS Code commands (COMPLETED)
5. ✅ **Diagnostics** - Show errors/warnings (COMPLETED)
6. ✅ **Status Bar Items** - Extension UI (COMPLETED)
7. ✅ **Terminal Operations** - sendText, show/hide, dispose (COMPLETED)

### Medium Priority
1. ✅ **Progress Indicators** - Long-running operations (COMPLETED)
2. **File Decorations** - Visual file metadata (requires complex provider pattern)
3. ✅ **Tab Group Management** - Tab operations (COMPLETED)
4. ✅ **Environment Properties** - Context information (COMPLETED)
5. ✅ **File Watchers** - workspace.createFileSystemWatcher (COMPLETED)

### Low Priority
1. **Telemetry** - Probably not needed for automation
2. **Custom tree views** - Complex, less useful for automation
3. **Authentication** - Extension-specific

### Cannot Implement (Package.json Required)
- Command registration
- Language providers (completion, hover, etc.)
- Debug adapters
- Task providers
- SCM providers
- Custom editors
- Tree data providers
- Test controllers
- Chat participants

## Current Implementation Summary

### Fully Working ✅
- TextDocument API (comprehensive)
- Window messages (info, warning, error)
- Quick Pick and Input Box (user input/selection)
- **File Dialogs (showOpenDialog, showSaveDialog - file/folder selection with filters)**
- Workspace operations (open document, save all, folders)
- Output channels (creation and basic operations)
- Event subscriptions (VS Code-style with disposables)
- Clipboard operations
- Webview panels (basic, asWebviewUri for local resources)
- **File System API (read, write, delete, rename, copy, stat, directory operations)**
- **Diagnostics API (create collections, set/delete/clear diagnostics)**
- **Status Bar Items (create, show/hide, set properties, dispose)**
- **Progress Indicators (withProgress for notifications/window/source control)**
- **Command Execution (executeCommand, getCommands)**
- **Configuration API (get, update, inspect, has - full read/write support)**
- **TextEditor Operations (edit with EditBuilder, insert snippets, reveal ranges, multi-cursor selections, options, viewport queries)**
- **Terminal Operations (create, sendText, show, hide, dispose - full object-oriented API)**
- **File System Watchers (workspace.createFileSystemWatcher with glob patterns, event handlers for create/change/delete)**
- **Environment Properties (workspace.env with app_name, language, machine_id, session_id, uri_scheme, shell, ui_kind, clipboard, open_external)**
- **Tab Management (window.tab_groups with get_all, get_active, close operations, event subscriptions)**
- **Complete Event Coverage (all onDid* events for window, workspace, editor, terminal, and file operations)**
- **Workspace Operations (findFiles, getWorkspaceFolder, asRelativePath - file search and path utilities)**

### Needs Extension ⚠️
- Webview operations (dispose, better message handling)

### Major Gaps to Fill ❌
- File decorations (requires complex provider pattern)
- Advanced webview operations (better message handling, webview view providers)
- Additional editor operations (show, hide)
- onWill* events (requires bidirectional async communication - can modify/cancel)

## Next Steps

Based on this analysis, the recommended implementation order is:

1. ✅ **Quick Pick & Input Box** - Enable user input/selection (COMPLETED)
2. ✅ **TextEditor Editing API** - Core editing operations (COMPLETED - edit, insertSnippet, revealRange, selections, options, viewport)
3. ✅ **File System Operations** - Comprehensive file I/O (COMPLETED)
4. ✅ **Execute Commands** - Run built-in VS Code commands (COMPLETED)
5. ✅ **Diagnostics API** - Show errors and warnings (COMPLETED)
6. ✅ **Status Bar** - Extension status indication (COMPLETED)
7. ✅ **Progress API** - Long operation feedback (COMPLETED)
8. ✅ **Configuration Updates** - Modify settings programmatically (COMPLETED)
9. ✅ **Terminal Operations** - Full terminal lifecycle (COMPLETED - sendText, show, hide, dispose)
10. ✅ **File Watchers** - workspace.createFileSystemWatcher (COMPLETED - glob patterns, event handlers)
11. ✅ **Tab Management** - Tab operations (COMPLETED - get_all, close tab/group, events)
12. ✅ **Environment Properties** - Context information (COMPLETED - app info, system info, clipboard)
13. ✅ **Complete Event Coverage** - Missing workspace/window events (COMPLETED - all onDid* events)
14. ✅ **Workspace Operations** - File search and path utilities (COMPLETED - findFiles, getWorkspaceFolder, asRelativePath)
