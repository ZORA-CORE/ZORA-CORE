"""
ZORA CORE Agent Autonomy Layer

This module provides the Agent Autonomy Layer for ZORA CORE, enabling agents
(SAM, LUMINA) to propose frontend config changes that humans can review and approve.

Key components:
- frontend_suggestions: Generate frontend config change suggestions via LLM
"""

from .frontend_suggestions import (
    generate_frontend_config_suggestion,
    AgentSuggestionResult,
    FrontendConfigSuggestion,
)

__all__ = [
    "generate_frontend_config_suggestion",
    "AgentSuggestionResult",
    "FrontendConfigSuggestion",
]
