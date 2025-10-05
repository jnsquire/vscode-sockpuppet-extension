# Development Notes

## Recent Changes

### Event-Driven Shutdown Pattern (2025-10-04) ✅ IMPLEMENTED
**Problem**: Examples using polling with `time.sleep()` were inefficient and couldn't be interrupted cleanly with Ctrl-C on Windows.

**Solution**: Replaced polling loops with event-driven pattern using `threading.Event`:

**Key Changes**:
1. Use `threading.Event` instead of boolean flag
2. Signal handler calls `event.set()` to trigger immediate shutdown
3. Main loop uses `event.wait(timeout=N)` instead of `time.sleep(N)`
4. On Ctrl-C or webview disposal, event is set and loop exits immediately

**Pattern**:
```python
class WebviewState:
    def __init__(self):
        self.stop_event = threading.Event()
    
    def stop(self):
        self.stop_event.set()
    
    @property
    def running(self):
        return not self.stop_event.is_set()

# Signal handler fires stop event
def signal_handler(sig, frame):
    state.stop()

signal.signal(signal.SIGINT, signal_handler)

# Event-driven wait (no polling!)
while state.running:
    if state.stop_event.wait(timeout=3.0):
        break  # Event was set, exit immediately
    # Timeout expired, do periodic work
    update_counter()
```

**Benefits**:
- ✅ No polling loops with multiple short sleeps
- ✅ Immediate response to Ctrl-C (no delay)
- ✅ Cleaner, more Pythonic code
- ✅ Works reliably on Windows and Unix
- ✅ Single wait point instead of checking flag in multiple places

**Files Updated**:
- ✅ `example_webview.py` - Periodic counter updates with event-driven wait
- ✅ `example_webview_forms.py` - Indefinite wait until form closed
- ✅ `example_webview_debug.py` - Debug logging with event-driven wait

### Webview Events Not Firing Investigation (2025-10-04) 🔍 INVESTIGATING
**Problem**: Button clicks in webview examples don't trigger Python event handlers.

**Hypothesis**: 
- CSP headers are now correct (added in previous fix)
- Event subscription might not be working properly
- Need to verify: event loop, event dispatching, webview message routing

**Debug Steps**:
1. Created `example_webview_debug.py` with extensive logging
2. Need to verify extension is running and pipe connection works
3. Check if `webview.onDidReceiveMessage` events are being broadcast from server
4. Verify event dispatcher is routing messages to correct panel

**Next Steps**:
- Run debug example to see where the event flow breaks
- Check server-side event broadcasting
- Verify client event loop is receiving messages

### Webview Script Execution Fix (2025-10-04) ✅ RESOLVED
**Problem**: Scripts embedded in webview examples were not executing because VS Code applies a restrictive Content Security Policy by default when none is specified.

**Solution**: Added explicit CSP meta tags to all webview examples that allow inline scripts and styles:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
```

**Files Updated**:
- `python/examples/example_webview.py` - Basic webview with counter
- `python/examples/example_webview_forms.py` - Form submission example
- `python/examples/example_webview_dispose.py` - Disposal event tracking
- `python/examples/example_webview_visibility.py` - Visibility state tracking
- `python/examples/example_webview_chart.py` - Already had CSP for external Chart.js

**Note**: The `enable_scripts=True` option in `WebviewOptions` enables script execution capability, but VS Code still requires an explicit CSP header in the HTML to actually allow inline scripts. Without the CSP, the browser blocks all inline scripts for security.

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
