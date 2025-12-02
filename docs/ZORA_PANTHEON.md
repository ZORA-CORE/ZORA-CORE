# ZORA PANTHEON - Nordic Agent Family

This document describes the ZORA CORE agent family, now named after Norse mythology figures. Each agent has a specific role and responsibility within the ZORA OS ecosystem.

## The Seven Agents

### ODIN - Chief Strategist & Research Lead
- **Pronouns:** he/him
- **Role:** Strategic planning, research coordination, and model development
- **Description:** ODIN is the all-seeing strategist of ZORA CORE, responsible for high-level planning, research initiatives, and guiding the overall direction of the system.
- **Capabilities:** Strategic planning, research coordination, model development, trend analysis
- **Internal Implementation:** `zora_core/agents/connor/` (class: ConnorAgent)

### THOR - Backend & Infra Engineer
- **Pronouns:** he/him
- **Role:** Backend systems, infrastructure, and API development
- **Description:** THOR is the powerhouse of ZORA CORE, handling all backend infrastructure, API development, and system reliability.
- **Capabilities:** Backend development, API design, infrastructure management, system reliability
- **Internal Implementation:** New agent (to be implemented)

### FREYA - Humans, Storytelling & Growth
- **Pronouns:** she/her
- **Role:** Human connection, storytelling, marketing, and growth
- **Description:** FREYA is the voice of ZORA CORE, responsible for creating compelling climate stories, managing growth initiatives, and connecting with humans.
- **Capabilities:** Storytelling, content creation, growth analysis, marketing strategy
- **Internal Implementation:** New agent (to be implemented)

### BALDUR - Frontend, UX & Product Experience
- **Pronouns:** he/him
- **Role:** Frontend development, UX design, and product experience
- **Description:** BALDUR owns the entire frontend experience of ZORA CORE across all domains, countries, and brands. Responsible for Next.js/UI components, layouts, visual design, OS feel, and excellent user experience.
- **Capabilities:** Frontend development, UI design, UX analysis, accessibility, i18n
- **Internal Implementation:** `zora_core/agents/sam/` (class: SamAgent)

### HEIMDALL - Observability & Monitoring
- **Pronouns:** he/him
- **Role:** System monitoring, observability, and climate mission suggestions
- **Description:** HEIMDALL is the watchtower of ZORA CORE, responsible for logs, metrics, anomaly detection, and system health monitoring. Ensures visibility into all operations.
- **Capabilities:** System monitoring, log analysis, anomaly detection, metrics collection, health checks
- **Internal Implementation:** `zora_core/agents/oracle/` (class: OracleAgent)

### TYR - Ethics, Safety & Climate Integrity
- **Pronouns:** he/him
- **Role:** Ethics oversight, safety enforcement, and climate integrity
- **Description:** TYR is the guardian of ZORA CORE, responsible for safety rules enforcement, anti-greenwashing validation, alignment oversight, policy management, and approval workflows. Combines orchestration with ethics oversight.
- **Capabilities:** Safety enforcement, ethics review, policy management, approval workflows, task planning, agent coordination
- **Internal Implementation:** `zora_core/agents/lumina/` (class: LuminaAgent)

### EIVOR - Memory & Knowledge Keeper
- **Pronouns:** she/her
- **Role:** Memory management and knowledge preservation
- **Description:** EIVOR maintains long-term memory for ZORA CORE, including projects, decisions, experiments, user/brand context, climate history, and mashup outcomes.
- **Capabilities:** Memory storage, knowledge retrieval, semantic search, context management
- **Internal Implementation:** `zora_core/agents/eivor/` (class: EivorAgent)

## Agent Routing

The following routing map determines which agent handles specific task categories:

| Category | Agent |
|----------|-------|
| Backend, System, API, Infrastructure, Testing | THOR |
| Frontend, UI, UX, Design, i18n, Localization | BALDUR |
| Memory, Knowledge, Context | EIVOR |
| Research, Strategy | ODIN |
| Prediction, Monitoring | HEIMDALL |
| Safety, Security, Ethics, Compliance | TYR |

## Migration Notes

This rename was implemented as part of the Nordic mythology alignment initiative. The following mappings were applied:

| Old Name | New Name | Role Change |
|----------|----------|-------------|
| CONNOR | ODIN | Systems & Backend -> Chief Strategist & Research Lead |
| LUMINA | TYR | Orchestrator -> Ethics, Safety & Climate Integrity |
| SAM | BALDUR | Frontend & Experience -> Frontend, UX & Product |
| ORACLE | HEIMDALL | Research & Foresight -> Observability & Monitoring |
| AEGIS | (merged into TYR) | Safety & Ethics -> Combined with TYR |
| EIVOR | EIVOR | Memory & Knowledge (unchanged) |
| (new) | THOR | Backend & Infra Engineer |
| (new) | FREYA | Humans, Storytelling & Growth |

### Backwards Compatibility

Python class names remain unchanged for backwards compatibility:
- `ConnorAgent` -> implements ODIN
- `LuminaAgent` -> implements TYR
- `SamAgent` -> implements BALDUR
- `OracleAgent` -> implements HEIMDALL
- `EivorAgent` -> implements EIVOR

The `AgentConfig` objects have been renamed (e.g., `ODIN_CONFIG`, `TYR_CONFIG`) with aliases for backwards compatibility (e.g., `CONNOR_CONFIG = ODIN_CONFIG`).

## Database Migration

The database migration updates all `agent_id` columns to use the new Nordic names. The migration is idempotent and can be safely re-run. See `supabase/SUPABASE_SCHEMA_V1_FULL.sql` for the full migration script (STEP 14J).
