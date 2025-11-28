"""
ZORA CORE Supabase Memory Adapter

Provides persistent memory storage using Supabase (Postgres).
"""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import Memory, MemoryBackend, MemoryType

# Supabase client import - optional dependency
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


class SupabaseMemoryAdapter(MemoryBackend):
    """
    Supabase-backed memory storage for EIVOR.
    
    This adapter connects to a Supabase Postgres database and provides
    persistent storage for agent memories.
    
    Configuration via environment variables:
    - SUPABASE_URL: The Supabase project URL
    - SUPABASE_SERVICE_KEY: The service role key (for backend use)
    - SUPABASE_ANON_KEY: The anon key (alternative to service key)
    """

    def __init__(
        self,
        url: str = None,
        key: str = None,
        table_name: str = "memory_events",
    ):
        """
        Initialize the Supabase memory adapter.
        
        Args:
            url: Supabase project URL (or set SUPABASE_URL env var)
            key: Supabase API key (or set SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY env var)
            table_name: Name of the memory table (default: memory_events)
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
        self.logger.info(f"SupabaseMemoryAdapter initialized for {self.url}")

    async def save_memory(
        self,
        agent: str,
        memory_type: str,
        content: str,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
        session_id: str = None,
    ) -> str:
        """
        Save a new memory to Supabase.
        
        Args:
            agent: The agent saving the memory
            memory_type: Type of memory (decision, reflection, etc.)
            content: The content to store
            tags: Optional tags for categorization
            metadata: Optional additional metadata
            session_id: Optional session identifier
            
        Returns:
            The memory ID (UUID)
        """
        # Validate memory type
        try:
            mem_type = MemoryType(memory_type)
        except ValueError:
            mem_type = MemoryType.ARTIFACT
        
        # Prepare the record
        record = {
            "agent": agent,
            "memory_type": mem_type.value,
            "content": content,
            "tags": tags or [],
            "metadata": metadata or {},
            "session_id": session_id,
        }
        
        try:
            result = self.client.table(self.table_name).insert(record).execute()
            
            if result.data and len(result.data) > 0:
                memory_id = result.data[0]["id"]
                self.logger.debug(f"Saved memory {memory_id} for agent {agent}")
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

    def _row_to_dict(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a database row to a memory dictionary."""
        return {
            "id": row["id"],
            "agent": row["agent"],
            "memory_type": row["memory_type"],
            "content": row["content"],
            "tags": row.get("tags", []),
            "metadata": row.get("metadata", {}),
            "session_id": row.get("session_id"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }


def is_supabase_configured() -> bool:
    """Check if Supabase environment variables are configured."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    return bool(url and key)
