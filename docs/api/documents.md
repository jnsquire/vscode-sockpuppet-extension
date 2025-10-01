# TextDocument API

The VS Code Sockpuppet package provides a comprehensive object-oriented API for working with text documents that mirrors the VS Code `TextDocument` interface.

## Overview

Instead of working with raw dictionaries, you get full Python objects with properties, methods, and IDE autocompletion support:

```python
from vscode_sockpuppet import VSCodeClient

with VSCodeClient() as vscode:
    # Open a document - returns a TextDocument object
    doc = vscode.workspace.open_text_document("file:///path/to/file.py")
    
    # Access properties
    print(f"Language: {doc.language_id}")
    print(f"Lines: {doc.line_count}")
    print(f"Dirty: {doc.is_dirty}")
    
    # Call methods
    text = doc.get_text()
    line = doc.line_at(10)
    doc.save()
```

## Core Classes

### Position

Represents a line and character position in a document.

**Properties:**
- `line: int` - Zero-based line number
- `character: int` - Zero-based character offset

**Example:**
```python
from vscode_sockpuppet import Position

pos = Position(line=5, character=10)
print(f"Line {pos.line}, Column {pos.character}")
```

### Range

Represents a range between two positions.

**Properties:**
- `start: Position` - The start position
- `end: Position` - The end position
- `is_empty: bool` - True if start equals end
- `is_single_line: bool` - True if start and end are on same line

**Example:**
```python
from vscode_sockpuppet import Position, Range

range = Range(
    start=Position(0, 0),
    end=Position(5, 10)
)

if range.is_single_line:
    print("Single line selection")
```

### TextLine

Represents a single line of text in a document.

**Properties:**
- `line_number: int` - Zero-based line number
- `text: str` - The text content (without line break)
- `is_empty_or_whitespace: bool` - True if line is empty or whitespace only
- `first_non_whitespace_character_index: int` - Index of first non-whitespace char
- `range: Range` - The range of this line (excluding line break)
- `range_including_line_break: Range` - The range including the line break

**Example:**
```python
line = doc.line_at(5)
print(f"Line {line.line_number}: {line.text}")

if not line.is_empty_or_whitespace:
    indent = line.first_non_whitespace_character_index
    print(f"Indented by {indent} spaces")
```

### TextDocument

The main document class representing a text file in VS Code.

## TextDocument Properties

### uri
```python
uri: str
```
The URI of this document (e.g., `file:///path/to/file.py`).

### file_name
```python
file_name: str
```
The file system path of this document.

### is_untitled
```python
is_untitled: bool
```
True if the document has never been saved.

### language_id
```python
language_id: str
```
The language identifier (e.g., `'python'`, `'typescript'`, `'markdown'`).

### version
```python
version: int
```
The version number of the document. Incremented after each change.

### is_dirty
```python
is_dirty: bool
```
True if there are unsaved changes.

### is_closed
```python
is_closed: bool
```
True if the document has been closed.

### eol
```python
eol: str
```
The end-of-line sequence: `'\n'` (LF) or `'\r\n'` (CRLF).

### line_count
```python
line_count: int
```
The number of lines in this document.

## TextDocument Methods

### save()
```python
def save() -> bool
```
Save the document to disk.

**Returns:** `True` if saved successfully

**Example:**
```python
if doc.is_dirty:
    success = doc.save()
    print(f"Saved: {success}")
```

### line_at()
```python
def line_at(line_or_position: int | Position) -> TextLine
```
Get a text line by line number or position.

**Parameters:**
- `line_or_position` - Line number (0-based) or Position object

**Returns:** TextLine object

**Example:**
```python
# By line number
line = doc.line_at(10)

# By position
pos = Position(10, 5)
line = doc.line_at(pos)

print(f"Line text: {line.text}")
```

### get_text()
```python
def get_text(range: Optional[Range] = None) -> str
```
Get text from the document.

**Parameters:**
- `range` - Optional range to get text from (entire document if None)

**Returns:** The text content

**Example:**
```python
# Get entire document
all_text = doc.get_text()

# Get specific range
range = Range(Position(0, 0), Position(10, 0))
partial_text = doc.get_text(range)
```

### offset_at()
```python
def offset_at(position: Position) -> int
```
Convert a position to a document offset (character index).

**Parameters:**
- `position` - The position to convert

**Returns:** The character offset from start of document

**Example:**
```python
pos = Position(line=5, character=10)
offset = doc.offset_at(pos)
print(f"Position {pos} is at character offset {offset}")
```

### position_at()
```python
def position_at(offset: int) -> Position
```
Convert a document offset to a position.

**Parameters:**
- `offset` - The character offset from start of document

**Returns:** Position object

**Example:**
```python
offset = 100
pos = doc.position_at(offset)
print(f"Offset {offset} is at line {pos.line}, column {pos.character}")
```

### get_word_range_at_position()
```python
def get_word_range_at_position(
    position: Position,
    regex: Optional[str] = None
) -> Optional[Range]
```
Get the word range at a specific position.

