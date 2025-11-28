"""
ZORA CORE Supabase Memory Adapter

Provides persistent memory storage using Supabase (Postgres).
Supports semantic search via pgvector embeddings.
"""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from .base import Memory, MemoryBackend, MemoryType

# Supabase client import - optional dependency
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

# Embedding provider import - optional dependency
if TYPE_CHECKING:
    from ..models.embedding import EmbeddingProvider


class SupabaseMemoryAdapter(MemoryBackend):
    """
    Supabase-backed memory storage for EIVOR.
    
    This adapter connects to a Supabase Postgres database and provides
    persistent storage for agent memories with optional semantic search
    via pgvector embeddings.
    
    Configuration via environment variables:
    - SUPABASE_URL: The Supabase project URL
    - SUPABASE_SERVICE_KEY: The service role key (for backend use)
    - SUPABASE_ANON_KEY: The anon key (alternative to service key)
    - OPENAI_API_KEY: Required for embeddings (optional)
    - ZORA_EMBEDDINGS_ENABLED: Enable/disable embeddings (default: true if API key present)
    """

    def __init__(
        self,
        url: str = None,
        key: str = None,
        table_name: str = "memory_events",
        enable_embeddings: bool = None,
        embedding_provider: "EmbeddingProvider" = None,
    ):
        """
        Initialize the Supabase memory adapter.
        
        Args:
            url: Supabase project URL (or set SUPABASE_URL env var)
            key: Supabase API key (or set SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY env var)
            table_name: Name of the memory table (default: memory_events)
            enable_embeddings: Enable embedding generation (default: auto-detect based on API key)
            embedding_provider: Custom embedding provider (default: auto-create based on config)
        """
        if not SUPABASE_AVAILABLE:
            raise ImportError(
                "Supabase client not installed. "
                "Install with: pip install supabase"
            )
        
        self.url = url or os.environ.get("SUPABASE_URL")
        self.key = key or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
        self.table_name = table_name
        
        if not self.url or not self.key:
            raise ValueError(
                "Supabase URL and key are required. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
            )
        
        self.client: Client = create_client(self.url, self.key)
        self.logger = logging.getLogger("zora.memory.supabase")
        
        # Initialize embedding provider
        self._embedding_provider = embedding_provider
        self._embeddings_enabled = self._init_embeddings(enable_embeddings)
        
        self.logger.info(
            f"SupabaseMemoryAdapter initialized for {self.url} "
            f"(embeddings: {'enabled' if self._embeddings_enabled else 'disabled'})"
        )
    
    def _init_embeddings(self, enable_embeddings: bool = None) -> bool:
        """Initialize embedding provider and determine if embeddings are enabled."""
        # Check environment variable override
        env_enabled = os.environ.get("ZORA_EMBEDDINGS_ENABLED", "").lower()
        if env_enabled == "false":
            self.logger.info("Embeddings disabled via ZORA_EMBEDDINGS_ENABLED=false")
            return False
        
        # If explicitly disabled, return False
        if enable_embeddings is False:
            return False
        
        # If provider already set, use it
        if self._embedding_provider is not None:
            return True
        
        # Try to create embedding provider
        try:
            from ..models.embedding import get_embedding_provider, is_embedding_configured
            
            if is_embedding_configured():
                self._embedding_provider = get_embedding_provider()
                return True
            else:
                self.logger.warning(
                    "Embeddings not configured (no OPENAI_API_KEY). "
                    "Semantic search will not be available."
                )
                return False
        except ImportError as e:
            self.logger.warning(f"Could not import embedding provider: {e}")
            return False
        except Exception as e:
            self.logger.warning(f"Failed to initialize embedding provider: {e}")
            return False
    
    @property
    def embeddings_enabled(self) -> bool:
        """Check if embeddings are enabled."""
        return self._embeddings_enabled
    
    async def _generate_embedding(self, text: str) -> tuple[Optional[List[float]], Optional[Dict[str, Any]]]:
        """
        Generate embedding for text with provider metadata.
        
        Returns:
            Tuple of (embedding vector or None, metadata dict or None)
        """
        if not self._embeddings_enabled or self._embedding_provider is None:
            return None, None
        
        try:
            embedding = await self._embedding_provider.embed_text(text)
            metadata = self._embedding_provider.get_metadata()
            return embedding, metadata
        except Exception as e:
            self.logger.warning(f"Failed to generate embedding: {e}")
            return None, None

    async def save_memory(
        self,
        agent: str,
        memory_type: str,
        content: str,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
        session_id: str = None,
        llm_provider: str = None,
        llm_model: str = None,
    ) -> str:
        """
        Save a new memory to Supabase with optional embedding and provider metadata.
        
        Args:
            agent: The agent saving the memory
            memory_type: Type of memory (decision, reflection, etc.)
            content: The content to store
            tags: Optional tags for categorization
            metadata: Optional additional metadata
            session_id: Optional session identifier
            llm_provider: Optional LLM provider that generated the content
            llm_model: Optional LLM model that generated the content
            
        Returns:
            The memory ID (UUID)
        """
        # Validate memory type
        try:
            mem_type = MemoryType(memory_type)
        except ValueError:
            mem_type = MemoryType.ARTIFACT
        
        # Generate embedding for the content (returns embedding and metadata)
        embedding, embedding_metadata = await self._generate_embedding(content)
        
        # Prepare the record
        record = {
            "agent": agent,
            "memory_type": mem_type.value,
            "content": content,
            "tags": tags or [],
            "metadata": metadata or {},
            "session_id": session_id,
        }
        
        # Add LLM provider/model metadata if provided
        if llm_provider:
            record["llm_provider"] = llm_provider
        if llm_model:
            record["llm_model"] = llm_model
        
        # Add embedding and embedding provider metadata if generated successfully
        if embedding is not None:
            record["embedding"] = embedding
            if embedding_metadata:
                record["embedding_provider"] = embedding_metadata.get("embedding_provider")
                record["embedding_model"] = embedding_metadata.get("embedding_model")
        
        try:
            result = self.client.table(self.table_name).insert(record).execute()
            
            if result.data and len(result.data) > 0:
                memory_id = result.data[0]["id"]
                has_embedding = embedding is not None
                self.logger.debug(
                    f"Saved memory {memory_id} for agent {agent} "
                    f"(embedding: {'yes' if has_embedding else 'no'}, "
                    f"llm: {llm_provider}/{llm_model if llm_provider else 'N/A'})"
                )
                return memory_id
            else:
                raise Exception("No data returned from insert")
                
        except Exception as e:
            self.logger.error(f"Failed to save memory: {e}")
            raise

    async def search_memory(
        self,
        agent: str = None,
        query: str = None,
        tags: List[str] = None,
        memory_type: str = None,
        session_id: str = None,
        limit: int = 10,
        start_time: datetime = None,
        end_time: datetime = None,
    ) -> List[Dict[str, Any]]:
        """
        Search memories in Supabase.
        
        Args:
            agent: Filter by agent name
            query: Text query for content search (uses ILIKE)
            tags: Filter by tags (any match using overlap)
            memory_type: Filter by memory type
            session_id: Filter by session
            limit: Maximum results to return
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List of matching memories as dictionaries
        """
        try:
            # Start building the query
            db_query = self.client.table(self.table_name).select("*")
            
            # Apply filters
            if agent:
                db_query = db_query.eq("agent", agent)
            
            if memory_type:
                db_query = db_query.eq("memory_type", memory_type)
            
            if session_id:
                db_query = db_query.eq("session_id", session_id)
            
            if query:
                # Use ILIKE for case-insensitive text search
                db_query = db_query.ilike("content", f"%{query}%")
            
            if tags:
                # Use overlap operator for array matching
                db_query = db_query.overlaps("tags", tags)
            
            if start_time:
                db_query = db_query.gte("created_at", start_time.isoformat())
            
            if end_time:
                db_query = db_query.lte("created_at", end_time.isoformat())
            
            # Order by created_at descending and limit
            db_query = db_query.order("created_at", desc=True).limit(limit)
            
            result = db_query.execute()
            
            # Convert to Memory format
            memories = []
            for row in result.data:
                memories.append(self._row_to_dict(row))
            
            return memories
            
        except Exception as e:
            self.logger.error(f"Failed to search memories: {e}")
            raise

    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific memory by ID."""
        try:
            result = self.client.table(self.table_name).select("*").eq("id", memory_id).execute()
            
            if result.data and len(result.data) > 0:
                return self._row_to_dict(result.data[0])
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to get memory {memory_id}: {e}")
            raise

    async def get_session_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get the history of a session.
        
        Args:
            session_id: The session identifier
            limit: Maximum entries to return
            
        Returns:
            List of session memories ordered by creation time
        """
        try:
            result = (
                self.client.table(self.table_name)
                .select("*")
                .eq("session_id", session_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            
            return [self._row_to_dict(row) for row in result.data]
            
        except Exception as e:
            self.logger.error(f"Failed to get session history for {session_id}: {e}")
            raise

    async def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        try:
            result = self.client.table(self.table_name).delete().eq("id", memory_id).execute()
            
            # Check if any rows were deleted
            return len(result.data) > 0
            
        except Exception as e:
            self.logger.error(f"Failed to delete memory {memory_id}: {e}")
            raise

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the memory store."""
        try:
            # Get total count
            total_result = self.client.table(self.table_name).select("id", count="exact").execute()
            total_count = total_result.count if hasattr(total_result, 'count') else len(total_result.data)
            
            # Get counts by agent
            agent_counts = {}
            agents_result = self.client.rpc("get_memory_stats_by_agent").execute()
            if agents_result.data:
                for row in agents_result.data:
                    agent_counts[row["agent"]] = row["count"]
            
            # Get counts by type
            type_counts = {}
            types_result = self.client.rpc("get_memory_stats_by_type").execute()
            if types_result.data:
                for row in types_result.data:
                    type_counts[row["memory_type"]] = row["count"]
            
            return {
                "total_memories": total_count,
                "memories_by_agent": agent_counts,
                "memories_by_type": type_counts,
                "backend": "supabase",
            }
            
        except Exception as e:
            # If RPC functions don't exist, return basic stats
            self.logger.warning(f"Could not get detailed stats: {e}")
            try:
                total_result = self.client.table(self.table_name).select("id", count="exact").execute()
                return {
                    "total_memories": total_result.count if hasattr(total_result, 'count') else len(total_result.data),
                    "backend": "supabase",
                }
            except Exception as e2:
                self.logger.error(f"Failed to get basic stats: {e2}")
                return {"backend": "supabase", "error": str(e2)}

    def clear(self) -> None:
        """
        Clear all memories (for testing).
        
        WARNING: This deletes all data in the memory_events table!
        """
        try:
            # Delete all rows - use a condition that matches all
            self.client.table(self.table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            self.logger.warning("Cleared all memories from Supabase")
        except Exception as e:
            self.logger.error(f"Failed to clear memories: {e}")
            raise

    def _row_to_dict(self, row: Dict[str, Any], include_similarity: bool = False) -> Dict[str, Any]:
        """Convert a database row to a memory dictionary."""
        result = {
            "id": row["id"],
            "agent": row["agent"],
            "memory_type": row["memory_type"],
            "content": row["content"],
            "tags": row.get("tags", []),
            "metadata": row.get("metadata", {}),
            "session_id": row.get("session_id"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            # Provider metadata (may be None for older records)
            "llm_provider": row.get("llm_provider"),
            "llm_model": row.get("llm_model"),
            "embedding_provider": row.get("embedding_provider"),
            "embedding_model": row.get("embedding_model"),
        }
        if include_similarity and "similarity" in row:
            result["similarity"] = row["similarity"]
        return result

    async def semantic_search(
        self,
        query: str,
        k: int = 10,
        agent: str = None,
        tags: List[str] = None,
        start_time: datetime = None,
        end_time: datetime = None,
    ) -> List[Dict[str, Any]]:
        """
        Search memories by semantic similarity using pgvector.
        
        Args:
            query: Natural language query to search for
            k: Maximum number of results to return
            agent: Filter by agent name
            tags: Filter by tags (any match)
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List of matching memories with similarity scores, ordered by relevance
        """
        if not self._embeddings_enabled:
            self.logger.warning(
                "Semantic search called but embeddings are not enabled. "
                "Falling back to text search."
            )
            return await self.search_memory(
                agent=agent,
                query=query,
                tags=tags,
                limit=k,
                start_time=start_time,
                end_time=end_time,
            )
        
        # Generate embedding for the query (returns tuple of embedding and metadata)
        query_embedding, _ = await self._generate_embedding(query)
        if query_embedding is None:
            self.logger.warning(
                "Failed to generate query embedding. Falling back to text search."
            )
            return await self.search_memory(
                agent=agent,
                query=query,
                tags=tags,
                limit=k,
                start_time=start_time,
                end_time=end_time,
            )
        
        try:
            # Call the RPC function for semantic search
            params = {
                "query_embedding": query_embedding,
                "match_count": k,
            }
            
            # Add optional filters
            if agent:
                params["filter_agent"] = agent
            if tags:
                params["filter_tags"] = tags
            if start_time:
                params["filter_start_time"] = start_time.isoformat()
            if end_time:
                params["filter_end_time"] = end_time.isoformat()
            
            result = self.client.rpc("search_memories_by_embedding", params).execute()
            
            if result.data:
                return [self._row_to_dict(row, include_similarity=True) for row in result.data]
            
            return []
            
        except Exception as e:
            self.logger.error(f"Semantic search failed: {e}")
            # Fall back to text search on error
            self.logger.info("Falling back to text search due to semantic search error")
            return await self.search_memory(
                agent=agent,
                query=query,
                tags=tags,
                limit=k,
                start_time=start_time,
                end_time=end_time,
            )


def is_supabase_configured() -> bool:
    """Check if Supabase environment variables are configured."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    return bool(url and key)
