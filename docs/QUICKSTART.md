# Quick Start Guide

Get up and running with VSCode Sockpuppet in 5 minutes!

## Step 1: Run the Extension

Press **F5** in VS Code to launch the extension in debug mode.

A new VS Code window will open with the extension running. You should see a message showing the pipe path:
> "VSCode Sockpuppet is ready! Pipe: \\.\pipe\vscode-sockpuppet" (Windows)
> "VSCode Sockpuppet is ready! Pipe: /tmp/vscode-sockpuppet.sock" (Unix)

## Step 2: Install the Python Package

Open a terminal and run:

```bash
cd python
pip install -e .
```

## Step 3: Try the Example

Run the example script:

```bash
python example.py
```

You should see:
- An information message in VS Code with buttons
- A quick pick menu
- An input box
- A new terminal created
- Messages printed in your Python terminal

## Step 4: Write Your Own Script

Create a new Python file:

```python
from vscode_sockpuppet import VSCodeClient, Position, Range

# Connect to VS Code
with VSCodeClient() as vscode:
    # Show a message
    result = vscode.window.show_information_message(
        "What would you like to do?",
        "Analyze Document",
        "Create File",
        "Open Terminal",
        "Cancel"
    )
    
    if result == "Analyze Document":
        # Get all open documents
        docs = vscode.workspace.text_documents()
        
        if docs:
            doc = docs[0]  # First document
            vscode.window.show_information_message(
                f"{doc.file_name}: {doc.line_count} lines, "
                f"Language: {doc.language_id}"
            )
            
            # Show first few lines
            for i in range(min(5, doc.line_count)):
                line = doc.line_at(i)
                print(f"{i}: {line.text}")
    
    elif result == "Create File":
        # Ask for filename
        filename = vscode.window.show_input_box({
            "prompt": "Enter filename",
            "placeholder": "example.txt"
        })
        
        if filename:
            # Create and open the file
            doc = vscode.workspace.open_text_document(
                content=f"# Created by Python!\n",
                language="markdown"
            )
            vscode.window.show_text_document(doc.uri, {})
            vscode.window.show_information_message(f"Created {filename}!")
    
    elif result == "Open Terminal":
        vscode.window.create_terminal(
            name="Python Terminal",
            text="echo 'Hello from Python!'",
            show=True
        )
```

## Common Operations

### Show Messages

```python
vscode.window.show_information_message("Info!")
vscode.window.show_warning_message("Warning!")
vscode.window.show_error_message("Error!")
```

### Get User Input

```python
name = vscode.window.show_input_box({
    "prompt": "What's your name?",
    "placeholder": "Enter name here"
})
```

### Show Menu

```python
choice = vscode.window.show_quick_pick(
    ["Option 1", "Option 2", "Option 3"],
    {"placeholder": "Choose one"}
)
```

### Create Terminal

```python
vscode.window.create_terminal(
    name="My Terminal",
    text="ls -la",
    show=True
)
```

### Edit Active File

```python
# Insert text at the beginning
vscode.editor.insert_text(0, 0, "# Header\n")

# Get current selection
selection = vscode.editor.get_selection()
print(f"Selected: {selection['text']}")

# Replace text
vscode.editor.replace_text(0, 0, 0, 10, "Replaced!")
```

### Work with Documents

```python
from vscode_sockpuppet import Position, Range

# Get all open documents
docs = vscode.workspace.text_documents()

for doc in docs:
    print(f"{doc.file_name}: {doc.line_count} lines")
    
    # Get a specific line
    if doc.line_count > 10:
        line = doc.line_at(10)
        print(f"  Line 10: {line.text}")
    
    # Get text in a range
    range = Range(Position(0, 0), Position(5, 0))
    text = doc.get_text(range)
    
    # Save if dirty
    if doc.is_dirty:
        doc.save()
```

### Execute Commands

```python
# Save all files
vscode.execute_command("workbench.action.files.saveAll")

# Open settings
vscode.execute_command("workbench.action.openSettings")

# Get list of all commands
commands = vscode.get_commands(filter_internal=True)
print(f"Available commands: {len(commands)}")
```

## Troubleshooting

**"ConnectionError: Not connected to VS Code"**
- Make sure the extension is running (press F5)
- On Unix/Linux, check that `/tmp/vscode-sockpuppet.sock` exists
- On Windows, ensure no other process is using the pipe

**"Module 'vscode_sockpuppet' not found"**
- Install the Python package: `cd python && pip install -e .`

**"ImportError: pywin32 is required on Windows"** (Windows only)
- Install pywin32: `pip install -e ".[windows]"` or `pip install pywin32`

**No response from VS Code**
- Check the Extension Development Host window for errors
- Look at VS Code's Output panel (View → Output → Extension Host)

## Next Steps

- Read the [TextDocument API Documentation](DOCUMENT_API.md) for comprehensive document manipulation
- Learn about [Event Subscriptions](EVENTS.md) to react to VS Code events
- Check out [example_document.py](../python/example_document.py) for document API examples
- Review [example_events.py](../python/example_events.py) for event handling examples
- Read the [Development Guide](DEVELOPMENT.md) to add new features
- Explore the [Extension Integration API](EXTENSION_API.md) if building VS Code extensions

## Tips

1. **Always use context manager:** The `with` statement ensures proper connection cleanup
2. **Check return values:** Most methods return useful information
3. **Handle None returns:** User can dismiss dialogs, always check for None
4. **Explore commands:** Use `get_commands()` to discover what VS Code can do

Happy automating! 🚀
