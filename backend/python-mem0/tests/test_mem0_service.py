"""Tests for Mem0Service."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from src.mem0_service import Mem0Service
from src.config import Mem0Config


@pytest.fixture
def mock_config():
    """Create a mock configuration for testing."""
    return Mem0Config(
        provider="openai",
        api_key="test-key",
        llm_model="gpt-4o-mini",
        embedding_model="text-embedding-3-small",
        collection_name="test_collection",
        qdrant_url="http://localhost:6333"
    )


@pytest.fixture
def mem0_service(mock_config):
    """Create a Mem0Service instance for testing."""
    with patch("src.mem0_service.Memory") as mock_memory:
        service = Mem0Service(mock_config)
        yield service


@pytest.mark.asyncio
async def test_initialize(mem0_service):
    """Test service initialization."""
    await mem0_service.initialize()
    assert mem0_service.is_initialized()


@pytest.mark.asyncio
async def test_add_messages(mem0_service):
    """Test adding messages to memory."""
    # Mock the memory instance
    mem0_service.mem0.add = AsyncMock(return_value={"results": [{"id": "test-id", "memory": "test memory"}]})
    
    messages = [
        {"id": "1", "type": "user", "content": "Hello", "timestamp": "2025-01-01T00:00:00Z"},
        {"id": "2", "type": "assistant", "content": "Hi there", "timestamp": "2025-01-01T00:01:00Z"}
    ]
    
    result = await mem0_service.add_messages(messages, "session-123", 1)
    
    assert result["results"]
    assert len(result["results"]) > 0
    mem0_service.mem0.add.assert_called_once()


@pytest.mark.asyncio
async def test_search(mem0_service):
    """Test searching memories."""
    # Mock the search result
    mem0_service.mem0.search = AsyncMock(return_value={
        "results": [
            {"id": "1", "memory": "test memory", "score": 0.95}
        ]
    })
    
    result = await mem0_service.search("test query", user_id=1, limit=10)
    
    assert result["results"]
    assert len(result["results"]) == 1
    assert result["results"][0]["score"] == 0.95
    mem0_service.mem0.search.assert_called_once()


@pytest.mark.asyncio
async def test_get_all_user_memories(mem0_service):
    """Test getting all memories for a user."""
    # Mock the get_all result
    mem0_service.mem0.get_all = AsyncMock(return_value={
        "results": [
            {"id": "1", "memory": "Memory 1"},
            {"id": "2", "memory": "Memory 2"},
            {"id": "3", "memory": "Memory 3"}
        ]
    })
    
    result = await mem0_service.get_all_user_memories(1, limit=100)
    
    assert len(result) == 3
    assert result[0]["memory"] == "Memory 1"
    mem0_service.mem0.get_all.assert_called_once_with(
        user_id="1",
        limit=100
    )


@pytest.mark.asyncio
async def test_delete_session_memories(mem0_service):
    """Test deleting session memories."""
    # Mock the delete result
    mem0_service.mem0.delete = AsyncMock()
    
    # First mock getting the memories
    mem0_service.mem0.get_all = AsyncMock(return_value={
        "results": [
            {"id": "1", "memory": "Memory 1"},
            {"id": "2", "memory": "Memory 2"}
        ]
    })
    
    deleted_count = await mem0_service.delete_session_memories("session-123", 1)
    
    assert deleted_count == 2
    assert mem0_service.mem0.delete.call_count == 2


@pytest.mark.asyncio
async def test_error_handling(mem0_service):
    """Test error handling in service methods."""
    # Mock an error
    mem0_service.mem0.add = AsyncMock(side_effect=Exception("Test error"))
    
    with pytest.raises(Exception) as exc_info:
        await mem0_service.add_messages([], "session-123", 1)
    
    assert "Test error" in str(exc_info.value)