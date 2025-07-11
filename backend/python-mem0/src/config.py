"""Configuration management for Mem0 service."""
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Configuration for Mem0 service."""
    
    def __init__(self):
        self.provider = self._detect_provider()
        self.api_key = self._get_api_key()
        self.embedding_model = self._get_embedding_model()
        self.llm_model = self._get_llm_model()
        self.azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        self.azure_embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
        self.azure_api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        
        # Vector store configuration
        self.vector_store_provider = os.getenv("MEM0_PROVIDER", "qdrant")
        self.qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        self.collection_name = os.getenv("MEM0_COLLECTION_NAME", "chatsg_memories")
        
        # Graph store configuration
        self.graph_enabled = os.getenv("MEM0_GRAPH_ENABLED", "false").lower() == "true"
        self.neo4j_url = os.getenv("NEO4J_URL", "neo4j://localhost:7687")
        self.neo4j_username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD", "password")
        
        # Check if Neo4j dependencies are available
        if self.graph_enabled:
            try:
                import langchain_neo4j
            except ImportError:
                print("WARNING: MEM0_GRAPH_ENABLED is true but langchain-neo4j is not installed")
                print("Disabling graph store. Install with: pip install langchain-neo4j")
                self.graph_enabled = False
    
    def _detect_provider(self) -> str:
        """Detect which provider to use based on environment variables."""
        provider = os.getenv("MEM0_MODELS", "").lower()
        if provider not in ["openai", "azure"]:
            raise ValueError(f"MEM0_MODELS must be 'openai' or 'azure', got: {provider}")
        return provider
    
    def _get_api_key(self) -> str:
        """Get the appropriate API key based on provider."""
        if self.provider == "azure":
            api_key = os.getenv("AZURE_OPENAI_API_KEY")
            if not api_key:
                raise ValueError("AZURE_OPENAI_API_KEY is required when MEM0_MODELS=azure")
            return api_key
        else:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY is required when MEM0_MODELS=openai")
            return api_key
    
    def _get_embedding_model(self) -> str:
        """Get the embedding model based on provider."""
        if self.provider == "azure":
            return os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
        else:
            return os.getenv("MEM0_EMBEDDING_MODEL", "text-embedding-3-small")
    
    def _get_llm_model(self) -> str:
        """Get the LLM model based on provider."""
        if self.provider == "azure":
            return os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
        else:
            return os.getenv("MEM0_LLM_MODEL", "gpt-4o-mini")
    
    def get_mem0_config(self) -> Dict[str, Any]:
        """Get the complete Mem0 configuration based on provider."""
        config = {
            "version": "v1.1"
        }
        
        # Configure embedder
        if self.provider == "azure":
            config["embedder"] = {
                "provider": "azure_openai",
                "config": {
                    "model": self.azure_embedding_deployment or self.embedding_model,
                    "embedding_model_dims": 1536,
                    "azure_kwargs": {
                        "api_version": self.azure_api_version,
                        "azure_endpoint": self.azure_endpoint,
                        "api_key": self.api_key,
                        "azure_deployment": self.azure_embedding_deployment or self.embedding_model,
                    }
                }
            }
        else:
            config["embedder"] = {
                "provider": "openai",
                "config": {
                    "model": self.embedding_model,
                    "api_key": self.api_key,
                }
            }
        
        # Configure LLM
        if self.provider == "azure":
            config["llm"] = {
                "provider": "azure_openai",
                "config": {
                    "model": self.azure_deployment or self.llm_model,
                    "temperature": 0.1,
                    "max_tokens": 2000,
                    "azure_kwargs": {
                        "azure_deployment": self.azure_deployment or self.llm_model,
                        "api_version": self.azure_api_version,
                        "azure_endpoint": self.azure_endpoint,
                        "api_key": self.api_key,
                    }
                }
            }
        else:
            config["llm"] = {
                "provider": "openai",
                "config": {
                    "model": self.llm_model,
                    "temperature": 0.1,
                    "max_tokens": 2000,
                    "api_key": self.api_key,
                }
            }
        
        # Configure vector store
        if self.vector_store_provider == "qdrant":
            config["vector_store"] = {
                "provider": "qdrant",
                "config": {
                    "url": self.qdrant_url,
                    "collection_name": self.collection_name,
                    "embedding_model_dims": 1536,
                }
            }
        
        # Configure graph store if enabled
        if self.graph_enabled:
            config["enable_graph"] = True
            config["graph_store"] = {
                "provider": "neo4j",
                "config": {
                    "url": self.neo4j_url,
                    "username": self.neo4j_username,
                    "password": self.neo4j_password,
                }
            }
        
        return config


# Global config instance
config = Config()