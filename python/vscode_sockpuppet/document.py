"""
TextDocument object model mirroring VS Code's TextDocument API
"""

from typing import Optional, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from .client import VSCodeClient


@dataclass
class Position:
    """Represents a line and character position in a document."""
    line: int
    character: int
    
    def __repr__(self) -> str:
        return f"Position(line={self.line}, character={self.character})"
    
    def to_dict(self) -> dict:
        return {"line": self.line, "character": self.character}
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Position':
        return cls(line=data["line"], character=data["character"])


@dataclass
class Range:
    """Represents a range in a document with start and end positions."""
    start: Position
    end: Position
    
    def __repr__(self) -> str:
        return f"Range({self.start}, {self.end})"
    
    def to_dict(self) -> dict:
        return {
            "start": self.start.to_dict(),
            "end": self.end.to_dict()
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Range':
        return cls(
            start=Position.from_dict(data["start"]),
            end=Position.from_dict(data["end"])
        )
    
    @property
    def is_empty(self) -> bool:
        """Check if this range is empty (start == end)."""
        return (self.start.line == self.end.line and
                self.start.character == self.end.character)
    
    @property
    def is_single_line(self) -> bool:
        """Check if this range is on a single line."""
        return self.start.line == self.end.line


class TextLine:
    """Represents a line of text in a document."""
    
    def __init__(self, line_number: int, text: str,
                 is_empty_or_whitespace: bool,
                 first_non_whitespace_char_index: int, range_obj: Range,
                 range_including_line_break: Range):
        self.line_number = line_number
        self.text = text
        self.is_empty_or_whitespace = is_empty_or_whitespace
        self.first_non_whitespace_character_index = (
            first_non_whitespace_char_index
        )
        self.range = range_obj
        self.range_including_line_break = range_including_line_break
    
    def __repr__(self) -> str:
        text_preview = repr(self.text[:50])
        return f"TextLine(line={self.line_number}, text={text_preview}...)"
    
    @classmethod
    def from_dict(cls, data: dict) -> 'TextLine':
        return cls(
            line_number=data["lineNumber"],
            text=data["text"],
            is_empty_or_whitespace=data["isEmptyOrWhitespace"],
            first_non_whitespace_char_index=data[
                "firstNonWhitespaceCharacterIndex"
            ],
            range_obj=Range.from_dict(data["range"]),
            range_including_line_break=Range.from_dict(
                data["rangeIncludingLineBreak"]
            )
        )


class TextDocument:
    """
    Represents a text document in VS Code.
    Mirrors the VS Code TextDocument API.
    """
    
    def __init__(self, client: 'VSCodeClient', data: dict):
        self._client = client
        self._uri = data["uri"]
        self._file_name = data["fileName"]
        self._is_untitled = data["isUntitled"]
        self._language_id = data["languageId"]
        self._version = data["version"]
        self._is_dirty = data["isDirty"]
        self._is_closed = data["isClosed"]
        self._eol = data["eol"]
        self._line_count = data["lineCount"]
    
    @property
    def uri(self) -> str:
        """The URI of this document."""
        return self._uri
    
    @property
    def file_name(self) -> str:
        """The file system path of this document."""
        return self._file_name
    
    @property
    def is_untitled(self) -> bool:
        """True if the document is not saved."""
        return self._is_untitled
    
    @property
    def language_id(self) -> str:
        """The language identifier (e.g., 'python', 'typescript')."""
        return self._language_id
    
    @property
    def version(self) -> int:
        """The version number (incremented on each change)."""
        return self._version
    
    @property
    def is_dirty(self) -> bool:
        """True if there are unsaved changes."""
        return self._is_dirty
    
    @property
    def is_closed(self) -> bool:
        """True if the document has been closed."""
        return self._is_closed
    
    @property
    def eol(self) -> str:
        """End-of-line sequence ('\\n' or '\\r\\n')."""
        return self._eol
    
    @property
    def line_count(self) -> int:
        """The number of lines in this document."""
        return self._line_count
    
    def save(self) -> bool:
        """
        Save the document.
        
        Returns:
            True if saved successfully
        """
        result = self._client._send_request("document.save", {"uri": self._uri})
        if result.get("success"):
            self._is_dirty = False
            self._version = result.get("version", self._version)
        return result.get("success", False)
    
    def line_at(self, line_or_position: int | Position) -> TextLine:
        """
        Get a text line by line number or position.
        
        Args:
            line_or_position: Line number (0-based) or Position
            
        Returns:
            TextLine object
        """
        if isinstance(line_or_position, Position):
            line_num = line_or_position.line
        else:
            line_num = line_or_position
        
        result = self._client._send_request("document.lineAt", {
            "uri": self._uri,
            "line": line_num
        })
        return TextLine.from_dict(result)
    
    def offset_at(self, position: Position) -> int:
        """
        Get the document offset for a position.
        
        Args:
            position: The position
            
        Returns:
            The character offset
        """
        return self._client._send_request("document.offsetAt", {
            "uri": self._uri,
            "position": position.to_dict()
        })
    
    def position_at(self, offset: int) -> Position:
        """
        Get the position for a document offset.
        
        Args:
            offset: The character offset
            
        Returns:
            Position object
        """
        result = self._client._send_request("document.positionAt", {
            "uri": self._uri,
            "offset": offset
        })
        return Position.from_dict(result)
    
    def get_text(self, range: Optional[Range] = None) -> str:
        """
        Get text from the document.
        
        Args:
            range: Optional range to get text from (entire document if None)
            
        Returns:
            The text content
        """
        params = {"uri": self._uri}
        if range:
            params["range"] = range.to_dict()
        
        return self._client._send_request("document.getText", params)
    
    def get_word_range_at_position(self, position: Position, 
                                   regex: Optional[str] = None) -> Optional[Range]:
        """
        Get the word range at a position.
        
        Args:
            position: The position
            regex: Optional regex pattern for word boundaries
            
        Returns:
            Range of the word, or None if no word at position
        """
        params = {
            "uri": self._uri,
            "position": position.to_dict()
        }
        if regex:
            params["regex"] = regex
        
        result = self._client._send_request("document.getWordRangeAtPosition", params)
        return Range.from_dict(result) if result else None
    
    def validate_range(self, range: Range) -> Range:
        """
        Ensure a range is valid for this document.
        
        Args:
            range: The range to validate
            
        Returns:
            Validated range
        """
        result = self._client._send_request("document.validateRange", {
            "uri": self._uri,
            "range": range.to_dict()
        })
        return Range.from_dict(result)
    
    def validate_position(self, position: Position) -> Position:
        """
        Ensure a position is valid for this document.
        
        Args:
            position: The position to validate
            
        Returns:
            Validated position
        """
        result = self._client._send_request("document.validatePosition", {
            "uri": self._uri,
            "position": position.to_dict()
        })
        return Position.from_dict(result)
    
    def __repr__(self) -> str:
        return f"TextDocument(uri={self._uri}, languageId={self._language_id}, version={self._version})"
    
    def __str__(self) -> str:
        dirty = " (dirty)" if self._is_dirty else ""
        untitled = " (untitled)" if self._is_untitled else ""
        return f"{self._file_name}{untitled}{dirty} [{self._language_id}]"
