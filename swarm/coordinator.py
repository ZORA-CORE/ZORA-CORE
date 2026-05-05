"""Runtime coordinator that binds orchestration state and tool authorization.

The coordinator is the first executable integration layer between:
- `SwarmOrchestrator` (workflow state machine)
- `ToolPolicyGate` (security and risk authorization)

It ensures that a tool can only be requested when:
1) the current workflow state permits that tool category, and
2) policy authorization succeeds.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from .orchestrator import LoopState, OrchestrationContext, SwarmOrchestrator
from .tool_contracts import ToolName, ToolPolicy, ToolPolicyGate, ToolRequest


class StateToolMismatchError(ValueError):
    """Raised when a tool is requested from an invalid orchestration state."""


# State -> allowed tool set.
STATE_TOOL_POLICY: Dict[LoopState, List[ToolName]] = {
    LoopState.SCOPE_PLAN: [ToolName.PLAN_TASK, ToolName.READ_REPO],
    LoopState.DECOMPOSE: [ToolName.PLAN_TASK, ToolName.READ_REPO],
    LoopState.IMPLEMENT: [ToolName.READ_REPO, ToolName.EDIT_PATCH, ToolName.RUN_BUILD],
    LoopState.BUILD_TEST: [ToolName.RUN_BUILD, ToolName.RUN_TESTS, ToolName.READ_REPO],
    LoopState.DIAGNOSE: [ToolName.READ_REPO, ToolName.RUN_TESTS, ToolName.RUN_SECURITY_SCAN],
    LoopState.PATCH: [ToolName.EDIT_PATCH, ToolName.READ_REPO, ToolName.RUN_BUILD],
    LoopState.RETEST: [ToolName.RUN_TESTS, ToolName.RUN_PERF_BENCHMARK, ToolName.OPEN_BROWSER_TEST],
    LoopState.SECURITY_PERF_GATE: [
        ToolName.RUN_SECURITY_SCAN,
        ToolName.RUN_PERF_BENCHMARK,
        ToolName.RUN_TESTS,
    ],
    LoopState.PACKAGE_PR: [ToolName.CREATE_PR_ARTIFACTS, ToolName.READ_REPO],
    LoopState.LEARN_PERSIST: [ToolName.READ_REPO, ToolName.PLAN_TASK],
    LoopState.COMPLETED: [],
    LoopState.FAILED: [],
}


@dataclass(frozen=True)
class CoordinatorDecision:
    """Result object for accepted tool requests."""

    accepted: bool
    tool: ToolName
    state: LoopState
    objective_id: str


class SwarmCoordinator:
    """Integration layer that enforces workflow-state + policy safety."""

    def __init__(self, context: OrchestrationContext, tool_policy: ToolPolicy) -> None:
        self.orchestrator = SwarmOrchestrator(context)
        self.tool_gate = ToolPolicyGate(tool_policy)

    @property
    def context(self) -> OrchestrationContext:
        return self.orchestrator.context

    def _ensure_tool_allowed_for_state(self, tool: ToolName) -> None:
        state = self.context.state
        allowed = STATE_TOOL_POLICY[state]
        if tool not in allowed:
            raise StateToolMismatchError(
                f"Tool {tool.value} is not allowed in state {state.value}"
            )

    def request_tool(
        self,
        *,
        tool: ToolName,
        actor: str,
        reason: str,
        payload: Optional[Dict[str, object]] = None,
        high_risk_approved: bool = False,
    ) -> CoordinatorDecision:
        """Validate and authorize a tool request for current state."""
        self._ensure_tool_allowed_for_state(tool)

        request = ToolRequest(
            tool=tool,
            objective_id=self.context.objective_id,
            actor=actor,
            reason=reason,
            payload=payload or {},
        )
        self.tool_gate.authorize(request, high_risk_approved=high_risk_approved)
        return CoordinatorDecision(
            accepted=True,
            tool=tool,
            state=self.context.state,
            objective_id=self.context.objective_id,
        )

    def transition(self, next_state: LoopState, reason: str) -> None:
        """Proxy transition helper for upper-layer runners."""
        self.orchestrator.transition(next_state, reason)
