# Python Mem0 Service Tests

This directory contains unit tests for the ChatSG Mem0 Python service.

## Running Tests

From the `python-mem0` directory:

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run with coverage
uv run pytest --cov=src

# Run a specific test file
uv run pytest tests/test_mem0_service.py
```

## Import Structure

The tests use the `src.` prefix for imports (e.g., `from src.mem0_service import Mem0Service`). This works because:

1. The `conftest.py` file adds the parent directory (`python-mem0`) to the Python path
2. This allows Python to find the `src` package and import modules from it
3. This approach ensures tests work consistently across different environments

## Test Coverage

The test suite covers:

- Service initialization
- Adding messages to memory
- Searching memories with relevance scores
- Retrieving all user memories
- Deleting session memories
- Error handling and exception propagation

## Notes

- Tests use mocks to avoid requiring actual API connections
- Environment variables are set at the top of test files to configure the service
- The `conftest.py` file is automatically loaded by pytest and sets up the import path