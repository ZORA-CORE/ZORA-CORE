# ZORA CORE Testing Guide

This document describes how to run tests for ZORA CORE, including tests for both in-memory and Supabase-backed memory storage.

## Quick Start

Run all tests with the in-memory backend (no external dependencies):

```bash
cd /path/to/ZORA-CORE
PYTHONPATH=. pytest tests/ -v
```

## Test Structure

Tests are organized into the following directories:

```
tests/
├── __init__.py
├── agents/                    # Agent-specific tests
│   ├── __init__.py
│   ├── test_agents.py         # Tests for all 6 agents
│   └── test_base_agent.py     # Tests for BaseAgent class
├── memory/                    # Memory backend tests
│   ├── __init__.py
│   └── test_memory_backends.py # Tests for MemoryStore and SupabaseMemoryAdapter
└── test_zora_infinity_dual_agi.py  # Integration tests
```

## Running Tests

### All Tests (In-Memory Backend)

```bash
PYTHONPATH=. pytest tests/ -v
```

### Agent Tests Only

```bash
PYTHONPATH=. pytest tests/agents/ -v
```

### Memory Backend Tests Only

```bash
PYTHONPATH=. pytest tests/memory/ -v
```

### Specific Test File

```bash
PYTHONPATH=. pytest tests/memory/test_memory_backends.py -v
```

### Specific Test Class

```bash
PYTHONPATH=. pytest tests/memory/test_memory_backends.py::TestMemoryStore -v
```

### Specific Test

```bash
PYTHONPATH=. pytest tests/memory/test_memory_backends.py::TestMemoryStore::test_save_memory -v
```

## Memory Backend Tests

The memory backend tests cover both the in-memory `MemoryStore` and the `SupabaseMemoryAdapter`.

### In-Memory Tests

These tests run without any external dependencies:

```bash
PYTHONPATH=. pytest tests/memory/test_memory_backends.py -v -k "not Supabase"
```

### Supabase Tests

Supabase tests are **automatically skipped** if credentials are not configured. To run them:

1. Set up environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

2. Run the tests:

```bash
PYTHONPATH=. pytest tests/memory/test_memory_backends.py::TestSupabaseMemoryAdapter -v
```

The tests will be skipped with a message if credentials are not set:
```
SKIPPED [1] tests/memory/test_memory_backends.py:317: Supabase credentials not configured (set SUPABASE_URL and SUPABASE_SERVICE_KEY)
```

## Test Coverage

To run tests with coverage reporting:

```bash
PYTHONPATH=. pytest tests/ -v --cov=zora_core --cov-report=html
```

View the coverage report by opening `htmlcov/index.html` in a browser.

## Continuous Integration

The test suite is designed to work in CI environments:

- All in-memory tests run without external dependencies
- Supabase tests are automatically skipped if credentials are not available
- CI will not fail due to missing Supabase credentials

To enable Supabase tests in CI, add the following secrets to your CI environment:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## CLI Demo Testing

You can also test the memory system using the CLI:

### In-Memory Backend (Default)

```bash
PYTHONPATH=. python -m zora_core.memory.cli demo
```

### Supabase Backend

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase demo
```

### Check Configuration

```bash
PYTHONPATH=. python -m zora_core.memory.cli config
```

## Troubleshooting

### Import Errors

If you see import errors, make sure you're running from the project root with `PYTHONPATH=.`:

```bash
cd /path/to/ZORA-CORE
PYTHONPATH=. pytest tests/ -v
```

### Supabase Connection Errors

If Supabase tests fail with connection errors:

1. Verify your credentials are correct
2. Check that the Supabase project is active
3. Ensure the database schema has been applied (see `supabase/migrations/`)

### Async Test Issues

All memory operations are async. Make sure tests use `@pytest.mark.asyncio` decorator:

```python
@pytest.mark.asyncio
async def test_save_memory(self, store):
    memory_id = await store.save_memory(...)
```

## Writing New Tests

When adding new tests:

1. Use `pytest.fixture` for setup/teardown
2. Use `@pytest.mark.asyncio` for async tests
3. Use `@requires_supabase` decorator for Supabase-specific tests
4. Clean up test data in fixtures

Example:

```python
import pytest
from zora_core.memory import MemoryStore

class TestNewFeature:
    @pytest.fixture
    def store(self):
        store = MemoryStore()
        yield store
        store.clear()

    @pytest.mark.asyncio
    async def test_new_feature(self, store):
        result = await store.some_method()
        assert result is not None
```
