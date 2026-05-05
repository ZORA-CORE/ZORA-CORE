import unittest

from swarm.coordinator import StateToolMismatchError, SwarmCoordinator
from swarm.orchestrator import LoopState, OrchestrationContext
from swarm.tool_contracts import ToolAuthorizationError, ToolName, default_tool_policy


class SwarmCoordinatorTests(unittest.TestCase):
    def test_accepts_valid_tool_for_state(self) -> None:
        coordinator = SwarmCoordinator(
            OrchestrationContext(objective_id="obj-coord-1"),
            default_tool_policy(),
        )

        decision = coordinator.request_tool(
            tool=ToolName.PLAN_TASK,
            actor="pm-agent",
            reason="create task graph",
        )

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.state, LoopState.SCOPE_PLAN)

    def test_rejects_tool_not_allowed_in_state(self) -> None:
        coordinator = SwarmCoordinator(
            OrchestrationContext(objective_id="obj-coord-2"),
            default_tool_policy(),
        )

        with self.assertRaises(StateToolMismatchError):
            coordinator.request_tool(
                tool=ToolName.EDIT_PATCH,
                actor="dev-agent",
                reason="attempt patch too early",
            )

    def test_rejects_high_risk_without_approval(self) -> None:
        coordinator = SwarmCoordinator(
            OrchestrationContext(objective_id="obj-coord-3"),
            default_tool_policy(),
        )

        coordinator.transition(LoopState.DECOMPOSE, "plan_created")
        coordinator.transition(LoopState.IMPLEMENT, "tasks_split")
        coordinator.transition(LoopState.BUILD_TEST, "impl_done")
        coordinator.transition(LoopState.DIAGNOSE, "test_failure")
        coordinator.transition(LoopState.PATCH, "fix_ready")
        coordinator.transition(LoopState.RETEST, "retest_phase")

        with self.assertRaises(ToolAuthorizationError):
            coordinator.request_tool(
                tool=ToolName.OPEN_BROWSER_TEST,
                actor="qa-agent",
                reason="run e2e visual",
            )

    def test_accepts_high_risk_with_approval(self) -> None:
        coordinator = SwarmCoordinator(
            OrchestrationContext(objective_id="obj-coord-4"),
            default_tool_policy(),
        )

        coordinator.transition(LoopState.DECOMPOSE, "plan_created")
        coordinator.transition(LoopState.IMPLEMENT, "tasks_split")
        coordinator.transition(LoopState.BUILD_TEST, "impl_done")
        coordinator.transition(LoopState.DIAGNOSE, "test_failure")
        coordinator.transition(LoopState.PATCH, "fix_ready")
        coordinator.transition(LoopState.RETEST, "retest_phase")

        decision = coordinator.request_tool(
            tool=ToolName.OPEN_BROWSER_TEST,
            actor="qa-agent",
            reason="run e2e visual",
            high_risk_approved=True,
        )

        self.assertTrue(decision.accepted)
        self.assertEqual(decision.objective_id, "obj-coord-4")


if __name__ == "__main__":
    unittest.main()
