# VSCode Sockpuppet - Development Guide

## Project Structure

```
vscode-sockpuppet/
├── src/                          # TypeScript extension source
│   ├── extension.ts             # Main extension entry point
│   └── server.ts                # WebSocket server implementation
├── python/                       # Python client package
│   ├── vscode_sockpuppet/       # Package source
│   │   ├── __init__.py
│   │   ├── client.py            # Main client class
│   │   ├── window.py            # Window operations
│   │   ├── workspace.py         # Workspace operations
│   │   └── editor.py            # Editor operations
│   ├── pyproject.toml           # Python package configuration
│   ├── README.md                # Python package documentation
│   └── example.py               # Usage examples
├── dist/                         # Compiled extension output
├── package.json                  # Extension manifest
└── README.md                     # Main documentation
```

## Development Setup

### Extension Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Compile the extension:**
   ```bash
   npm run compile
   ```

3. **Watch for changes:**
   ```bash
   npm run watch
   ```

4. **Run extension in debug mode:**
   - Press F5 in VS Code
   - This opens a new Extension Development Host window

### Python Package Development

1. **Install in editable mode:**
   ```bash
   cd python
   pip install -e .
   ```

2. **Install development dependencies:**
   ```bash
   pip install -e ".[dev]"
   ```

3. **Run the example:**
   ```bash
   python example.py
   ```

## How It Works

### Communication Protocol

The extension and Python client communicate via WebSocket using a JSON-RPC-like protocol:

**Request (Python → VS Code):**
```json
{
  "id": 1,
  "method": "window.showInformationMessage",
  "params": {
    "message": "Hello from Python!",
    "items": ["OK", "Cancel"]
  }
}
```

**Response (VS Code → Python):**
```json
{
  "id": 1,
  "result": "OK"
}
```

**Error Response:**
```json
{
  "id": 1,
  "error": "Error message"
}
```

### Adding New Methods

#### 1. Add handler in TypeScript (src/server.ts)

```typescript
case 'your.new.method':
    result = await vscode.yourNewMethod(params.arg1, params.arg2);
    break;
```

#### 2. Add Python wrapper (python/vscode_sockpuppet/*.py)

```python
def your_new_method(self, arg1: str, arg2: int) -> Any:
    """Description of the method."""
    return self.client._send_request("your.new.method", {
        "arg1": arg1,
        "arg2": arg2
    })
```

## Testing

### Manual Testing

1. Launch the extension (F5)
2. Run a Python script:
   ```bash
   cd python
   python example.py
   ```

### Debugging

- **Extension:** Use VS Code's built-in debugger (F5)
- **Python:** Use standard Python debugging tools
- **WebSocket traffic:** Add console.log statements in server.ts

## Building for Distribution

### Extension Package

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be installed in VS Code.

### Python Package

```bash
cd python
python -m build
```

This creates distribution files in `python/dist/`.

## Architecture Notes

### Why Named Pipes / Unix Domain Sockets?

- Lower latency than TCP/WebSocket for local IPC
- More secure - no network exposure
- No port conflicts or firewall issues
- Native OS support, no additional dependencies
- Works well with Python's synchronous API

### Design Decisions

1. **Platform-specific paths:** Uses Windows named pipes or Unix domain sockets.
2. **Newline-delimited JSON:** Simple message framing protocol.
3. **Single client:** Currently designed for one Python client at a time.
4. **Synchronous Python API:** Simpler for users, but could add async support.
5. **No package.json changes:** All methods are dynamic, avoiding restart requirements.

## Troubleshooting

### Python can't connect

- Ensure the extension is running (check Output panel)
- On Unix/Linux: Verify `/tmp/vscode-sockpuppet.sock` exists
- On Windows: Install pywin32 (`pip install pywin32`)
- Check VS Code extension host logs

### Method not found

- Ensure the method is implemented in server.ts
- Check spelling in both Python and TypeScript

### Socket errors

- Check VS Code Developer Tools (Help → Toggle Developer Tools)
- Look for error messages in the extension host
- On Unix, ensure the socket file isn't orphaned (delete manually if needed)

## Future Enhancements

- [ ] Add event support (e.g., document changes, selection changes)
- [ ] Support multiple simultaneous clients
- [ ] Add authentication/security layer
- [ ] Implement more VS Code API methods
- [ ] Add async Python API
- [ ] Create detailed API documentation
- [ ] Add unit tests
