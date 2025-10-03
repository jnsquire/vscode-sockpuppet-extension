"""
Example Python script that uses environment variables set by another extension
to connect to VSCode Sockpuppet.

This script is designed to be launched by another VS Code extension that
uses the Sockpuppet API to set up the environment.
"""

import os
import sys

from vscode_sockpuppet import VSCodeClient


def main():
    # Get pipe path from environment variable
    # This is automatically set when launched via Sockpuppet API
    pipe_path = os.environ.get("VSCODE_SOCKPUPPET_PIPE")

    if not pipe_path:
        print("Error: VSCODE_SOCKPUPPET_PIPE environment variable not set")
        print("This script should be launched by an extension using Sockpuppet API")
        sys.exit(1)

    print(f"Connecting to VS Code via: {pipe_path}")

    try:
        # Connect to VS Code
        with VSCodeClient(pipe_path=pipe_path) as vscode:
            # Show a greeting
            vscode.window.show_information_message(
                "Hello from Python! I was launched by another extension."
            )

            # Get workspace information
            folders = vscode.workspace.get_workspace_folders()
            print(f"Workspace folders: {folders}")

            # Ask user for input
            name = vscode.window.show_input_box(
                {"prompt": "What's your name?", "placeholder": "Enter your name"}
            )

            if name:
                # Create an output channel and show results
                vscode.window.create_output_channel(
                    name="Python Automation",
                    text=f"Hello, {name}! This is Python speaking.\n",
                    show=True,
                )

                # Show quick pick
                choice = vscode.window.show_quick_pick(
                    ["Option A", "Option B", "Option C"],
                    {"placeholder": f"Hi {name}, choose an option"},
                )

                if choice:
                    vscode.window.show_information_message(f"You selected: {choice}")

            # Update status bar
            vscode.window.set_status_bar_message("Python automation completed!", 5000)

            print("Automation completed successfully")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
