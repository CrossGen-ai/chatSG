"""FastAPI application for Mem0 service."""
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .mem0_service import mem0_service
from .config import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ChatSG Mem0 Service",
    description="Python service for Mem0 memory management with Azure OpenAI support",
    version="0.1.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class Message(BaseModel):
    id: Optional[str] = None
    type: str
    content: str
    timestamp: Optional[str] = None
    role: Optional[str] = None


class AddMessagesRequest(BaseModel):
    messages: List[Message]
    session_id: str
    user_id: Optional[int] = None


class SearchRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    user_id: Optional[int] = None
    limit: int = 10


class GetSessionMemoriesRequest(BaseModel):
    session_id: str
    user_id: Optional[int] = None
    limit: int = 100


class GetAllUserMemoriesRequest(BaseModel):
    user_id: int
    limit: int = 1000


class DeleteSessionMemoriesRequest(BaseModel):
    session_id: str
    user_id: Optional[int] = None


class GetContextRequest(BaseModel):
    query: str
    session_id: str
    user_id: Optional[int] = None
    max_messages: int = 50


# Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize Mem0 service on startup."""
    try:
        mem0_service.initialize()
        logger.info(f"Mem0 service started with provider: {config.provider}")
    except Exception as e:
        logger.error(f"Failed to initialize Mem0 service: {str(e)}")
        # Don't raise - allow service to start for health checks


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy" if mem0_service.initialized else "initializing",
        "provider": config.provider,
        "initialized": mem0_service.initialized
    }


@app.get("/config")
async def get_config():
    """Get current configuration (without sensitive data)."""
    return {
        "provider": config.provider,
        "embedding_model": config.embedding_model,
        "llm_model": config.llm_model,
        "vector_store_provider": config.vector_store_provider,
        "graph_enabled": config.graph_enabled,
        "azure_endpoint": config.azure_endpoint if config.provider == "azure" else None,
        "azure_api_version": config.azure_api_version if config.provider == "azure" else None,
    }


@app.post("/add")
async def add_messages(request: AddMessagesRequest):
    """Add messages to memory."""
    if not mem0_service.initialized:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        # Convert messages to dict format
        messages = [msg.dict() for msg in request.messages]
        result = await mem0_service.add_messages(
            messages, 
            request.session_id, 
            request.user_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
        
        return result
    except Exception as e:
        logger.error(f"Error adding messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search_memories(request: SearchRequest):
    """Search for relevant memories."""
    if not mem0_service.initialized:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        result = await mem0_service.search(
            request.query,
            request.session_id,
            request.user_id,
            request.limit
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
        
        return result
    except Exception as e:
        logger.error(f"Error searching memories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/get-session-memories")
async def get_session_memories(request: GetSessionMemoriesRequest):
    """Get all memories for a session."""
    if not mem0_service.initialized:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        memories = await mem0_service.get_session_memories(
            request.session_id,
            request.user_id,
            request.limit
        )
        return {"success": True, "memories": memories}
    except Exception as e:
        logger.error(f"Error getting session memories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/get-all-user-memories")
async def get_all_user_memories(request: GetAllUserMemoriesRequest):
    """Get all memories for a user across all sessions."""
    try:
        if not mem0_service.initialized:
            raise HTTPException(status_code=503, detail="Service not initialized")
        
        memories = await mem0_service.get_all_user_memories(
            user_id=request.user_id,
            limit=request.limit
        )
        
        return {
            "success": True,
            "memories": memories,
            "count": len(memories)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all user memories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"500: {str(e)}")


@app.post("/delete-session-memories")
async def delete_session_memories(request: DeleteSessionMemoriesRequest):
    """Delete all memories for a session."""
    if not mem0_service.initialized:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        result = await mem0_service.delete_session_memories(
            request.session_id,
            request.user_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
        
        return result
    except Exception as e:
        logger.error(f"Error deleting session memories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/get-context")
async def get_context_for_query(request: GetContextRequest):
    """Get context messages for LLM based on query."""
    if not mem0_service.initialized:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        context_messages = await mem0_service.get_context_for_query(
            request.query,
            request.session_id,
            request.user_id,
            request.max_messages
        )
        return {"success": True, "context_messages": context_messages}
    except Exception as e:
        logger.error(f"Error getting context: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)