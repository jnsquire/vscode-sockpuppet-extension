# Event Subscriptions in VSCode Sockpuppet

## Overview

VSCode Sockpuppet now supports real-time event subscriptions! Python scripts can subscribe to VS Code events and react to changes in the editor, workspace, terminals, and more.

## Available Events

### Document Events

- **`workspace.onDidOpenTextDocument`** - Fired when a document is opened
  ```python
  def on_open(data):
      print(f"Opened: {data['fileName']}")
  
  vscode.subscribe('workspace.onDidOpenTextDocument', on_open)
  ```

- **`workspace.onDidCloseTextDocument`** - Fired when a document is closed
  ```python
  vscode.subscribe('workspace.onDidCloseTextDocument', lambda data: 
      print(f"Closed: {data['fileName']}"))
  ```

- **`workspace.onDidSaveTextDocument`** - Fired when a document is saved
  ```python
  vscode.subscribe('workspace.onDidSaveTextDocument', on_save_handler)
  ```

- **`workspace.onDidChangeTextDocument`** - Fired when document content changes
  ```python
  def on_change(data):
      print(f"Changed: {data['uri']}")
      for change in data['contentChanges']:
          print(f"  Text: {change['text']}")
  
  vscode.subscribe('workspace.onDidChangeTextDocument', on_change)
  ```

### Editor Events

- **`window.onDidChangeActiveTextEditor`** - Fired when active editor changes
  ```python
  def on_active_change(data):
      if data:
          print(f"Active: {data['fileName']}")
  
  vscode.subscribe('window.onDidChangeActiveTextEditor', on_active_change)
  ```

- **`window.onDidChangeTextEditorSelection`** - Fired when selection changes
  ```python
  def on_selection(data):
      sel = data['selections'][0]
      print(f"Line {sel['start']['line']}, Col {sel['start']['character']}")
  
  vscode.subscribe('window.onDidChangeTextEditorSelection', on_selection)
  ```

- **`window.onDidChangeVisibleTextEditors`** - Fired when visible editors change
  ```python
  vscode.subscribe('window.onDidChangeVisibleTextEditors', 
                   lambda data: print(f"{data['count']} editors visible"))
  ```

### Terminal Events

- **`window.onDidOpenTerminal`** - Fired when a terminal is opened
  ```python
  vscode.subscribe('window.onDidOpenTerminal',
                   lambda data: print(f"Terminal: {data['name']}"))
  ```

- **`window.onDidCloseTerminal`** - Fired when a terminal is closed
  ```python
  vscode.subscribe('window.onDidCloseTerminal', on_terminal_close)
  ```

### Workspace Events

- **`workspace.onDidChangeWorkspaceFolders`** - Fired when workspace folders change
  ```python
  def on_folders_change(data):
      print(f"Added: {len(data['added'])}")
      print(f"Removed: {len(data['removed'])}")
  
  vscode.subscribe('workspace.onDidChangeWorkspaceFolders', on_folders_change)
  ```

- **`workspace.onDidChangeConfiguration`** - Fired when settings change
  ```python
  vscode.subscribe('workspace.onDidChangeConfiguration',
                   lambda data: print("Configuration changed"))
  ```

## API Methods

### `subscribe(event, handler)`

Subscribe to an event with a callback handler.

```python
def my_handler(event_data):
    print(f"Event received: {event_data}")

vscode.subscribe('workspace.onDidSaveTextDocument', my_handler)
```

**Parameters:**
- `event` (str): Event name
- `handler` (Callable): Function to call when event fires

### `unsubscribe(event, handler=None)`

Unsubscribe from an event.

```python
# Unsubscribe specific handler
vscode.unsubscribe('workspace.onDidSaveTextDocument', my_handler)

# Unsubscribe all handlers for an event
vscode.unsubscribe('workspace.onDidSaveTextDocument')
```

**Parameters:**
- `event` (str): Event name
- `handler` (Callable, optional): Specific handler to remove, or None for all

### `get_subscriptions()`

Get list of currently subscribed events.

```python
events = vscode.get_subscriptions()
print(f"Subscribed to: {events}")
# Output: ['workspace.onDidSaveTextDocument', 'window.onDidOpenTerminal']
```

**Returns:** List of event names

## Complete Example

See [../python/example_events.py](../python/example_events.py) for a complete working example.