**Parameters:**
- `position` - The position to check
- `regex` - Optional regex pattern for word boundaries

**Returns:** Range of the word, or None if no word at position

**Example:**
```python
pos = Position(5, 10)
word_range = doc.get_word_range_at_position(pos)

if word_range:
    word = doc.get_text(word_range)
    print(f"Word at position: {word}")
```

### validate_range()
```python
def validate_range(range: Range) -> Range
```
Ensure a range is valid for this document (adjusts to document boundaries).

**Parameters:**
- `range` - The range to validate

**Returns:** Validated range

**Example:**
```python
# This range might extend past end of document
large_range = Range(Position(0, 0), Position(9999, 9999))
valid_range = doc.validate_range(large_range)
print(f"Valid range: {valid_range}")
```

### validate_position()
```python
def validate_position(position: Position) -> Position
```
Ensure a position is valid for this document (adjusts to document boundaries).

**Parameters:**
- `position` - The position to validate

**Returns:** Validated position

**Example:**
```python
# This position might be past end of line
pos = Position(5, 9999)
valid_pos = doc.validate_position(pos)
print(f"Valid position: {valid_pos}")
```

## Workspace Methods for Documents

### text_documents()
```python
def text_documents() -> list[TextDocument]
```
Get all currently open text documents.

**Example:**
```python
with VSCodeClient() as vscode:
    docs = vscode.workspace.text_documents()
    
    for doc in docs:
        print(f"{doc.file_name} [{doc.language_id}]")
        print(f"  Lines: {doc.line_count}, Dirty: {doc.is_dirty}")
```

### get_text_document()
```python
def get_text_document(uri: str) -> TextDocument
```
Get a specific open document by URI.

**Parameters:**
- `uri` - The URI of the document

**Returns:** TextDocument object

**Raises:** Exception if document not found

**Example:**
```python
uri = "file:///path/to/file.py"
doc = vscode.workspace.get_text_document(uri)
print(f"Found: {doc.file_name}")
```

### open_text_document()
```python
def open_text_document(
    uri: Optional[str] = None,
    content: Optional[str] = None,
    language: Optional[str] = None
) -> TextDocument
```
Open or create a text document.

**Parameters:**
- `uri` - URI of existing file to open
- `content` - Content for untitled document
- `language` - Language ID for untitled document

**Returns:** TextDocument object

**Example:**
```python
# Open existing file
doc = vscode.workspace.open_text_document("file:///path/to/file.py")

# Create untitled document
doc = vscode.workspace.open_text_document(
    content="# New file\n",
    language="python"
)
```

## Complete Example

```python
from vscode_sockpuppet import VSCodeClient, Position, Range

with VSCodeClient() as vscode:
    # Get all open documents
    docs = vscode.workspace.text_documents()
    print(f"Open documents: {len(docs)}")
    
    # Work with first document
    if docs:
        doc = docs[0]
        
        print(f"\n=== {doc.file_name} ===")
        print(f"Language: {doc.language_id}")
        print(f"Lines: {doc.line_count}")
        print(f"Version: {doc.version}")
        print(f"EOL: {repr(doc.eol)}")
        
        # Iterate through lines
        for i in range(min(10, doc.line_count)):
            line = doc.line_at(i)
            print(f"{i:3d}: {line.text}")
        
        # Get text in a range
        if doc.line_count > 5:
            range = Range(Position(0, 0), Position(5, 0))
            text = doc.get_text(range)
            print(f"\nFirst 5 lines:\n{text}")
        
        # Find word at cursor position
        pos = Position(10, 15)
        word_range = doc.get_word_range_at_position(pos)
        if word_range:
            word = doc.get_text(word_range)
            print(f"\nWord at {pos}: {word}")
        
        # Position/offset conversion
        offset = doc.offset_at(Position(5, 10))
        back = doc.position_at(offset)
        print(f"\nPosition(5, 10) = offset {offset} = {back}")
```

## Best Practices

### 1. Check Document State
```python
if doc.is_closed:
    print("Document is closed")
    return

if doc.is_dirty:
    print("Warning: Unsaved changes")
```

### 2. Validate Positions and Ranges
```python
# Always validate user input
user_pos = Position(line, column)
safe_pos = doc.validate_position(user_pos)

# Now safe to use
text = doc.get_text(Range(safe_pos, safe_pos))
```

### 3. Handle Line Boundaries
```python
line = doc.line_at(5)

# Text without line break
text = line.text

# Range excluding line break
range = line.range

# Range including line break (for deletion)
full_range = line.range_including_line_break
```

### 4. Work with Empty Lines
```python
for i in range(doc.line_count):
    line = doc.line_at(i)
    
    if line.is_empty_or_whitespace:
        print(f"Line {i} is blank")
    else:
        indent = line.first_non_whitespace_character_index
        print(f"Line {i} indented by {indent} characters")
```

## See Also

- [Quick Start Guide](QUICKSTART.md)
- [Event Subscriptions](EVENTS.md) - React to document changes
- [Example Script](../python/example_document.py) - Complete working example
