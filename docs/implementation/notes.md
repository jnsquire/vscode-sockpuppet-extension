# Implementation Notes

This document contains technical implementation details for developers who want to understand how VSCode Sockpuppet works internally or contribute to the project.

## Table of Contents

- [Extension API Implementation](#extension-api-implementation)
- [TextDocument API Implementation](#textdocument-api-implementation)
- [Webview API Implementation](#webview-api-implementation)
- [Architecture Overview](#architecture-overview)

---

## Extension API Implementation

### Overview

The Extension API allows other VS Code extensions to:
1. Get the pipe path for Python connections
2. Launch Python processes with proper environment setup
3. Execute VS Code methods directly (without Python)
4. Check server status
5. Generate connection code

### Files Created

#### `src/api.ts`
TypeScript interface defining the external API with JSDoc documentation:
- `getPipePath()` - Returns the platform-specific pipe path
- `isRunning()` - Checks if server is active
- `getPythonConnectionCode()` - Generates Python connection snippet
- `getEnvironmentVariables()` - Returns env vars for Python processes
- `executeMethod()` - Direct method execution without Python

#### `examples/extension-integration.ts`
Working examples showing:
- How to get and use the Sockpuppet API
- Launching Python scripts with environment variables
- Executing VS Code methods directly
- Progress reporting with Python scripts
- Error handling patterns

#### `examples/launched-by-extension.py`
Python script demonstrating:
- Reading `VSCODE_SOCKPUPPET_PIPE` from environment
- Automatic connection without hardcoded paths
- Full automation workflow example

### Code Changes

#### `src/extension.ts`
- Changed `activate()` return type to `SockpuppetAPI`
- Created API object with all public methods
- Returns API for external extensions to use

#### `src/server.ts`
Added two new public methods:
- `isRunning()` - Returns server listening status
- `executeMethod()` - Allows direct method calls from TypeScript

#### `python/vscode_sockpuppet/client.py`
Enhanced `__init__()` to check environment variables:
1. First checks for explicit `pipe_path` parameter
2. Then checks `VSCODE_SOCKPUPPET_PIPE` env var
3. Falls back to platform default

### Environment Variables

The API exposes these environment variables for Python processes:

| Variable | Description | Example |
|----------|-------------|---------|
| `VSCODE_SOCKPUPPET_PIPE` | Pipe/socket path | `\\.\pipe\vscode-sockpuppet` |
| `VSCODE_PID` | VS Code process ID | `12345` |

### Usage Example

```typescript
// In another extension
const sockpuppetExt = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');
const api = await sockpuppetExt?.activate();

// Get pipe path
const pipePath = api.getPipePath();

// Launch Python with environment
const env = { ...process.env, ...api.getEnvironmentVariables() };
child_process.spawn('python', ['script.py'], { env });

// Or execute methods directly
const result = await api.executeMethod('window.showInformationMessage', {
    message: 'Hello!',
    items: ['OK', 'Cancel']
});
```

### Use Cases

This API enables:
- **AI/ML Extensions** - Launch Python ML scripts that control VS Code UI
- **Testing Tools** - Automated UI testing with Python
- **Data Science** - Jupyter/data analysis workflows with VS Code integration
- **Build Tools** - Python build scripts with progress reporting
- **Custom Workflows** - Any Python automation that needs VS Code control

---

## TextDocument API Implementation

### Overview

The TextDocument API provides a comprehensive object-oriented interface for working with text documents that mirrors VS Code's `TextDocument` interface.

### Python Object Model

Created in `python/vscode_sockpuppet/document.py`:

#### Position
- Represents a line and character position
- Properties: `line`, `character`
- Methods: `to_dict()`, `from_dict()`

#### Range
- Represents a range between two positions
- Properties: `start`, `end`, `is_empty`, `is_single_line`
- Methods: `to_dict()`, `from_dict()`

#### TextLine
- Represents a single line of text
- Properties:
  - `line_number` - Zero-based line number
  - `text` - Line content without line break
  - `is_empty_or_whitespace` - True if blank
  - `first_non_whitespace_character_index` - Indentation index
  - `range` - Line range excluding line break
  - `range_including_line_break` - Full line range
- Methods: `from_dict()`

#### TextDocument
- Main document class with full VS Code API
- **Properties:**
  - `uri` - Document URI
  - `file_name` - File system path
  - `is_untitled` - Not saved yet
  - `language_id` - Language identifier (e.g., 'python')
  - `version` - Version number (incremented on change)
  - `is_dirty` - Has unsaved changes
  - `is_closed` - Document closed
  - `eol` - End-of-line sequence ('\n' or '\r\n')
  - `line_count` - Number of lines

- **Methods:**
  - `save()` - Save document to disk
  - `line_at(line_or_position)` - Get TextLine by line number or Position
  - `get_text(range)` - Get document text (full or partial)
  - `offset_at(position)` - Convert position to character offset
  - `position_at(offset)` - Convert offset to position
  - `get_word_range_at_position(position, regex)` - Get word range at position
  - `validate_range(range)` - Ensure range is valid for document
  - `validate_position(position)` - Ensure position is valid

### Server-Side Implementation

Added to `src/server.ts`:

#### New Request Handlers
- `workspace.textDocuments` - Get all open documents
- `workspace.getTextDocument` - Get specific document by URI
- `document.save` - Save a document
- `document.lineAt` - Get line information
- `document.offsetAt` - Position to offset conversion
- `document.positionAt` - Offset to position conversion
- `document.getText` - Get document text
- `document.getWordRangeAtPosition` - Get word range
- `document.validateRange` - Validate range
- `document.validatePosition` - Validate position

#### Helper Methods
- `serializeTextDocument(doc)` - Serialize VS Code TextDocument to JSON
- `serializeTextLine(line)` - Serialize VS Code TextLine to JSON

#### Enhanced Methods
- `workspace.openTextDocument` - Now returns full TextDocument object

### Complete API Surface

```python
# Properties (Read-Only)
doc.uri                 # "file:///path/to/file.py"
doc.file_name           # "/path/to/file.py"
doc.is_untitled         # False
doc.language_id         # "python"
doc.version             # 5
doc.is_dirty            # True
doc.is_closed           # False
doc.eol                 # "\n"
doc.line_count          # 100

# Content Access
text = doc.get_text()                    # Full document
text = doc.get_text(Range(...))          # Partial text
line = doc.line_at(5)                    # Get line 5
line = doc.line_at(Position(5, 0))       # By position

# Position/Offset Conversion
offset = doc.offset_at(Position(5, 10))  # Get offset
pos = doc.position_at(500)               # Get position

# Word Detection
word_range = doc.get_word_range_at_position(pos)

# Validation
range = doc.validate_range(Range(...))
pos = doc.validate_position(Position(...))

# Modification
success = doc.save()
```

### Design Decisions

1. **Immutability** - Documents are read-only from Python (matches VS Code API)
2. **Lazy Loading** - Document content fetched on-demand
3. **Type Safety** - Full type hints for all methods
4. **Pythonic API** - Snake_case naming, properties instead of getters
5. **Error Handling** - Raises appropriate exceptions for invalid operations

---

## Webview API Implementation

### Overview

The Webview API enables Python scripts to create and control custom HTML-based UI panels in VS Code.

### Extension (TypeScript) Implementation

#### Server-side Changes (`src/server.ts`)

1. **Webview Panel Tracking**
   - Added `webviewPanels: Map<string, vscode.WebviewPanel>` to track active panels
   - Automatic cleanup on panel disposal

2. **Window API Methods**
   - `window.createWebviewPanel` - Create new webview with HTML content
   - `window.updateWebviewPanel` - Update HTML, title, or icon
   - `window.disposeWebviewPanel` - Close and cleanup panel
   - `window.postMessageToWebview` - Send messages to webview JavaScript

3. **Event Broadcasting**
   - `webview.onDidReceiveMessage` - Broadcast messages from webview to Python
   - Includes panel ID for filtering

4. **Configuration Options**
   - ViewColumn positioning (One, Two, Three, Active)
   - Enable/disable JavaScript
   - Retain context when hidden
   - Local resource roots for file access

### Python Package Implementation

#### `vscode_sockpuppet/webview.py` (260 lines)

Created two main classes:

**WebviewPanel:**
- Represents an active webview panel
- Properties: `id`, `view_type`, `title`, `disposed`
- Methods:
  * `update_html(html)` - Update content
  * `update_title(title)` - Change title
  * `update_icon(path)` - Set icon
  * `post_message(message)` - Send to JavaScript
  * `on_did_receive_message(handler)` - Subscribe to messages
  * `dispose()` - Close panel
- Context manager support (`with` statement)

**WebviewOptions:**
- Configuration options
- Properties:
  * `enable_scripts` - Allow JavaScript
  * `enable_forms` - Allow HTML forms
  * `enable_command_uris` - Allow command:// URIs
  * `port_mapping` - Port forwarding configuration
  * `local_resource_roots` - Allowed file paths
  * `retain_context_when_hidden` - Keep state when hidden

#### Updated `vscode_sockpuppet/window.py`

- Added `create_webview_panel()` method
- Auto-generates panel ID and view type if not provided
- Returns `WebviewPanel` instance

### Message Subscription API

**Key Innovation: Panel-specific message handling**

Before (global subscription):
```python
def handle_message(event):
    if event['data']['id'] == panel.id:  # Manual filtering
        message = event['data']['message']
        # Handle message
        
client.subscribe('webview.onDidReceiveMessage', handle_message)
```

After (panel-specific subscription):
```python
def handle_message(message):
    # Direct access to message, no filtering needed
    action = message.get('action')
    # Handle message

unsubscribe = panel.on_did_receive_message(handle_message)
```

**Implementation Details:**

1. Each `WebviewPanel` maintains its own handler list
2. Sets up global subscription on first handler registration
3. Filters messages by panel ID automatically
4. Returns unsubscribe function for cleanup
5. Handles multiple handlers per panel
6. Exception handling in handler loop

### Two-Way Communication Pattern

**Python to Webview:**
```python
panel.post_message({'type': 'update', 'value': 42})
```

**JavaScript in Webview:**
```javascript
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'update') {
        document.getElementById('value').textContent = message.value;
    }
});
```

**Webview to Python:**
```javascript
const vscode = acquireVsCodeApi();
vscode.postMessage({action: 'buttonClick', data: 'value'});
```

**Python Handler:**
```python
def handle_message(message):
    if message.get('action') == 'buttonClick':
        print(f"Received: {message['data']}")

panel.on_did_receive_message(handle_message)
```

### Security Considerations

1. **JavaScript disabled by default** - Must explicitly enable
2. **Content Security Policy** - Automatically applied by VS Code
3. **Local resource access** - Restricted to specified roots
4. **Command URIs** - Disabled by default
5. **Message validation** - All messages must be JSON-serializable

---

## Architecture Overview

### IPC Architecture

VSCode Sockpuppet uses named pipes (Windows) and Unix domain sockets (Unix/Linux/macOS) for inter-process communication:

```
┌─────────────────────────────────────┐
│   VS Code Extension (TypeScript)    │
│  ┌──────────────────────────────┐   │
│  │      Extension Host          │   │
│  │  ┌────────────────────────┐  │   │
│  │  │   VSCode Sockpuppet    │  │   │
│  │  │   Extension            │  │   │
│  │  │  - Server (Named Pipe) │  │   │
│  │  │  - API Methods         │  │   │
│  │  └────────────────────────┘  │   │
│  └──────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │ Named Pipe / Socket
┌──────────────┴──────────────────────┐
│   Python Client                     │
│  ┌──────────────────────────────┐   │
│  │   vscode_sockpuppet          │   │
│  │  - Client (connects to pipe) │   │
│  │  - Window, Workspace, Editor │   │
│  │  - Document, Webview         │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Request/Response Protocol

All communication uses JSON messages:

**Request:**
```json
{
  "id": 1,
  "method": "window.showInformationMessage",
  "params": {
    "message": "Hello!",
    "items": ["OK", "Cancel"]
  }
}
```

**Response:**
```json
{
  "id": 1,
  "result": "OK"
}
```

**Error:**
```json
{
  "id": 1,
  "error": "Method not found"
}
```

### Event Broadcasting

Events flow from VS Code to Python clients:

1. VS Code fires event (e.g., document saved)
2. Extension server broadcasts to all connected clients
3. Python client invokes registered handlers

**Event Message:**
```json
{
  "event": "workspace.onDidSaveTextDocument",
  "data": {
    "uri": "file:///path/to/file.py",
    "fileName": "/path/to/file.py"
  }
}
```

### Threading Model

**Extension (TypeScript):**
- Single-threaded event loop
- Async/await for non-blocking operations
- Named pipe server accepts multiple connections

**Python Client:**
- Main thread for synchronous API calls
- Background thread for event listening
- Thread-safe message handling with locks

### Future Enhancements

Potential improvements:

1. **Bidirectional Events** - Python can fire custom events to VS Code
2. **Multi-client Support** - Multiple Python processes connected simultaneously
3. **Authentication** - Security tokens for connections
4. **Streaming API** - For large data transfers
5. **Custom Decorators** - Python decorators for command registration
6. **Async API** - Asyncio support for Python client
7. **WebSocket Fallback** - For remote connections

---

## Contributing

See the [Development Guide](../guides/development.md) for information on:
- Setting up the development environment
- Running tests
- Code style guidelines
- Submitting pull requests

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Python Packaging Guide](https://packaging.python.org/)
- [Named Pipes (Windows)](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes)
- [Unix Domain Sockets](https://man7.org/linux/man-pages/man7/unix.7.html)
