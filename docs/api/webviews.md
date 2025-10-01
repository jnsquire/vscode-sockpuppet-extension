# Webview API

The Webview API allows you to create custom HTML-based UI panels in VS Code from your Python scripts.

## Quick Start

```python
from vscode_sockpuppet import VSCodeClient, WebviewOptions

with VSCodeClient() as client:
    # Create a webview with HTML content
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
                padding: 20px;
            }
        </style>
    </head>
    <body>
        <h1>Hello from Python!</h1>
        <button onclick="alert('Clicked!')">Click Me</button>
    </body>
    </html>
    """
    
    panel = client.window.create_webview_panel(
        title="My Panel",
        html=html
    )
```

## Creating Webviews

### `Window.create_webview_panel()`

```python
panel = window.create_webview_panel(
    title: str,
    html: str,
    view_type: Optional[str] = None,
    panel_id: Optional[str] = None,
    show_options: int = 1,
    options: Optional[WebviewOptions] = None
) -> WebviewPanel
```

**Parameters:**

- `title` - The title displayed in the editor tab
- `html` - The HTML content to display
- `view_type` - Optional identifier for the webview type (auto-generated if None)
- `panel_id` - Optional unique identifier (auto-generated if None)
- `show_options` - ViewColumn where to show: 1 (One), 2 (Two), 3 (Three), -1 (Active)
- `options` - Optional `WebviewOptions` for configuration

**Returns:** A `WebviewPanel` instance

## WebviewPanel Class

Represents an open webview panel in VS Code.

### Properties

```python
panel.id          # Unique identifier (str)
panel.view_type   # View type identifier (str)
panel.title       # Current title (str)
panel.disposed    # Whether panel is disposed (bool)
```

### Methods

#### `update_html(html: str)`

Update the HTML content of the webview.

```python
panel.update_html("<h1>Updated content</h1>")
```

#### `update_title(title: str)`

Change the panel title.

```python
panel.update_title("New Title")
```

#### `update_icon(icon_path: str)`

Set the panel icon.

```python
panel.update_icon("/path/to/icon.svg")
```

#### `post_message(message: Any)`

Send a message to the webview's JavaScript context.

```python
panel.post_message({
    'type': 'update',
    'data': [1, 2, 3]
})
```

The message can be received in the webview:

```javascript
window.addEventListener('message', event => {
    const message = event.data;
    console.log('Received:', message);
});
```

#### `on_did_receive_message(handler: Callable[[Any], None]) -> Callable[[], None]`

Subscribe to messages posted from the webview's JavaScript.

```python
def handle_message(message):
    print(f"Received: {message}")
    action = message.get('action')
    if action == 'save':
        # Handle save action
        panel.post_message({'status': 'saved'})

# Subscribe to messages
unsubscribe = panel.on_did_receive_message(handle_message)

# Later, to unsubscribe
unsubscribe()
```

In the webview JavaScript, post messages using:

```javascript
const vscode = acquireVsCodeApi();
vscode.postMessage({ action: 'save', data: myData });
```

**Returns:** A function that can be called to unsubscribe the handler.

#### `dispose()`

Close the webview panel.

```python
panel.dispose()
```

### Context Manager

WebviewPanel supports context management for automatic cleanup:

```python
with window.create_webview_panel("My Panel", html) as panel:
    # Use panel
    panel.update_html("<h1>Hello</h1>")
# Panel automatically disposed here
```

## WebviewOptions Class

Configure webview behavior.

```python
from vscode_sockpuppet import WebviewOptions

options = WebviewOptions(
    enable_scripts=True,                    # Enable JavaScript
    retain_context_when_hidden=False,       # Keep state when hidden
    local_resource_roots=["/path/to/dir"]   # Local file access paths
)

panel = window.create_webview_panel(
    title="Configured Panel",
    html=html,
    options=options
)
```

### Parameters

- `enable_scripts` (bool) - Whether to enable JavaScript in the webview. Default: `True`
- `retain_context_when_hidden` (bool) - Keep webview state when switching tabs. Default: `False`
- `local_resource_roots` (list[str]) - List of local paths the webview can access. Default: `[]`

## Two-Way Communication

### Python → Webview

Send messages from Python to JavaScript:

**Python:**
```python
panel.post_message({
    'command': 'updateData',
    'value': 42
})
```

**JavaScript:**
```javascript
window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.command === 'updateData') {
        document.getElementById('value').textContent = msg.value;
    }
});
```

### Webview → Python

Send messages from JavaScript to Python using the panel's message subscription:

**JavaScript:**
```javascript
const vscode = acquireVsCodeApi();

function sendToPython() {
    vscode.postMessage({
        action: 'buttonClicked',
        value: 123
    });
}
```

