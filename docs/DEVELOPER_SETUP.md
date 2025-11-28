# ZORA CORE Developer Setup Guide

This guide will help you set up a development environment for ZORA CORE.

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher (for frontend)
- Git
- A Supabase account (optional, for persistent storage)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ZORA-CORE/ZORA-CORE.git
cd ZORA-CORE
```

### 2. Set Up Python Environment

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Or install with pip directly
pip install pytest pytest-asyncio supabase
```

### 3. Verify Installation

```bash
# Run the memory demo (in-memory backend)
PYTHONPATH=. python -m zora_core.memory.cli demo

# Run the test suite
PYTHONPATH=. pytest tests/ -v
```

You should see output like:
```
=== ZORA CORE Memory Demo (MemoryStore) ===

1. Saving memories...
   Saved: mem_abc123...
...
=== Demo Complete ===
```

## Supabase Setup (Optional)

For persistent storage, you'll need to set up Supabase.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be created

### 2. Apply the Database Schema

1. Go to your project's SQL Editor in the Supabase dashboard
2. Copy the contents of `supabase/migrations/00001_initial_schema.sql`
3. Paste and run the SQL
4. For semantic memory support, also run `supabase/migrations/00002_pgvector_semantic_memory.sql`

Alternatively, if you have the Supabase CLI:
```bash
supabase db push
```

**Note:** The pgvector migration requires the pgvector extension to be enabled in your Supabase project. This is typically available by default on Supabase projects.

### 3. Get Your API Keys

1. Go to Project Settings > API
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Service Role Key** (for backend use - keep this secret!)

### 4. Configure Environment Variables

Create a `.env` file in the project root (or export directly):

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

Or export directly:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

### 5. Verify Supabase Connection

```bash
# Check configuration
PYTHONPATH=. python -m zora_core.memory.cli config

# Run demo with Supabase backend
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase demo
```

## Cloudflare Workers API Setup

The ZORA CORE API is built with Cloudflare Workers and provides HTTP endpoints for climate profiles, missions, and journal entries.

### 1. Install Dependencies

```bash
cd workers/api
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file in the `workers/api` directory:

```bash
# workers/api/.dev.vars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Run the API Locally

```bash
npm run dev
```

The API will be available at `http://localhost:8787`.

### 4. Test the API

```bash
# Check status
curl http://localhost:8787/api/status

# List climate profiles
curl http://localhost:8787/api/climate/profiles

# Create a climate profile
curl -X POST http://localhost:8787/api/climate/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Profile", "profile_type": "person"}'
```

For full API documentation, see [workers/api/README.md](../workers/api/README.md).

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API Base URL

Create a `.env.local` file in the `frontend` directory:

```bash
# frontend/.env.local
NEXT_PUBLIC_ZORA_API_BASE_URL=http://localhost:8787
```

Or set the environment variable when running:

```bash
NEXT_PUBLIC_ZORA_API_BASE_URL=http://localhost:8787 npm run dev
```

### 3. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
```

## Local End-to-End Run

To run the complete ZORA CORE stack locally (Supabase + Workers API + Frontend):

### 1. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Apply the database schema from `supabase/migrations/00001_initial_schema.sql`
3. For semantic memory, also apply `supabase/migrations/00002_pgvector_semantic_memory.sql`
4. Get your Project URL and Service Role Key from Project Settings > API

### 2. Start the Workers API

```bash
cd workers/api

# Create .dev.vars with your Supabase credentials and OpenAI key
cat > .dev.vars << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
EOF

# Install dependencies and start the API
npm install
npm run dev
```

The API will be available at `http://localhost:8787`.

**Note:** `OPENAI_API_KEY` is required for semantic search in Agent Dashboards. Without it, semantic search will return a 503 error.

### 3. Start the Frontend

In a new terminal:

