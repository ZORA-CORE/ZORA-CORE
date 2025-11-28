# ZORA CORE Model Providers

This document describes the multi-provider architecture for ZORA CORE, including how to configure LLM and embedding providers.

## Overview

ZORA CORE supports multiple AI providers for both LLM (chat/completion) and embedding tasks. The architecture is designed to be:

- **Provider-agnostic**: Switch between providers via configuration
- **Extensible**: Easy to add new providers
- **Graceful**: Falls back gracefully when credentials are missing
- **Traceable**: Stores provider/model metadata with each memory event

## Supported Providers

### LLM Providers

| Provider | Status | API Key Env Var | Models |
|----------|--------|-----------------|--------|
| OpenAI | Supported | `OPENAI_API_KEY` | gpt-4-turbo, gpt-4o, gpt-4o-mini, o1-preview, o1-mini |
| Anthropic (Claude) | Supported | `ANTHROPIC_API_KEY` | claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet |
| Google (Gemini) | Supported | `GEMINI_API_KEY` | gemini-pro, gemini-pro-vision, gemini-1.5-pro, gemini-1.5-flash |
| xAI (Grok) | Supported | `XAI_API_KEY` | grok-beta, grok-vision-beta |
| GitHub Copilot | Supported | `COPILOT_API_KEY` | copilot-chat |

### Embedding Providers

| Provider | Status | API Key Env Var | Default Model | Dimensions |
|----------|--------|-----------------|---------------|------------|
| OpenAI | **Fully Supported** | `OPENAI_API_KEY` | text-embedding-3-small | 1536 |
| Anthropic | Stub | `ANTHROPIC_API_KEY` | N/A | N/A |
| Google | Stub | `GEMINI_API_KEY` | N/A | N/A |
| xAI | Stub | `XAI_API_KEY` | N/A | N/A |
| Copilot | Stub | `COPILOT_API_KEY` | N/A | N/A |

**Note**: Currently, only OpenAI provides production-ready embeddings. Other providers are stubbed and will return placeholder embeddings. This is because:
- Anthropic does not offer a public embedding API
- Google's embedding API has different dimensions and would require schema changes
- xAI does not currently offer embeddings
- Copilot is primarily for code completion, not embeddings

## Configuration

### Environment Variables

Set the following environment variables to enable each provider:

```bash
# OpenAI (required for embeddings)
export OPENAI_API_KEY="sk-proj-..."

# Anthropic (Claude)
export ANTHROPIC_API_KEY="sk-ant-..."

# Google (Gemini)
export GEMINI_API_KEY="AIza..."

# xAI (Grok)
export XAI_API_KEY="xai-..."

# GitHub Copilot (optional)
export COPILOT_API_KEY="..."
```

### Where to Set Environment Variables

| Component | Location | Notes |
|-----------|----------|-------|
| Python Backend/CLI | `.env` file or shell export | Use `python-dotenv` or export directly |
| Cloudflare Workers | `.dev.vars` (local) or `wrangler secret put` (production) | Never commit `.dev.vars` |
| Next.js Frontend | `.env.local` | Only for public keys; keep secrets server-side |

### Configuration File

Provider configuration is defined in `config/ai_providers.yaml`. This file specifies:

- Available providers and their API endpoints
- Available models for each provider
- Default routing for different task types
- Embedding provider defaults

Example configuration:

```yaml
# Default embedding settings
embeddings:
  default_provider: "openai"
  default_model: "text-embedding-3-small"

# Provider definitions
providers:
  openai:
    name: "OpenAI"
    enabled: true
    api_base: "https://api.openai.com/v1"
    api_key_env: "OPENAI_API_KEY"
    models:
      gpt-4-turbo:
        name: "GPT-4 Turbo"
        context_window: 128000
        # ...
```

## Usage

### CLI Tools

ZORA CORE provides CLI tools to test and verify provider configuration:

```bash
# List all providers and their status
python -m zora_core.models.cli list-providers

# Test chat/LLM with a specific provider
python -m zora_core.models.cli chat-demo --provider=openai --model=gpt-4-turbo
python -m zora_core.models.cli chat-demo --provider=anthropic --model=claude-3-opus

# Test embedding generation
python -m zora_core.models.cli embed-demo --provider=openai --text="Hello world"

# Show embedding system info
python -m zora_core.models.cli info
```

### Python API

#### Embedding Generation

```python
from zora_core.models.embedding import embed_text, get_embedding_provider

# Simple embedding (auto-detects provider)
embedding, metadata = await embed_text("Hello world")
print(f"Provider: {metadata['embedding_provider']}")
print(f"Model: {metadata['embedding_model']}")
print(f"Dimensions: {len(embedding)}")

# Specific provider
embedding, metadata = await embed_text(
    "Hello world",
    provider="openai",
    model="text-embedding-3-small"
)

# Using the provider directly
provider = get_embedding_provider(provider="openai")
embedding = await provider.embed_text("Hello world")
metadata = provider.get_metadata()
```

