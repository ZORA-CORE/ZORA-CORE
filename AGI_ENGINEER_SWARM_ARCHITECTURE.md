# ZORA CORE — Ultimate AGI Engineer Swarm Architecture Proposal

## 0) Vision and non-goals

**Mission:** Build an autonomous multi-agent software engineering swarm that can convert a high-level product objective into production-grade software with measurable quality, security, and operational reliability.

**Primary optimization order:**
1. Correctness and safety
2. Delivery speed
3. Cost efficiency
4. Autonomy depth

**Non-goals (v1):**
- Fully unattended production deployment without policy gates
- Cross-tenant memory sharing
- Infinite recursion of self-spawned agents without budget controls

---

## 1) Agent roles and hierarchy (selected blueprint)

### 1.1 Governance model
Adopt a **hybrid hierarchical + market system**:
- **Chief Orchestrator Agent (COA)** owns global plan, loop progression, and policy compliance.
- Domain leads (PM, Architect, Tech Lead, QA, DevOps, Security) run as specialist agents.
- Worker agents are dynamically spawned per task (coding, refactor, test generation, debugging).
- Conflicts are resolved by a **Policy Judge** using weighted scoring (risk, test evidence, cost, latency).

### 1.2 Final decision authority
Final merge/deploy recommendation = **COA + Policy Judge**.
High-risk changes (security, data migrations, infra mutations) require **Human Approval Gate**.

### 1.3 Agent roster (v1)
- Product Manager Agent
- Solution Architect Agent
- Tech Lead Planner Agent
- Developer Agents (parallel pool)
- QA/Test Synthesis Agent
- Security/AppSec Agent
- Performance Agent
- DevOps/SRE Agent
- Documentation Agent
- Critic/Red-Team Agent

### 1.4 Parallelism policy
- Default: 6 parallel worker agents per feature branch
- Burst mode: up to 20 workers if merge conflict risk < threshold
- Locking: file-level optimistic locking + conflict reconciliation agent

---

## 2) Tools and sandbox architecture (selected blueprint)

### 2.1 Execution substrate
Use **ephemeral Firecracker microVMs** for untrusted execution, with optional Docker inside VM for language/runtime convenience.

### 2.2 Environment model
- Immutable base images per language family
- Deterministic toolchains (pinned versions)
- Read-only source snapshot + controlled writable overlay
- Network default-deny with policy allowlist

### 2.3 Tool API contract
All agents operate through strict tools:
- `plan_task`
- `read_repo`
- `edit_patch`
- `run_build`
- `run_tests`
- `run_security_scan`
- `run_perf_benchmark`
- `open_browser_test`
- `create_pr_artifacts`

No raw shell access outside audited tool endpoints.

### 2.4 Supply chain and secrets
- SBOM generation on each candidate release
- Dependency vulnerability checks in loop
- Ephemeral short-lived secrets via vault broker
- Provenance attestation (SLSA-inspired)

---

## 3) Memory and context system (selected blueprint)

### 3.1 Three-layer memory
1. **Working memory:** current branch/task context
2. **Episodic memory:** prior loop outcomes, failed attempts, RCA notes
3. **Semantic memory:** architecture decisions, code patterns, module knowledge

### 3.2 Data architecture
- Relational metadata store: PostgreSQL
- Vector index: Qdrant (self-hosted)
- Artifact store: object storage (logs, traces, screenshots, test outputs)

### 3.3 Indexing strategy
- AST/symbol-level chunks as default
- File-level fallback for non-parseable files
- Commit-triggered re-index pipeline
- Staleness invalidation by file hash + commit id

### 3.4 Retrieval policy
Rank by:
- Relevance (semantic score)
- Recency (latest commits)
- Authority (golden decisions, approved ADRs)

### 3.5 Safety boundaries
- Strict tenant isolation in memory
- No cross-repo learning unless explicitly enabled
- Signed “golden constraints” not overridable by agents

---

## 4) LLM backend strategy (selected blueprint)

