"""
ZORA CORE Agent Autonomy Layer

This module provides the Agent Autonomy Layer for ZORA CORE, enabling agents
to process tasks from a queue and propose changes that humans can review.

Key components:
- runtime: Agent Runtime v1 - task queue processing and agent dispatch
- cli: Command-line interface for running the runtime
- frontend_suggestions: Generate frontend config change suggestions via LLM
"""

from .frontend_suggestions import (
    generate_frontend_config_suggestion,
    AgentSuggestionResult,
    FrontendConfigSuggestion,
)

from .runtime import (
    AgentRuntime,
    AgentTask,
    AgentTaskResult,
    AgentRuntimeContext,
    is_runtime_configured,
)

__all__ = [
    # Frontend suggestions
    "generate_frontend_config_suggestion",
    "AgentSuggestionResult",
    "FrontendConfigSuggestion",
    # Agent Runtime v1
    "AgentRuntime",
    "AgentTask",
    "AgentTaskResult",
    "AgentRuntimeContext",
    "is_runtime_configured",
]
