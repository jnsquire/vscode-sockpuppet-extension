# Development Notes

## Recent Changes

### Asyncio Event Loop Refactor (2025-10-04) ✅ RESOLVED
**Problem**: Windows named pipe threading deadlock when multiple threads accessed the pipe simultaneously.

**Solution**: Refactored client.py to use asyncio event loop architecture:
- Single event loop thread handles ALL I/O operations (reads and writes)
- Main thread uses `concurrent.futures.Future` to wait for responses
- Requests are sent via `loop.call_soon_threadsafe()` + executor
- Responses are received in the I/O loop and matched to futures by request ID
- Events are processed in the same I/O loop and dispatched to handlers

**Benefits**:
- ✅ No more threading deadlocks on Windows named pipes
- ✅ Single thread doing I/O eliminates pipe contention
- ✅ Cleaner separation: user code (sync) + I/O (async)
- ✅ Better error handling with futures
- ✅ Maintains backward-compatible synchronous API

**Architecture**:
```
User Thread                    Event Loop Thread (asyncio)
    |                                    |
    | _send_request()                    |
    |----> create Future                 |
    |----> queue send via                |
    |      call_soon_threadsafe()        |
    |                                    |
    |                          run_in_executor(send)
    |                                    |
    | future.result(timeout)    read from pipe
    | <----- wait -----                  |
    |                           parse message
    |                           match request_id
    | <----- set_result() ------         |
    |                                    |
    | return result                      |
```

**Follow-up (2025-10-04)**:
- `_send_request_async` now accepts an optional timeout (defaults to the same 10s)
- `_send_request` forwards `None` timeout values through the async pipeline
- Both sync/async paths share `DEFAULT_TIMEOUT`

## Known Issues

## Recent Changes (cont'd)

### Language Model API Documentation (2025-10-04)
- Created comprehensive docs/api/language-model.md
- Complete API reference for all Language Model classes and methods
- Multiple use case examples (code generation, explanation, documentation, error analysis)
- Best practices and model selection strategies documented

### Webview Disposal Events (2025-10-04)
- Added `on_did_dispose()` event handler to WebviewPanel class
- Server now broadcasts `webview.onDidDispose` event when panel closes
- Updated example_webview.py to use disposal events for auto-exit
- Refactored state management: replaced mutable lists with dedicated state classes
  - `WebviewState` class for counter and running state
  - `DisposalState` class for disposal tracking
- Examples now exit cleanly when webview is closed by user

### Language Model API (2025-10-04)
- Implemented complete Language Model API integration
- Added LanguageModel, LanguageModelChat, LanguageModelChatMessage classes
- Supports GitHub Copilot and custom LM providers
- Created example_language_model.py with 9 comprehensive use cases
- Fixed example to use `client.editor.get_selection()` instead of non-existent method

### Multi-Instance IPC Support (2025-10-04)
- Implemented unique pipe naming per VS Code instance
- Uses MD5 hash of workspace path (8 chars) for consistency
- Falls back to process.pid if no workspace
- Added VSCODE_SOCKPUPPET_PIPE environment variable
- Integrated with VS Code's EnvironmentVariableCollection API
- Status bar shows active pipe path with copy-to-clipboard

## Architecture

### IPC Communication
- **Windows**: Named pipes via `\\.\pipe\vscode-sockpuppet-{uniqueId}`
- **Unix**: Domain sockets in `/tmp/vscode-sockpuppet-{uniqueId}.sock`
- **Discovery**: VSCODE_SOCKPUPPET_PIPE environment variable
- **Multi-instance**: Each workspace gets unique pipe based on path hash

### Event System
- Events broadcast from TypeScript to Python via JSON-RPC
- Python client maintains event handlers per event type
- Background thread (`_event_loop`) receives and dispatches events
- Supported: workspace, window, webview, terminal events

### State Management Pattern
- Use dedicated state classes instead of mutable lists
- Example: `WebviewState` with counter and running flag
- Methods for state transitions (increment, reset, stop)
- Clean, testable, Pythonic approach

## Testing

To test changes:
1. Run `npm run compile` to build TypeScript and lint Python
2. Press F5 to launch Extension Development Host
3. Run Python examples from the debug instance
4. Check terminal output for events and messages

## Known Issues
None currently.

## TODO

- [x] Document all Language Model API features in docs/
  - Created docs/api/language-model.md with complete API reference
- [x] Add more webview examples (forms, data visualization)
  - Created example_webview_forms.py - Interactive form with data collection
  - Created example_webview_chart.py - Real-time data visualization with Chart.js
- [x] Consider adding webview panel visibility events
  - Added on_did_change_view_state() for visibility and active state tracking
  - Created example_webview_visibility.py demonstrating usage
- [ ] Test multi-instance with multiple workspaces
  - Need to verify unique pipe names work correctly with 2+ instances