**Python (Method 1 - Recommended):**
```python
# Subscribe directly on the panel
def handle_message(message):
    action = message.get('action')
    
    if action == 'buttonClicked':
        print(f"Button clicked with value: {message['value']}")
        # Respond back
        panel.post_message({'status': 'received'})

unsubscribe = panel.on_did_receive_message(handle_message)
```

**Python (Method 2 - Global subscription):**
```python
# Subscribe to all webview messages globally
def handle_message(event):
    if event['data']['id'] == panel.id:  # Filter by panel ID
        message = event['data']['message']
        action = message.get('action')
        
        if action == 'buttonClicked':
            print(f"Button clicked with value: {message['value']}")
            panel.post_message({'status': 'received'})

client.subscribe('webview.onDidReceiveMessage', handle_message)
```

## VS Code Theming

Your webview can use VS Code's theme colors through CSS variables:

```html
<style>
    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-editor-foreground);
        background-color: var(--vscode-editor-background);
    }
    
    button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: 1px solid var(--vscode-button-border);
    }
    
    button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    
    a {
        color: var(--vscode-textLink-foreground);
    }
    
    .info {
        background-color: var(--vscode-editor-infoBackground);
        border-left: 4px solid var(--vscode-editorInfo-foreground);
    }
</style>
```

### Common Theme Variables

- **Colors:**
  - `--vscode-editor-foreground` - Text color
  - `--vscode-editor-background` - Background color
  - `--vscode-editor-selectionBackground` - Selection color
  - `--vscode-textLink-foreground` - Link color
  - `--vscode-textLink-activeForeground` - Active link color

- **UI Elements:**
  - `--vscode-button-background` - Button background
  - `--vscode-button-foreground` - Button text
  - `--vscode-button-hoverBackground` - Button hover state
  - `--vscode-input-background` - Input field background
  - `--vscode-input-foreground` - Input field text

- **Typography:**
  - `--vscode-font-family` - Editor font family
  - `--vscode-font-size` - Editor font size
  - `--vscode-font-weight` - Editor font weight

See [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color) for complete list.

## Complete Example

```python
from vscode_sockpuppet import VSCodeClient, WebviewOptions
import time

with VSCodeClient() as client:
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background: var(--vscode-editor-background);
                padding: 20px;
            }
            button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 10px 20px;
                cursor: pointer;
            }
            #counter {
                font-size: 48px;
                text-align: center;
                margin: 20px;
            }
        </style>
    </head>
    <body>
        <h1>Interactive Counter</h1>
        <div id="counter">0</div>
        <button onclick="increment()">Increment</button>
        <button onclick="reset()">Reset</button>
        
        <script>
            const vscode = acquireVsCodeApi();
            let count = 0;
            
            function increment() {
                vscode.postMessage({ action: 'increment' });
            }
            
            function reset() {
                vscode.postMessage({ action: 'reset' });
            }
            
            window.addEventListener('message', event => {
                const msg = event.data;
                if (msg.type === 'updateCounter') {
                    count = msg.value;
                    document.getElementById('counter').textContent = count;
                }
            });
        </script>
    </body>
    </html>
    """
    
    options = WebviewOptions(enable_scripts=True)
    panel = client.window.create_webview_panel(
        title="Counter Demo",
        html=html,
        options=options
    )
    
    counter = 0
    
    def handle_message(message):
        global counter
        
        if message['action'] == 'increment':
            counter += 1
        elif message['action'] == 'reset':
            counter = 0
        
        panel.post_message({
            'type': 'updateCounter',
            'value': counter
        })
    
    # Subscribe to messages using the panel method
    panel.on_did_receive_message(handle_message)
    
    # Keep running to handle messages
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        panel.dispose()
```

## Best Practices

1. **Always enable scripts** for interactive webviews:
   ```python
   options = WebviewOptions(enable_scripts=True)
   ```

2. **Use context managers** for automatic cleanup:
   ```python
   with window.create_webview_panel(...) as panel:
       # Your code
   ```

3. **Use VS Code theme variables** for consistent styling:
   ```css
   color: var(--vscode-editor-foreground);
   ```

4. **Check disposed state** before operations:
   ```python
   if not panel.disposed:
       panel.update_html(new_html)
   ```

5. **Handle messages asynchronously** using event subscriptions:
   ```python
   client.subscribe('webview.onDidReceiveMessage', handler)
   ```

6. **Retain context for long-running views**:
   ```python
   options = WebviewOptions(retain_context_when_hidden=True)
   ```

## Security Considerations

- **JavaScript is enabled by default** - Only display trusted content
- **No direct file system access** - Use `local_resource_roots` for file access
- **Content Security Policy** - Consider adding CSP meta tags
- **Sanitize user input** - Never inject unsanitized data into HTML

Example CSP header:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               style-src 'unsafe-inline'; 
               script-src 'unsafe-inline';">
```

## See Also

- [Example: example_webview.py](../python/example_webview.py) - Complete interactive example
- [EVENTS.md](EVENTS.md) - Event subscription guide
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview) - Official VS Code documentation