```bash
cd frontend

# Create .env.local with the API URL
echo "NEXT_PUBLIC_ZORA_API_BASE_URL=http://localhost:8787" > .env.local

# Install dependencies and start the frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Verify the Setup

1. Open `http://localhost:3000` in your browser
2. Navigate to **Climate OS** (`/climate`) - you should see a form to create your climate profile
3. Create a profile and add missions - data will be stored in Supabase
4. Navigate to **Journal** (`/journal`) - you should see system events (if any exist)
5. Navigate to **Agents** (`/agents`) - you should see the 6 ZORA agents with memory and semantic search

## Semantic Agent Dashboards

The Agent Dashboards provide a "Founder view" to inspect the inner life of ZORA CORE by viewing agent memories and performing semantic searches.

### Features

- **Agent List**: View all 6 ZORA agents (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM)
- **Recent Memory**: View recent memory events for each agent
- **Semantic Search**: Search an agent's memory using natural language queries

### Requirements

1. **Supabase with pgvector**: Apply both migrations:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_pgvector_semantic_memory.sql`

2. **OpenAI API Key**: Required for semantic search (embedding generation)

### How to Use

1. Start the Workers API with `OPENAI_API_KEY` configured in `.dev.vars`
2. Start the frontend
3. Navigate to `/agents`
4. Click on an agent to view their recent memories
5. Use the search box to perform semantic searches on that agent's memory

### API Endpoints

The Agent Dashboards use the following API endpoints:

- `GET /api/agents` - List all agents
- `GET /api/agents/:agentId` - Get a single agent
- `GET /api/agents/:agentId/memory` - Get recent memories for an agent
- `POST /api/agents/:agentId/memory/semantic-search` - Semantic search on agent memory

For full API documentation, see [workers/api/README.md](../workers/api/README.md).

### Troubleshooting End-to-End Setup

**API returns 500 errors:**
- Check that `.dev.vars` has correct Supabase credentials
- Verify the database schema has been applied
- Check the Workers API console for error details

**Frontend shows "Failed to load profile":**
- Ensure the Workers API is running on port 8787
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_ZORA_API_BASE_URL` is set correctly

**Data not persisting:**
- Verify Supabase project is active
- Check that the service key has write permissions
- Look for errors in the Supabase dashboard logs

## Project Structure

```
ZORA-CORE/
├── config/                    # Configuration files
│   └── ai_providers.yaml      # AI model provider configuration
├── docs/                      # Documentation
│   ├── DATABASE_SCHEMA_v0_1.md
│   ├── DEVELOPER_SETUP.md     # This file
│   ├── MEMORY_AND_CONTEXT.md
│   ├── STATUS_REPORT_ITERATION_0001.md
│   ├── STATUS_REPORT_ITERATION_0002.md
│   └── TESTING.md
├── frontend/                  # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       ├── dashboard/     # Main dashboard
│   │       ├── agents/        # Agent management
│   │       └── climate/       # Climate OS
│   └── package.json
├── supabase/                  # Supabase configuration
│   └── migrations/            # Database migrations
│       └── 00001_initial_schema.sql
├── workers/                   # Cloudflare Workers
│   └── api/                   # ZORA CORE API
│       ├── src/               # TypeScript source
│       ├── wrangler.toml      # Cloudflare config
│       └── README.md          # API documentation
├── tests/                     # Test suite
│   ├── agents/                # Agent tests
│   └── memory/                # Memory backend tests
├── zora_core/                 # Main Python package
│   ├── agents/                # 6 ZORA agents
│   │   ├── aegis/             # Safety & Ethics
│   │   ├── connor/            # Systems & Backend
│   │   ├── eivor/             # Memory & Knowledge
│   │   ├── lumina/            # Orchestrator
│   │   ├── oracle/            # Research & Strategy
│   │   └── sam/               # Frontend & UX
│   ├── memory/                # Memory layer
│   │   ├── base.py            # Abstract interface
│   │   ├── config.py          # Configuration
│   │   ├── memory_store.py    # In-memory backend
│   │   ├── supabase_adapter.py # Supabase backend
│   │   └── cli.py             # CLI tool
│   ├── models/                # Model routing
│   └── orchestrator/          # Task orchestration
├── pyproject.toml             # Python project config
└── requirements.txt           # Python dependencies
```

