"""Tests for Mem0Service."""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import os


# Set up test environment variables before imports
os.environ['MEM0_MODELS'] = 'openai'
os.environ['OPENAI_API_KEY'] = 'test-key'
os.environ['MEM0_LLM_MODEL'] = 'gpt-4o-mini'
os.environ['MEM0_EMBEDDING_MODEL'] = 'text-embedding-3-small'


@pytest.fixture
def mock_memory():
    """Create a mock Memory instance."""
    with patch("src.mem0_service.Memory") as mock_memory_class:
        mock_instance = MagicMock()
        mock_memory_class.from_config.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mem0_service(mock_memory):
    """Create a Mem0Service instance for testing."""
    from src.mem0_service import Mem0Service
    service = Mem0Service()
    return service


def test_initialize(mem0_service, mock_memory):
    """Test service initialization."""
    mem0_service.initialize()
    assert mem0_service.initialized is True
    assert mem0_service.memory is not None


@pytest.mark.asyncio
async def test_add_messages(mem0_service, mock_memory):
    """Test adding messages to memory."""
    # Initialize the service first
    mem0_service.initialize()
    
    # Mock the add method
    mock_memory.add.return_value = [{"id": "test-id", "memory": "test memory"}]
    
    messages = [
        {"id": "1", "type": "user", "content": "Hello", "timestamp": "2025-01-01T00:00:00Z"},
        {"id": "2", "type": "assistant", "content": "Hi there", "timestamp": "2025-01-01T00:01:00Z"}
    ]
    
    result = await mem0_service.add_messages(messages, "session-123", 1)
    
    assert result["success"] is True
    assert result["results"] is not None
    mock_memory.add.assert_called_once()


@pytest.mark.asyncio
async def test_search(mem0_service, mock_memory):
    """Test searching memories."""
    # Initialize the service first
    mem0_service.initialize()
    
    # Mock the search result
    mock_memory.search.return_value = {
        "results": [
            {"id": "1", "memory": "test memory", "score": 0.95}
        ]
    }
    
    result = await mem0_service.search("test query", user_id=1, limit=10)
    
    assert result["success"] is True
    assert len(result["results"]) == 1
    assert result["results"][0]["score"] == 0.95
    mock_memory.search.assert_called_once()


@pytest.mark.asyncio
async def test_get_all_user_memories(mem0_service, mock_memory):
    """Test getting all memories for a user."""
    # Initialize the service first
    mem0_service.initialize()
    
    # Mock the get_all result - return a list directly
    mock_memory.get_all.return_value = [
        {"id": "1", "memory": "Memory 1"},
        {"id": "2", "memory": "Memory 2"},
        {"id": "3", "memory": "Memory 3"}
    ]
    
    result = await mem0_service.get_all_user_memories(1, limit=100)
    
    assert len(result) == 3
    assert result[0]["memory"] == "Memory 1"
    mock_memory.get_all.assert_called_once_with(
        user_id="1",
        limit=100
    )


@pytest.mark.asyncio
async def test_delete_session_memories(mem0_service, mock_memory):
    """Test deleting session memories."""
    # Initialize the service first
    mem0_service.initialize()
    
    # Mock getting the memories with session metadata
    mock_memory.get_all.return_value = [
        {"id": "1", "memory": "Memory 1", "metadata": {"session_id": "session-123"}},
        {"id": "2", "memory": "Memory 2", "metadata": {"session_id": "session-123"}}
    ]
    
    # Mock the delete method
    mock_memory.delete.return_value = None
    
    result = await mem0_service.delete_session_memories("session-123", 1)
    
    assert result["success"] is True
    assert result["deleted_count"] == 2
    assert mock_memory.delete.call_count == 2


@pytest.mark.asyncio
async def test_error_handling(mem0_service, mock_memory):
    """Test error handling in service methods."""
    # Initialize the service first
    mem0_service.initialize()
    
    # Mock an error
    mock_memory.add.side_effect = Exception("Test error")
    
    # The current implementation catches exceptions and returns error in response
    result = await mem0_service.add_messages([], "session-123", 1)
    
    assert result["success"] is False
    assert "Test error" in result["error"]