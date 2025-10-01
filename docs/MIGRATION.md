# Migration to Named Pipes / Unix Domain Sockets

## Summary

Successfully migrated from WebSocket (TCP port 37568) to platform-specific IPC:
- **Windows:** Named pipe at `\\.\pipe\vscode-sockpuppet`
- **Unix/Linux/Mac:** Unix domain socket at `/tmp/vscode-sockpuppet.sock`

## Benefits

1. **Better Security** - No network exposure, purely local IPC
2. **Lower Latency** - Direct OS kernel communication
3. **No Port Conflicts** - No need to manage TCP ports
4. **No Firewall Issues** - Doesn't trigger firewall warnings
5. **Simpler Dependencies** - Uses native Node.js `net` module, no external WebSocket library

## Changes Made

### TypeScript Extension (`src/server.ts`)

- Replaced WebSocket server with `net.createServer()`
- Platform detection for pipe path (Windows vs Unix)
- Newline-delimited JSON message framing
- Proper socket cleanup on shutdown

### Python Client (`python/vscode_sockpuppet/client.py`)

- Replaced `websocket-client` with native `socket` module (Unix)
- Added `pywin32` support for Windows named pipes
- Newline-delimited message protocol
- Better error messages with connection troubleshooting

### Dependencies

**Removed:**
- `ws` (WebSocket library for Node.js)
- `@types/ws`
- `websocket-client` (Python)

**Added:**
- `pywin32` (optional, Windows only) for named pipe support

### Documentation Updates

- README.md - Updated architecture diagram and overview
- QUICKSTART.md - Updated connection information
- DEVELOPMENT.md - Updated rationale and troubleshooting
- python/README.md - Added Windows installation instructions

## Installation

### Extension
```bash
npm install
npm run compile
```

### Python Package
```bash
cd python
pip install -e .

# Windows only:
pip install -e ".[windows]"
# OR
pip install pywin32
```

## Testing

1. Press F5 to launch extension
2. Note the pipe path in the notification
3. Run Python example:
   ```bash
   cd python
   python example.py
   ```

## Platform-Specific Notes

### Windows
- Uses Windows named pipes API via `pywin32`
- Pipe path: `\\.\pipe\vscode-sockpuppet`
- Requires `pywin32` package

### Unix/Linux/Mac
- Uses Unix domain sockets
- Socket path: `/tmp/vscode-sockpuppet.sock`
- No additional dependencies needed
- Socket file is automatically cleaned up

## Protocol

Messages are newline-delimited JSON:

**Request:**
```json
{"id": 1, "method": "window.showInformationMessage", "params": {"message": "Hello"}}\n
```

**Response:**
```json
{"id": 1, "result": "OK"}\n
```

This simple protocol allows for efficient message framing without complex parsing.
