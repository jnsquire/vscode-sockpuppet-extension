"""
Example demonstrating the TextDocument object model API.

This example shows how to work with VS Code documents using the 
full object-oriented API that mirrors VS Code's TextDocument interface.
"""

import os
from vscode_sockpuppet import VSCodeClient, Position, Range

# Connect to VS Code
with VSCodeClient() as vscode:
    print("Connected to VS Code!")
    
    # Example 1: Get all open documents
    print("\n=== All Open Documents ===")
    documents = vscode.workspace.text_documents()
    for doc in documents:
        dirty = " (unsaved)" if doc.is_dirty else ""
        untitled = " (untitled)" if doc.is_untitled else ""
        print(f"  - {doc.file_name}{untitled}{dirty}")
        print(f"    Language: {doc.language_id}, Lines: {doc.line_count}")
    
    # Example 2: Open a new document
    print("\n=== Opening a New Document ===")
    new_doc = vscode.workspace.open_text_document(
        content="# Hello from Python!\n\nThis is a test document.",
        language="markdown"
    )
    print(f"Created: {new_doc}")
    print(f"  URI: {new_doc.uri}")
    print(f"  Lines: {new_doc.line_count}")
    print(f"  Language: {new_doc.language_id}")
    print(f"  EOL: {repr(new_doc.eol)}")
    
    # Example 3: Read document content
    print("\n=== Reading Document Content ===")
    full_text = new_doc.get_text()
    print(f"Full text ({len(full_text)} chars):")
    print(full_text)
    
    # Example 4: Work with specific lines
    print("\n=== Working with Lines ===")
    for i in range(new_doc.line_count):
        line = new_doc.line_at(i)
        print(f"Line {line.line_number}: {repr(line.text)}")
        print(f"  Empty/Whitespace: {line.is_empty_or_whitespace}")
        if not line.is_empty_or_whitespace:
            first_char = line.first_non_whitespace_character_index
            print(f"  First non-whitespace at index: {first_char}")
    
    # Example 5: Work with ranges
    print("\n=== Working with Ranges ===")
    # Get text from a specific range (first line only)
    first_line_range = Range(Position(0, 0), Position(0, 100))
    validated_range = new_doc.validate_range(first_line_range)
    first_line_text = new_doc.get_text(validated_range)
    print(f"First line: {repr(first_line_text)}")
    
    # Example 6: Position and offset conversion
    print("\n=== Position/Offset Conversion ===")
    pos = Position(1, 0)  # Start of second line
    offset = new_doc.offset_at(pos)
    print(f"Position {pos} is at offset {offset}")
    
    back_to_pos = new_doc.position_at(offset)
    print(f"Offset {offset} is at position {back_to_pos}")
    
    # Example 7: Get word at position
    print("\n=== Word Range at Position ===")
    # Try to find a word on line 0
    word_pos = Position(0, 2)  # Inside "Hello"
    word_range = new_doc.get_word_range_at_position(word_pos)
    if word_range:
        word = new_doc.get_text(word_range)
        print(f"Word at {word_pos}: {repr(word)}")
        print(f"  Range: {word_range}")
    
    # Example 8: Check if document exists by URI
    print("\n=== Getting Document by URI ===")
    try:
        found_doc = vscode.workspace.get_text_document(new_doc.uri)
        print(f"Found document: {found_doc.file_name}")
        print(f"  Version: {found_doc.version}")
        print(f"  Is dirty: {found_doc.is_dirty}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Example 9: Work with real files if workspace is open
    print("\n=== Working with Workspace Files ===")
    workspace_docs = [d for d in documents if not d.is_untitled]
    if workspace_docs:
        doc = workspace_docs[0]
        print(f"Analyzing: {doc.file_name}")
        print(f"  Total lines: {doc.line_count}")
        print(f"  Version: {doc.version}")
        print(f"  Language: {doc.language_id}")
        
        # Show first few lines
        print("\n  First 5 lines:")
        for i in range(min(5, doc.line_count)):
            line = doc.line_at(i)
            print(f"    {i}: {line.text[:60]}")
    
    # Example 10: Save document
    print("\n=== Saving Document ===")
    if new_doc.is_dirty:
        success = new_doc.save()
        print(f"Document saved: {success}")
        print(f"  New version: {new_doc.version}")
    
    print("\n✓ All examples completed!")
