"""
ZORA CORE Model Layer

The model layer provides routing to external AI providers and models,
with support for fallbacks, rate limiting, and agent-specific preferences.
It also provides embedding capabilities for semantic memory search.
"""

from .model_router import ModelRouter, ModelConfig
from .embedding import (
    EmbeddingProvider,
    OpenAIEmbeddingProvider,
    StubEmbeddingProvider,
    get_embedding_provider,
    is_embedding_configured,
    get_embedding_info,
)

__all__ = [
    "ModelRouter",
    "ModelConfig",
    "EmbeddingProvider",
    "OpenAIEmbeddingProvider",
    "StubEmbeddingProvider",
    "get_embedding_provider",
    "is_embedding_configured",
    "get_embedding_info",
]
