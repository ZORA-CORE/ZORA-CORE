"""
ZORA CORE Memory Configuration

Provides configuration and factory functions for memory backends.
"""

import os
from enum import Enum
from typing import Optional

from .base import MemoryBackend


class MemoryBackendType(str, Enum):
    """Available memory backend types."""
    MEMORY = "memory"  # In-memory storage
    SUPABASE = "supabase"  # Supabase/Postgres storage


def get_memory_backend(
    backend_type: MemoryBackendType = None,
    supabase_url: str = None,
    supabase_key: str = None,
) -> MemoryBackend:
    """
    Factory function to create a memory backend.
    
    Args:
        backend_type: The type of backend to create. If None, will auto-detect
                     based on environment variables (uses Supabase if configured,
                     otherwise falls back to in-memory).
        supabase_url: Supabase project URL (optional, uses env var if not provided)
        supabase_key: Supabase API key (optional, uses env var if not provided)
        
    Returns:
        A MemoryBackend instance
        
    Raises:
        ValueError: If Supabase backend is requested but not configured
        ImportError: If Supabase backend is requested but supabase package not installed
    """
    # Auto-detect backend type if not specified
    if backend_type is None:
        backend_type = _detect_backend_type()
    
    # Handle string input
    if isinstance(backend_type, str):
        backend_type = MemoryBackendType(backend_type.lower())
    
    if backend_type == MemoryBackendType.MEMORY:
        from .memory_store import MemoryStore
        return MemoryStore()
    
    elif backend_type == MemoryBackendType.SUPABASE:
        from .supabase_adapter import SupabaseMemoryAdapter, is_supabase_configured
        
        # Check if Supabase is configured
        url = supabase_url or os.environ.get("SUPABASE_URL")
        key = supabase_key or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
        
        if not url or not key:
            raise ValueError(
                "Supabase backend requested but not configured. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables, "
                "or use --backend=memory for in-memory storage."
            )
        
        return SupabaseMemoryAdapter(url=url, key=key)
    
    else:
        raise ValueError(f"Unknown backend type: {backend_type}")


def _detect_backend_type() -> MemoryBackendType:
    """
    Auto-detect the best backend type based on environment.
    
    Returns Supabase if configured, otherwise falls back to in-memory.
    """
    # Check for Supabase configuration
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    
    if url and key:
        # Also check if supabase package is available
        try:
            from supabase import create_client
            return MemoryBackendType.SUPABASE
        except ImportError:
            pass
    
    return MemoryBackendType.MEMORY


def get_backend_info() -> dict:
    """
    Get information about the current backend configuration.
    
    Returns:
        Dictionary with backend configuration details
    """
    url = os.environ.get("SUPABASE_URL")
    has_service_key = bool(os.environ.get("SUPABASE_SERVICE_KEY"))
    has_anon_key = bool(os.environ.get("SUPABASE_ANON_KEY"))
    
    supabase_available = False
    try:
        from supabase import create_client
        supabase_available = True
    except ImportError:
        pass
    
    detected_backend = _detect_backend_type()
    
    return {
        "detected_backend": detected_backend.value,
        "supabase_configured": bool(url and (has_service_key or has_anon_key)),
        "supabase_url": url[:30] + "..." if url and len(url) > 30 else url,
        "has_service_key": has_service_key,
        "has_anon_key": has_anon_key,
        "supabase_package_available": supabase_available,
    }
