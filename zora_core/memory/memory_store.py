"""
ZORA CORE Memory Store

Provides the core memory storage and retrieval functionality for EIVOR.
This module contains the in-memory implementation. For Supabase-backed
storage, see supabase_adapter.py.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import Memory, MemoryBackend, MemoryType


class MemoryStore(MemoryBackend):
    """
    In-memory storage for ZORA CORE memories.
    
    This is the MVP implementation. For production use with persistent
    storage, see SupabaseMemoryAdapter in supabase_adapter.py.
    
    Implements the MemoryBackend interface for interchangeability.
    """

    def __init__(self):
        """Initialize the memory store."""
        self._memories: Dict[str, Memory] = {}
        self._sessions: Dict[str, List[str]] = {}  # session_id -> memory_ids
        self._tag_index: Dict[str, List[str]] = {}  # tag -> memory_ids
        self._agent_index: Dict[str, List[str]] = {}  # agent -> memory_ids
        self._type_index: Dict[str, List[str]] = {}  # memory_type -> memory_ids

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
        Save a new memory.
        
        Args:
            agent: The agent saving the memory
            memory_type: Type of memory (decision, reflection, etc.)
            content: The content to store
            tags: Optional tags for categorization
            metadata: Optional additional metadata
            session_id: Optional session identifier
            
        Returns:
            The memory ID
        """
        memory_id = f"mem_{uuid.uuid4().hex[:12]}"
        
        # Convert string to MemoryType enum
        try:
            mem_type = MemoryType(memory_type)
        except ValueError:
            mem_type = MemoryType.ARTIFACT  # Default fallback
        
        memory = Memory(
            id=memory_id,
            agent=agent,
            memory_type=mem_type,
            content=content,
            tags=tags or [],
            metadata=metadata or {},
            session_id=session_id,
        )
        
        # Store the memory
        self._memories[memory_id] = memory
        
        # Update indices
        self._update_indices(memory)
        
        return memory_id

    def _update_indices(self, memory: Memory) -> None:
        """Update all indices for a memory."""
        # Tag index
        for tag in memory.tags:
            if tag not in self._tag_index:
                self._tag_index[tag] = []
            self._tag_index[tag].append(memory.id)
        
        # Agent index
        if memory.agent not in self._agent_index:
            self._agent_index[memory.agent] = []
        self._agent_index[memory.agent].append(memory.id)
        
        # Type index
        type_key = memory.memory_type.value
        if type_key not in self._type_index:
            self._type_index[type_key] = []
        self._type_index[type_key].append(memory.id)
        
        # Session index
        if memory.session_id:
            if memory.session_id not in self._sessions:
                self._sessions[memory.session_id] = []
            self._sessions[memory.session_id].append(memory.id)

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
        Search memories based on criteria.
        
        Args:
            agent: Filter by agent name
            query: Text query for content search
            tags: Filter by tags (any match)
            memory_type: Filter by memory type
            session_id: Filter by session
            limit: Maximum results to return
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List of matching memories as dictionaries
        """
        # Start with all memories or filtered by index
        candidate_ids = set(self._memories.keys())
        
        # Filter by agent
        if agent:
            agent_ids = set(self._agent_index.get(agent, []))
            candidate_ids &= agent_ids
        
        # Filter by memory type
        if memory_type:
            type_ids = set(self._type_index.get(memory_type, []))
            candidate_ids &= type_ids
        
        # Filter by session
        if session_id:
            session_ids = set(self._sessions.get(session_id, []))
            candidate_ids &= session_ids
        
        # Filter by tags (any match)
        if tags:
            tag_ids = set()
            for tag in tags:
                tag_ids.update(self._tag_index.get(tag, []))
            candidate_ids &= tag_ids
        
        # Get memories and filter by query and time range
        results = []
        for memory_id in candidate_ids:
            memory = self._memories.get(memory_id)
            if not memory:
                continue
            
            # Text search in content
            if query and query.lower() not in memory.content.lower():
                continue
            
            # Time range filter
            if start_time and memory.created_at < start_time:
                continue
            if end_time and memory.created_at > end_time:
                continue
            
            results.append(memory.to_dict())
        
        # Sort by created_at (newest first)
        results.sort(key=lambda x: x["created_at"], reverse=True)
        
        return results[:limit]

    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific memory by ID."""
        memory = self._memories.get(memory_id)
        return memory.to_dict() if memory else None

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
            List of session memories
        """
        memory_ids = self._sessions.get(session_id, [])
        
        memories = []
        for memory_id in memory_ids[-limit:]:
            memory = self._memories.get(memory_id)
            if memory:
                memories.append(memory.to_dict())
        
        return memories

    async def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        memory = self._memories.get(memory_id)
        if not memory:
            return False
        
        # Remove from indices
        for tag in memory.tags:
            if tag in self._tag_index and memory_id in self._tag_index[tag]:
                self._tag_index[tag].remove(memory_id)
        
        if memory.agent in self._agent_index:
            if memory_id in self._agent_index[memory.agent]:
                self._agent_index[memory.agent].remove(memory_id)
        
        type_key = memory.memory_type.value
        if type_key in self._type_index and memory_id in self._type_index[type_key]:
            self._type_index[type_key].remove(memory_id)
        
        if memory.session_id and memory.session_id in self._sessions:
            if memory_id in self._sessions[memory.session_id]:
                self._sessions[memory.session_id].remove(memory_id)
        
        # Remove the memory
        del self._memories[memory_id]
        
        return True

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the memory store."""
        return {
            "total_memories": len(self._memories),
            "total_sessions": len(self._sessions),
            "total_tags": len(self._tag_index),
            "memories_by_agent": {
                agent: len(ids) for agent, ids in self._agent_index.items()
            },
            "memories_by_type": {
                mem_type: len(ids) for mem_type, ids in self._type_index.items()
            },
        }

    def clear(self) -> None:
        """Clear all memories (for testing)."""
        self._memories.clear()
        self._sessions.clear()
        self._tag_index.clear()
        self._agent_index.clear()
        self._type_index.clear()
