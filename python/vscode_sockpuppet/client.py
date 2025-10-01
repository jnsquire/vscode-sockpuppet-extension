"""
Main client for communicating with VS Code extension
"""

import json
import socket
import threading
import os
import tempfile
from typing import Any, Optional, Union, Callable, Dict

from .window import Window
from .workspace import Workspace
from .editor import Editor


class VSCodeClient:
    """Main client for interacting with VS Code via Sockpuppet extension."""

    def __init__(self, pipe_path: Optional[str] = None):
        """
        Initialize the VS Code client.

        Args:
            pipe_path: Path to the named pipe/socket.
                      If None, checks VSCODE_SOCKPUPPET_PIPE environment
                      variable, then falls back to platform default.
        """
        if pipe_path is None:
            # First try environment variable (set by other extensions)
            pipe_path = os.environ.get('VSCODE_SOCKPUPPET_PIPE')

        if pipe_path is None:
            # Use platform-specific default paths
            if os.name == 'nt':  # Windows
                pipe_path = r'\\.\pipe\vscode-sockpuppet'
            else:  # Unix/Linux/Mac
                pipe_path = os.path.join(
                    tempfile.gettempdir(),
                    'vscode-sockpuppet.sock'
                )

        self.pipe_path = pipe_path
        self.sock: Optional[Union[socket.socket, Any]] = None
        self._request_id = 0
        self._lock = threading.Lock()
        self._buffer = ''
        self._event_handlers: Dict[str, list[Callable]] = {}
        self._event_thread: Optional[threading.Thread] = None
        self._running = False

        # API namespaces
        self.window = Window(self)
        self.workspace = Workspace(self)
        self.editor = Editor(self)

    def connect(self) -> None:
        """Connect to the VS Code extension via named pipe/socket."""
        if os.name == 'nt':  # Windows named pipe
            try:
                import win32file  # type: ignore
                import win32pipe  # type: ignore
                import pywintypes  # type: ignore

                # Wait for pipe to become available
                win32pipe.WaitNamedPipe(self.pipe_path, 5000)

                # Open the named pipe
                self.sock = win32file.CreateFile(
                    self.pipe_path,
                    win32file.GENERIC_READ | win32file.GENERIC_WRITE,
                    0,
                    None,
                    win32file.OPEN_EXISTING,
                    0,
                    None
                )
            except ImportError:
                raise ImportError(
                    "pywin32 is required on Windows. "
                    "Install with: pip install pywin32"
                )
            except Exception as e:
                raise ConnectionError(
                    f"Could not connect to VS Code. "
                    f"Make sure the extension is running. Error: {e}"
                )
        else:  # Unix domain socket
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                self.sock.connect(self.pipe_path)
            except Exception as e:
                raise ConnectionError(
                    f"Could not connect to VS Code. "
                    f"Make sure the extension is running. Error: {e}"
                )

    def disconnect(self) -> None:
        """Disconnect from the VS Code extension."""
        if self.sock:
            try:
                if os.name == 'nt':
                    import win32file  # type: ignore
                    win32file.CloseHandle(self.sock)
                else:
                    self.sock.close()
            except Exception:
                pass
            self.sock = None

    def is_connected(self) -> bool:
        """Check if connected to VS Code."""
        return self.sock is not None
    def _send_request(
        self, method: str, params: Optional[dict] = None
    ) -> Any:
        """
        Send a request to VS Code and wait for response.

        Args:
            method: The method to call
            params: Parameters for the method

        Returns:
            The result from VS Code

        Raises:
            ConnectionError: If not connected to VS Code
            RuntimeError: If the request fails
        """
        if not self.is_connected():
            raise ConnectionError(
                "Not connected to VS Code. Call connect() first."
            )

        with self._lock:
            self._request_id += 1
            request_id = self._request_id

        request = {
            "id": request_id,
            "method": method,
            "params": params or {}
        }

        # Send request with newline delimiter
        message = json.dumps(request) + '\n'

        if os.name == 'nt':
            import win32file  # type: ignore
            win32file.WriteFile(self.sock, message.encode('utf-8'))
        else:
            self.sock.sendall(message.encode('utf-8'))  # type: ignore

        # Receive response
        while True:
            if os.name == 'nt':
                import win32file  # type: ignore
                hr, data = win32file.ReadFile(self.sock, 4096)
                chunk = data.decode('utf-8')
            else:
                chunk_bytes = self.sock.recv(4096)  # type: ignore
                if not chunk_bytes:
                    raise ConnectionError("Connection closed by VS Code")
                chunk = chunk_bytes.decode('utf-8')

            self._buffer += chunk

            # Look for complete message (newline-delimited)
            if '\n' in self._buffer:
                lines = self._buffer.split('\n')
                self._buffer = '\n'.join(lines[1:])
                response_str = lines[0]
                break

        response = json.loads(response_str)

        if "error" in response:
            raise RuntimeError(f"VS Code error: {response['error']}")

        return response.get("result")
    
    def execute_command(self, command: str, *args) -> Any:
        """
        Execute a VS Code command.
        
        Args:
            command: The command identifier
            *args: Arguments to pass to the command
            
        Returns:
            The result of the command execution
        """
        return self._send_request("commands.executeCommand", {
            "command": command,
            "args": list(args)
        })
    
    def get_commands(self, filter_internal: bool = False) -> list[str]:
        """
        Get all available VS Code commands.
        
        Args:
            filter_internal: Whether to filter internal commands
            
        Returns:
            List of command identifiers
        """
        return self._send_request("commands.getCommands", {
            "filterInternal": filter_internal
        })

    def subscribe(self, event: str, handler: Callable[[Any], None]) -> None:
        """
        Subscribe to a VS Code event.

        Args:
            event: Event name (e.g., 'workspace.onDidSaveTextDocument')
            handler: Callback function to handle the event data

        Available events:
            - workspace.onDidOpenTextDocument
            - workspace.onDidCloseTextDocument
            - workspace.onDidSaveTextDocument
            - workspace.onDidChangeTextDocument
            - window.onDidChangeActiveTextEditor
            - window.onDidChangeTextEditorSelection
            - window.onDidChangeVisibleTextEditors
            - window.onDidOpenTerminal
            - window.onDidCloseTerminal
            - workspace.onDidChangeWorkspaceFolders
            - workspace.onDidChangeConfiguration
        """
        if event not in self._event_handlers:
            self._event_handlers[event] = []
            # Subscribe on server
            self._send_request("events.subscribe", {"event": event})

        self._event_handlers[event].append(handler)

        # Start event listener thread if not running
        if not self._running and self._event_thread is None:
            self._running = True
            self._event_thread = threading.Thread(
                target=self._event_loop,
                daemon=True
            )
            self._event_thread.start()

    def unsubscribe(self, event: str, handler: Optional[Callable] = None) -> None:
        """
        Unsubscribe from a VS Code event.

        Args:
            event: Event name
            handler: Specific handler to remove, or None to remove all
        """
        if event not in self._event_handlers:
            return

        if handler is None:
            # Remove all handlers for this event
            del self._event_handlers[event]
            self._send_request("events.unsubscribe", {"event": event})
        else:
            # Remove specific handler
            if handler in self._event_handlers[event]:
                self._event_handlers[event].remove(handler)

            # If no handlers left, unsubscribe from server
            if not self._event_handlers[event]:
                del self._event_handlers[event]
                self._send_request("events.unsubscribe", {"event": event})

    def get_subscriptions(self) -> list[str]:
        """
        Get list of currently subscribed events.

        Returns:
            List of event names
        """
        return self._send_request("events.listSubscriptions")

    def _event_loop(self) -> None:
        """Background thread that listens for events from VS Code."""
        while self._running:
            try:
                if os.name == 'nt':
                    import win32file  # type: ignore
                    hr, data = win32file.ReadFile(self.sock, 4096)
                    chunk = data
                else:
                    chunk_bytes = self.sock.recv(4096)  # type: ignore
                    if not chunk_bytes:
                        break
                    chunk = chunk_bytes.decode('utf-8')

                self._buffer += chunk

                # Process complete messages
                while '\n' in self._buffer:
                    line, self._buffer = self._buffer.split('\n', 1)
                    if line.strip():
                        message = json.loads(line)

                        # Check if it's an event (not a response)
                        if message.get('type') == 'event':
                            event_name = message.get('event')
                            event_data = message.get('data')

                            # Call all handlers for this event
                            if event_name in self._event_handlers:
                                for handler in self._event_handlers[event_name]:
                                    try:
                                        handler(event_data)
                                    except Exception as e:
                                        print(
                                            f"Error in event handler "
                                            f"for {event_name}: {e}"
                                        )

            except Exception as e:
                if self._running:
                    print(f"Error in event loop: {e}")
                break
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self._running = False
        if self._event_thread:
            self._event_thread.join(timeout=1.0)
        self.disconnect()
