# VSCode Sockpuppet

[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://jnsquire.github.io/vscode-sockpuppet-extension/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

VS Code extension with integrated Python package that allows you to programmatically control VS Code through Python code. Perfect for automation, testing, or building custom workflows.

📚 **[Full Documentation](https://jnsquire.github.io/vscode-sockpuppet-extension/)** | 🐍 **[Python API Reference](https://jnsquire.github.io/vscode-sockpuppet-extension/api/)** | 🚀 **[Quick Start](https://jnsquire.github.io/vscode-sockpuppet-extension/getting-started/quickstart/)**

## Features

- **Full TextDocument Object Model** - Rich API mirroring VS Code's TextDocument interface
- **No Package.json Modifications Required** - All operations are dynamic
- **Simple Python API** - Intuitive methods for common VS Code operations
- **Real-time Communication** - Named pipe/Unix socket for low latency
- **Event Subscriptions** - React to VS Code events (file saves, edits, selections, etc.)
- **Type-Safe** - Written in TypeScript with Python type hints
- **Extension Integration** - Public API for other VS Code extensions

## Quick Example

```python
from vscode_sockpuppet import VSCodeClient

with VSCodeClient() as vscode:
    # Show a message
    vscode.window.show_information_message("Hello from Python!")
    
    # Get the active editor
    editor = vscode.window.active_text_editor
    if editor:
        doc = editor.document
        print(f"Editing: {doc.file_name}")
        print(f"Lines: {doc.line_count}")
    
    # List workspace folders
    folders = vscode.workspace.workspace_folders
    for folder in folders:
        print(f"Workspace: {folder['name']}")
```

**[See more examples in the documentation →](https://jnsquire.github.io/vscode-sockpuppet-extension/getting-started/examples/)**

## Overview

VSCode Sockpuppet consists of two components:

1. **VS Code Extension** - Runs a named pipe (Windows) / Unix domain socket (Linux/Mac) server inside VS Code's extension host
2. **Python Package** - Provides a Pythonic API to interact with the VS Code API

The extension exposes VS Code UI operations that don't require package.json metadata, enabling dynamic control of:
- Window operations (messages, quick picks, input boxes)
- Editor manipulation (selection, text editing)
- Terminal and output channels
- Workspace operations
- Command execution

## Features

- **No Package.json Modifications Required** - All operations are dynamic
- **Simple Python API** - Intuitive methods for common VS Code operations
- **Real-time Communication** - WebSocket-based for low latency
- **Type-Safe** - Written in TypeScript with Python type hints
- **Extensible** - Easy to add new VS Code API methods

## Installation

### 1. Install the VS Code Extension

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile
```

Then press F5 to launch the extension in debug mode, or package it for installation.

### 2. Install the Python Package

**Using uv (Recommended):**

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh  # Unix/macOS
# or
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows

# Install the package
cd python
uv pip install -e .

# On Windows, also install:
uv pip install -e ".[windows]"
```

**Using pip:**

```bash
cd python
pip install -e .

# On Windows, also install:
pip install -e ".[windows]"
```

## Usage

### Basic Example

```python
from vscode_sockpuppet import VSCodeClient

# Connect to VS Code
with VSCodeClient() as vscode:
    # Show a message
    vscode.window.show_information_message("Hello from Python!")
    
    # Get user input
    name = vscode.window.show_input_box({
        "prompt": "What's your name?"
    })
    
    if name:
        vscode.window.show_information_message(f"Hello, {name}!")
```

### Advanced Example

```python
from vscode_sockpuppet import VSCodeClient

with VSCodeClient() as vscode:
    # Show quick pick menu
    choice = vscode.window.show_quick_pick(
        ["Option 1", "Option 2", "Option 3"],
        {"placeholder": "Select an option"}
    )
    
    # Create a terminal
    vscode.window.create_terminal(
        name="My Terminal",
        text="echo 'Hello from Python!'",
        show=True
    )
    
    # Edit the active document
    vscode.editor.insert_text(0, 0, "# Added by Python\n")
    
    # Execute VS Code commands
    vscode.execute_command("workbench.action.files.saveAll")
    
    # Get workspace information
    folders = vscode.workspace.get_workspace_folders()
    print(f"Workspace folders: {folders}")
```

### Event Subscriptions

```python
from vscode_sockpuppet import VSCodeClient
import time

def on_file_saved(data):
    print(f"File saved: {data['fileName']}")

with VSCodeClient() as vscode:
    # Subscribe to file save events
    vscode.subscribe('workspace.onDidSaveTextDocument', on_file_saved)
    
    # Keep script running to receive events
    while True:
        time.sleep(0.1)
```

### TextDocument Object Model

```python
from vscode_sockpuppet import VSCodeClient, Position, Range

with VSCodeClient() as vscode:
    # Get all open documents
    docs = vscode.workspace.text_documents()
    
    for doc in docs:
        print(f"{doc.file_name} [{doc.language_id}]")
        print(f"  Lines: {doc.line_count}, Dirty: {doc.is_dirty}")
        
        # Work with specific lines
        line = doc.line_at(5)
        print(f"  Line 5: {line.text}")
        
        # Get text in a range
        range = Range(Position(0, 0), Position(10, 0))
        text = doc.get_text(range)
```

See `python/example.py` for more examples.

## API Reference

### Window Operations
- `show_information_message(message, *items)` - Show info message with optional buttons
- `show_warning_message(message, *items)` - Show warning message
- `show_error_message(message, *items)` - Show error message
- `show_quick_pick(items, options)` - Show quick pick menu
- `show_input_box(options)` - Show input box
- `create_output_channel(name, text, show)` - Create output channel
- `create_terminal(name, shell_path, text, show)` - Create terminal
- `set_status_bar_message(text, timeout)` - Set status bar message

### Editor Operations
- `get_selection()` - Get current selection
- `set_selection(start_line, start_char, end_line, end_char)` - Set selection
- `insert_text(line, character, text)` - Insert text at position
- `delete_range(start_line, start_char, end_line, end_char)` - Delete text range
- `replace_text(start_line, start_char, end_line, end_char, text)` - Replace text

### Workspace Operations
- `open_text_document(uri, content, language)` - Open or create document
- `save_all(include_untitled)` - Save all dirty files
- `get_workspace_folders()` - Get workspace folders
- `write_to_clipboard(text)` - Write to clipboard
- `read_from_clipboard()` - Read from clipboard
- `open_external(uri)` - Open external URI

### Command Execution
- `execute_command(command, *args)` - Execute any VS Code command
- `get_commands(filter_internal)` - Get all available commands

### Event Subscriptions
- `subscribe(event, handler)` - Subscribe to VS Code events
- `unsubscribe(event, handler)` - Unsubscribe from events
- `get_subscriptions()` - List active subscriptions

See [Event Subscriptions](docs/api/events.md) for complete event documentation.

## Architecture

```
┌─────────────────────┐      Named Pipe / Unix Socket       ┌──────────────────┐
│   Python Script     │ ◄───────────────────────────────────► │  VS Code         │
│                     │   (newline-delimited JSON-RPC)       │  Extension Host  │
│  VSCodeClient()     │                                       │                  │
│   ├─ window         │   Windows: \\.\pipe\vscode-sockpuppet │  VSCodeServer    │
│   ├─ editor         │   Unix: /tmp/vscode-sockpuppet.sock  │   ├─ handleReq   │
│   ├─ workspace      │                                       │   └─ VS Code API │
│   └─ commands       │                                       │                  │
└─────────────────────┘                                       └──────────────────┘
```

## Requirements

- VS Code 1.104.0 or higher
- Python 3.8 or higher
- Node.js and npm (for building the extension)

## Extension Commands

- `VSCode Sockpuppet: Show Server Status` - Display server connection information

## Known Issues

- The extension must be running for Python clients to connect
- Only one Python client can send requests at a time (WebSocket is not thread-safe by default)
- Some VS Code API operations may require specific conditions (e.g., active editor)

## Documentation

📚 **[Complete Documentation](https://jnsquire.github.io/vscode-sockpuppet-extension/)** - Comprehensive guides and API reference

### Quick Links

- 🚀 **[Quick Start Guide](https://jnsquire.github.io/vscode-sockpuppet-extension/getting-started/quickstart/)** - Get started in 5 minutes
- 📖 **[API Reference](https://jnsquire.github.io/vscode-sockpuppet-extension/api/)** - Complete API documentation
- 💡 **[Examples](https://jnsquire.github.io/vscode-sockpuppet-extension/getting-started/examples/)** - Practical code examples
- 🔧 **[Development Guide](https://jnsquire.github.io/vscode-sockpuppet-extension/guides/development/)** - Contributing and extending

### Documentation Source Files

The documentation is also available in the repository:

- [docs/](docs/) - User guides and tutorials
- [python/docs_src/](python/docs_src/) - API documentation source

### API Highlights

- **[Window](https://jnsquire.github.io/vscode-sockpuppet-extension/api/window/)** - Messages, dialogs, editors
- **[Workspace](https://jnsquire.github.io/vscode-sockpuppet-extension/api/workspace/)** - Files, folders, configuration
- **[Editor](https://jnsquire.github.io/vscode-sockpuppet-extension/api/editor/)** - Text editing and decorations
- **[TextDocument](https://jnsquire.github.io/vscode-sockpuppet-extension/api/document/)** - Document manipulation
- **[Events](https://jnsquire.github.io/vscode-sockpuppet-extension/api/events/)** - Real-time event handling
- **[Webview](https://jnsquire.github.io/vscode-sockpuppet-extension/api/webview/)** - Custom HTML panels

## Extension Integration

Other VS Code extensions can integrate with Sockpuppet to launch Python processes that control VS Code:

```typescript
// Get the Sockpuppet API
const sockpuppetExt = vscode.extensions.getExtension('undefined_publisher.vscode-sockpuppet');
const api = await sockpuppetExt?.activate();

// Launch Python with proper environment
const env = api.getEnvironmentVariables();
launchPython(scriptPath, { env });
```

See [EXTENSION_API.md](EXTENSION_API.md) for complete documentation and examples.

## License

MIT

## Contributing

Contributions are welcome! See [DEVELOPMENT.md](DEVELOPMENT.md) for details on the architecture and how to add new features.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