### 4.1 Multi-model routing
Use a **router + verifier architecture**:
- Small/fast models for parsing, classification, and formatting tasks
- Large reasoning models for planning, architecture, and difficult bug fixing
- Independent verifier model validates risky outputs

### 4.2 Suggested model tiers (logical)
- **Tier S (small):** triage, log parsing, lint autofix
- **Tier M (medium):** routine coding tasks, test synthesis
- **Tier L (large):** system design, refactor strategy, hard debugging
- **Tier V (verifier):** adversarial review and policy conformance checks

### 4.3 Budget governance
- Per-loop token and cost quota
- ROI scoring (quality delta per cost)
- Dynamic downgrade under budget pressure
- Automatic failover chain for model outages

### 4.4 Output contracts
All model outputs must be schema-constrained (JSON/tool-calls), never free-form for critical actions.

---

## 5) Self-correction and feedback loops (selected blueprint)

### 5.1 Infinity Loop state machine
1. Scope & Plan
2. Task Decomposition
3. Implement (parallel)
4. Build/Test
5. Diagnose
6. Patch
7. Retest
8. Security/Perf gate
9. Package PR
10. Learn & Persist

### 5.2 Error taxonomy and routing
- Compile errors → Developer Fix Agent
- Failing tests → QA + Developer pair
- Security findings → AppSec Agent
- Performance regressions → Performance Agent
- Flaky tests → Flake Analyzer Agent

### 5.3 Regression prevention
- Mandatory test delta for each bugfix
- Auto-generated negative tests from incident traces
- Rollback to last green checkpoint on regression amplification

### 5.4 Critic loop
A dedicated Red-Team/Critic agent attempts to break the proposed patch before “ready-to-merge” status.

### 5.5 Done criteria
Mandatory green gates:
- Build success
- Unit + integration tests
- Security scan threshold
- Performance budget not exceeded
- Docs/changelog updated
- Policy compliance pass

---

## 6) Recommended technical stack

### 6.1 Control plane
- Python 3.12+
- LangGraph (stateful orchestration) + Pydantic contracts
- FastAPI control API
- Redis for transient coordination queues
- PostgreSQL for durable state

### 6.2 Execution plane
- Firecracker microVM manager service
- Docker runtime inside VM templates
- uv/pnpm/cargo/go toolchain images (pinned)
- Playwright for browser validation

### 6.3 Memory & observability
- Qdrant (vector)
- OpenTelemetry traces + Prometheus + Grafana
- Object storage for artifacts
- Structured event log for full replay/audit

### 6.4 Security baseline
- OPA policy engine for action authorization
- Sigstore/Cosign for artifact signing
- Trivy/Grype for vulnerability scanning
- Secret scanning + license compliance scan

---

## 7) KPI framework (beat-the-market)

North-star KPIs:
1. **Task Success Rate** (fully green, policy-passing delivery)
2. **Median Time-to-Green** (objective → verified patch)
3. **Escaped Defect Rate** (post-merge defects per release)

Secondary KPIs:
- Cost per successful task
- Rework loops per task
- Human intervention frequency

---

## 8) Rollout roadmap

### Phase 1 (Foundation)
- COA, planner, developer, tester, verifier
- Single-repo operation
- Deterministic sandbox + CI-style loop

### Phase 2 (Hardening)
- Security + perf agents
- Full memory tiers
- Critic/red-team loop

### Phase 3 (Scale)
- Multi-repo, multi-tenant isolation
- Dynamic agent spawning with budget optimizer
- Advanced policy automation for semi-autonomous deploy

---

## 9) Default decisions locked for “ultimate” profile

- Governance: hybrid hierarchy + policy judge
- Sandbox: Firecracker-first, network-default-deny
- Memory: 3-layer + Qdrant + Postgres
- Models: routed multi-tier + verifier
- Loop: strict state machine with hard gates
- Security: mandatory scan/sign/attest pipeline
- Quality: critic loop required before merge

This profile maximizes reliability, explainability, and controlled autonomy while preserving aggressive iteration speed.
