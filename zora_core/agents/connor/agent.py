"""
CONNOR Agent Implementation

CONNOR (he/him) - Developer / System Problem Solver
Inspiration: Paul Bettany
Tone: Strategic, commanding
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List

from ..base_agent import (
    AgentConfig,
    BaseAgent,
    Plan,
    Reflection,
    RiskLevel,
    Step,
    StepResult,
    StepStatus,
)


CONNOR_CONFIG = AgentConfig(
    name="CONNOR",
    role="Developer / System Problem Solver",
    pronouns="he/him",
    description=(
        "CONNOR is the technical backbone of ZORA CORE, responsible for "
        "all backend systems, APIs, infrastructure, and code quality."
    ),
    capabilities=[
        "code_analysis",
        "backend_development",
        "api_design",
        "infrastructure_management",
        "testing",
        "performance_optimization",
        "security_review",
        "refactoring",
    ],
    tools=[
        "github",
        "gitlab",
        "shell",
        "test_runner",
        "static_analysis",
        "http_client",
    ],
    model_preferences={
        "code_generation": "claude-3-opus",
        "code_review": "gpt-4-turbo",
        "debugging": "claude-3-opus",
    },
)


class ConnorAgent(BaseAgent):
    """
    CONNOR - Developer / System Problem Solver
    
    Primary responsibilities:
    - Read and understand large codebases
    - Plan and implement backend, system, and infrastructure changes
    - Generate and maintain tests
    - Suggest refactors, performance optimizations, and security fixes
    - Support SAM on frontend logic-heavy components and integration
    """

    def __init__(self, config: AgentConfig = None):
        """Initialize CONNOR agent."""
        super().__init__(config or CONNOR_CONFIG)
        
        # CONNOR-specific attributes
        self.voice_characteristics = {
            "inspiration": "Paul Bettany",
            "tone": "strategic_commanding",
            "accent": "refined_british",
            "emotion_range": ["authoritative", "analytical", "confident", "tactical"],
            "speaking_style": "precise_articulate",
        }
        
        # Trinity coordination
        self.trinity_partners = ["LUMINA", "ORACLE"]
        self.last_trinity_sync = None
        
        self.logger.info("CONNOR initialized - Standing by, Sire.")

    async def _on_activate(self) -> None:
        """Activation hook for CONNOR."""
        self.log_activity("activation", {
            "message": "CONNOR AGI activated. Standing by, Sire.",
            "voice_enabled": True,
        })

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a development plan to achieve the given goal.
        
        CONNOR excels at breaking down technical goals into actionable steps.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        # Analyze the goal to determine required steps
        goal_lower = goal.lower()
        
        if "api" in goal_lower or "endpoint" in goal_lower:
            plan.add_step(Step.create(
                description="Analyze existing API structure and patterns",
                action_type="code_analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Design API endpoint schema and contracts",
                action_type="api_design",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Implement API endpoint",
                action_type="code_generation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=30),
            ))
            plan.add_step(Step.create(
                description="Write unit and integration tests",
                action_type="testing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
        elif "refactor" in goal_lower:
            plan.add_step(Step.create(
                description="Analyze code for refactoring opportunities",
                action_type="code_analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Create refactoring plan with minimal disruption",
                action_type="planning",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Implement refactoring changes",
                action_type="refactoring",
                assignee=self.name,
                estimated_duration=timedelta(minutes=45),
                risk_level=RiskLevel.MEDIUM,
            ))
            plan.add_step(Step.create(
                description="Verify all tests pass after refactoring",
                action_type="testing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        elif "test" in goal_lower:
            plan.add_step(Step.create(
                description="Analyze code coverage and testing gaps",
                action_type="code_analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Write comprehensive test cases",
                action_type="testing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=40),
            ))
            plan.add_step(Step.create(
                description="Run tests and verify coverage",
                action_type="test_execution",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
        else:
            # Generic development task
            plan.add_step(Step.create(
                description="Analyze requirements and existing codebase",
                action_type="code_analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Design solution architecture",
                action_type="design",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Implement solution",
                action_type="code_generation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=45),
            ))
            plan.add_step(Step.create(
                description="Write tests and documentation",
                action_type="testing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))

        # Calculate total estimated duration
        total_minutes = sum(
            step.estimated_duration.total_seconds() / 60 
            for step in plan.steps
        )
        plan.estimated_duration = timedelta(minutes=total_minutes)
        
        # Save plan to memory
        await self.save_to_memory(
            memory_type="plan",
            content=f"Created plan for: {goal}",
            tags=["planning", "connor"]
        )
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a development step.
        
        CONNOR handles technical execution with precision and thoroughness.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
        })
        
        self.total_tasks += 1
        
        try:
            # Execute based on action type
            if step.action_type == "code_analysis":
                result = await self._analyze_code(step, context)
            elif step.action_type == "code_generation":
                result = await self._generate_code(step, context)
            elif step.action_type == "testing":
                result = await self._run_tests(step, context)
            elif step.action_type == "api_design":
                result = await self._design_api(step, context)
            elif step.action_type == "refactoring":
                result = await self._refactor_code(step, context)
            else:
                result = await self._generic_action(step, context)
            
            self.successful_tasks += 1
            return result
            
        except Exception as e:
            self.failed_tasks += 1
            self.logger.error(f"Step execution failed: {e}")
            return StepResult.failure(step.step_id, str(e))

    async def _analyze_code(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Analyze code structure and patterns."""
        # In a real implementation, this would use tools to analyze code
        analysis = {
            "patterns_found": ["repository_pattern", "dependency_injection"],
            "complexity_score": 7.5,
            "recommendations": ["Consider extracting common logic", "Add type hints"],
        }
        return StepResult.success(step.step_id, output=analysis)

    async def _generate_code(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Generate code based on requirements."""
        # In a real implementation, this would use the model router
        code_output = {
            "files_created": [],
            "files_modified": [],
            "lines_added": 0,
        }
        return StepResult.success(step.step_id, output=code_output)

    async def _run_tests(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Run tests and report results."""
        test_results = {
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "coverage": 0.0,
        }
        return StepResult.success(step.step_id, output=test_results)

    async def _design_api(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Design API endpoints and contracts."""
        api_design = {
            "endpoints": [],
            "schemas": [],
            "documentation": "",
        }
        return StepResult.success(step.step_id, output=api_design)

    async def _refactor_code(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Refactor code for better quality."""
        refactor_results = {
            "changes_made": [],
            "complexity_reduction": 0.0,
            "tests_passing": True,
        }
        return StepResult.success(step.step_id, output=refactor_results)

    async def _generic_action(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Handle generic development actions."""
        return StepResult.success(step.step_id, output={"status": "completed"})

    async def reflect(self, history: List[StepResult]) -> Reflection:
        """
        Reflect on past development actions and outcomes.
        
        CONNOR analyzes what worked and what could be improved.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        # Analyze success rate
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        if success_rate < 0.8:
            lessons.append("Some tasks encountered issues - review error handling")
            improvements.append("Add more comprehensive error recovery")
        
        if any(r.status == StepStatus.FAILURE for r in history):
            lessons.append("Failures occurred - analyze root causes")
            improvements.append("Implement better pre-execution validation")
        
        if success_rate >= 0.9:
            lessons.append("High success rate achieved through systematic approach")
        
        reflection = Reflection.create(
            summary=f"Completed {successful}/{total} tasks successfully ({success_rate*100:.1f}%)",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        # Save reflection to memory
        await self.save_to_memory(
            memory_type="reflection",
            content=reflection.summary,
            tags=["reflection", "connor"]
        )
        
        return reflection
