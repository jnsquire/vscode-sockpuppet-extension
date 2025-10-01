# Documentation

Welcome to the VSCode Sockpuppet documentation!

## Getting Started

- **[Quick Start Guide](getting-started/quickstart.md)** - Get up and running in 5 minutes
  - Installation
  - First script
  - Common operations

- **[Migration Guide](getting-started/migration.md)** - Historical reference for upgrading from WebSocket to Named Pipes

## API Documentation

- **[TextDocument API](api/documents.md)** - Complete object model for working with documents
  - Position, Range, TextLine, TextDocument classes
  - Properties and methods
  - Examples and best practices

- **[Event Subscriptions](api/events.md)** - Real-time event handling
  - Available events
  - Subscription API
  - Event data structures
  - Threading considerations

- **[Webview API](api/webviews.md)** - Create custom HTML UI panels
  - Creating webviews
  - Two-way communication
  - VS Code theming
  - Security considerations

## Guides for Developers

- **[Development Guide](guides/development.md)** - Contributing and extending
  - Project structure
  - Adding new API methods
  - Testing
  - Contributing guidelines

- **[Extension Integration](guides/extension-integration.md)** - For VS Code extension developers
  - How to integrate with other extensions
  - TypeScript API reference
  - Launch Python scripts from extensions
  - Environment variables

- **[Repository Setup](guides/repository-setup.md)** - Two-repository structure
  - Git submodules
  - CI/CD configuration
  - Development workflow
  - Publishing

## Implementation Details

- **[Implementation Notes](implementation/notes.md)** - Technical implementation details
  - Architecture overview
  - IPC protocol
  - API implementations
  - Future enhancements
  - Breaking changes
  - Migration paths
  - Version compatibility

## Examples

All examples are in the `python/` folder:

- **[example.py](../python/example.py)** - Basic operations demo
- **[example_events.py](../python/example_events.py)** - Event subscription demo
- **[example_document.py](../python/example_document.py)** - TextDocument API demo
- **[launched-by-extension.py](../python/launched-by-extension.py)** - Extension integration demo

## Quick Links

- [Main README](../README.md)
- [Python Package README](../python/README.md)
- [TypeScript Source](../src/)
- [Python Source](../python/vscode_sockpuppet/)

## Documentation Structure

```
docs/
├── README.md                        # This file
├── QUICKSTART.md                    # 5-minute getting started guide
├── DOCUMENT_API.md                  # TextDocument object model
├── EVENTS.md                        # Event subscription system
├── EXTENSION_API.md                 # Extension integration
├── DEVELOPMENT.md                   # Developer guide
├── API_IMPLEMENTATION.md            # Implementation details
├── DOCUMENT_IMPLEMENTATION.md       # Document API details
└── MIGRATION.md                     # Version migration guide
```

## Support

For issues, questions, or contributions:
1. Check the relevant documentation above
2. Review the example scripts
3. Open an issue on GitHub
4. Submit a pull request

## License

See [LICENSE](../LICENSE) in the root directory.
