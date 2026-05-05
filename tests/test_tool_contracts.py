import unittest

from swarm.tool_contracts import (
    RiskLevel,
    ToolAuthorizationError,
    ToolName,
    ToolPolicy,
    ToolPolicyGate,
    ToolRequest,
    default_tool_policy,
)


class ToolContractsTests(unittest.TestCase):
    def test_request_validation_requires_reason(self) -> None:
        req = ToolRequest(
            tool=ToolName.RUN_TESTS,
            objective_id="obj-1",
            actor="qa-agent",
            reason="   ",
            payload={"suite": "unit"},
        )

        with self.assertRaises(ValueError):
            req.validate()

    def test_policy_denies_disallowed_tool(self) -> None:
        policy = ToolPolicy(
            allowed_tools=[ToolName.READ_REPO],
            max_risk=RiskLevel.HIGH,
        )
        gate = ToolPolicyGate(policy)
        req = ToolRequest(
            tool=ToolName.RUN_TESTS,
            objective_id="obj-2",
            actor="qa-agent",
            reason="execute test suite",
        )

        with self.assertRaises(ToolAuthorizationError):
            gate.authorize(req)

    def test_policy_enforces_risk_ceiling(self) -> None:
        policy = ToolPolicy(
            allowed_tools=[ToolName.OPEN_BROWSER_TEST],
            max_risk=RiskLevel.MEDIUM,
        )
        gate = ToolPolicyGate(policy)
        req = ToolRequest(
            tool=ToolName.OPEN_BROWSER_TEST,
            objective_id="obj-3",
            actor="qa-agent",
            reason="run e2e validation",
        )

        with self.assertRaises(ToolAuthorizationError):
            gate.authorize(req)

    def test_high_risk_requires_explicit_approval(self) -> None:
        policy = default_tool_policy()
        gate = ToolPolicyGate(policy)
        req = ToolRequest(
            tool=ToolName.OPEN_BROWSER_TEST,
            objective_id="obj-4",
            actor="qa-agent",
            reason="run visual regression",
        )

        with self.assertRaises(ToolAuthorizationError):
            gate.authorize(req)

        gate.authorize(req, high_risk_approved=True)

    def test_medium_risk_passes_under_default_policy(self) -> None:
        policy = default_tool_policy()
        gate = ToolPolicyGate(policy)
        req = ToolRequest(
            tool=ToolName.RUN_TESTS,
            objective_id="obj-5",
            actor="qa-agent",
            reason="validate patch",
            payload={"suite": "unit"},
        )

        gate.authorize(req)


if __name__ == "__main__":
    unittest.main()
