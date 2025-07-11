"""Mem0 service wrapper for handling memory operations."""
import logging
from typing import List, Dict, Any, Optional
from mem0 import Memory
from .config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Mem0Service:
    """Wrapper for Mem0 memory operations."""
    
    def __init__(self):
        self.config = config
        self.memory: Optional[Memory] = None
        self.initialized = False
    
    def initialize(self) -> None:
        """Initialize the Mem0 memory instance."""
        if self.initialized:
            return
        
        try:
            logger.info(f"Initializing Mem0 with provider: {self.config.provider}")
            mem0_config = self.config.get_mem0_config()
            
            # Log configuration (without sensitive data)
            logger.info(f"Using embedding model: {self.config.embedding_model}")
            logger.info(f"Using LLM model: {self.config.llm_model}")
            if self.config.provider == "azure":
                logger.info(f"Azure endpoint: {self.config.azure_endpoint}")
                logger.info(f"Azure API version: {self.config.azure_api_version}")
            
            # Initialize Mem0
            self.memory = Memory.from_config(mem0_config)
            self.initialized = True
            logger.info("Mem0 initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Mem0: {str(e)}")
            raise
    
    async def add_messages(
        self, 
        messages: List[Dict[str, Any]], 
        session_id: str, 
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Add messages to memory."""
        if not self.initialized:
            self.initialize()
        
        try:
            # Convert message format if needed
            mem0_messages = []
            for msg in messages:
                role = "user" if msg.get("type") == "user" else "assistant"
                mem0_messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
            
            # Build metadata
            metadata = {
                "session_id": session_id,
                "user_id": str(user_id) if user_id else "default"
            }
            
            # Add to memory
            result = self.memory.add(
                mem0_messages,
                user_id=str(user_id) if user_id else "default",
                metadata=metadata
            )
            
            logger.info(f"Added {len(messages)} messages to memory for session {session_id}")
            return {"success": True, "results": result}
            
        except Exception as e:
            logger.error(f"Failed to add messages: {str(e)}")
            return {"success": False, "error": str(e), "results": []}
    
    async def search(
        self, 
        query: str, 
        session_id: Optional[str] = None,
        user_id: Optional[int] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Search for relevant memories."""
        if not self.initialized:
            self.initialize()
        
        try:
            search_params = {
                "query": query,
                "user_id": str(user_id) if user_id else "default",
                "limit": limit
            }
            
            # Add session filter if provided
            if session_id:
                search_params["filters"] = {"session_id": session_id}
            
            results = self.memory.search(**search_params)
            
            # Debug log
            logger.info(f"Raw search results type: {type(results)}")
            
            # Handle different response formats from mem0
            if isinstance(results, dict):
                # If it's a dict with 'results' key, extract the results
                actual_results = results.get('results', [])
                logger.info(f"Got dict with 'results' key, extracting {len(actual_results)} results")
            elif isinstance(results, list):
                actual_results = results
                logger.info(f"Got list directly with {len(actual_results)} results")
            else:
                logger.warning(f"Unexpected results format: {type(results)}")
                actual_results = []
            
            # Normalize results to always be dicts
            normalized_results = []
            for idx, result in enumerate(actual_results):
                if isinstance(result, dict):
                    normalized_results.append(result)
                elif isinstance(result, str):
                    normalized_results.append({
                        "id": str(idx),
                        "memory": result,
                        "score": 1.0
                    })
            
            logger.info(f"Search for '{query}' returned {len(normalized_results)} results")
            return {"success": True, "results": normalized_results}
            
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            return {"success": False, "error": str(e), "results": []}
    
    async def get_all_user_memories(
        self,
        user_id: int,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get all memories for a user across all sessions."""
        if not self.initialized:
            self.initialize()
        
        try:
            all_memories = self.memory.get_all(
                user_id=str(user_id) if user_id else "default",
                limit=limit
            )
            
            # Debug log
            logger.info(f"Raw all_memories type: {type(all_memories)}")
            
            # Handle different response formats
            if isinstance(all_memories, dict):
                actual_memories = all_memories.get('results', all_memories.get('memories', []))
                logger.info(f"Got dict response, extracted {len(actual_memories)} memories")
            elif isinstance(all_memories, list):
                actual_memories = all_memories
                logger.info(f"Got list response with {len(actual_memories)} memories")
            else:
                logger.warning(f"Unexpected all_memories format: {type(all_memories)}")
                actual_memories = []
            
            # Return all memories without filtering by session
            formatted_memories = []
            for mem in actual_memories:
                if isinstance(mem, dict):
                    formatted_memories.append(mem)
                elif isinstance(mem, str):
                    formatted_memories.append({
                        "id": str(len(formatted_memories)),
                        "memory": mem,
                        "metadata": {}
                    })
            
            logger.info(f"Retrieved {len(formatted_memories)} total memories for user {user_id}")
            return formatted_memories
            
        except Exception as e:
            logger.error(f"Failed to get all user memories: {str(e)}")
            return []
    
    async def get_session_memories(
        self, 
        session_id: str, 
        user_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all memories for a session."""
        if not self.initialized:
            self.initialize()
        
        try:
            all_memories = self.memory.get_all(
                user_id=str(user_id) if user_id else "default",
                limit=limit
            )
            
            # Debug log to see what we're getting
            logger.info(f"Raw all_memories type: {type(all_memories)}")
            
            # Handle different response formats
            if isinstance(all_memories, dict):
                # If it's a dict with 'results' or 'memories' key, extract them
                actual_memories = all_memories.get('results', all_memories.get('memories', []))
                logger.info(f"Got dict response, extracted {len(actual_memories)} memories")
            elif isinstance(all_memories, list):
                actual_memories = all_memories
                logger.info(f"Got list response with {len(actual_memories)} memories")
            else:
                logger.warning(f"Unexpected all_memories format: {type(all_memories)}")
                actual_memories = []
            
            # Filter by session_id - handle both dict and string responses
            session_memories = []
            for mem in actual_memories:
                if isinstance(mem, dict):
                    # Check if this memory belongs to the session
                    mem_session_id = mem.get("metadata", {}).get("session_id")
                    if mem_session_id == session_id:
                        session_memories.append(mem)
                elif isinstance(mem, str):
                    # If it's a string, wrap it in a dict format
                    session_memories.append({
                        "id": str(len(session_memories)),
                        "memory": mem,
                        "metadata": {"session_id": session_id}
                    })
            
            logger.info(f"Retrieved {len(session_memories)} memories for session {session_id}")
            return session_memories
            
        except Exception as e:
            logger.error(f"Failed to get session memories: {str(e)}")
            return []
    
    async def delete_session_memories(
        self, 
        session_id: str, 
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Delete all memories for a session."""
        if not self.initialized:
            self.initialize()
        
        try:
            # Get all memories for the session
            memories = await self.get_session_memories(session_id, user_id)
            
            # Delete each memory
            deleted_count = 0
            for memory in memories:
                if memory.get("id"):
                    self.memory.delete(memory["id"])
                    deleted_count += 1
            
            logger.info(f"Deleted {deleted_count} memories for session {session_id}")
            return {"success": True, "deleted_count": deleted_count}
            
        except Exception as e:
            logger.error(f"Failed to delete session memories: {str(e)}")
            return {"success": False, "error": str(e), "deleted_count": 0}
    
    async def get_context_for_query(
        self,
        query: str,
        session_id: str,
        user_id: Optional[int] = None,
        max_messages: int = 50
    ) -> List[Dict[str, str]]:
        """Get context messages for LLM based on query."""
        if not self.initialized:
            self.initialize()
        
        try:
            # Search for relevant memories (cross-session for user context)
            search_results = await self.search(query, user_id=user_id, limit=max_messages)
            
            # Convert to context messages
            context_messages = []
            for result in search_results.get("results", []):
                memory_content = result.get("memory", "")
                if memory_content:
                    context_messages.append({
                        "role": "system",
                        "content": f"[Relevant Context: {memory_content}]"
                    })
            
            logger.info(f"Built context with {len(context_messages)} relevant memories")
            return context_messages
            
        except Exception as e:
            logger.error(f"Failed to get context: {str(e)}")
            return []


# Global service instance
mem0_service = Mem0Service()