## Semantic Memory Setup (Optional)

For semantic search capabilities using pgvector, you'll need to set up embeddings.

### 1. Enable pgvector in Supabase

pgvector is typically enabled by default in Supabase projects. If not, run in the SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Apply the pgvector Migration

Run the semantic memory migration in the Supabase SQL Editor:

```sql
-- Copy contents from supabase/migrations/00002_pgvector_semantic_memory.sql
```

This creates:
- HNSW index on the embedding column for fast similarity search
- `search_memories_by_embedding()` function for semantic queries

### 3. Configure OpenAI API Key

Set your OpenAI API key for generating embeddings:

```bash
export OPENAI_API_KEY="your-openai-api-key"
```

Or add to your `.env` file:

```bash
# .env
OPENAI_API_KEY=your-openai-api-key
```

### 4. Verify Semantic Memory

```bash
# Check embedding configuration
PYTHONPATH=. python -c "from zora_core.models.embedding import get_embedding_info; print(get_embedding_info())"

# Run semantic memory demo
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase semantic-demo
```

### Semantic Memory Without API Key

If you don't have an OpenAI API key, the system will use a stub embedding provider. This allows the system to function, but semantic search will fall back to text-based search.

## Common Commands

### Memory CLI

```bash
# Show help
PYTHONPATH=. python -m zora_core.memory.cli --help

# Run demo (in-memory)
PYTHONPATH=. python -m zora_core.memory.cli demo

# Run demo (Supabase)
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase demo

# Save a memory
PYTHONPATH=. python -m zora_core.memory.cli save \
  --agent CONNOR \
  --type decision \
  --content "Decided to use FastAPI" \
  --tags "architecture,backend"

# Search memories
PYTHONPATH=. python -m zora_core.memory.cli search --query "FastAPI"

# Semantic search (requires Supabase + OpenAI)
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase semantic-search --query "climate action"

# Run semantic memory demo
PYTHONPATH=. python -m zora_core.memory.cli --backend=supabase semantic-demo

# Show statistics
PYTHONPATH=. python -m zora_core.memory.cli stats

# Show configuration
PYTHONPATH=. python -m zora_core.memory.cli config
```

### Testing

```bash
# Run all tests
PYTHONPATH=. pytest tests/ -v

# Run specific test file
PYTHONPATH=. pytest tests/memory/test_memory_backends.py -v

# Run with coverage
PYTHONPATH=. pytest tests/ -v --cov=zora_core --cov-report=html
```

### Frontend

```bash
cd frontend

# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | For Supabase backend | - |
| `SUPABASE_SERVICE_KEY` | Service role key | For Supabase backend | - |
| `SUPABASE_ANON_KEY` | Anonymous key | Alternative to service key | - |
| `OPENAI_API_KEY` | OpenAI API key | For semantic memory | - |
| `ZORA_EMBEDDING_MODEL` | Embedding model name | No | `text-embedding-3-small` |

## Troubleshooting

### Import Errors

If you see `ModuleNotFoundError`, make sure you're running from the project root with `PYTHONPATH=.`:

```bash
cd /path/to/ZORA-CORE
PYTHONPATH=. python -m zora_core.memory.cli demo
```

### Supabase Connection Errors

1. Verify your credentials are correct
2. Check that the project is active in the Supabase dashboard
3. Ensure the schema has been applied
4. Check for network/firewall issues

### Test Failures

1. Make sure all dependencies are installed
2. Run tests from the project root
3. Check that no other process is using the test database

### Frontend Build Errors

1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Next.js cache: `rm -rf .next`
3. Check Node.js version: `node --version` (should be 18+)

## Getting Help

- Check the documentation in `docs/`
- Review the status reports for known limitations
- Open an issue on GitHub

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `PYTHONPATH=. pytest tests/ -v`
4. Commit and push
5. Open a pull request

---

*ZORA CORE Developer Setup Guide - Iteration 0005*