#### Model Router

```python
from zora_core.models.model_router import ModelRouter

router = ModelRouter()

# Get configured providers
providers = router.get_configured_providers()

# Get provider info
info = router.get_provider_info("openai")

# Generate embedding with metadata
embedding, metadata = await router.embed("Hello world")

# LLM call (placeholder in MVP)
response = await router.llm(
    task_type="code_generation",
    prompt="Write a Python function",
    agent="CONNOR"
)
```

### Memory with Provider Metadata

When saving memories, provider metadata is automatically tracked:

```python
from zora_core.memory.supabase_adapter import SupabaseMemoryAdapter

adapter = SupabaseMemoryAdapter()

# Save memory with LLM provider info
memory_id = await adapter.save_memory(
    agent="EIVOR",
    memory_type="decision",
    content="Decided to use renewable energy sources",
    llm_provider="openai",
    llm_model="gpt-4-turbo"
)

# Embedding provider/model is automatically tracked
# when embeddings are generated

# Search returns provider metadata
results = await adapter.semantic_search("renewable energy")
for result in results:
    print(f"LLM: {result['llm_provider']}/{result['llm_model']}")
    print(f"Embedding: {result['embedding_provider']}/{result['embedding_model']}")
```

## Provider Selection Logic

### Default Provider Selection

1. If a provider is explicitly specified, use it
2. Otherwise, check `ai_providers.yaml` for defaults
3. For embeddings, auto-detect based on available API keys (OpenAI preferred)
4. Fall back to stub provider if no credentials are available

### Graceful Degradation

When a provider is not configured:

- **LLM calls**: Return placeholder responses (MVP behavior)
- **Embedding calls**: Return stub embeddings (zeros or random values)
- **Memory storage**: Still works, but without semantic search capability

## Extending Providers

### Adding a New LLM Provider

1. Add provider configuration to `config/ai_providers.yaml`:

```yaml
providers:
  new_provider:
    name: "New Provider"
    enabled: true
    api_base: "https://api.newprovider.com/v1"
    api_key_env: "NEW_PROVIDER_API_KEY"
    models:
      model-name:
        name: "Model Name"
        context_window: 8192
        max_output: 4096
```

2. Implement the API call in `ModelRouter.llm()` (currently placeholder)

### Adding a New Embedding Provider

1. Add to `PROVIDER_REGISTRY` in `zora_core/models/embedding.py`:

```python
PROVIDER_REGISTRY["new_provider"] = ProviderInfo(
    name="New Provider Embeddings",
    provider_id="new_provider",
    status="supported",  # or "stub" if not yet implemented
    api_key_env="NEW_PROVIDER_API_KEY",
    default_model="embedding-model",
    default_dimensions=1536,
)
```

2. Create a provider class:

```python
class NewProviderEmbeddingProvider(EmbeddingProvider):
    @property
    def provider_id(self) -> str:
        return "new_provider"
    
    @property
    def dimensions(self) -> int:
        return 1536
    
    @property
    def model_name(self) -> str:
        return self._model
    
    async def embed_text(self, text: str) -> List[float]:
        # Implement API call
        pass
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # Implement batch API call
        pass
```

3. Update `get_embedding_provider()` factory function

## Database Schema

Provider metadata is stored in the `memory_events` table:

| Column | Type | Description |
|--------|------|-------------|
| `llm_provider` | VARCHAR(50) | Provider that generated content (e.g., "openai") |
| `llm_model` | VARCHAR(100) | Model used for content (e.g., "gpt-4-turbo") |
| `embedding_provider` | VARCHAR(50) | Provider used for embedding (e.g., "openai") |
| `embedding_model` | VARCHAR(100) | Embedding model (e.g., "text-embedding-3-small") |

Apply the migration to add these columns:

```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/00003_memory_provider_metadata.sql
```

## Troubleshooting

### "Embeddings not configured" Warning

This means no OpenAI API key is set. Set `OPENAI_API_KEY` to enable semantic search.

### "Unknown provider" Error

The provider ID doesn't match any configured provider. Check `ai_providers.yaml` for valid provider IDs.

### Stub Embeddings

If you see all-zero embeddings, the provider is either:
- Not configured (missing API key)
- A stub provider (doesn't support embeddings yet)

Check provider status with:
```bash
python -m zora_core.models.cli list-providers
```

## Security Notes

- **Never commit API keys** to version control
- Use environment variables or secret management
- Keep keys server-side; don't expose in frontend code
- Rotate keys periodically
- Use separate keys for development and production

## Future Improvements

- Implement actual API calls for all LLM providers (currently placeholder)
- Add support for Google's embedding API when schema supports variable dimensions
- Implement provider-specific rate limiting
- Add cost tracking per provider
- Support for local/self-hosted models (Ollama, vLLM)
