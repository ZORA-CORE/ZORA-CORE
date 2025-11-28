"""
ZORA CORE Memory Base Classes

Defines the abstract interface for memory storage backends.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class MemoryType(str, Enum):
    """Types of memories that can be stored."""
    DECISION = "decision"
    REFLECTION = "reflection"
    ARTIFACT = "artifact"
    CONVERSATION = "conversation"
    PLAN = "plan"
    RESULT = "result"
    RESEARCH = "research"
    DESIGN = "design"
    SAFETY_REVIEW = "safety_review"
    CLIMATE_DATA = "climate_data"
    BRAND_DATA = "brand_data"


@dataclass
class Memory:
    """Represents a single memory entry."""
    id: str
    agent: str
    memory_type: MemoryType
    content: str
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    session_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    embedding: Optional[List[float]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert memory to dictionary."""
        return {
            "id": self.id,
            "agent": self.agent,
            "memory_type": self.memory_type.value,
            "content": self.content,
            "tags": self.tags,
            "metadata": self.metadata,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "updated_at": self.updated_at.isoformat() if self.updated_at and isinstance(self.updated_at, datetime) else self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Memory":
        """Create memory from dictionary."""
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        elif created_at is None:
            created_at = datetime.utcnow()
            
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            
        return cls(
            id=data["id"],
            agent=data["agent"],
            memory_type=MemoryType(data["memory_type"]),
            content=data["content"],
            tags=data.get("tags", []),
            metadata=data.get("metadata", {}),
            session_id=data.get("session_id"),
            created_at=created_at,
            updated_at=updated_at,
        )


class MemoryBackend(ABC):
    """
    Abstract base class for memory storage backends.
    
    All memory backends (in-memory, Supabase, etc.) must implement this interface.
    """

    @abstractmethod
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
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific memory by ID."""
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    async def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        pass

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the memory store."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear all memories (for testing)."""
        pass
