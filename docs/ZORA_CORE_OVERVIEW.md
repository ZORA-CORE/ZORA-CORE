# ZORA CORE Architecture Overview

## Introduction

ZORA CORE is an advanced multi-agent AI operating system designed as a climate-first intelligence platform. It combines six specialized AI agents working in coordination to deliver a comprehensive Climate OS and climate-focused brand mashup platform.

## System Architecture

### High-Level Component Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │           FOUNDER (Human)           │
                                    │      Ultimate Decision Maker        │
                                    └─────────────────┬───────────────────┘
                                                      │
                                    ┌─────────────────▼───────────────────┐
                                    │         LUMINA (Orchestrator)       │
                                    │    Plans, coordinates, delegates    │
                                    └─────────────────┬───────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
        ┌───────────▼───────────┐       ┌────────────▼────────────┐       ┌────────────▼────────────┐
        │   CONNOR (Backend)    │       │   EIVOR (Memory)        │       │   SAM (Frontend)        │
        │   Systems & APIs      │       │   Knowledge & Context   │       │   UI & Experience       │
        └───────────┬───────────┘       └────────────┬────────────┘       └────────────┬────────────┘
                    │                                 │                                 │
                    │                   ┌─────────────┴─────────────┐                   │
                    │                   │                           │                   │
        ┌───────────▼───────────┐       │       ┌───────────────────▼───────────┐      │
        │   ORACLE (Research)   │◄──────┴───────►   AEGIS (Safety)              │◄─────┘
        │   Strategy & Insight  │               │   Ethics & Compliance         │
        └───────────────────────┘               └───────────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              ZORA CORE SYSTEM                                    │
│                                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Next.js   │    │ Cloudflare  │    │  Supabase   │    │  External   │       │
│  │  Frontend   │◄──►│   Workers   │◄──►│  (Postgres) │    │  AI APIs    │       │
│  │  (Vercel)   │    │   (API)     │    │             │    │             │       │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│                            │                  │                  │              │
│                            └──────────────────┼──────────────────┘              │
│                                               │                                  │
│  ┌────────────────────────────────────────────▼────────────────────────────────┐│
│  │                         AGENT ORCHESTRATION LAYER                           ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   ││
│  │  │ CONNOR  │ │ LUMINA  │ │  EIVOR  │ │ ORACLE  │ │  AEGIS  │ │   SAM   │   ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                              MEMORY LAYER (EIVOR)                           ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                    ││
│  │  │   Memories    │  │   Sessions    │  │   Decisions   │                    ││
│  │  │   (Vector)    │  │   (Context)   │  │   (History)   │                    ││
│  │  └───────────────┘  └───────────────┘  └───────────────┘                    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Layer (`zora_core/agents/`)

The six core agents form the heart of ZORA CORE:

| Agent | Role | Responsibilities |
|-------|------|------------------|
| CONNOR | Developer / System Problem Solver | Backend systems, APIs, infrastructure, testing |
| LUMINA | Planner / Orchestrator | Task planning, coordination, workflow management |
| EIVOR | Memory / Knowledge Weaver | Long-term memory, RAG, context management |
| ORACLE | Research & Foresight | Research, strategy, predictions, best practices |
| AEGIS | Safety & Alignment Guardian | Security, ethics, compliance, risk assessment |
| SAM | Frontend & Experience Architect | UI/UX, multi-tenant frontends, design systems |

### 2. Orchestrator Layer (`zora_core/orchestrator/`)

The orchestrator manages task execution and agent coordination:

- **Task Manager**: Creates, tracks, and manages tasks
- **Task Graph**: Handles dependencies and execution order
- **Agent Router**: Routes tasks to appropriate agents
- **Safety Gate**: Integrates AEGIS for risk assessment

### 3. Memory Layer (`zora_core/memory/`)

EIVOR's memory system provides persistent context:

- **Memory Store**: Supabase-backed storage for memories
- **Vector Search**: Semantic retrieval using embeddings
- **Session Management**: Context tracking across sessions
- **Summarization**: Prevents context overflow

### 4. Model Router (`zora_core/models/`)

Routes AI requests to appropriate providers:

