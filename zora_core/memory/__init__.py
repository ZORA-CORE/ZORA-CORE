"""
ZORA CORE Memory Layer

The memory layer provides long-term storage and retrieval capabilities
for the entire ZORA CORE system, managed by EIVOR.

Supports multiple backends:
- MemoryStore: In-memory storage (default, for testing/demos)
- SupabaseMemoryAdapter: Supabase/Postgres storage (for production)

Use get_memory_backend() to get the appropriate backend based on configuration.
"""

from .base import Memory, MemoryBackend, MemoryType
from .config import MemoryBackendType, get_memory_backend, get_backend_info
from .memory_store import MemoryStore

# Conditionally export SupabaseMemoryAdapter if available
try:
    from .supabase_adapter import SupabaseMemoryAdapter, is_supabase_configured
    __all__ = [
        "Memory",
        "MemoryBackend",
        "MemoryType",
        "MemoryStore",
        "SupabaseMemoryAdapter",
        "MemoryBackendType",
        "get_memory_backend",
        "get_backend_info",
        "is_supabase_configured",
    ]
except ImportError:
    __all__ = [
        "Memory",
        "MemoryBackend",
        "MemoryType",
        "MemoryStore",
        "MemoryBackendType",
        "get_memory_backend",
        "get_backend_info",
    ]
