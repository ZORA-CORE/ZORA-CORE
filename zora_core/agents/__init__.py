"""
ZORA CORE Agents - The Nordic Pantheon

The seven core agents that form the heart of ZORA CORE:
- ODIN: Chief Strategist & Research Lead (he/him) - formerly CONNOR
- THOR: Backend & Infrastructure Engineer (he/him) - new agent
- FREYA: Humans, Storytelling & Growth (she/her) - new agent
- BALDUR: Frontend, UX & Product Experience (he/him) - formerly SAM
- HEIMDALL: Observability & Monitoring (he/him) - formerly ORACLE
- TYR: Ethics, Safety & Climate Integrity (he/him) - formerly LUMINA + AEGIS
- EIVOR: Memory & Knowledge Keeper (she/her) - unchanged
"""

from .base_agent import BaseAgent, Plan, Step, StepResult, Reflection, AgentConfig, RiskLevel, StepStatus
from .connor import ConnorAgent
from .lumina import LuminaAgent
from .eivor import EivorAgent
from .oracle import OracleAgent
from .aegis import AegisAgent
from .sam import SamAgent

__all__ = [
    # Base classes
    "BaseAgent",
    "Plan",
    "Step",
    "StepResult",
    "Reflection",
    "AgentConfig",
    "RiskLevel",
    "StepStatus",
    # Agent implementations
    "ConnorAgent",
    "LuminaAgent",
    "EivorAgent",
    "OracleAgent",
    "AegisAgent",
    "SamAgent",
]
