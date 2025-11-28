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

Alternatively, if you have the Supabase CLI:
```bash
supabase db push
```

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

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 3. Build for Production

```bash
npm run build
```

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

*ZORA CORE Developer Setup Guide - Iteration 0002*
