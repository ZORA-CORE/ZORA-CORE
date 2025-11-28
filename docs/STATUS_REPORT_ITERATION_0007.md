# ZORA CORE - Iteration 0007 Status Report

## Multi-Provider Model & Embedding Architecture for EIVOR Memory

**Date:** 2025-11-28  
**Status:** In Progress  
**Branch:** `devin/1764302103-multi-provider-model`

---

## Executive Summary

Iteration 0007 introduces a clean, extensible multi-provider architecture for ZORA CORE's model and embedding layer. This enables EIVOR's memory system to work with multiple AI providers (OpenAI, Anthropic/Claude, Google/Gemini, xAI/Grok, and GitHub Copilot) while maintaining OpenAI as the default embedding provider.

---

## Current State (Before Iteration 0007)

### Single-Provider Embedding Layer

The current embedding implementation in `zora_core/models/embedding.py` supports:
- **OpenAI** as the only real embedding provider (text-embedding-3-small, 1536 dimensions)
- **Stub provider** for development without API keys

### Existing Provider Configuration

The `config/ai_providers.yaml` already defines multiple chat/LLM providers:
- OpenAI (GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Google (Gemini Pro, Gemini Pro Vision)
- Perplexity (Sonar Medium Online)
- DeepSeek (DeepSeek Coder)

However, embeddings are only configured for OpenAI.

### Memory Schema

The `memory_events` table stores:
- agent, memory_type, content, tags, metadata
- embedding (VECTOR(1536))
- created_at, updated_at

**Missing:** Provider/model metadata for tracking which LLM/embedding model was used.

---

## Target Multi-Provider Design

### 1. Extended Provider Configuration

Add two new providers to `ai_providers.yaml`:
- **xAI (Grok)** - Chat models only (no embedding API yet)
- **Copilot** - GitHub Copilot / Azure OpenAI wrapper

Update embeddings section with provider-agnostic structure.

### 2. Provider-Agnostic Embedding Interface

Refactor `embedding.py` to support:
```python
embed_text(text: str, provider: str = None, model: str = None) -> List[float]
```

Provider implementations:
- **OpenAI** - Full support (text-embedding-3-small/large)
- **Google/Gemini** - Stub (embedding API available but not yet integrated)
- **Anthropic** - Stub (no native embedding API)
- **xAI** - Stub (no embedding API)
- **Copilot** - Stub (uses Azure OpenAI embeddings if configured)

### 3. Memory Provider Metadata

Add columns to `memory_events`:
- `llm_provider` - Provider that generated the content (if applicable)
- `llm_model` - Specific model used
- `embedding_provider` - Provider used for embedding
- `embedding_model` - Specific embedding model

### 4. CLI Tools for Provider Testing

New CLI module `zora_core/models/cli.py`:
- `list-providers` - Show all configured providers
- `chat-demo --provider=X` - Test chat with a provider
- `embed-demo --provider=X --text="..."` - Test embedding

---

## Provider Support Matrix

| Provider | Chat/LLM | Embeddings | API Key Env Var | Status |
|----------|----------|------------|-----------------|--------|
| OpenAI | Full | Full | `OPENAI_API_KEY` | Supported |
| Anthropic | Full | Stub | `ANTHROPIC_API_KEY` | Chat only |
| Google | Full | Stub | `GEMINI_API_KEY` | Chat only |
| xAI | Full | Stub | `XAI_API_KEY` | Chat only |
| Copilot | Stub | Stub | `COPILOT_API_KEY` | Planned |
| Perplexity | Full | N/A | `PERPLEXITY_API_KEY` | Chat only |
| DeepSeek | Full | N/A | `DEEPSEEK_API_KEY` | Chat only |

**Note:** Only OpenAI has a production-ready embedding API that we integrate. Other providers either don't offer embeddings or have limited availability.

---

## Implementation Plan

### Phase 1: Provider Configuration
1. Add xAI (Grok) to `ai_providers.yaml`
2. Add Copilot configuration
3. Restructure embeddings section for multi-provider

### Phase 2: Embedding Layer Refactor
1. Create provider registry in `embedding.py`
2. Add stub providers for non-OpenAI
3. Implement provider selection logic
4. Add graceful fallback handling

### Phase 3: Memory Schema Update
1. Create migration `00003_memory_provider_metadata.sql`
2. Add provider/model columns
3. Update `SupabaseMemoryAdapter` to write metadata
4. Update semantic search to return metadata

### Phase 4: CLI Tools
1. Create `zora_core/models/cli.py`
2. Implement `list-providers` command
3. Implement `chat-demo` command
4. Implement `embed-demo` command

### Phase 5: Documentation & Tests
1. Create `MODEL_PROVIDERS.md`
2. Update `DEVELOPER_SETUP.md`
3. Add tests for multi-provider logic
4. Update `TESTING.md`

---

## Environment Variables

### Required for Full Functionality
```bash
# OpenAI (required for embeddings)
OPENAI_API_KEY=sk-...

# Anthropic (optional, for Claude chat)
ANTHROPIC_API_KEY=sk-ant-...

# Google (optional, for Gemini chat)
GEMINI_API_KEY=AIza...

# xAI (optional, for Grok chat)
XAI_API_KEY=xai-...

# Copilot (optional, Azure OpenAI)
COPILOT_API_KEY=...
```

### Configuration Flags
```bash
# Override default embedding provider
ZORA_EMBEDDING_PROVIDER=openai

# Override default embedding model
ZORA_EMBEDDING_MODEL=text-embedding-3-small

# Disable embeddings entirely
ZORA_EMBEDDINGS_ENABLED=false
```

---

## Known Limitations

1. **Embedding Provider Lock-in**: Only OpenAI provides production-ready embeddings. Other providers are stubbed.

2. **No Hybrid Search Yet**: Semantic + keyword search combination is planned for a future iteration.

3. **No Authentication**: Still dev-mode, single-tenant.

4. **Copilot Integration**: Treated as Azure OpenAI wrapper; actual GitHub Copilot API integration is complex.

5. **Rate Limiting**: Per-provider rate limits defined in config but not enforced in code yet.

---

## Tradeoffs and Decisions

### Decision 1: OpenAI as Default Embedding Provider
**Rationale:** OpenAI's text-embedding-3-small is well-tested, cost-effective, and has the best ecosystem support. Other providers either don't offer embeddings or have limited availability.

### Decision 2: Stub Providers for Non-OpenAI Embeddings
**Rationale:** Rather than blocking on missing APIs, we provide stubs that clearly indicate limitations. This allows the architecture to be ready when providers add embedding support.

### Decision 3: Provider Metadata in Memory
**Rationale:** Tracking which provider/model generated content enables future analytics, debugging, and potential model comparison studies.

### Decision 4: CLI-First Testing
**Rationale:** CLI tools allow developers to quickly verify provider configuration without running the full stack.

---

## Acceptance Criteria

- [ ] `ai_providers.yaml` defines all 5 providers (OpenAI, Anthropic, Google, xAI, Copilot)
- [ ] `EmbeddingProvider` is provider-agnostic with OpenAI as default
- [ ] `memory_events` stores provider/model metadata
- [ ] `SupabaseMemoryAdapter` writes and returns metadata
- [ ] CLI tools exist for testing providers
- [ ] Documentation explains provider configuration
- [ ] Tests cover multi-provider logic

---

## Next Steps (Future Iterations)

1. **Iteration 0008+**: JWT authentication and multi-tenant separation
2. **Iteration 0009+**: Hybrid search (semantic + keyword)
3. **Iteration 0010+**: Provider analytics dashboard
4. **Future**: Integrate additional embedding providers as they become available

---

## Files Changed

### New Files
- `docs/STATUS_REPORT_ITERATION_0007.md` (this file)
- `docs/MODEL_PROVIDERS.md`
- `supabase/migrations/00003_memory_provider_metadata.sql`
- `zora_core/models/cli.py`

### Modified Files
- `config/ai_providers.yaml`
- `zora_core/models/embedding.py`
- `zora_core/models/__init__.py`
- `zora_core/memory/supabase_adapter.py`
- `docs/DEVELOPER_SETUP.md`
- `docs/TESTING.md`
