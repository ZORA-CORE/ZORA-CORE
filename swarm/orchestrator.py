"""Core state-machine orchestrator for the AGI Engineer Swarm.

This module implements a deterministic, policy-aware workflow controller for
one engineering objective. It models the Infinity Loop:

    scope_plan -> decompose -> implement -> build_test -> diagnose
    -> patch -> retest -> security_perf_gate -> package_pr -> learn_persist

Safety guarantees:
- Explicit transition graph (no implicit jumps).
- Immutable audit trail of every transition.
- Retry budget enforcement for debugging loops.
- Hard validation of transition reasons for traceability.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional


class LoopState(str, Enum):
    """Lifecycle states for a single engineering objective."""

    SCOPE_PLAN = "scope_plan"
    DECOMPOSE = "decompose"
    IMPLEMENT = "implement"
    BUILD_TEST = "build_test"
    DIAGNOSE = "diagnose"
    PATCH = "patch"
    RETEST = "retest"
    SECURITY_PERF_GATE = "security_perf_gate"
    PACKAGE_PR = "package_pr"
    LEARN_PERSIST = "learn_persist"
    COMPLETED = "completed"
    FAILED = "failed"


# Allowed directed transitions.
TRANSITIONS: Dict[LoopState, List[LoopState]] = {
    LoopState.SCOPE_PLAN: [LoopState.DECOMPOSE, LoopState.FAILED],
    LoopState.DECOMPOSE: [LoopState.IMPLEMENT, LoopState.FAILED],
    LoopState.IMPLEMENT: [LoopState.BUILD_TEST, LoopState.FAILED],
    LoopState.BUILD_TEST: [LoopState.SECURITY_PERF_GATE, LoopState.DIAGNOSE, LoopState.FAILED],
    LoopState.DIAGNOSE: [LoopState.PATCH, LoopState.FAILED],
    LoopState.PATCH: [LoopState.RETEST, LoopState.FAILED],
    LoopState.RETEST: [LoopState.SECURITY_PERF_GATE, LoopState.DIAGNOSE, LoopState.FAILED],
    LoopState.SECURITY_PERF_GATE: [LoopState.PACKAGE_PR, LoopState.DIAGNOSE, LoopState.FAILED],
    LoopState.PACKAGE_PR: [LoopState.LEARN_PERSIST, LoopState.FAILED],
    LoopState.LEARN_PERSIST: [LoopState.COMPLETED, LoopState.FAILED],
    LoopState.COMPLETED: [],
    LoopState.FAILED: [],
}


@dataclass(frozen=True)
class TransitionEvent:
    """Immutable audit log entry for each state transition."""

    sequence: int
    from_state: LoopState
    to_state: LoopState
    reason: str
    at_utc: datetime


@dataclass(frozen=True)
class OrchestrationPolicy:
    """Policy knobs controlling loop behavior and safety bounds."""

    max_debug_cycles: int = 5
    require_non_empty_reason: bool = True


@dataclass
class OrchestrationContext:
    """Mutable state for one orchestration run."""

    objective_id: str
    policy: OrchestrationPolicy = field(default_factory=OrchestrationPolicy)
    state: LoopState = LoopState.SCOPE_PLAN
    debug_cycles: int = 0
    transition_count: int = 0
    history: List[TransitionEvent] = field(default_factory=list)

    def snapshot(self) -> Dict[str, object]:
        """Serialize current context into a JSON-friendly dictionary."""
        return {
            "objective_id": self.objective_id,
            "state": self.state.value,
            "debug_cycles": self.debug_cycles,
            "transition_count": self.transition_count,
            "max_debug_cycles": self.policy.max_debug_cycles,
        }


class TransitionError(ValueError):
    """Raised when an illegal state transition is requested."""


class RetryBudgetExceeded(RuntimeError):
    """Raised when debug cycle budget is exceeded."""


class ReasonRequiredError(ValueError):
    """Raised when a transition reason is missing while policy requires one."""


class SwarmOrchestrator:
    """Deterministic orchestrator for the Infinity Loop state machine."""

    def __init__(self, context: OrchestrationContext) -> None:
        self.context = context

    def next_states(self) -> List[LoopState]:
        """Return all allowed next states from the current state."""
        return list(TRANSITIONS[self.context.state])

    def can_transition_to(self, next_state: LoopState) -> bool:
        """Return True if the next state is valid from the current state."""
        return next_state in TRANSITIONS[self.context.state]

    def _validate_reason(self, reason: str) -> None:
        if self.context.policy.require_non_empty_reason and not reason.strip():
            raise ReasonRequiredError("Transition reason is required by policy")

    def _record_transition(self, current: LoopState, next_state: LoopState, reason: str) -> None:
        self.context.transition_count += 1
        self.context.history.append(
            TransitionEvent(
                sequence=self.context.transition_count,
                from_state=current,
                to_state=next_state,
                reason=reason,
                at_utc=datetime.now(timezone.utc),
            )
        )

    def _consume_debug_cycle_if_needed(self, current: LoopState, next_state: LoopState) -> None:
        # Count one debug cycle only when a retest fails and loops back to diagnose.
        if current == LoopState.RETEST and next_state == LoopState.DIAGNOSE:
            self.context.debug_cycles += 1
            if self.context.debug_cycles > self.context.policy.max_debug_cycles:
                self.context.state = LoopState.FAILED
                raise RetryBudgetExceeded(
                    f"Debug cycle budget exceeded ({self.context.policy.max_debug_cycles})"
                )

    def transition(self, next_state: LoopState, reason: str) -> None:
        """Advance to `next_state` if policy and graph constraints allow it."""
        self._validate_reason(reason)

        current = self.context.state
        if not self.can_transition_to(next_state):
            raise TransitionError(f"Invalid transition: {current.value} -> {next_state.value}")

        self._consume_debug_cycle_if_needed(current, next_state)
        self._record_transition(current, next_state, reason)
        self.context.state = next_state

    def fail(self, reason: str) -> None:
        """Force transition to FAILED for any non-terminal state."""
        self._validate_reason(reason)
        if self.context.state in {LoopState.COMPLETED, LoopState.FAILED}:
            return

        current = self.context.state
        # Emergency fail transition intentionally bypasses transition graph to allow
        # external policy interrupts (e.g., critical security incident).
        self._record_transition(current, LoopState.FAILED, reason)
        self.context.state = LoopState.FAILED

    def complete(self, reason: Optional[str] = None) -> None:
        """Complete the workflow from LEARN_PERSIST."""
        if self.context.state != LoopState.LEARN_PERSIST:
            raise TransitionError(
                "Workflow can only be completed after LEARN_PERSIST state"
            )
        self.transition(LoopState.COMPLETED, reason or "workflow_completed")
