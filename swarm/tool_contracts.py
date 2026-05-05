"""Typed tool contracts and policy enforcement for swarm actions.

This module introduces a secure, auditable interface between orchestration logic
and execution backends. It ensures that tool calls are validated before runtime
and can be blocked by policy without shell-level side effects.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class RiskLevel(str, Enum):
    """Risk categories used for policy gating."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolName(str, Enum):
    """Allowed orchestration tools for v1."""

    PLAN_TASK = "plan_task"
    READ_REPO = "read_repo"
    EDIT_PATCH = "edit_patch"
    RUN_BUILD = "run_build"
    RUN_TESTS = "run_tests"
    RUN_SECURITY_SCAN = "run_security_scan"
    RUN_PERF_BENCHMARK = "run_perf_benchmark"
    OPEN_BROWSER_TEST = "open_browser_test"
    CREATE_PR_ARTIFACTS = "create_pr_artifacts"


TOOL_RISK_MAP: Dict[ToolName, RiskLevel] = {
    ToolName.PLAN_TASK: RiskLevel.LOW,
    ToolName.READ_REPO: RiskLevel.LOW,
    ToolName.EDIT_PATCH: RiskLevel.MEDIUM,
    ToolName.RUN_BUILD: RiskLevel.MEDIUM,
    ToolName.RUN_TESTS: RiskLevel.MEDIUM,
    ToolName.RUN_SECURITY_SCAN: RiskLevel.MEDIUM,
    ToolName.RUN_PERF_BENCHMARK: RiskLevel.MEDIUM,
    ToolName.OPEN_BROWSER_TEST: RiskLevel.HIGH,
    ToolName.CREATE_PR_ARTIFACTS: RiskLevel.HIGH,
}


class ToolContractError(ValueError):
    """Raised when tool requests violate contract constraints."""


class ToolAuthorizationError(PermissionError):
    """Raised when policy denies a tool call."""


@dataclass(frozen=True)
class ToolRequest:
    """Validated request object for a single tool invocation."""

    tool: ToolName
    objective_id: str
    actor: str
    payload: Dict[str, object] = field(default_factory=dict)
    reason: str = ""

    def validate(self) -> None:
        """Validate request fields before execution."""
        if not self.objective_id.strip():
            raise ToolContractError("objective_id is required")
        if not self.actor.strip():
            raise ToolContractError("actor is required")
        if not self.reason.strip():
            raise ToolContractError("reason is required")


@dataclass(frozen=True)
class ToolResult:
    """Auditable result envelope for tool execution outcomes."""

    tool: ToolName
    ok: bool
    message: str
    data: Optional[Dict[str, object]] = None


@dataclass(frozen=True)
class ToolPolicy:
    """Policy controls for tool authorization."""

    allowed_tools: List[ToolName]
    max_risk: RiskLevel = RiskLevel.MEDIUM
    require_explicit_high_risk_approval: bool = True


_RISK_ORDER = {
    RiskLevel.LOW: 1,
    RiskLevel.MEDIUM: 2,
    RiskLevel.HIGH: 3,
    RiskLevel.CRITICAL: 4,
}


class ToolPolicyGate:
    """Authorizes or denies tool requests using deterministic policy rules."""

    def __init__(self, policy: ToolPolicy) -> None:
        self.policy = policy

    def _is_risk_allowed(self, risk: RiskLevel) -> bool:
        return _RISK_ORDER[risk] <= _RISK_ORDER[self.policy.max_risk]

    def authorize(self, request: ToolRequest, high_risk_approved: bool = False) -> None:
        """Raise ToolAuthorizationError when a tool invocation is not permitted."""
        request.validate()

        if request.tool not in self.policy.allowed_tools:
            raise ToolAuthorizationError(f"Tool not allowed: {request.tool.value}")

        risk = TOOL_RISK_MAP[request.tool]
        if not self._is_risk_allowed(risk):
            raise ToolAuthorizationError(
                f"Tool risk {risk.value} exceeds policy max_risk {self.policy.max_risk.value}"
            )

        if (
            risk in {RiskLevel.HIGH, RiskLevel.CRITICAL}
            and self.policy.require_explicit_high_risk_approval
            and not high_risk_approved
        ):
            raise ToolAuthorizationError(
                f"High-risk tool requires approval: {request.tool.value}"
            )


def default_tool_policy() -> ToolPolicy:
    """Return a secure-by-default policy profile for local development."""
    return ToolPolicy(
        allowed_tools=[
            ToolName.PLAN_TASK,
            ToolName.READ_REPO,
            ToolName.EDIT_PATCH,
            ToolName.RUN_BUILD,
            ToolName.RUN_TESTS,
            ToolName.RUN_SECURITY_SCAN,
            ToolName.RUN_PERF_BENCHMARK,
            ToolName.OPEN_BROWSER_TEST,
            ToolName.CREATE_PR_ARTIFACTS,
        ],
        max_risk=RiskLevel.HIGH,
        require_explicit_high_risk_approval=True,
    )
