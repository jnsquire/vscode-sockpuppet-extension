# VSCode Sockpuppet Extension

Control VS Code programmatically from Python scripts.

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/)
[![Python Package](https://img.shields.io/badge/Python-Package-blue)](https://github.com/yourusername/vscode-sockpuppet-python)

## Overview

VSCode Sockpuppet enables Python scripts to programmatically control VS Code through a comprehensive API. It consists of two components:

1. **This Extension** (TypeScript) - Runs in VS Code and exposes the VS Code API via IPC
2. **[Python Package](https://github.com/yourusername/vscode-sockpuppet-python)** (Python) - Client library for Python scripts *(separate repository)*

## Architecture

```
┌─────────────────────────────────────┐
│      VS Code Extension (TS)         │
│   github.com/you/vscode-sockpuppet  │
│                                     │
│  • Window operations                │
│  • Document manipulation            │
│  • Event broadcasting               │
│  • IPC Server (Named Pipe)          │
└────────────┬────────────────────────┘
             │ IPC Communication
┌────────────┼────────────────────────┐
│            ▼                        │
│   Python Package (Standalone)       │
│   github.com/you/vscode-sock...py   │
│                                     │
│  • TextDocument object model        │
│  • Event subscriptions              │
│  • Type-safe Python API             │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Install the Extension

- Install from VS Code Marketplace, or
- Press `F5` in this repository to run in development mode

### 2. Install Python Package

The Python package is maintained in a [separate repository](https://github.com/yourusername/vscode-sockpuppet-python):

```bash
pip install vscode-sockpuppet
```

### 3. Write Your First Script

```python
from vscode_sockpuppet import VSCodeClient, Position, Range

with VSCodeClient() as vscode:
    # Show a message
    vscode.window.show_information_message("Hello from Python!")
    
    # Get all open documents
    docs = vscode.workspace.text_documents()
    for doc in docs:
        print(f"{doc.file_name}: {doc.line_count} lines")
```

## Features

- **Full TextDocument Object Model** - Rich API mirroring VS Code's TextDocument interface
- **No Package.Json Modifications Required** - All operations are dynamic
- **Simple Python API** - Intuitive methods for common VS Code operations
- **Real-time Communication** - Named pipe/Unix socket for low latency
- **Event Subscriptions** - React to VS Code events (file saves, edits, selections, etc.)
- **Type-Safe** - Written in TypeScript with Python type hints
- **Extensible** - Easy to add new VS Code API methods
- **Extension Integration** - Public API for other VS Code extensions

## Examples

### Basic Operations

```python
from vscode_sockpuppet import VSCodeClient

with VSCodeClient() as vscode:
    # Show messages
    choice = vscode.window.show_information_message(
        "What to do?",
        "Create File",
        "Open Terminal"
    )
    
    if choice == "Create File":
        filename = vscode.window.show_input_box({
            "prompt": "Enter filename",
            "placeholder": "example.txt"
        })
    elif choice == "Open Terminal":
        vscode.window.create_terminal(
            name="Python Terminal",
            text="echo 'Hello!'",
            show=True
        )
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
        text="echo 'Hello from Python!'"1

,
        show=True
    )
    
    # Edit the active document
    vscode.editor.insert_text(0, 0, "# Added by Python\\n")
    
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

## Documentation

📚 **[Complete Documentation](docs/)** - All guides organized in the `docs/` folder

- [Quick Start Guide](docs/QUICKSTART.md) - Get started in 5 minutes
- [TextDocument API](docs/DOCUMENT_API.md) - Complete object model for working with documents
- [Event Subscriptions](docs/EVENTS.md) - Real-time event handling
- [Extension Integration API](docs/EXTENSION_API.md) - For VS Code extension developers
- [Development Guide](docs/DEVELOPMENT.md) - Contributing and extending the project

### Python Package Documentation

The Python package has its own repository and documentation:
- **Repository**: https://github.com/yourusername/vscode-sockpuppet-python
- **PyPI**: https://pypi.org/project/vscode-sockpuppet/
- **Examples**: See the `python/` folder in the extension repository (included as Git submodule)

## API Overview

### Window Operations
- `show_information_message(message, *items)` - Show info message
- `show_warning_message(message, *items)` - Show warning
- `show_error_message(message, *items)` - Show error
- `show_quick_pick(items, options)` - Show quick pick menu
- `show_input_box(options)` - Show input box
- `create_terminal(name, text, show)` - Create terminal
- `create_output_channel(name, text, show)` - Create output channel
- `set_status_bar_message(text, timeout)` - Set status bar message

### Editor Operations
- `get_selection()` - Get current selection
- `set_selection(start, end)` - Set selection
- `insert_text(line, character, text)` - Insert text
- `delete_range(start_line, start_char, end_line, end_char)` - Delete text
- `replace_text(start_line, start_char, end_line, end_char, text)` - Replace text

### Workspace Operations
- `open_text_document(uri, content, language)` - Open or create a document (returns TextDocument)
- `text_documents()` - Get all open documents (returns list[TextDocument])
- `get_text_document(uri)` - Get specific document by URI (returns TextDocument)
- `save_all(include_untitled)` - Save all files
- `get_workspace_folders()` - Get workspace folders
- `write_to_clipboard(text)` - Write to clipboard
- `read_from_clipboard()` - Read from clipboard
- `open_external(uri)` - Open external URI

### TextDocument API
- Properties: `uri`, `file_name`, `language_id`, `line_count`, `is_dirty`, `version`, `eol`
- `save()` - Save the document
- `get_text(range)` - Get document text
- `line_at(line)` - Get TextLine object
- `offset_at(position)` - Convert position to offset
- `position_at(offset)` - Convert offset to position
- `get_word_range_at_position(position)` - Get word range
- `validate_range(range)` - Validate a range
- `validate_position(position)` - Validate a position

See [DOCUMENT_API.md](docs/DOCUMENT_API.md) for complete documentation.

### Command Execution
- `execute_command(command, *args)` - Execute any VS Code command
- `get_commands(filter_internal)` - Get all available commands

### Event Subscriptions
- `subscribe(event, handler)` - Subscribe to VS Code events
- `unsubscribe(event, handler)` - Unsubscribe from events
- `get_subscriptions()` - List active subscriptions

See [EVENTS.md](docs/EVENTS.md) for complete event documentation.

## Extension Integration

Other VS Code extensions can integrate with Sockpuppet to launch Python scripts:

```typescript
import * as vscode from 'vscode';

// Get the Sockpuppet API
const sockpuppetExt = vscode.extensions.getExtension('your-publisher.vscode-sockpuppet');
if (sockpuppetExt) {
    const api = sockpuppetExt.exports;
    
    // Get connection details
    const pipePath = api.getPipePath();
    const env = api.getEnvironmentVariables();
    
    // Launch Python script with connection info
    const terminal = vscode.window.createTerminal({
        name: "Python Script",
        env: env
    });
    terminal.sendText(`python my_script.py`);
}
```

See [EXTENSION_API.md](docs/EXTENSION_API.md) for complete integration documentation.

## Repository Structure

This repository contains the VS Code extension code:

```
vscode-sockpuppet-extension/
├── src/                    # TypeScript extension source
│   ├── extension.ts        # Extension entry point
│   ├── server.ts           # IPC server implementation
│   └── api.ts              # Public API definition
├── docs/                   # Documentation
├── examples/               # TypeScript examples
├── python/                 # Python package (Git submodule)
│   └── → vscode-sockpuppet-python repository
├── package.json            # Extension manifest
└── README.md              # This file
```

The Python package is maintained in a separate repository and included here as a Git submodule for convenience during development.

## Development

### Extension Development

```bash
# Clone this repository
git clone --recursive https://github.com/yourusername/vscode-sockpuppet-extension
cd vscode-sockpuppet-extension

# Install dependencies
npm install

# Compile
npm run compile

# Run in development mode
# Press F5 in VS Code
```

### Python Package Development

The Python package is in a separate repository:

```bash
# Clone the Python package repository
git clone https://github.com/yourusername/vscode-sockpuppet-python
cd vscode-sockpuppet-python

# Install in development mode
pip install -e .
```

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for complete development guide.

## Contributing

Contributions are welcome! Please see:
- Extension contributions: This repository
- Python package contributions: [vscode-sockpuppet-python](https://github.com/yourusername/vscode-sockpuppet-python)

## License

MIT License - see [LICENSE](LICENSE) for details

## Related Projects

- **[Python Package Repository](https://github.com/yourusername/vscode-sockpuppet-python)** - The Python client library
- **[VS Code Extension API](https://code.visualstudio.com/api)** - Official VS Code API documentation

## Support

- **Extension Issues**: [GitHub Issues](https://github.com/yourusername/vscode-sockpuppet-extension/issues)
- **Python Package Issues**: [Python Repo Issues](https://github.com/yourusername/vscode-sockpuppet-python/issues)
- **Documentation**: [docs/](docs/)
