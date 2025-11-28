"""
ZORA CORE Agents

The six core agents that form the heart of ZORA CORE:
- CONNOR: Developer / System Problem Solver (he/him)
- LUMINA: Planner / Orchestrator (she/her)
- EIVOR: Memory / Knowledge Weaver (she/her)
- ORACLE: Research & Foresight Engine (they/them)
- AEGIS: Safety, Security & Alignment Guardian (they/them)
- SAM: Frontend & Experience Architect (he/him)
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
