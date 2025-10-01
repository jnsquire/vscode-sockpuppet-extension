"""
Workspace operations for VS Code
"""

from typing import Optional, TYPE_CHECKING
from .document import TextDocument

if TYPE_CHECKING:
    from .client import VSCodeClient


class Workspace:
    """VS Code workspace operations."""
    
    def __init__(self, client: 'VSCodeClient'):
        self.client = client
    
    def open_text_document(self, uri: Optional[str] = None,
                          content: Optional[str] = None,
                          language: Optional[str] = None) -> TextDocument:
        """
        Open a text document.
        
        Args:
            uri: The URI of the document to open
            content: Content for an untitled document
            language: Language identifier for untitled document
            
        Returns:
            TextDocument object
        """
        data = self.client._send_request("workspace.openTextDocument", {
            "uri": uri,
            "content": content,
            "language": language
        })
        return TextDocument(self.client, data)
    
    def save_all(self, include_untitled: bool = False) -> bool:
        """
        Save all dirty files.
        
        Args:
            include_untitled: Whether to include untitled files
            
        Returns:
            True if all files were saved
        """
        return self.client._send_request("workspace.saveAll", {
            "includeUntitled": include_untitled
        })
    
    def get_workspace_folders(self) -> list[dict]:
        """
        Get all workspace folders.
        
        Returns:
            List of workspace folders (uri, name, index)
        """
        return self.client._send_request("workspace.workspaceFolders", {})
    
    def text_documents(self) -> list[TextDocument]:
        """
        Get all open text documents.
        
        Returns:
            List of TextDocument objects
        """
        docs_data = self.client._send_request(
            "workspace.textDocuments", {}
        )
        return [TextDocument(self.client, data) for data in docs_data]
    
    def get_text_document(self, uri: str) -> TextDocument:
        """
        Get a specific open text document by URI.
        
        Args:
            uri: The URI of the document
            
        Returns:
            TextDocument object
        """
        data = self.client._send_request(
            "workspace.getTextDocument", {"uri": uri}
        )
        return TextDocument(self.client, data)
    
    def write_to_clipboard(self, text: str) -> dict:
        """
        Write text to clipboard.
        
        Args:
            text: The text to write
            
        Returns:
            Success status
        """
        return self.client._send_request("env.clipboard.writeText", {
            "text": text
        })
    
    def read_from_clipboard(self) -> str:
        """
        Read text from clipboard.
        
        Returns:
            The clipboard text
        """
        return self.client._send_request("env.clipboard.readText")
    
    def open_external(self, uri: str) -> bool:
        """
        Open an external URI.
        
        Args:
            uri: The URI to open
            
        Returns:
            True if successful
        """
        return self.client._send_request("env.openExternal", {
            "uri": uri
        })

