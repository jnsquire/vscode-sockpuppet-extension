# Documentation

Welcome to the VSCode Sockpuppet documentation!

## Getting Started

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
  - Installation
  - First script
  - Common operations

## API Documentation

- **[TextDocument API](DOCUMENT_API.md)** - Complete object model for working with documents
  - Position, Range, TextLine, TextDocument classes
  - Properties and methods
  - Examples and best practices

- **[Event Subscriptions](EVENTS.md)** - Real-time event handling
  - Available events
  - Subscription API
  - Event data structures
  - Threading considerations

## Integration & Development

- **[Extension Integration API](EXTENSION_API.md)** - For VS Code extension developers
  - How to integrate with other extensions
  - TypeScript API reference
  - Launch Python scripts from extensions

- **[Development Guide](DEVELOPMENT.md)** - Contributing and extending
  - Project structure
  - Adding new API methods
  - Testing
  - Contributing guidelines

## Implementation Details

- **[API Implementation](API_IMPLEMENTATION.md)** - Server-side API implementation notes
  - Request/response protocol
  - VS Code API mappings
  - Future enhancements

- **[Document Implementation](DOCUMENT_IMPLEMENTATION.md)** - TextDocument API implementation
  - Object model design
  - Serialization details
  - Complete feature list

- **[Migration Guide](MIGRATION.md)** - Upgrading and compatibility
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
