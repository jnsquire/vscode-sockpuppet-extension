"""
VSCode Sockpuppet - Python API for controlling VS Code programmatically
"""

from .client import VSCodeClient
from .window import Window
from .workspace import Workspace
from .editor import Editor
from .document import TextDocument, Position, Range, TextLine

__version__ = "0.1.0"
__all__ = [
    "VSCodeClient",
    "Window",
    "Workspace",
    "Editor",
    "TextDocument",
    "Position",
    "Range",
    "TextLine"
]