```python
from vscode_sockpuppet import VSCodeClient
import time


def on_file_saved(data):
    """React to file saves."""
    print(f"✓ Saved: {data['fileName']}")


def on_file_changed(data):
    """React to file changes."""
    changes = data['contentChanges']
    print(f"✎ Edited: {len(changes)} change(s)")


def main():
    with VSCodeClient() as vscode:
        # Subscribe to events
        vscode.subscribe('workspace.onDidSaveTextDocument', on_file_saved)
        vscode.subscribe('workspace.onDidChangeTextDocument', on_file_changed)
        
        # Show what we're listening for
        print(f"Monitoring: {vscode.get_subscriptions()}")
        
        # Keep script running to receive events
        try:
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("Stopped")


if __name__ == "__main__":
    main()
```

## Use Cases

### 1. Auto-Save Detector

```python
def on_save(data):
    vscode.window.show_information_message(f"Saved: {data['fileName']}")

vscode.subscribe('workspace.onDidSaveTextDocument', on_save)
```

### 2. Live Linting

```python
def on_change(data):
    # Run linter on every change
    run_linter(data['uri'])
    
vscode.subscribe('workspace.onDidChangeTextDocument', on_change)
```

### 3. Terminal Logger

```python
terminals = []

def on_terminal_open(data):
    terminals.append(data['name'])
    print(f"Terminal opened: {data['name']} (Total: {len(terminals)})")

def on_terminal_close(data):
    terminals.remove(data['name'])
    print(f"Terminal closed: {data['name']} (Remaining: {len(terminals)})")

vscode.subscribe('window.onDidOpenTerminal', on_terminal_open)
vscode.subscribe('window.onDidCloseTerminal', on_terminal_close)
```

### 4. Selection Tracker

```python
def track_selection(data):
    sel = data['selections'][0]
    line = sel['start']['line']
    col = sel['start']['character']
    # Log cursor position for analytics
    log_cursor_position(line, col)

vscode.subscribe('window.onDidChangeTextEditorSelection', track_selection)
```

### 5. Workspace Monitor

```python
def on_folder_change(data):
    if data['added']:
        for folder in data['added']:
            print(f"Added folder: {folder['name']}")
            initialize_workspace(folder['uri'])

vscode.subscribe('workspace.onDidChangeWorkspaceFolders', on_folder_change)
```

## Event Data Structures

### Document Events
```python
{
    'uri': 'file:///path/to/file.py',
    'languageId': 'python',
    'fileName': '/path/to/file.py'
}
```

### Change Events
```python
{
    'uri': 'file:///path/to/file.py',
    'contentChanges': [
        {
            'range': {
                'start': {'line': 0, 'character': 0},
                'end': {'line': 0, 'character': 5}
            },
            'text': 'Hello'
        }
    ]
}
```

### Selection Events
```python
{
    'uri': 'file:///path/to/file.py',
    'selections': [
        {
            'start': {'line': 10, 'character': 5},
            'end': {'line': 10, 'character': 15},
            'active': {'line': 10, 'character': 15},
            'anchor': {'line': 10, 'character': 5}
        }
    ]
}
```

## Important Notes

1. **Event Thread**: Events are processed in a background thread automatically
2. **Context Manager**: Use `with VSCodeClient()` to ensure proper cleanup
3. **Keep Alive**: Scripts must stay running to receive events (use `time.sleep()` or similar)
4. **Error Handling**: Event handlers should catch exceptions to avoid breaking the event loop
5. **Performance**: Avoid heavy processing in event handlers; use queues for async work

## Threading Considerations

```python
import queue
import threading

# Use a queue for heavy processing
event_queue = queue.Queue()

def on_save(data):
    # Quick: just add to queue
    event_queue.put(('save', data))

def worker():
    while True:
        event_type, data = event_queue.get()
        # Heavy processing here
        process_event(event_type, data)

# Start worker thread
threading.Thread(target=worker, daemon=True).start()

# Subscribe with lightweight handler
vscode.subscribe('workspace.onDidSaveTextDocument', on_save)
```

## Debugging Events

Enable debug output to see all events:

```python
def debug_handler(data):
    import json
    print(json.dumps(data, indent=2))

# Subscribe to all events for debugging
for event in [
    'workspace.onDidSaveTextDocument',
    'workspace.onDidOpenTextDocument',
    'window.onDidChangeActiveTextEditor',
    # ... add more
]:
    vscode.subscribe(event, lambda d, e=event: print(f"{e}: {d}"))
```

## See Also

- [python/example_events.py](python/example_events.py) - Complete working example
- [EXTENSION_API.md](EXTENSION_API.md) - Extension integration API
- [README.md](README.md) - Main documentation
