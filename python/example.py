"""
Example usage of VSCode Sockpuppet
"""

from vscode_sockpuppet import VSCodeClient


def main():
    # Connect to VS Code
    with VSCodeClient() as vscode:
        # Show a greeting
        response = vscode.window.show_information_message(
            "Hello from Python!",
            "Option 1",
            "Option 2"
        )
        print(f"User selected: {response}")
        
        # Show a quick pick
        choice = vscode.window.show_quick_pick(
            ["Python", "JavaScript", "TypeScript", "Go"],
            {"placeholder": "Select your favorite language"}
        )
        print(f"Favorite language: {choice}")
        
        # Get user input
        name = vscode.window.show_input_box({
            "prompt": "What's your name?",
            "placeholder": "Enter your name"
        })
        
        if name:
            vscode.window.show_information_message(f"Hello, {name}!")
        
        # Create a terminal and run a command
        vscode.window.create_terminal(
            name="Python Demo",
            text="echo 'Hello from Python-created terminal!'",
            show=True
        )
        
        # Get workspace info
        folders = vscode.workspace.get_workspace_folders()
        print(f"Workspace folders: {folders}")
        
        # Work with the clipboard
        vscode.workspace.write_to_clipboard("Hello from Python!")
        clipboard_text = vscode.workspace.read_from_clipboard()
        print(f"Clipboard: {clipboard_text}")
        
        # Get available commands
        commands = vscode.get_commands(filter_internal=True)
        print(f"Found {len(commands)} commands")
        
        # Set status bar message
        vscode.window.set_status_bar_message("Python is in control!", 5000)


if __name__ == "__main__":
    main()
