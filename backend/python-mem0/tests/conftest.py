"""Pytest configuration and shared fixtures."""

import sys
from pathlib import Path

# Add the parent directory (python-mem0) to Python path so we can import src modules
parent_path = Path(__file__).parent.parent
sys.path.insert(0, str(parent_path))