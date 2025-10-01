"""
Editor operations for VS Code
"""

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .client import VSCodeClient


class Editor:
    """VS Code editor operations."""
    
    def __init__(self, client: 'VSCodeClient'):
        self.client = client
    
    def get_selection(self) -> dict:
        """
        Get the current selection in the active editor.
        
        Returns:
            Selection information with start, end positions and text
        """
        return self.client._send_request("window.activeTextEditor.selection")
    
    def set_selection(self, start_line: int, start_char: int, end_line: int, end_char: int) -> dict:
        """
        Set the selection in the active editor.
        
        Args:
            start_line: Starting line number
            start_char: Starting character position
            end_line: Ending line number
            end_char: Ending character position
            
        Returns:
            Success status
        """
        return self.client._send_request("window.activeTextEditor.setSelection", {
            "start": {"line": start_line, "character": start_char},
            "end": {"line": end_line, "character": end_char}
        })
    
    def insert_text(self, line: int, character: int, text: str) -> dict:
        """
        Insert text at a position.
        
        Args:
            line: Line number
            character: Character position
            text: Text to insert
            
        Returns:
            Success status
        """
        return self.client._send_request("window.activeTextEditor.edit", {
            "edits": [{
                "type": "insert",
                "range": {
                    "start": {"line": line, "character": character},
                    "end": {"line": line, "character": character}
                },
                "text": text
            }]
        })
    
    def delete_range(self, start_line: int, start_char: int, end_line: int, end_char: int) -> dict:
        """
        Delete text in a range.
        
        Args:
            start_line: Starting line number
            start_char: Starting character position
            end_line: Ending line number
            end_char: Ending character position
            
        Returns:
            Success status
        """
        return self.client._send_request("window.activeTextEditor.edit", {
            "edits": [{
                "type": "delete",
                "range": {
                    "start": {"line": start_line, "character": start_char},
                    "end": {"line": end_line, "character": end_char}
                }
            }]
        })
    
    def replace_text(self, start_line: int, start_char: int, end_line: int, end_char: int, text: str) -> dict:
        """
        Replace text in a range.
        
        Args:
            start_line: Starting line number
            start_char: Starting character position
            end_line: Ending line number
            end_char: Ending character position
            text: Replacement text
            
        Returns:
            Success status
        """
        return self.client._send_request("window.activeTextEditor.edit", {
            "edits": [{
                "type": "replace",
                "range": {
                    "start": {"line": start_line, "character": start_char},
                    "end": {"line": end_line, "character": end_char}
                },
                "text": text
            }]
        })
