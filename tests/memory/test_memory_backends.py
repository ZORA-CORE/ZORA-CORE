"""
Tests for ZORA CORE Memory Backends

Tests both the in-memory and Supabase backends.
Supabase tests are skipped if credentials are not configured.
"""

import os
import pytest
from datetime import datetime, timedelta

from zora_core.memory import (
    Memory,
    MemoryBackend,
    MemoryType,
    MemoryStore,
    MemoryBackendType,
    get_memory_backend,
    get_backend_info,
)


# Check if Supabase is configured
def is_supabase_configured():
    """Check if Supabase environment variables are set."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    return bool(url and key)


# Skip decorator for Supabase tests
requires_supabase = pytest.mark.skipif(
    not is_supabase_configured(),
    reason="Supabase credentials not configured (set SUPABASE_URL and SUPABASE_SERVICE_KEY)"
)


class TestMemoryType:
    """Tests for MemoryType enum."""

    def test_memory_types_exist(self):
        """Test that all expected memory types exist."""
        expected_types = [
            "decision", "reflection", "artifact", "conversation",
            "plan", "result", "research", "design", "safety_review",
            "climate_data", "brand_data"
        ]
        for type_name in expected_types:
            assert hasattr(MemoryType, type_name.upper())
            assert MemoryType(type_name).value == type_name


class TestMemory:
    """Tests for Memory dataclass."""

    def test_create_memory(self):
        """Test creating a Memory instance."""
        memory = Memory(
            id="test_123",
            agent="CONNOR",
            memory_type=MemoryType.DECISION,
            content="Test decision content",
            tags=["test", "decision"],
            metadata={"confidence": 0.95},
            session_id="session_1",
        )
        
        assert memory.id == "test_123"
        assert memory.agent == "CONNOR"
        assert memory.memory_type == MemoryType.DECISION
        assert memory.content == "Test decision content"
        assert memory.tags == ["test", "decision"]
        assert memory.metadata == {"confidence": 0.95}
        assert memory.session_id == "session_1"

    def test_memory_to_dict(self):
        """Test converting Memory to dictionary."""
        memory = Memory(
            id="test_123",
            agent="LUMINA",
            memory_type=MemoryType.PLAN,
            content="Test plan",
        )
        
        data = memory.to_dict()
        
        assert data["id"] == "test_123"
        assert data["agent"] == "LUMINA"
        assert data["memory_type"] == "plan"
        assert data["content"] == "Test plan"
        assert "created_at" in data

    def test_memory_from_dict(self):
        """Test creating Memory from dictionary."""
        data = {
            "id": "test_456",
            "agent": "EIVOR",
            "memory_type": "reflection",
            "content": "Test reflection",
            "tags": ["memory"],
            "metadata": {},
            "session_id": None,
            "created_at": "2025-01-01T00:00:00",
        }
        
        memory = Memory.from_dict(data)
        
        assert memory.id == "test_456"
        assert memory.agent == "EIVOR"
        assert memory.memory_type == MemoryType.REFLECTION
        assert memory.content == "Test reflection"


class TestMemoryStore:
    """Tests for in-memory MemoryStore."""

    @pytest.fixture
    def store(self):
        """Create a fresh MemoryStore for each test."""
        return MemoryStore()

    @pytest.mark.asyncio
    async def test_save_memory(self, store):
        """Test saving a memory."""
        memory_id = await store.save_memory(
            agent="CONNOR",
            memory_type="decision",
            content="Test decision",
            tags=["test"],
            session_id="test_session",
        )
        
        assert memory_id is not None
        assert memory_id.startswith("mem_")

    @pytest.mark.asyncio
    async def test_get_memory(self, store):
        """Test retrieving a memory by ID."""
        memory_id = await store.save_memory(
            agent="LUMINA",
            memory_type="plan",
            content="Test plan content",
        )
        
        memory = await store.get_memory(memory_id)
        
        assert memory is not None
        assert memory["id"] == memory_id
        assert memory["agent"] == "LUMINA"
        assert memory["content"] == "Test plan content"

    @pytest.mark.asyncio
    async def test_get_nonexistent_memory(self, store):
        """Test retrieving a non-existent memory."""
        memory = await store.get_memory("nonexistent_id")
        assert memory is None

    @pytest.mark.asyncio
    async def test_search_by_agent(self, store):
        """Test searching memories by agent."""
        await store.save_memory(agent="CONNOR", memory_type="decision", content="Connor's decision")
        await store.save_memory(agent="LUMINA", memory_type="plan", content="Lumina's plan")
        await store.save_memory(agent="CONNOR", memory_type="result", content="Connor's result")
        
        results = await store.search_memory(agent="CONNOR")
        
        assert len(results) == 2
        assert all(r["agent"] == "CONNOR" for r in results)

    @pytest.mark.asyncio
    async def test_search_by_query(self, store):
        """Test searching memories by text query."""
        await store.save_memory(agent="ORACLE", memory_type="research", content="Climate change research findings")
        await store.save_memory(agent="ORACLE", memory_type="research", content="Brand strategy analysis")
        
        results = await store.search_memory(query="climate")
        
        assert len(results) == 1
        assert "climate" in results[0]["content"].lower()

    @pytest.mark.asyncio
    async def test_search_by_tags(self, store):
        """Test searching memories by tags."""
        await store.save_memory(agent="AEGIS", memory_type="safety_review", content="Review 1", tags=["safety", "high-risk"])
        await store.save_memory(agent="AEGIS", memory_type="safety_review", content="Review 2", tags=["safety", "low-risk"])
        await store.save_memory(agent="CONNOR", memory_type="decision", content="Decision", tags=["architecture"])
        
        results = await store.search_memory(tags=["safety"])
        
        assert len(results) == 2
        assert all("safety" in r["tags"] for r in results)

    @pytest.mark.asyncio
    async def test_search_by_type(self, store):
        """Test searching memories by type."""
        await store.save_memory(agent="SAM", memory_type="design", content="UI design")
        await store.save_memory(agent="SAM", memory_type="artifact", content="Component code")
        
        results = await store.search_memory(memory_type="design")
        
        assert len(results) == 1
        assert results[0]["memory_type"] == "design"

    @pytest.mark.asyncio
    async def test_search_with_limit(self, store):
        """Test search result limiting."""
        for i in range(10):
            await store.save_memory(agent="EIVOR", memory_type="reflection", content=f"Reflection {i}")
        
        results = await store.search_memory(agent="EIVOR", limit=5)
        
        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_get_session_history(self, store):
        """Test getting session history."""
        session_id = "test_session_123"
        
        await store.save_memory(agent="CONNOR", memory_type="decision", content="Step 1", session_id=session_id)
        await store.save_memory(agent="LUMINA", memory_type="plan", content="Step 2", session_id=session_id)
        await store.save_memory(agent="AEGIS", memory_type="safety_review", content="Step 3", session_id=session_id)
        await store.save_memory(agent="CONNOR", memory_type="result", content="Other session", session_id="other_session")
        
        history = await store.get_session_history(session_id)
        
        assert len(history) == 3

    @pytest.mark.asyncio
    async def test_delete_memory(self, store):
        """Test deleting a memory."""
        memory_id = await store.save_memory(agent="CONNOR", memory_type="decision", content="To be deleted")
        
        # Verify it exists
        memory = await store.get_memory(memory_id)
        assert memory is not None
        
        # Delete it
        success = await store.delete_memory(memory_id)
        assert success is True
        
        # Verify it's gone
        memory = await store.get_memory(memory_id)
        assert memory is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_memory(self, store):
        """Test deleting a non-existent memory."""
        success = await store.delete_memory("nonexistent_id")
        assert success is False

    def test_get_stats(self, store):
        """Test getting memory store statistics."""
        stats = store.get_stats()
        
        assert "total_memories" in stats
        assert "total_sessions" in stats
        assert "memories_by_agent" in stats
        assert "memories_by_type" in stats

    @pytest.mark.asyncio
    async def test_clear(self, store):
        """Test clearing all memories."""
        await store.save_memory(agent="CONNOR", memory_type="decision", content="Test 1")
        await store.save_memory(agent="LUMINA", memory_type="plan", content="Test 2")
        
        stats = store.get_stats()
        assert stats["total_memories"] == 2
        
        store.clear()
        
        stats = store.get_stats()
        assert stats["total_memories"] == 0


class TestMemoryBackendFactory:
    """Tests for the memory backend factory."""

    def test_get_memory_backend_default(self):
        """Test getting default memory backend."""
        backend = get_memory_backend(MemoryBackendType.MEMORY)
        assert isinstance(backend, MemoryStore)

    def test_get_backend_info(self):
        """Test getting backend configuration info."""
        info = get_backend_info()
        
        assert "detected_backend" in info
        assert "supabase_configured" in info
        assert "supabase_package_available" in info

    def test_memory_backend_type_enum(self):
        """Test MemoryBackendType enum values."""
        assert MemoryBackendType.MEMORY.value == "memory"
        assert MemoryBackendType.SUPABASE.value == "supabase"


@requires_supabase
class TestSupabaseMemoryAdapter:
    """
    Tests for Supabase memory adapter.
    
    These tests are skipped if Supabase credentials are not configured.
    To run these tests, set the following environment variables:
    - SUPABASE_URL
    - SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY)
    """

    @pytest.fixture
    def adapter(self):
        """Create a SupabaseMemoryAdapter for testing."""
        from zora_core.memory import SupabaseMemoryAdapter
        adapter = SupabaseMemoryAdapter()
        yield adapter
        # Clean up test data
        adapter.clear()

    @pytest.mark.asyncio
    async def test_save_memory(self, adapter):
        """Test saving a memory to Supabase."""
        memory_id = await adapter.save_memory(
            agent="CONNOR",
            memory_type="decision",
            content="Test decision for Supabase",
            tags=["test", "supabase"],
            session_id="supabase_test_session",
        )
        
        assert memory_id is not None
        # Supabase returns UUIDs
        assert len(memory_id) == 36

    @pytest.mark.asyncio
    async def test_get_memory(self, adapter):
        """Test retrieving a memory from Supabase."""
        memory_id = await adapter.save_memory(
            agent="LUMINA",
            memory_type="plan",
            content="Test plan for Supabase",
        )
        
        memory = await adapter.get_memory(memory_id)
        
        assert memory is not None
        assert memory["id"] == memory_id
        assert memory["agent"] == "LUMINA"

    @pytest.mark.asyncio
    async def test_search_by_agent(self, adapter):
        """Test searching memories by agent in Supabase."""
        await adapter.save_memory(agent="ORACLE", memory_type="research", content="Oracle research 1")
        await adapter.save_memory(agent="ORACLE", memory_type="research", content="Oracle research 2")
        await adapter.save_memory(agent="SAM", memory_type="design", content="Sam design")
        
        results = await adapter.search_memory(agent="ORACLE")
        
        assert len(results) >= 2
        assert all(r["agent"] == "ORACLE" for r in results)

    @pytest.mark.asyncio
    async def test_search_by_query(self, adapter):
        """Test text search in Supabase."""
        await adapter.save_memory(agent="ORACLE", memory_type="research", content="Climate impact analysis")
        await adapter.save_memory(agent="ORACLE", memory_type="research", content="Brand positioning study")
        
        results = await adapter.search_memory(query="climate")
        
        assert len(results) >= 1
        assert any("climate" in r["content"].lower() for r in results)

    @pytest.mark.asyncio
    async def test_delete_memory(self, adapter):
        """Test deleting a memory from Supabase."""
        memory_id = await adapter.save_memory(
            agent="AEGIS",
            memory_type="safety_review",
            content="To be deleted from Supabase",
        )
        
        success = await adapter.delete_memory(memory_id)
        assert success is True
        
        memory = await adapter.get_memory(memory_id)
        assert memory is None

    def test_get_stats(self, adapter):
        """Test getting stats from Supabase adapter."""
        stats = adapter.get_stats()
        
        assert "backend" in stats
        assert stats["backend"] == "supabase"
