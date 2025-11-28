"""
ZORA CORE Multi-Provider Embedding System

Provides text embedding capabilities for semantic memory search with support
for multiple AI providers. Currently supports OpenAI with stubs for other providers.
"""

import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("zora.models.embedding")


# =============================================================================
# Provider Information
# =============================================================================

@dataclass
class ProviderInfo:
    """Information about an embedding provider."""
    name: str
    provider_id: str
    status: str  # "supported", "stub", "planned"
    api_key_env: str
    default_model: Optional[str] = None
    default_dimensions: int = 1536
    notes: Optional[str] = None
    
    @property
    def is_configured(self) -> bool:
        """Check if the provider's API key is configured."""
        return bool(os.environ.get(self.api_key_env))
    
    @property
    def is_supported(self) -> bool:
        """Check if the provider is fully supported (not a stub)."""
        return self.status == "supported"


# =============================================================================
# Provider Registry
# =============================================================================

# Registry of all known embedding providers
PROVIDER_REGISTRY: Dict[str, ProviderInfo] = {
    "openai": ProviderInfo(
        name="OpenAI Embeddings",
        provider_id="openai",
        status="supported",
        api_key_env="OPENAI_API_KEY",
        default_model="text-embedding-3-small",
        default_dimensions=1536,
        notes="Production-ready embedding provider.",
    ),
    "anthropic": ProviderInfo(
        name="Anthropic Embeddings",
        provider_id="anthropic",
        status="stub",
        api_key_env="ANTHROPIC_API_KEY",
        default_model=None,
        default_dimensions=1536,
        notes="Anthropic does not currently offer a public embedding API.",
    ),
    "google": ProviderInfo(
        name="Google Embeddings",
        provider_id="google",
        status="stub",
        api_key_env="GEMINI_API_KEY",
        default_model="text-embedding-004",
        default_dimensions=768,
        notes="Google offers text-embedding-004 via Vertex AI. Integration planned.",
    ),
    "xai": ProviderInfo(
        name="xAI Embeddings",
        provider_id="xai",
        status="stub",
        api_key_env="XAI_API_KEY",
        default_model=None,
        default_dimensions=1536,
        notes="xAI does not currently offer a public embedding API.",
    ),
    "copilot": ProviderInfo(
        name="Copilot Embeddings",
        provider_id="copilot",
        status="stub",
        api_key_env="AZURE_OPENAI_API_KEY",
        default_model="text-embedding-ada-002",
        default_dimensions=1536,
        notes="Uses Azure OpenAI embeddings if configured.",
    ),
}


def get_provider_info(provider_id: str) -> Optional[ProviderInfo]:
    """Get information about a specific provider."""
    return PROVIDER_REGISTRY.get(provider_id.lower())


def list_providers() -> List[ProviderInfo]:
    """List all registered embedding providers."""
    return list(PROVIDER_REGISTRY.values())


def get_configured_providers() -> List[ProviderInfo]:
    """List providers that have API keys configured."""
    return [p for p in PROVIDER_REGISTRY.values() if p.is_configured]


def get_supported_providers() -> List[ProviderInfo]:
    """List providers that are fully supported (not stubs)."""
    return [p for p in PROVIDER_REGISTRY.values() if p.is_supported]


# =============================================================================
# Abstract Base Class
# =============================================================================


class EmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers.
    
    All embedding providers must implement this interface.
    """
    
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Return the provider identifier (e.g., 'openai', 'anthropic')."""
        pass
    
    @property
    @abstractmethod
    def dimensions(self) -> int:
        """Return the dimensionality of embeddings produced by this provider."""
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the name of the embedding model."""
        pass
    
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """
        Generate an embedding for a single text.
        
        Args:
            text: The text to embed
            
        Returns:
            A list of floats representing the embedding vector
        """
        pass
    
    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        pass
    
    def get_metadata(self) -> Dict[str, Any]:
        """Return metadata about this provider for storage."""
        return {
            "embedding_provider": self.provider_id,
            "embedding_model": self.model_name,
            "embedding_dimensions": self.dimensions,
        }


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """
    OpenAI-based embedding provider using text-embedding-3-small.
    
    Configuration via environment variables:
    - OPENAI_API_KEY: Required API key for OpenAI
    - ZORA_EMBEDDING_MODEL: Optional model override (default: text-embedding-3-small)
    """
    
    DEFAULT_MODEL = "text-embedding-3-small"
    MODEL_DIMENSIONS = {
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        "text-embedding-ada-002": 1536,
    }
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_text_length: int = 8000,
    ):
        """
        Initialize the OpenAI embedding provider.
        
        Args:
            api_key: OpenAI API key (or set OPENAI_API_KEY env var)
            model: Model to use (default: text-embedding-3-small)
            max_text_length: Maximum text length before truncation (default: 8000)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "OpenAI API key is required. "
                "Set OPENAI_API_KEY environment variable or pass api_key parameter."
            )
        
        self._model = model or os.environ.get("ZORA_EMBEDDING_MODEL", self.DEFAULT_MODEL)
        self._dimensions = self.MODEL_DIMENSIONS.get(self._model, 1536)
        self.max_text_length = max_text_length
        
        # Import openai here to make it an optional dependency
        try:
            import openai
            self.client = openai.AsyncOpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. "
                "Install with: pip install openai"
            )
        
        logger.info(f"OpenAIEmbeddingProvider initialized with model {self._model}")
    
    @property
    def provider_id(self) -> str:
        return "openai"
    
    @property
    def dimensions(self) -> int:
        return self._dimensions
    
    @property
    def model_name(self) -> str:
        return self._model
    
    def _truncate_text(self, text: str) -> str:
        """Truncate text to max length if needed."""
        if len(text) > self.max_text_length:
            logger.warning(
                f"Text truncated from {len(text)} to {self.max_text_length} characters"
            )
            return text[:self.max_text_length]
        return text
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate an embedding for a single text using OpenAI."""
        text = self._truncate_text(text)
        
        try:
            response = await self.client.embeddings.create(
                model=self._model,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts using OpenAI."""
        if not texts:
            return []
        
        # Truncate all texts
        texts = [self._truncate_text(t) for t in texts]
        
        try:
            response = await self.client.embeddings.create(
                model=self._model,
                input=texts,
            )
            # Sort by index to ensure correct order
            sorted_data = sorted(response.data, key=lambda x: x.index)
            return [item.embedding for item in sorted_data]
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise


