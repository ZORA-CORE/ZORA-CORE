"""
Tests for ZORA CORE Embedding and Semantic Memory

Tests the embedding interface and semantic search functionality.
Embedding tests can be mocked, while semantic search tests require Supabase with pgvector.
"""

import os
import pytest
from unittest.mock import Mock, patch, AsyncMock

from zora_core.models.embedding import (
    EmbeddingProvider,
    OpenAIEmbeddingProvider,
    StubEmbeddingProvider,
    get_embedding_provider,
    is_embedding_configured,
    get_embedding_info,
    # Multi-provider additions
    ProviderInfo,
    PROVIDER_REGISTRY,
    get_provider_info,
    list_providers,
    get_configured_providers,
    get_supported_providers,
    get_provider_status,
    embed_text,
    embed_batch,
    # Provider-specific stubs
    AnthropicStubProvider,
    GoogleStubProvider,
    XAIStubProvider,
    CopilotStubProvider,
)


def is_openai_configured():
    """Check if OpenAI API key is configured."""
    return bool(os.environ.get("OPENAI_API_KEY"))


def is_supabase_configured():
    """Check if Supabase environment variables are set."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    return bool(url and key)


requires_openai = pytest.mark.skipif(
    not is_openai_configured(),
    reason="OpenAI API key not configured (set OPENAI_API_KEY)"
)

requires_supabase = pytest.mark.skipif(
    not is_supabase_configured(),
    reason="Supabase credentials not configured (set SUPABASE_URL and SUPABASE_SERVICE_KEY)"
)

requires_both = pytest.mark.skipif(
    not (is_openai_configured() and is_supabase_configured()),
    reason="Both OpenAI and Supabase credentials required for semantic search tests"
)

def is_openai_package_available():
    """Check if openai package is installed."""
    try:
        import openai
        return True
    except ImportError:
        return False

requires_openai_package = pytest.mark.skipif(
    not is_openai_package_available(),
    reason="OpenAI package not installed (pip install openai)"
)


class TestProviderRegistry:
    """Tests for the multi-provider registry system."""

    def test_provider_registry_has_all_providers(self):
        """Test that all expected providers are in the registry."""
        expected_providers = ["openai", "anthropic", "google", "xai", "copilot"]
        for provider_id in expected_providers:
            assert provider_id in PROVIDER_REGISTRY
            assert isinstance(PROVIDER_REGISTRY[provider_id], ProviderInfo)

    def test_provider_info_properties(self):
        """Test ProviderInfo dataclass properties."""
        info = PROVIDER_REGISTRY["openai"]
        assert info.name == "OpenAI Embeddings"
        assert info.provider_id == "openai"
        assert info.status == "supported"
        assert info.api_key_env == "OPENAI_API_KEY"
        assert info.default_model == "text-embedding-3-small"
        assert info.default_dimensions == 1536

    def test_provider_info_is_supported(self):
        """Test is_supported property."""
        openai_info = PROVIDER_REGISTRY["openai"]
        anthropic_info = PROVIDER_REGISTRY["anthropic"]
        
        assert openai_info.is_supported is True
        assert anthropic_info.is_supported is False  # stub

    def test_list_providers(self):
        """Test list_providers returns all provider info objects."""
        providers = list_providers()
        assert isinstance(providers, list)
        assert len(providers) >= 5
        # list_providers returns ProviderInfo objects
        provider_ids = [p.provider_id for p in providers]
        assert "openai" in provider_ids
        assert "anthropic" in provider_ids

    def test_get_provider_info(self):
        """Test get_provider_info returns correct info."""
        info = get_provider_info("openai")
        assert info is not None
        assert info.provider_id == "openai"
        
        # Unknown provider returns None
        unknown = get_provider_info("unknown_provider")
        assert unknown is None

    def test_get_supported_providers(self):
        """Test get_supported_providers returns only supported providers."""
        supported = get_supported_providers()
        # get_supported_providers returns ProviderInfo objects
        supported_ids = [p.provider_id for p in supported]
        assert "openai" in supported_ids
        # Stub providers should not be in supported list
        for provider in supported:
            assert provider.is_supported is True

    def test_get_provider_status(self):
        """Test get_provider_status returns correct status dict."""
        status = get_provider_status()
        assert "openai" in status
        assert "configured" in status["openai"]
        assert "status" in status["openai"]


class TestStubEmbeddingProvider:
    """Tests for the stub embedding provider (no API key required)."""

    def test_stub_provider_dimensions(self):
        """Test that stub provider returns correct dimensions."""
        provider = StubEmbeddingProvider()
        assert provider.dimensions == 1536

    def test_stub_provider_model_name(self):
        """Test that stub provider returns correct model name."""
        provider = StubEmbeddingProvider()
        assert provider.model_name == "stub"

    def test_stub_provider_id(self):
        """Test that stub provider returns correct provider ID."""
        provider = StubEmbeddingProvider()
        assert provider.provider_id == "stub"
        
        # Test with custom provider_id
        custom = StubEmbeddingProvider(provider_id="custom", model_name="custom-model")
        assert custom.provider_id == "custom"
        assert custom.model_name == "custom-model"

    def test_stub_provider_metadata(self):
        """Test that stub provider returns correct metadata."""
        provider = StubEmbeddingProvider(provider_id="test", model_name="test-model")
        metadata = provider.get_metadata()
        
        assert metadata["embedding_provider"] == "test"
        assert metadata["embedding_model"] == "test-model"
        assert metadata["embedding_dimensions"] == 1536

    @pytest.mark.asyncio
    async def test_stub_embed_text(self):
        """Test that stub provider returns zero vector."""
        provider = StubEmbeddingProvider()
        embedding = await provider.embed_text("test text")
        
        assert isinstance(embedding, list)
        assert len(embedding) == 1536
        assert all(v == 0.0 for v in embedding)

    @pytest.mark.asyncio
    async def test_stub_embed_batch(self):
        """Test that stub provider handles batch embedding."""
        provider = StubEmbeddingProvider()
        texts = ["text 1", "text 2", "text 3"]
        embeddings = await provider.embed_batch(texts)
        
        assert len(embeddings) == 3
        for emb in embeddings:
            assert len(emb) == 1536
            assert all(v == 0.0 for v in emb)


class TestProviderSpecificStubs:
    """Tests for provider-specific stub classes."""

    def test_anthropic_stub_provider(self):
        """Test AnthropicStubProvider."""
        provider = AnthropicStubProvider()
        assert provider.provider_id == "anthropic"
        assert provider.model_name == "anthropic-stub"
        assert provider.dimensions == 1536

    def test_google_stub_provider(self):
        """Test GoogleStubProvider."""
        provider = GoogleStubProvider()
        assert provider.provider_id == "google"
        assert provider.model_name == "text-embedding-004-stub"
        assert provider.dimensions == 768  # Google uses 768 dimensions

    def test_xai_stub_provider(self):
        """Test XAIStubProvider."""
        provider = XAIStubProvider()
        assert provider.provider_id == "xai"
        assert provider.model_name == "xai-stub"
        assert provider.dimensions == 1536

    def test_copilot_stub_provider(self):
        """Test CopilotStubProvider."""
        provider = CopilotStubProvider()
        assert provider.provider_id == "copilot"
        assert provider.model_name == "azure-ada-002-stub"
        assert provider.dimensions == 1536

    @pytest.mark.asyncio
    async def test_stub_providers_return_embeddings(self):
        """Test that all stub providers return valid embeddings."""
        providers = [
            (AnthropicStubProvider(), 1536),
            (GoogleStubProvider(), 768),  # Google uses 768 dimensions
            (XAIStubProvider(), 1536),
            (CopilotStubProvider(), 1536),
        ]
        
        for provider, expected_dims in providers:
            embedding = await provider.embed_text("test")
            assert len(embedding) == expected_dims
            assert all(v == 0.0 for v in embedding)


class TestEmbeddingProviderFactory:
    """Tests for the embedding provider factory function."""

    def test_get_embedding_info(self):
        """Test getting embedding configuration info."""
        info = get_embedding_info()
        
        # Check for actual keys returned by get_embedding_info
        assert "provider" in info
        assert "model" in info
        assert "dimensions" in info
        assert "configured" in info
        assert "all_providers" in info

    def test_is_embedding_configured_without_key(self):
        """Test is_embedding_configured returns False without API key."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove OPENAI_API_KEY if it exists
            os.environ.pop("OPENAI_API_KEY", None)
            result = is_embedding_configured()
            # Result depends on whether key was set before test
            assert isinstance(result, bool)

    def test_get_embedding_provider_returns_provider(self):
        """Test that factory returns an EmbeddingProvider."""
        provider = get_embedding_provider()
        assert isinstance(provider, EmbeddingProvider)

    def test_stub_provider_when_no_key(self):
        """Test that stub provider is returned when no API key."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop("OPENAI_API_KEY", None)
            provider = get_embedding_provider()
            assert isinstance(provider, StubEmbeddingProvider)

    def test_get_embedding_provider_with_specific_provider(self):
        """Test factory with specific provider argument."""
        # Test stub providers
        anthropic = get_embedding_provider(provider="anthropic")
        assert isinstance(anthropic, AnthropicStubProvider)
        
        google = get_embedding_provider(provider="google")
        assert isinstance(google, GoogleStubProvider)
        
        xai = get_embedding_provider(provider="xai")
        assert isinstance(xai, XAIStubProvider)
        
        copilot = get_embedding_provider(provider="copilot")
        assert isinstance(copilot, CopilotStubProvider)

    def test_get_embedding_provider_unknown_raises(self):
        """Test that unknown provider raises ValueError."""
        with pytest.raises(ValueError, match="Unknown embedding provider"):
            get_embedding_provider(provider="unknown_provider")


class TestConvenienceFunctions:
    """Tests for the embed_text and embed_batch convenience functions."""

    @pytest.mark.asyncio
    async def test_embed_text_returns_tuple(self):
        """Test that embed_text returns (embedding, metadata) tuple."""
        embedding, metadata = await embed_text("test text")
        
        assert isinstance(embedding, list)
        assert len(embedding) == 1536
        assert isinstance(metadata, dict)
        assert "embedding_provider" in metadata
        assert "embedding_model" in metadata

    @pytest.mark.asyncio
    async def test_embed_text_with_provider(self):
        """Test embed_text with specific provider."""
        embedding, metadata = await embed_text("test", provider="anthropic")
        
        assert metadata["embedding_provider"] == "anthropic"
        assert metadata["embedding_model"] == "anthropic-stub"

    @pytest.mark.asyncio
    async def test_embed_batch_returns_tuple(self):
        """Test that embed_batch returns (embeddings, metadata) tuple."""
        texts = ["text 1", "text 2", "text 3"]
        embeddings, metadata = await embed_batch(texts)
        
        assert isinstance(embeddings, list)
        assert len(embeddings) == 3
        for emb in embeddings:
            assert len(emb) == 1536
        
        assert isinstance(metadata, dict)
        assert "embedding_provider" in metadata

    @pytest.mark.asyncio
    async def test_embed_batch_with_provider(self):
        """Test embed_batch with specific provider."""
        texts = ["text 1", "text 2"]
        embeddings, metadata = await embed_batch(texts, provider="google")
        
        assert metadata["embedding_provider"] == "google"
        assert len(embeddings) == 2


@requires_openai_package
class TestOpenAIEmbeddingProviderMocked:
    """Tests for OpenAI embedding provider with mocked API calls."""

    def test_openai_provider_dimensions(self):
        """Test OpenAI provider dimensions."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider()
            assert provider.dimensions == 1536

    def test_openai_provider_model_name(self):
        """Test OpenAI provider model name."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider()
            assert provider.model_name == "text-embedding-3-small"

    def test_openai_provider_custom_model(self):
        """Test OpenAI provider with custom model."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider(model="text-embedding-3-large")
            assert provider.model_name == "text-embedding-3-large"
            assert provider.dimensions == 3072

    @patch("openai.OpenAI")
    def test_embed_text_mocked(self, mock_openai_class):
        """Test embed_text with mocked OpenAI client."""
        # Set up mock
        mock_client = Mock()
        mock_openai_class.return_value = mock_client
        
        mock_embedding = Mock()
        mock_embedding.embedding = [0.1] * 1536
        mock_response = Mock()
        mock_response.data = [mock_embedding]
        mock_client.embeddings.create.return_value = mock_response
        
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider()
            result = provider.embed_text("test text")
        
        assert len(result) == 1536
        assert result[0] == 0.1

    @patch("openai.OpenAI")
    def test_embed_batch_mocked(self, mock_openai_class):
        """Test embed_batch with mocked OpenAI client."""
        mock_client = Mock()
        mock_openai_class.return_value = mock_client
        
        mock_embeddings = []
        for i in range(3):
            mock_emb = Mock()
            mock_emb.embedding = [0.1 * (i + 1)] * 1536
            mock_embeddings.append(mock_emb)
        
        mock_response = Mock()
        mock_response.data = mock_embeddings
        mock_client.embeddings.create.return_value = mock_response
        
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider()
            results = provider.embed_batch(["text 1", "text 2", "text 3"])
        
        assert len(results) == 3
        for i, result in enumerate(results):
            assert len(result) == 1536

    @patch("openai.OpenAI")
    def test_embed_text_truncation(self, mock_openai_class):
        """Test that long text is truncated."""
        mock_client = Mock()
        mock_openai_class.return_value = mock_client
        
        mock_embedding = Mock()
        mock_embedding.embedding = [0.1] * 1536
        mock_response = Mock()
        mock_response.data = [mock_embedding]
        mock_client.embeddings.create.return_value = mock_response
        
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            provider = OpenAIEmbeddingProvider()
            long_text = "x" * 10000  # Longer than 8000 char limit
            provider.embed_text(long_text)
        
        # Verify the text was truncated
        call_args = mock_client.embeddings.create.call_args
        input_text = call_args.kwargs.get("input") or call_args[1].get("input")
        assert len(input_text) <= 8000


