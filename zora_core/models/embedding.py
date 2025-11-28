"""
ZORA CORE Embedding Provider

Provides text embedding capabilities for semantic memory search.
"""

import logging
import os
from abc import ABC, abstractmethod
from typing import List, Optional

logger = logging.getLogger("zora.models.embedding")


class EmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers.
    
    All embedding providers must implement this interface.
    """
    
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
    
    Used when no embedding API key is configured, allowing the system
    to function without semantic search capabilities.
    """
    
    def __init__(self, dimensions: int = 1536):
        """
        Initialize the stub provider.
        
        Args:
            dimensions: Dimensionality of zero vectors to return
        """
        self._dimensions = dimensions
        logger.warning(
            "StubEmbeddingProvider initialized. "
            "Semantic search will not work. "
            "Set OPENAI_API_KEY to enable real embeddings."
        )
    
    @property
    def dimensions(self) -> int:
        return self._dimensions
    
    @property
    def model_name(self) -> str:
        return "stub"
    
    async def embed_text(self, text: str) -> List[float]:
        """Return a zero vector."""
        return [0.0] * self._dimensions
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Return zero vectors for all texts."""
        return [[0.0] * self._dimensions for _ in texts]


def get_embedding_provider(
    provider_type: Optional[str] = None,
    **kwargs
) -> EmbeddingProvider:
    """
    Factory function to create an embedding provider.
    
    Args:
        provider_type: Type of provider ("openai" or "stub"). 
                      If None, auto-detects based on available API keys.
        **kwargs: Additional arguments passed to the provider constructor
        
    Returns:
        An EmbeddingProvider instance
    """
    # Auto-detect if not specified
    if provider_type is None:
        if os.environ.get("OPENAI_API_KEY"):
            provider_type = "openai"
        else:
            provider_type = "stub"
    
    provider_type = provider_type.lower()
    
    if provider_type == "openai":
        return OpenAIEmbeddingProvider(**kwargs)
    elif provider_type == "stub":
        return StubEmbeddingProvider(**kwargs)
    else:
        raise ValueError(f"Unknown embedding provider type: {provider_type}")


def is_embedding_configured() -> bool:
    """Check if embedding is properly configured."""
    return bool(os.environ.get("OPENAI_API_KEY"))


def get_embedding_info() -> dict:
    """Get information about the current embedding configuration."""
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
        "provider": "openai" if has_openai_key else "stub",
        "model": model if has_openai_key else "stub",
        "dimensions": OpenAIEmbeddingProvider.MODEL_DIMENSIONS.get(model, 1536),
        "openai_package_available": openai_available,
    }
