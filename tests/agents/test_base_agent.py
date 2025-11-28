"""
Tests for BaseAgent and related data structures.
"""

import pytest
from datetime import timedelta

from zora_core.agents import (
    AgentConfig,
    Plan,
    Step,
    StepResult,
    Reflection,
    RiskLevel,
    StepStatus,
)


class TestAgentConfig:
    """Tests for AgentConfig dataclass."""

    def test_create_config(self):
        """Test creating an agent configuration."""
        config = AgentConfig(
            name="TEST_AGENT",
            role="Test Role",
            pronouns="they/them",
            description="A test agent",
            capabilities=["testing"],
            tools=["test_tool"],
        )
        
        assert config.name == "TEST_AGENT"
        assert config.role == "Test Role"
        assert config.pronouns == "they/them"
        assert config.description == "A test agent"
        assert "testing" in config.capabilities
        assert "test_tool" in config.tools

    def test_default_values(self):
        """Test default values in AgentConfig."""
        config = AgentConfig(
            name="TEST",
            role="Test",
            pronouns="they/them",
            description="Test",
        )
        
        assert config.rate_limit == 60
        assert config.timeout == 30
        assert config.retry_attempts == 3
        assert config.capabilities == []
        assert config.tools == []


class TestStep:
    """Tests for Step dataclass."""

    def test_create_step(self):
        """Test creating a step with factory method."""
        step = Step.create(
            description="Test step",
            action_type="test_action",
            assignee="CONNOR",
        )
        
        assert step.step_id.startswith("step_")
        assert step.description == "Test step"
        assert step.action_type == "test_action"
        assert step.assignee == "CONNOR"
        assert step.risk_level == RiskLevel.LOW

    def test_step_with_risk_level(self):
        """Test creating a step with high risk level."""
        step = Step.create(
            description="Risky step",
            action_type="dangerous_action",
            risk_level=RiskLevel.HIGH,
            requires_aegis_review=True,
        )
        
        assert step.risk_level == RiskLevel.HIGH
        assert step.requires_aegis_review is True


class TestPlan:
    """Tests for Plan dataclass."""

    def test_create_plan(self):
        """Test creating a plan with factory method."""
        plan = Plan.create(
            goal="Test goal",
            created_by="LUMINA",
        )
        
        assert plan.plan_id.startswith("plan_")
        assert plan.goal == "Test goal"
        assert plan.created_by == "LUMINA"
        assert plan.risk_level == RiskLevel.LOW
        assert len(plan.steps) == 0

    def test_add_step_to_plan(self):
        """Test adding steps to a plan."""
        plan = Plan.create(goal="Test goal")
        
        step1 = Step.create(description="Step 1", action_type="action1")
        step2 = Step.create(description="Step 2", action_type="action2")
        
        plan.add_step(step1)
        plan.add_step(step2)
        
        assert len(plan.steps) == 2
        assert plan.steps[0].description == "Step 1"
        assert plan.steps[1].description == "Step 2"

    def test_plan_risk_level_updates(self):
        """Test that plan risk level updates based on steps."""
        plan = Plan.create(goal="Test goal")
        
        # Add low risk step
        plan.add_step(Step.create(
            description="Low risk",
            action_type="safe",
            risk_level=RiskLevel.LOW,
        ))
        assert plan.risk_level == RiskLevel.LOW
        
        # Add high risk step
        plan.add_step(Step.create(
            description="High risk",
            action_type="dangerous",
            risk_level=RiskLevel.HIGH,
        ))
        assert plan.risk_level == RiskLevel.HIGH
        assert plan.requires_aegis_review is True


class TestStepResult:
    """Tests for StepResult dataclass."""

    def test_success_result(self):
        """Test creating a successful step result."""
        result = StepResult.success(
            step_id="step_123",
            output={"data": "test"},
        )
        
        assert result.step_id == "step_123"
        assert result.status == StepStatus.SUCCESS
        assert result.output == {"data": "test"}
        assert result.error is None

    def test_failure_result(self):
        """Test creating a failed step result."""
        result = StepResult.failure(
            step_id="step_456",
            error="Something went wrong",
        )
        
        assert result.step_id == "step_456"
        assert result.status == StepStatus.FAILURE
        assert result.error == "Something went wrong"


class TestReflection:
    """Tests for Reflection dataclass."""

    def test_create_reflection(self):
        """Test creating a reflection with factory method."""
        reflection = Reflection.create(
            summary="Test reflection",
            agent_name="CONNOR",
            lessons_learned=["Lesson 1", "Lesson 2"],
            improvements_suggested=["Improvement 1"],
            confidence_score=0.85,
        )
        
        assert reflection.reflection_id.startswith("reflect_")
        assert reflection.summary == "Test reflection"
        assert reflection.agent_name == "CONNOR"
        assert len(reflection.lessons_learned) == 2
        assert len(reflection.improvements_suggested) == 1
        assert reflection.confidence_score == 0.85


class TestRiskLevel:
    """Tests for RiskLevel enum."""

    def test_risk_levels(self):
        """Test risk level values."""
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"


class TestStepStatus:
    """Tests for StepStatus enum."""

    def test_step_statuses(self):
        """Test step status values."""
        assert StepStatus.PENDING.value == "pending"
        assert StepStatus.IN_PROGRESS.value == "in_progress"
        assert StepStatus.SUCCESS.value == "success"
        assert StepStatus.FAILURE.value == "failure"
        assert StepStatus.PARTIAL.value == "partial"
        assert StepStatus.BLOCKED.value == "blocked"