class StubEmbeddingProvider(EmbeddingProvider):
    """
    Stub embedding provider that returns zero vectors.
    
    Used when no embedding API key is configured or when a provider
    doesn't support embeddings, allowing the system to function
    without semantic search capabilities.
    """
    
    def __init__(
        self,
        provider_id: str = "stub",
        model_name: str = "stub",
        dimensions: int = 1536,
    ):
        """
        Initialize the stub provider.
        
        Args:
            provider_id: Identifier for this stub provider
            model_name: Name to report for this stub
            dimensions: Dimensionality of zero vectors to return
        """
        self._provider_id = provider_id
        self._model_name = model_name
        self._dimensions = dimensions
        logger.warning(
            f"StubEmbeddingProvider initialized for '{provider_id}'. "
            "Semantic search will not work with this provider."
        )
    
    @property
    def provider_id(self) -> str:
        return self._provider_id
    
    @property
    def dimensions(self) -> int:
        return self._dimensions
    
    @property
    def model_name(self) -> str:
        return self._model_name
    
    async def embed_text(self, text: str) -> List[float]:
        """Return a zero vector."""
        return [0.0] * self._dimensions
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Return zero vectors for all texts."""
        return [[0.0] * self._dimensions for _ in texts]


# =============================================================================
# Provider-Specific Stub Classes
# =============================================================================

class AnthropicStubProvider(StubEmbeddingProvider):
    """Stub provider for Anthropic (no embedding API available)."""
    
    def __init__(self):
        super().__init__(
            provider_id="anthropic",
            model_name="anthropic-stub",
            dimensions=1536,
        )
        logger.warning(
            "Anthropic does not offer a public embedding API. "
            "Using stub provider."
        )


class GoogleStubProvider(StubEmbeddingProvider):
    """Stub provider for Google (embedding API available but not integrated)."""
    
    def __init__(self):
        super().__init__(
            provider_id="google",
            model_name="text-embedding-004-stub",
            dimensions=768,
        )
        logger.warning(
            "Google embedding integration not yet implemented. "
            "Using stub provider."
        )


class XAIStubProvider(StubEmbeddingProvider):
    """Stub provider for xAI (no embedding API available)."""
    
    def __init__(self):
        super().__init__(
            provider_id="xai",
            model_name="xai-stub",
            dimensions=1536,
        )
        logger.warning(
            "xAI does not offer a public embedding API. "
            "Using stub provider."
        )


class CopilotStubProvider(StubEmbeddingProvider):
    """Stub provider for Copilot/Azure (embedding API available but not integrated)."""
    
    def __init__(self):
        super().__init__(
            provider_id="copilot",
            model_name="azure-ada-002-stub",
            dimensions=1536,
        )
        logger.warning(
            "Copilot/Azure OpenAI embedding integration not yet implemented. "
            "Using stub provider."
        )


# =============================================================================
# Provider Factory
# =============================================================================

def _auto_detect_provider() -> str:
    """Auto-detect the best available provider based on configured API keys."""
    # Check environment variable override
    env_provider = os.environ.get("ZORA_EMBEDDING_PROVIDER")
    if env_provider:
        return env_provider
    
    # Priority order: OpenAI (only fully supported provider)
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    
    # No supported provider configured
    logger.warning(
        "No embedding provider configured. "
        "Set OPENAI_API_KEY for semantic search capabilities."
    )
    return "stub"


def get_embedding_provider(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    **kwargs
) -> EmbeddingProvider:
    """
    Factory function to create an embedding provider.
    
    Args:
        provider: Provider to use ("openai", "anthropic", "google", "xai", "copilot", "stub").
                  If None, auto-detects based on available API keys.
        model: Specific model to use (provider-dependent)
        **kwargs: Additional arguments passed to the provider constructor
        
    Returns:
        An EmbeddingProvider instance
        
    Raises:
        ValueError: If the provider is unknown
    """
    # Auto-detect provider if not specified
    if provider is None:
        provider = _auto_detect_provider()
    
    provider = provider.lower()
    
    # Create the appropriate provider
    if provider == "openai":
        if not os.environ.get("OPENAI_API_KEY"):
            logger.warning("OpenAI API key not configured, falling back to stub")
            return StubEmbeddingProvider(provider_id="openai", model_name="openai-stub")
        return OpenAIEmbeddingProvider(model=model, **kwargs)
    
    elif provider == "anthropic":
        return AnthropicStubProvider()
    
    elif provider == "google":
        return GoogleStubProvider()
    
    elif provider == "xai":
        return XAIStubProvider()
    
    elif provider == "copilot":
        return CopilotStubProvider()
    
    elif provider == "stub":
        return StubEmbeddingProvider(**kwargs)
    
    else:
        raise ValueError(f"Unknown embedding provider: {provider}")


# =============================================================================
# Multi-Provider Embedding Interface
# =============================================================================

async def embed_text(
    text: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> Tuple[List[float], Dict[str, Any]]:
    """
    Generate an embedding for text using the specified or default provider.
    
    This is the main entry point for embedding text in ZORA CORE.
    
    Args:
        text: The text to embed
        provider: Provider to use (default: auto-detect)
        model: Specific model to use (default: provider's default)
        
    Returns:
        Tuple of (embedding vector, metadata dict with provider/model info)
    """
    embedding_provider = get_embedding_provider(provider=provider, model=model)
    embedding = await embedding_provider.embed_text(text)
    metadata = embedding_provider.get_metadata()
    return embedding, metadata


async def embed_batch(
    texts: List[str],
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> Tuple[List[List[float]], Dict[str, Any]]:
    """
    Generate embeddings for multiple texts using the specified or default provider.
    
    Args:
        texts: List of texts to embed
        provider: Provider to use (default: auto-detect)
        model: Specific model to use (default: provider's default)
        
    Returns:
        Tuple of (list of embedding vectors, metadata dict with provider/model info)
    """
    embedding_provider = get_embedding_provider(provider=provider, model=model)
    embeddings = await embedding_provider.embed_batch(texts)
    metadata = embedding_provider.get_metadata()
    return embeddings, metadata


# =============================================================================
# Utility Functions
# =============================================================================

def is_embedding_configured() -> bool:
    """Check if any embedding provider is properly configured."""
    return bool(os.environ.get("OPENAI_API_KEY"))


def get_default_provider() -> str:
    """Get the default embedding provider."""
    return _auto_detect_provider()


def get_embedding_info() -> Dict[str, Any]:
    """Get information about the current embedding configuration."""
    provider_id = _auto_detect_provider()
    provider_info = get_provider_info(provider_id)
    
    has_openai_key = bool(os.environ.get("OPENAI_API_KEY"))
    model = os.environ.get("ZORA_EMBEDDING_MODEL", OpenAIEmbeddingProvider.DEFAULT_MODEL)
    
    openai_available = False
    try:
        import openai
        openai_available = True
    except ImportError:
        pass
    
    return {
        "configured": has_openai_key,
        "provider": provider_id,
        "provider_name": provider_info.name if provider_info else "Unknown",
        "provider_status": provider_info.status if provider_info else "unknown",
        "model": model if has_openai_key else "stub",
        "dimensions": OpenAIEmbeddingProvider.MODEL_DIMENSIONS.get(model, 1536),
        "openai_package_available": openai_available,
        "all_providers": [
            {
                "id": p.provider_id,
                "name": p.name,
                "status": p.status,
                "configured": p.is_configured,
            }
            for p in list_providers()
        ],
    }


def get_provider_status() -> Dict[str, Dict[str, Any]]:
    """Get status of all embedding providers."""
    return {
        p.provider_id: {
            "name": p.name,
            "status": p.status,
            "configured": p.is_configured,
            "api_key_env": p.api_key_env,
            "default_model": p.default_model,
            "notes": p.notes,
        }
        for p in list_providers()
    }