- **Provider Catalog**: Configured in `config/ai_providers.yaml`
- **Task Routing**: Matches tasks to optimal models
- **Fallback Logic**: Handles provider failures gracefully
- **ZORA-AGI Virtual Model**: Composites multiple providers

### 5. Tools Layer (`zora_core/tools/`)

Standardized tools for agent use:

- GitHub/GitLab integration
- HTTP client
- Shell commands (sandboxed)
- Vector DB client
- Test runners

## Product Pillars

### Climate OS (TERRA-like)

A climate-focused experience helping users:

- Understand their climate profile and footprint
- Receive and complete Climate Missions
- Track impact with honest estimates
- Visualize progress over time

### Climate-Focused Brand Mashup Shop

A platform for climate-aligned collaborations:

- Only climate-neutral or climate-positive products
- Brand mashups with clear climate stories
- Integrated with Climate OS data
- Rule-based climate labels (guarded by AEGIS)

## Technology Stack

### Frontend
- **Framework**: Next.js (React)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **Components**: Custom design system

### Backend
- **API Layer**: Cloudflare Workers
- **Runtime**: Edge computing
- **Authentication**: JWT-based

### Database
- **Primary**: Supabase (PostgreSQL)
- **Vector Store**: pgvector extension
- **Caching**: Edge caching via Cloudflare

### External AI Systems
- OpenAI (GPT-4)
- Anthropic (Claude)
- Google (Gemini)
- And others as configured

## Directory Structure

```
ZORA-CORE/
├── zora_core/
│   ├── agents/
│   │   ├── connor/      # Developer / System Problem Solver
│   │   ├── lumina/      # Planner / Orchestrator
│   │   ├── eivor/       # Memory / Knowledge Weaver
│   │   ├── oracle/      # Research & Foresight
│   │   ├── aegis/       # Safety & Alignment
│   │   └── sam/         # Frontend & Experience
│   ├── orchestrator/    # Task management & coordination
│   ├── memory/          # EIVOR's memory layer
│   ├── tools/           # Shared tools for agents
│   ├── models/          # Model router & AI providers
│   └── evaluation/      # Agent evaluation framework
├── frontend/            # Next.js application
├── config/
│   ├── ai_providers.yaml
│   └── safety_policies.yaml
├── docs/
│   ├── ZORA_CORE_OVERVIEW.md
│   ├── AGENT_FAMILY_OVERVIEW.md
│   ├── MEMORY_AND_CONTEXT.md
│   ├── ORCHESTRATION_ENGINE.md
│   └── SAFETY_AND_LIMITATIONS.md
└── tests/               # Test suites
```

## Current Limitations & Refactor Opportunities

### Limitations

1. **Agent Integration**: Existing agents (connor.py, lumina.py, etc.) need restructuring into the new modular architecture
2. **Memory Persistence**: Current memory is session-based; needs Supabase integration
3. **Orchestration**: Task management is basic; needs full task graph implementation
4. **Safety Layer**: AEGIS needs comprehensive policy enforcement
5. **Frontend**: Dashboard needs implementation with Climate OS and Mashup Shop

### Refactor Opportunities

1. **Modular Agent Structure**: Move from monolithic agent files to modular packages
2. **Unified BaseAgent**: Implement Protocol-based interface with plan/act/reflect
3. **Memory Abstraction**: Create clean memory API with multiple backend support
4. **Config-Driven Routing**: Enhance ModelRouter with YAML-based configuration
5. **Type Safety**: Add comprehensive type hints and Pydantic models

## Development Philosophy

1. **Build Iteratively**: Small, working versions (v0.1, v0.2, ...)
2. **Climate-First**: Every feature supports real climate action
3. **No Greenwashing**: Honest, traceable climate claims
4. **Human-in-the-Loop**: Founder remains ultimate decision maker
5. **Long-Term Learning**: System improves from its own history

## Getting Started

See the individual documentation files for detailed information:

- [Agent Family Overview](./AGENT_FAMILY_OVERVIEW.md)
- [Memory and Context](./MEMORY_AND_CONTEXT.md)
- [Orchestration Engine](./ORCHESTRATION_ENGINE.md)
- [Safety and Limitations](./SAFETY_AND_LIMITATIONS.md)

---

*Generated by ZORA CORE System - Iteration 0001*