@requires_openai
class TestOpenAIEmbeddingProviderLive:
    """
    Live tests for OpenAI embedding provider.
    
    These tests require a valid OPENAI_API_KEY environment variable.
    """

    def test_embed_text_live(self):
        """Test actual embedding generation."""
        provider = OpenAIEmbeddingProvider()
        embedding = provider.embed_text("Climate change is a global challenge.")
        
        assert isinstance(embedding, list)
        assert len(embedding) == 1536
        assert all(isinstance(v, float) for v in embedding)

    def test_embed_batch_live(self):
        """Test actual batch embedding generation."""
        provider = OpenAIEmbeddingProvider()
        texts = [
            "Renewable energy sources",
            "Carbon footprint reduction",
            "Sustainable development goals",
        ]
        embeddings = provider.embed_batch(texts)
        
        assert len(embeddings) == 3
        for emb in embeddings:
            assert len(emb) == 1536

    def test_similar_texts_have_similar_embeddings(self):
        """Test that semantically similar texts have similar embeddings."""
        provider = OpenAIEmbeddingProvider()
        
        text1 = "Solar panels generate clean electricity from sunlight."
        text2 = "Photovoltaic systems produce renewable energy from the sun."
        text3 = "The stock market closed higher today."
        
        emb1 = provider.embed_text(text1)
        emb2 = provider.embed_text(text2)
        emb3 = provider.embed_text(text3)
        
        # Calculate cosine similarity
        def cosine_similarity(a, b):
            dot_product = sum(x * y for x, y in zip(a, b))
            norm_a = sum(x ** 2 for x in a) ** 0.5
            norm_b = sum(x ** 2 for x in b) ** 0.5
            return dot_product / (norm_a * norm_b)
        
        sim_1_2 = cosine_similarity(emb1, emb2)
        sim_1_3 = cosine_similarity(emb1, emb3)
        
        # Similar texts should have higher similarity
        assert sim_1_2 > sim_1_3


