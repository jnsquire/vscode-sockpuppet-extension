# VSCode Sockpuppet Python Package

Standalone Python client for programmatically controlling VS Code.

This is the Python package that works with the [VSCode Sockpuppet Extension](https://github.com/yourusername/vscode-sockpuppet-extension).

## Repository Structure

This repository contains only the Python package. For the VS Code extension, see:
- **Extension Repository**: https://github.com/yourusername/vscode-sockpuppet-extension
- **Complete Documentation**: Available in the extension repository

## Quick Install

```bash
pip install vscode-sockpuppet
```

## Quick Example

```python
from vscode_sockpuppet import VSCodeClient, Position, Range

with VSCodeClient() as vscode:
    # Get all open documents
    docs = vscode.workspace.text_documents()
    for doc in docs:
        print(f"{doc.file_name}: {doc.line_count} lines")
```

## Full Documentation

See the [extension repository docs](https://github.com/yourusername/vscode-sockpuppet-extension/tree/main/docs):
- [Quick Start Guide](https://github.com/yourusername/vscode-sockpuppet-extension/blob/main/docs/QUICKSTART.md)
- [TextDocument API](https://github.com/yourusername/vscode-sockpuppet-extension/blob/main/docs/DOCUMENT_API.md)
- [Event Subscriptions](https://github.com/yourusername/vscode-sockpuppet-extension/blob/main/docs/EVENTS.md)

## Examples

- [example.py](example.py) - Basic operations
- [example_events.py](example_events.py) - Event subscriptions
- [example_document.py](example_document.py) - TextDocument API

## API Reference

See [Python Package README](README_DETAILED.md) for complete API documentation.

## Development

```bash
# Clone this repository
git clone https://github.com/yourusername/vscode-sockpuppet-python
cd vscode-sockpuppet-python

# Install in development mode
pip install -e .

# Install with optional Windows dependencies
pip install -e ".[windows]"
```

## License

MIT License
