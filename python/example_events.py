"""
Example: Using event subscriptions with VSCode Sockpuppet

This example demonstrates how to subscribe to VS Code events
and react to them in Python.
"""

from vscode_sockpuppet import VSCodeClient
import time


def on_file_saved(data):
    """Called when a file is saved."""
    print(f"File saved: {data['fileName']}")


def on_file_opened(data):
    """Called when a file is opened."""
    print(f"File opened: {data['fileName']} ({data['languageId']})")


def on_file_changed(data):
    """Called when a file's content changes."""
    print(f"File changed: {data['uri']}")
    print(f"  Changes: {len(data['contentChanges'])} edit(s)")


def on_selection_changed(data):
    """Called when text selection changes."""
    selections = data['selections']
    if selections:
        sel = selections[0]
        print(f"Selection changed: Line {sel['start']['line']}, "
              f"Col {sel['start']['character']}")


def on_terminal_opened(data):
    """Called when a terminal is opened."""
    print(f"Terminal opened: {data['name']}")


def on_active_editor_changed(data):
    """Called when the active editor changes."""
    if data:
        print(f"Active editor: {data['fileName']}")
    else:
        print("No active editor")


def main():
    """Main example showing event subscriptions."""
    
    with VSCodeClient() as vscode:
        # Show welcome message
        vscode.window.show_information_message(
            "Event subscription example started! "
            "Try opening/saving/editing files."
        )
        
        # Subscribe to various events
        print("Subscribing to events...")
        
        vscode.subscribe('workspace.onDidSaveTextDocument', on_file_saved)
        vscode.subscribe('workspace.onDidOpenTextDocument', on_file_opened)
        vscode.subscribe('workspace.onDidChangeTextDocument', on_file_changed)
        vscode.subscribe('window.onDidChangeTextEditorSelection',
                        on_selection_changed)
        vscode.subscribe('window.onDidOpenTerminal', on_terminal_opened)
        vscode.subscribe('window.onDidChangeActiveTextEditor',
                        on_active_editor_changed)
        
        # Show subscribed events
        subscriptions = vscode.get_subscriptions()
        print(f"Subscribed to {len(subscriptions)} events:")
        for event in subscriptions:
            print(f"  - {event}")
        
        # Create an output channel for logging
        vscode.window.create_output_channel(
            name="Event Monitor",
            text="Monitoring VS Code events...\n",
            show=True
        )
        
        # Show status
        vscode.window.set_status_bar_message(
            "Event monitoring active",
            5000
        )
        
        print("\nListening for events... (Ctrl+C to stop)")
        print("Try:")
        print("  - Opening files")
        print("  - Saving files")
        print("  - Editing text")
        print("  - Changing selection")
        print("  - Opening terminals")
        
        try:
            # Keep the script running to receive events
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nStopping event monitoring...")
            vscode.window.show_information_message(
                "Event monitoring stopped"
            )


if __name__ == "__main__":
    main()
