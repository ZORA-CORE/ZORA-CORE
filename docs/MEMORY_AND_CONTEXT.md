# ZORA CORE Memory and Context System

## Overview

The ZORA CORE memory system, managed by EIVOR, provides long-term storage and retrieval capabilities for the entire agent family. It serves as the knowledge fabric that connects all agents and enables learning from past experiences.

## Architecture

### Memory Store

The memory store is the central repository for all ZORA CORE memories. In the MVP, it uses in-memory storage with indexing for fast retrieval. Production will use Supabase/Postgres with vector embeddings for semantic search.

```
┌─────────────────────────────────────────────────────────────┐
│                      Memory Store                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Memories  │  │   Sessions  │  │   Indices   │         │
│  │  (Dict)     │  │  (Dict)     │  │  (Multiple) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Indices:                                                    │
│  - Tag Index: tag → [memory_ids]                            │
│  - Agent Index: agent → [memory_ids]                        │
│  - Type Index: memory_type → [memory_ids]                   │
│  - Session Index: session_id → [memory_ids]                 │
└─────────────────────────────────────────────────────────────┘
```

### Memory Types

The system supports various memory types:

| Type | Description | Example Use |
|------|-------------|-------------|
| `decision` | Architectural or design decisions | "Decided to use PostgreSQL for the database" |
| `reflection` | Agent reflections on past actions | "Task completion rate was 95%" |
| `artifact` | Generated artifacts (code, docs) | "Created API endpoint for /users" |
| `conversation` | Conversation history | "User requested dashboard feature" |
| `plan` | Plans created by agents | "Plan to implement authentication" |
| `result` | Task execution results | "Tests passed: 42/42" |
| `research` | Research findings | "Best practices for climate APIs" |
| `design` | Design decisions and specs | "Dashboard layout specification" |
| `safety_review` | AEGIS safety reviews | "Reviewed deployment for risks" |
| `climate_data` | Climate-related data | "Carbon footprint calculation" |
| `brand_data` | Brand/mashup data | "Brand collaboration details" |

## API Reference

### save_memory

Save a new memory to the store.

```python
memory_id = await memory_store.save_memory(
    agent="CONNOR",
    memory_type="decision",
    content="Decided to use FastAPI for the backend",
    tags=["architecture", "backend"],
    metadata={"priority": "high"},
    session_id="session_123",
)
```

**Parameters:**
- `agent` (str): The agent saving the memory
- `memory_type` (str): Type of memory
- `content` (str): The content to store
- `tags` (List[str], optional): Tags for categorization
- `metadata` (Dict, optional): Additional metadata
- `session_id` (str, optional): Session identifier

**Returns:** Memory ID (str)

### search_memory

Search memories based on criteria.

```python
results = await memory_store.search_memory(
    agent="CONNOR",
    query="PostgreSQL",
    tags=["database"],
    memory_type="decision",
    limit=10,
)
```

**Parameters:**
- `agent` (str, optional): Filter by agent
- `query` (str, optional): Text search in content
- `tags` (List[str], optional): Filter by tags (any match)
- `memory_type` (str, optional): Filter by type
- `session_id` (str, optional): Filter by session
- `limit` (int): Maximum results (default: 10)

**Returns:** List of memory dictionaries

### get_session_history

Get the history of a specific session.

```python
history = await memory_store.get_session_history(
    session_id="session_123",
    limit=50,
)
```

**Parameters:**
- `session_id` (str): The session identifier
- `limit` (int): Maximum entries (default: 50)

**Returns:** List of session memories

### get_memory

Get a specific memory by ID.

```python
memory = await memory_store.get_memory("mem_abc123")
```

**Parameters:**
- `memory_id` (str): The memory ID

**Returns:** Memory dictionary or None

### delete_memory

Delete a memory by ID.

```python
success = await memory_store.delete_memory("mem_abc123")
```

**Parameters:**
- `memory_id` (str): The memory ID

**Returns:** Boolean indicating success

## Integration with Agents

All agents can interact with the memory system through their base class methods:

```python
# Save to memory
await agent.save_to_memory(
    memory_type="decision",
    content="Implemented new feature",
    tags=["feature", "backend"],
)

# Search memory
results = await agent.search_memory(
    query="feature implementation",
    limit=5,
)
```

## Session Management

Sessions group related memories together, enabling:

1. **Context Retrieval**: Get all memories from a specific work session
2. **History Tracking**: Track the progression of a task or project
3. **Summarization**: Generate summaries of session activities

## Future Enhancements

### Vector Embeddings (Planned)

Production will use vector embeddings for semantic search:

```python
# Future API
results = await memory_store.semantic_search(
    query="How did we handle authentication?",
    similarity_threshold=0.8,
    limit=10,
)
```

### Supabase Integration (Planned)

The memory store will be backed by Supabase/Postgres:

```sql
-- Future schema
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    agent VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    metadata JSONB,
    session_id UUID,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_memories_agent ON memories(agent);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_session ON memories(session_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
```

### Summarization Pipeline (Planned)

Automatic summarization to prevent context overflow:

```python
# Future API
summary = await memory_store.summarize_session(
    session_id="session_123",
    max_tokens=500,
)
```

## CLI Testing Tool

A simple CLI is provided for testing memory operations:

```bash
# Save a memory
python -m zora_core.memory.cli save --agent CONNOR --type decision --content "Test memory"

# Search memories
python -m zora_core.memory.cli search --query "test" --limit 5

# Get session history
python -m zora_core.memory.cli history --session session_123
```

---

*Generated by ZORA CORE System - Iteration 0001*
