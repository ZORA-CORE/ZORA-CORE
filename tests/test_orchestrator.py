import unittest

from swarm.orchestrator import (
    LoopState,
    OrchestrationContext,
    OrchestrationPolicy,
    ReasonRequiredError,
    RetryBudgetExceeded,
    SwarmOrchestrator,
    TransitionError,
)


class SwarmOrchestratorTests(unittest.TestCase):
    def test_happy_path_to_completed(self) -> None:
        ctx = OrchestrationContext(objective_id="obj-1")
        orch = SwarmOrchestrator(ctx)

        orch.transition(LoopState.DECOMPOSE, "plan_ready")
        orch.transition(LoopState.IMPLEMENT, "tasks_split")
        orch.transition(LoopState.BUILD_TEST, "code_done")
        orch.transition(LoopState.SECURITY_PERF_GATE, "tests_green")
        orch.transition(LoopState.PACKAGE_PR, "gates_green")
        orch.transition(LoopState.LEARN_PERSIST, "pr_created")
        orch.complete()

        self.assertEqual(ctx.state, LoopState.COMPLETED)
        self.assertEqual(len(ctx.history), 7)
        self.assertEqual(ctx.history[-1].sequence, 7)

    def test_invalid_transition_raises(self) -> None:
        ctx = OrchestrationContext(objective_id="obj-2")
        orch = SwarmOrchestrator(ctx)

        with self.assertRaises(TransitionError):
            orch.transition(LoopState.IMPLEMENT, "skipping_decompose")

    def test_retry_budget_exceeded_on_retest_loop(self) -> None:
        ctx = OrchestrationContext(
            objective_id="obj-3",
            policy=OrchestrationPolicy(max_debug_cycles=1),
        )
        orch = SwarmOrchestrator(ctx)

        orch.transition(LoopState.DECOMPOSE, "plan_ready")
        orch.transition(LoopState.IMPLEMENT, "tasks_split")
        orch.transition(LoopState.BUILD_TEST, "code_done")
        orch.transition(LoopState.DIAGNOSE, "test_fail")
        orch.transition(LoopState.PATCH, "apply_fix_1")
        orch.transition(LoopState.RETEST, "rerun_1")
        orch.transition(LoopState.DIAGNOSE, "still_failing_once")

        orch.transition(LoopState.PATCH, "apply_fix_2")
        orch.transition(LoopState.RETEST, "rerun_2")

        with self.assertRaises(RetryBudgetExceeded):
            orch.transition(LoopState.DIAGNOSE, "still_failing_twice")

        self.assertEqual(ctx.state, LoopState.FAILED)

    def test_fail_helper_moves_to_failed(self) -> None:
        ctx = OrchestrationContext(objective_id="obj-4")
        orch = SwarmOrchestrator(ctx)

        orch.fail("policy_violation")

        self.assertEqual(ctx.state, LoopState.FAILED)
        self.assertEqual(ctx.history[-1].reason, "policy_violation")

    def test_reason_is_required_by_default(self) -> None:
        ctx = OrchestrationContext(objective_id="obj-5")
        orch = SwarmOrchestrator(ctx)

        with self.assertRaises(ReasonRequiredError):
            orch.transition(LoopState.DECOMPOSE, "   ")

    def test_snapshot_contains_operational_fields(self) -> None:
        ctx = OrchestrationContext(objective_id="obj-6")
        orch = SwarmOrchestrator(ctx)
        orch.transition(LoopState.DECOMPOSE, "plan_ready")

        snap = ctx.snapshot()
        self.assertEqual(snap["objective_id"], "obj-6")
        self.assertEqual(snap["state"], LoopState.DECOMPOSE.value)
        self.assertEqual(snap["transition_count"], 1)


if __name__ == "__main__":
    unittest.main()
