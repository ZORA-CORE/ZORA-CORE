"""
ZORA CORE Dev Knowledge & API Manifest v1.0 (Python Mirror)

This module provides a Python-accessible representation of ZORA CORE's
modules, tables, and API endpoints. It mirrors the TypeScript version
in workers/api/src/dev/devManifest.ts.

Designed for:
- EIVOR agent consumption for system understanding
- Python-based tooling and scripts
- Agent planning and reasoning about the codebase

Iteration 00D3
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Literal

# ============================================================================
# TYPES
# ============================================================================

HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]

ModuleDomain = Literal[
    "climate",
    "shop",
    "foundation",
    "academy",
    "energy",
    "autonomy",
    "billing",
    "organizations",
    "auth",
    "system",
    "other",
]


@dataclass
class DevApiEndpoint:
    """Represents a single API endpoint in the ZORA CORE system."""
    method: HttpMethod
    path: str
    description: str
    auth_required: bool
    roles: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


@dataclass
class DevModuleManifest:
    """Represents a module in the ZORA CORE system."""
    key: str
    name: str
    description: str
    domain: ModuleDomain
    core_tables: List[str]
    api_endpoints: List[DevApiEndpoint]


@dataclass
class DevManifest:
    """The complete Dev Knowledge & API Manifest for ZORA CORE."""
    version: str
    generated_at: str
    modules: List[DevModuleManifest]


# ============================================================================
# MANIFEST VERSION
# ============================================================================

MANIFEST_VERSION = "1.0.0"

# ============================================================================
# MODULE DEFINITIONS
# ============================================================================

CLIMATE_OS_MODULE = DevModuleManifest(
    key="climate_os",
    name="Climate OS",
    description="Climate profiles, missions, impact estimates, weekly plans, and climate summaries. The core climate tracking and action system.",
    domain="climate",
    core_tables=["climate_profiles", "climate_missions", "climate_plans", "climate_plan_items", "climate_summaries", "climate_timeseries"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/climate/profiles", "List climate profiles for the current tenant", True, ["member", "founder", "brand_admin"], ["list", "climate_profiles"]),
        DevApiEndpoint("POST", "/api/climate/profiles", "Create a new climate profile", True, ["member", "founder", "brand_admin"], ["create", "climate_profiles"]),
        DevApiEndpoint("GET", "/api/climate/profiles/:id", "Get a specific climate profile by ID", True, ["member", "founder", "brand_admin"], ["read", "climate_profiles"]),
        DevApiEndpoint("PUT", "/api/climate/profiles/:id", "Update a climate profile", True, ["member", "founder", "brand_admin"], ["update", "climate_profiles"]),
        DevApiEndpoint("DELETE", "/api/climate/profiles/:id", "Delete a climate profile", True, ["founder", "brand_admin"], ["delete", "climate_profiles"]),
        DevApiEndpoint("GET", "/api/climate/profiles/:id/missions", "List missions for a specific climate profile", True, ["member", "founder", "brand_admin"], ["list", "climate_missions"]),
        DevApiEndpoint("POST", "/api/climate/profiles/:id/missions", "Create a mission for a climate profile", True, ["member", "founder", "brand_admin"], ["create", "climate_missions"]),
        DevApiEndpoint("GET", "/api/climate/profiles/:id/summary", "Get climate summary for a profile", True, ["member", "founder", "brand_admin"], ["read", "climate_summaries"]),
        DevApiEndpoint("GET", "/api/climate/profiles/:id/timeseries", "Get climate timeseries data for a profile", True, ["member", "founder", "brand_admin"], ["read", "climate_timeseries"]),
        DevApiEndpoint("POST", "/api/climate/profiles/:id/weekly-plan/suggest", "Generate AI-suggested weekly climate plan", True, ["member", "founder", "brand_admin"], ["ai", "climate_plans"]),
        DevApiEndpoint("POST", "/api/climate/profiles/:id/weekly-plan/apply", "Apply a suggested weekly plan", True, ["member", "founder", "brand_admin"], ["create", "climate_plans"]),
    ],
)

ZORA_SHOP_MODULE = DevModuleManifest(
    key="zora_shop",
    name="ZORA SHOP",
    description="Climate-first product universe with brands, products, materials, climate metadata, and cross-brand collaboration projects.",
    domain="shop",
    core_tables=["brands", "products", "product_brands", "materials", "product_materials", "product_climate_meta", "zora_shop_projects"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/shop/brands", "List all brands", True, ["member", "founder", "brand_admin"], ["list", "brands"]),
        DevApiEndpoint("POST", "/api/shop/brands", "Create a new brand", True, ["founder", "brand_admin"], ["create", "brands"]),
        DevApiEndpoint("GET", "/api/shop/brands/:id", "Get a specific brand", True, ["member", "founder", "brand_admin"], ["read", "brands"]),
        DevApiEndpoint("PUT", "/api/shop/brands/:id", "Update a brand", True, ["founder", "brand_admin"], ["update", "brands"]),
        DevApiEndpoint("GET", "/api/shop/products", "List all products", True, ["member", "founder", "brand_admin"], ["list", "products"]),
        DevApiEndpoint("POST", "/api/shop/products", "Create a new product", True, ["founder", "brand_admin"], ["create", "products"]),
        DevApiEndpoint("GET", "/api/shop/products/:id", "Get a specific product with climate metadata", True, ["member", "founder", "brand_admin"], ["read", "products"]),
        DevApiEndpoint("PUT", "/api/shop/products/:id", "Update a product", True, ["founder", "brand_admin"], ["update", "products"]),
        DevApiEndpoint("GET", "/api/shop/materials", "List all materials", True, ["member", "founder", "brand_admin"], ["list", "materials"]),
        DevApiEndpoint("POST", "/api/shop/materials", "Create a new material", True, ["founder", "brand_admin"], ["create", "materials"]),
        DevApiEndpoint("GET", "/api/shop/projects", "List ZORA SHOP projects", True, ["member", "founder", "brand_admin"], ["list", "zora_shop_projects"]),
        DevApiEndpoint("POST", "/api/shop/projects", "Create a new ZORA SHOP project", True, ["founder", "brand_admin"], ["create", "zora_shop_projects"]),
    ],
)

HEMP_MATERIALS_MODULE = DevModuleManifest(
    key="hemp_materials",
    name="Hemp & Climate Materials",
    description="Specialized module for hemp-based and sustainable materials with climate benefit tracking.",
    domain="climate",
    core_tables=["materials", "climate_material_profiles"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/climate-materials", "List climate materials with hemp/cannabis filtering", True, ["member", "founder", "brand_admin"], ["list", "materials"]),
        DevApiEndpoint("POST", "/api/climate-materials", "Create a climate material entry", True, ["founder", "brand_admin"], ["create", "materials"]),
        DevApiEndpoint("GET", "/api/climate-materials/:id", "Get a specific climate material", True, ["member", "founder", "brand_admin"], ["read", "materials"]),
        DevApiEndpoint("PUT", "/api/climate-materials/:id", "Update a climate material", True, ["founder", "brand_admin"], ["update", "materials"]),
        DevApiEndpoint("GET", "/api/climate-materials/hemp", "List hemp-specific materials", True, ["member", "founder", "brand_admin"], ["list", "hemp"]),
    ],
)

GOES_GREEN_MODULE = DevModuleManifest(
    key="goes_green",
    name="ZORA GOES GREEN",
    description="Energy transition module for households and businesses. Tracks energy profiles, green actions, and transition roadmaps.",
    domain="energy",
    core_tables=["goes_green_profiles", "goes_green_actions", "goes_green_roadmaps"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/goes-green/profiles", "List GOES GREEN energy profiles", True, ["member", "founder", "brand_admin"], ["list", "goes_green_profiles"]),
        DevApiEndpoint("POST", "/api/goes-green/profiles", "Create a GOES GREEN profile", True, ["member", "founder", "brand_admin"], ["create", "goes_green_profiles"]),
        DevApiEndpoint("GET", "/api/goes-green/profiles/:id", "Get a specific GOES GREEN profile", True, ["member", "founder", "brand_admin"], ["read", "goes_green_profiles"]),
        DevApiEndpoint("PUT", "/api/goes-green/profiles/:id", "Update a GOES GREEN profile", True, ["member", "founder", "brand_admin"], ["update", "goes_green_profiles"]),
        DevApiEndpoint("GET", "/api/goes-green/profiles/:id/actions", "List actions for a GOES GREEN profile", True, ["member", "founder", "brand_admin"], ["list", "goes_green_actions"]),
        DevApiEndpoint("POST", "/api/goes-green/profiles/:id/actions", "Create an action for a GOES GREEN profile", True, ["member", "founder", "brand_admin"], ["create", "goes_green_actions"]),
        DevApiEndpoint("GET", "/api/goes-green/profiles/:id/roadmap", "Get energy transition roadmap", True, ["member", "founder", "brand_admin"], ["read", "goes_green_roadmaps"]),
    ],
)

QUANTUM_CLIMATE_LAB_MODULE = DevModuleManifest(
    key="quantum_climate_lab",
    name="Quantum Climate Lab",
    description="Experimental climate research module for running climate experiments, simulations, and scenario modeling.",
    domain="climate",
    core_tables=["climate_experiments", "climate_experiment_results", "climate_scenarios"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/climate-experiments", "List climate experiments", True, ["member", "founder", "brand_admin"], ["list", "climate_experiments"]),
        DevApiEndpoint("POST", "/api/climate-experiments", "Create a climate experiment", True, ["founder", "brand_admin"], ["create", "climate_experiments"]),
        DevApiEndpoint("GET", "/api/climate-experiments/:id", "Get a specific climate experiment", True, ["member", "founder", "brand_admin"], ["read", "climate_experiments"]),
        DevApiEndpoint("POST", "/api/climate-experiments/:id/run", "Run a climate experiment", True, ["founder", "brand_admin"], ["execute", "climate_experiments"]),
        DevApiEndpoint("GET", "/api/climate-experiments/:id/results", "Get experiment results", True, ["member", "founder", "brand_admin"], ["read", "climate_experiment_results"]),
    ],
)

ZORA_FOUNDATION_MODULE = DevModuleManifest(
    key="zora_foundation",
    name="THE ZORA FOUNDATION",
    description="Climate impact projects, contributions tracking, and foundation initiatives for real-world climate action.",
    domain="foundation",
    core_tables=["foundation_projects", "foundation_contributions", "foundation_impact_reports"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/foundation/projects", "List foundation projects", True, ["member", "founder", "brand_admin"], ["list", "foundation_projects"]),
        DevApiEndpoint("POST", "/api/foundation/projects", "Create a foundation project", True, ["founder"], ["create", "foundation_projects"]),
        DevApiEndpoint("GET", "/api/foundation/projects/:id", "Get a specific foundation project", True, ["member", "founder", "brand_admin"], ["read", "foundation_projects"]),
        DevApiEndpoint("PUT", "/api/foundation/projects/:id", "Update a foundation project", True, ["founder"], ["update", "foundation_projects"]),
        DevApiEndpoint("GET", "/api/foundation/projects/:id/contributions", "List contributions to a project", True, ["member", "founder", "brand_admin"], ["list", "foundation_contributions"]),
        DevApiEndpoint("POST", "/api/foundation/projects/:id/contributions", "Record a contribution", True, ["member", "founder", "brand_admin"], ["create", "foundation_contributions"]),
    ],
)

CLIMATE_ACADEMY_MODULE = DevModuleManifest(
    key="climate_academy",
    name="Climate Academy",
    description="Educational content system with topics, lessons, modules, learning paths, and progress tracking.",
    domain="academy",
    core_tables=["academy_topics", "academy_lessons", "academy_modules", "academy_learning_paths", "academy_enrollments", "academy_progress"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/academy/topics", "List academy topics", True, ["member", "founder", "brand_admin"], ["list", "academy_topics"]),
        DevApiEndpoint("POST", "/api/academy/topics", "Create an academy topic", True, ["founder", "brand_admin"], ["create", "academy_topics"]),
        DevApiEndpoint("GET", "/api/academy/lessons", "List academy lessons", True, ["member", "founder", "brand_admin"], ["list", "academy_lessons"]),
        DevApiEndpoint("POST", "/api/academy/lessons", "Create an academy lesson", True, ["founder", "brand_admin"], ["create", "academy_lessons"]),
        DevApiEndpoint("GET", "/api/academy/paths", "List learning paths", True, ["member", "founder", "brand_admin"], ["list", "academy_learning_paths"]),
        DevApiEndpoint("POST", "/api/academy/paths", "Create a learning path", True, ["founder", "brand_admin"], ["create", "academy_learning_paths"]),
        DevApiEndpoint("GET", "/api/academy/paths/:id", "Get a specific learning path", True, ["member", "founder", "brand_admin"], ["read", "academy_learning_paths"]),
        DevApiEndpoint("POST", "/api/academy/paths/:id/enroll", "Enroll in a learning path", True, ["member", "founder", "brand_admin"], ["create", "academy_enrollments"]),
        DevApiEndpoint("GET", "/api/academy/progress", "Get user learning progress", True, ["member", "founder", "brand_admin"], ["read", "academy_progress"]),
    ],
)

ORGANIZATIONS_PLAYBOOKS_MODULE = DevModuleManifest(
    key="organizations_playbooks",
    name="Organizations & Playbooks",
    description="Multi-tenant organization management with climate playbooks for structured sustainability programs.",
    domain="organizations",
    core_tables=["organizations", "organization_members", "playbooks", "playbook_steps", "playbook_executions"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/organizations", "List organizations for the tenant", True, ["member", "founder", "brand_admin"], ["list", "organizations"]),
        DevApiEndpoint("POST", "/api/organizations", "Create an organization", True, ["founder", "brand_admin"], ["create", "organizations"]),
        DevApiEndpoint("GET", "/api/organizations/:id", "Get a specific organization", True, ["member", "founder", "brand_admin"], ["read", "organizations"]),
        DevApiEndpoint("PUT", "/api/organizations/:id", "Update an organization", True, ["founder", "brand_admin"], ["update", "organizations"]),
        DevApiEndpoint("GET", "/api/playbooks", "List playbooks", True, ["member", "founder", "brand_admin"], ["list", "playbooks"]),
        DevApiEndpoint("POST", "/api/playbooks", "Create a playbook", True, ["founder", "brand_admin"], ["create", "playbooks"]),
        DevApiEndpoint("GET", "/api/playbooks/:id", "Get a specific playbook", True, ["member", "founder", "brand_admin"], ["read", "playbooks"]),
        DevApiEndpoint("POST", "/api/playbooks/:id/execute", "Start playbook execution", True, ["founder", "brand_admin"], ["execute", "playbook_executions"]),
    ],
)

AUTONOMY_MODULE = DevModuleManifest(
    key="autonomy",
    name="Agent Autonomy",
    description="Task execution engine for ZORA agents with commands, tasks, safety policies, schedules, and execution tracking.",
    domain="autonomy",
    core_tables=["agent_commands", "agent_tasks", "agent_task_logs", "safety_policies", "task_schedules"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/autonomy/commands", "List agent commands", True, ["founder", "brand_admin"], ["list", "agent_commands"]),
        DevApiEndpoint("POST", "/api/autonomy/commands", "Create an agent command", True, ["founder", "brand_admin"], ["create", "agent_commands"]),
        DevApiEndpoint("GET", "/api/autonomy/tasks", "List agent tasks", True, ["founder", "brand_admin"], ["list", "agent_tasks"]),
        DevApiEndpoint("POST", "/api/autonomy/tasks", "Create an agent task", True, ["founder", "brand_admin"], ["create", "agent_tasks"]),
        DevApiEndpoint("GET", "/api/autonomy/tasks/:id", "Get a specific task", True, ["founder", "brand_admin"], ["read", "agent_tasks"]),
        DevApiEndpoint("POST", "/api/autonomy/tasks/:id/approve", "Approve a pending task", True, ["founder"], ["approve", "agent_tasks"]),
        DevApiEndpoint("POST", "/api/autonomy/tasks/:id/reject", "Reject a pending task", True, ["founder"], ["reject", "agent_tasks"]),
        DevApiEndpoint("GET", "/api/autonomy/schedules", "List task schedules", True, ["founder", "brand_admin"], ["list", "task_schedules"]),
        DevApiEndpoint("POST", "/api/autonomy/schedules", "Create a task schedule", True, ["founder"], ["create", "task_schedules"]),
        DevApiEndpoint("GET", "/api/autonomy/safety-policies", "List safety policies", True, ["founder"], ["list", "safety_policies"]),
    ],
)

AGENTS_MODULE = DevModuleManifest(
    key="agents",
    name="ZORA Agents",
    description="The 6 core ZORA agents (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM) with insights and suggestions.",
    domain="autonomy",
    core_tables=["agent_insights", "agent_suggestions", "memory_events"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/agents", "List available agents", True, ["member", "founder", "brand_admin"], ["list", "agents"]),
        DevApiEndpoint("GET", "/api/agents/:name", "Get agent details and recent activity", True, ["member", "founder", "brand_admin"], ["read", "agents"]),
        DevApiEndpoint("GET", "/api/agents/:name/insights", "Get insights from a specific agent", True, ["member", "founder", "brand_admin"], ["list", "agent_insights"]),
        DevApiEndpoint("POST", "/api/agents/:name/insights", "Create an agent insight", True, ["founder", "brand_admin"], ["create", "agent_insights"]),
        DevApiEndpoint("GET", "/api/agents/suggestions", "List agent suggestions", True, ["founder", "brand_admin"], ["list", "agent_suggestions"]),
        DevApiEndpoint("POST", "/api/agents/suggestions/:id/apply", "Apply an agent suggestion", True, ["founder"], ["apply", "agent_suggestions"]),
        DevApiEndpoint("POST", "/api/agents/suggestions/:id/reject", "Reject an agent suggestion", True, ["founder"], ["reject", "agent_suggestions"]),
    ],
)

BILLING_MODULE = DevModuleManifest(
    key="billing",
    name="Billing & Subscriptions",
    description="Subscription management, billing plans, payment processing, and commission tracking for ZORA SHOP.",
    domain="billing",
    core_tables=["billing_plans", "tenant_subscriptions", "billing_invoices", "shop_commissions", "shop_payouts"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/billing/plans", "List available billing plans", False, [], ["list", "billing_plans"]),
        DevApiEndpoint("GET", "/api/billing/subscription", "Get current tenant subscription", True, ["founder", "brand_admin"], ["read", "tenant_subscriptions"]),
        DevApiEndpoint("POST", "/api/billing/subscription", "Create or update subscription", True, ["founder"], ["create", "tenant_subscriptions"]),
        DevApiEndpoint("GET", "/api/billing/invoices", "List billing invoices", True, ["founder", "brand_admin"], ["list", "billing_invoices"]),
        DevApiEndpoint("POST", "/api/billing/webhooks/stripe", "Stripe webhook handler", False, [], ["webhook", "stripe"]),
        DevApiEndpoint("POST", "/api/billing/webhooks/paypal", "PayPal webhook handler", False, [], ["webhook", "paypal"]),
        DevApiEndpoint("GET", "/api/billing/commissions", "List shop commissions", True, ["founder", "brand_admin"], ["list", "shop_commissions"]),
    ],
)

AUTH_MODULE = DevModuleManifest(
    key="auth",
    name="Authentication & Users",
    description="User authentication, JWT tokens, password management, email verification, and account security.",
    domain="auth",
    core_tables=["tenants", "users", "password_reset_tokens", "email_verification_tokens", "account_lockouts"],
    api_endpoints=[
        DevApiEndpoint("POST", "/api/auth/register", "Register a new user", False, [], ["create", "users"]),
        DevApiEndpoint("POST", "/api/auth/login", "Login with username/password", False, [], ["auth", "login"]),
        DevApiEndpoint("POST", "/api/auth/logout", "Logout current session", True, [], ["auth", "logout"]),
        DevApiEndpoint("GET", "/api/auth/me", "Get current user info", True, [], ["read", "users"]),
        DevApiEndpoint("POST", "/api/auth/password/reset-request", "Request password reset", False, [], ["auth", "password_reset"]),
        DevApiEndpoint("POST", "/api/auth/password/reset", "Reset password with token", False, [], ["auth", "password_reset"]),
        DevApiEndpoint("POST", "/api/auth/email/verify", "Verify email address", False, [], ["auth", "email_verification"]),
        DevApiEndpoint("POST", "/api/auth/email/resend", "Resend verification email", True, [], ["auth", "email_verification"]),
    ],
)

SEED_ONBOARDING_MODULE = DevModuleManifest(
    key="seed_onboarding",
    name="Seed Data & Onboarding",
    description="Tenant onboarding with seed data for climate missions, materials, products, and learning content.",
    domain="system",
    core_tables=["seed_runs"],
    api_endpoints=[
        DevApiEndpoint("POST", "/api/admin/tenants/:id/seed", "Run seed data for a tenant", True, ["founder"], ["admin", "seed"]),
    ],
)

ADMIN_MODULE = DevModuleManifest(
    key="admin",
    name="Admin & System",
    description="Administrative endpoints for tenant management, user management, system status, and developer tools.",
    domain="system",
    core_tables=["tenants", "users", "schema_metadata"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/admin/status", "Get system status", True, ["founder"], ["admin", "status"]),
        DevApiEndpoint("GET", "/api/admin/schema-status", "Get database schema status", True, ["founder"], ["admin", "schema"]),
        DevApiEndpoint("POST", "/api/admin/bootstrap", "Bootstrap initial tenant and user", True, ["founder"], ["admin", "bootstrap"]),
        DevApiEndpoint("GET", "/api/admin/tenants", "List all tenants", True, ["founder"], ["admin", "tenants"]),
        DevApiEndpoint("POST", "/api/admin/tenants/:id/users", "Create a user for a tenant", True, ["founder", "brand_admin"], ["admin", "users"]),
        DevApiEndpoint("POST", "/api/admin/token", "Generate JWT token for a user", True, ["founder"], ["admin", "token"]),
        DevApiEndpoint("GET", "/api/admin/dev/manifest", "Get the dev knowledge manifest", True, ["founder", "brand_admin"], ["admin", "dev"]),
    ],
)

OBSERVABILITY_MODULE = DevModuleManifest(
    key="observability",
    name="Observability & Metrics",
    description="System metrics, autonomy status, and monitoring endpoints for operational visibility.",
    domain="system",
    core_tables=["system_metrics", "system_alerts"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/system-metrics", "Get system metrics", True, ["founder", "brand_admin"], ["read", "system_metrics"]),
        DevApiEndpoint("GET", "/api/autonomy-status", "Get autonomy system status", True, ["founder", "brand_admin"], ["read", "autonomy_status"]),
    ],
)

JOURNAL_MODULE = DevModuleManifest(
    key="journal",
    name="Journal & Audit",
    description="Human-readable timeline of events, decisions, and system changes for audit and transparency.",
    domain="system",
    core_tables=["journal_entries"],
    api_endpoints=[
        DevApiEndpoint("GET", "/api/journal", "List journal entries", True, ["member", "founder", "brand_admin"], ["list", "journal_entries"]),
        DevApiEndpoint("POST", "/api/journal", "Create a journal entry", True, ["member", "founder", "brand_admin"], ["create", "journal_entries"]),
        DevApiEndpoint("GET", "/api/journal/:id", "Get a specific journal entry", True, ["member", "founder", "brand_admin"], ["read", "journal_entries"]),
    ],
)

# ============================================================================
# ALL MODULES
# ============================================================================

ALL_MODULES: List[DevModuleManifest] = [
    CLIMATE_OS_MODULE,
    ZORA_SHOP_MODULE,
    HEMP_MATERIALS_MODULE,
    GOES_GREEN_MODULE,
    QUANTUM_CLIMATE_LAB_MODULE,
    ZORA_FOUNDATION_MODULE,
    CLIMATE_ACADEMY_MODULE,
    ORGANIZATIONS_PLAYBOOKS_MODULE,
    AUTONOMY_MODULE,
    AGENTS_MODULE,
    BILLING_MODULE,
    AUTH_MODULE,
    SEED_ONBOARDING_MODULE,
    ADMIN_MODULE,
    OBSERVABILITY_MODULE,
    JOURNAL_MODULE,
]

# ============================================================================
# MANIFEST FUNCTIONS
# ============================================================================


def get_dev_manifest() -> DevManifest:
    """
    Get the complete Dev Knowledge & API Manifest for ZORA CORE.
    This manifest describes all modules, tables, and API endpoints.
    """
    return DevManifest(
        version=MANIFEST_VERSION,
        generated_at=datetime.utcnow().isoformat() + "Z",
        modules=ALL_MODULES,
    )


def get_module_by_key(key: str) -> Optional[DevModuleManifest]:
    """Get a specific module by key."""
    for module in ALL_MODULES:
        if module.key == key:
            return module
    return None


def get_modules_by_domain(domain: ModuleDomain) -> List[DevModuleManifest]:
    """Get all modules for a specific domain."""
    return [m for m in ALL_MODULES if m.domain == domain]


def search_endpoints(query: str) -> List[DevApiEndpoint]:
    """Search endpoints across all modules."""
    lower_query = query.lower()
    results: List[DevApiEndpoint] = []
    
    for module in ALL_MODULES:
        for endpoint in module.api_endpoints:
            if (
                lower_query in endpoint.path.lower()
                or lower_query in endpoint.description.lower()
                or any(lower_query in tag.lower() for tag in endpoint.tags)
            ):
                results.append(endpoint)
    
    return results


def get_manifest_stats() -> dict:
    """Get statistics about the manifest."""
    endpoint_count = sum(len(m.api_endpoints) for m in ALL_MODULES)
    all_tables = set()
    for module in ALL_MODULES:
        all_tables.update(module.core_tables)
    domains = list(set(m.domain for m in ALL_MODULES))
    
    return {
        "module_count": len(ALL_MODULES),
        "endpoint_count": endpoint_count,
        "table_count": len(all_tables),
        "domains": domains,
    }