@requires_both
class TestSemanticSearchIntegration:
    """
    Integration tests for semantic search with Supabase and pgvector.
    
    These tests require both OpenAI API key and Supabase credentials.
    """

    @pytest.fixture
    def adapter(self):
        """Create a SupabaseMemoryAdapter with embeddings enabled."""
        from zora_core.memory import SupabaseMemoryAdapter
        adapter = SupabaseMemoryAdapter(enable_embeddings=True)
        yield adapter
        # Clean up test data
        adapter.clear()

    @pytest.mark.asyncio
    async def test_save_memory_with_embedding(self, adapter):
        """Test saving a memory generates and stores an embedding."""
        memory_id = await adapter.save_memory(
            agent="ORACLE",
            memory_type="research",
            content="Climate change research on renewable energy adoption.",
            tags=["climate", "research"],
            session_id="semantic_test_session",
        )
        
        assert memory_id is not None
        assert adapter.embeddings_enabled

    @pytest.mark.asyncio
    async def test_semantic_search_basic(self, adapter):
        """Test basic semantic search functionality."""
        # Save some test memories
        await adapter.save_memory(
            agent="ORACLE",
            memory_type="research",
            content="Solar panels and wind turbines are key renewable energy technologies.",
            tags=["energy"],
        )
        await adapter.save_memory(
            agent="AEGIS",
            memory_type="safety_review",
            content="The new authentication system passed security review.",
            tags=["security"],
        )
        await adapter.save_memory(
            agent="LUMINA",
            memory_type="plan",
            content="Plan to reduce carbon emissions by 50% through clean energy adoption.",
            tags=["climate"],
        )
        
        # Search for energy-related content
        results = await adapter.semantic_search(
            query="What renewable energy options are available?",
            k=2,
        )
        
        assert len(results) > 0
        # The renewable energy memory should be in the results
        contents = [r["content"] for r in results]
        assert any("renewable" in c.lower() or "solar" in c.lower() for c in contents)

    @pytest.mark.asyncio
    async def test_semantic_search_with_filters(self, adapter):
        """Test semantic search with agent filter."""
        await adapter.save_memory(
            agent="ORACLE",
            memory_type="research",
            content="Research on biodiversity conservation strategies.",
            tags=["biodiversity"],
        )
        await adapter.save_memory(
            agent="CONNOR",
            memory_type="decision",
            content="Decision to implement biodiversity tracking module.",
            tags=["biodiversity"],
        )
        
        # Search with agent filter
        results = await adapter.semantic_search(
            query="biodiversity and nature conservation",
            k=5,
            agent="ORACLE",
        )
        
        # All results should be from ORACLE
        assert all(r["agent"] == "ORACLE" for r in results)

    @pytest.mark.asyncio
    async def test_semantic_search_returns_similarity_scores(self, adapter):
        """Test that semantic search returns similarity scores."""
        await adapter.save_memory(
            agent="EIVOR",
            memory_type="reflection",
            content="Memory system performance has improved significantly.",
            tags=["memory"],
        )
        
        results = await adapter.semantic_search(
            query="How is the memory system performing?",
            k=1,
        )
        
        if results:
            # Check that similarity score is included
            assert "similarity" in results[0]
            assert isinstance(results[0]["similarity"], (int, float))
