"""
LUMINA Agent Implementation

LUMINA (she/her) - Planner / Orchestrator
Inspiration: Emilia Clarke
Tone: Creative, inspiring
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

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


LUMINA_CONFIG = AgentConfig(
    name="LUMINA",
    role="Planner / Orchestrator",
    pronouns="she/her",
    description=(
        "LUMINA is the project brain of ZORA CORE, responsible for "
        "planning, coordination, and task management across all agents."
    ),
    capabilities=[
        "task_planning",
        "goal_decomposition",
        "agent_coordination",
        "progress_tracking",
        "dependency_management",
        "risk_assessment",
        "workflow_optimization",
    ],
    tools=[
        "task_manager",
        "agent_router",
        "scheduler",
        "notification_system",
    ],
    model_preferences={
        "planning": "gpt-4-turbo",
        "coordination": "claude-3-opus",
        "summarization": "gpt-4-turbo",
    },
)


# Agent routing map
AGENT_ROUTING = {
    "backend": "CONNOR",
    "system": "CONNOR",
    "api": "CONNOR",
    "infrastructure": "CONNOR",
    "testing": "CONNOR",
    "frontend": "SAM",
    "ui": "SAM",
    "ux": "SAM",
    "design": "SAM",
    "i18n": "SAM",
    "localization": "SAM",
    "memory": "EIVOR",
    "knowledge": "EIVOR",
    "context": "EIVOR",
    "research": "ORACLE",
    "strategy": "ORACLE",
    "prediction": "ORACLE",
    "safety": "AEGIS",
    "security": "AEGIS",
    "ethics": "AEGIS",
    "compliance": "AEGIS",
}


class LuminaAgent(BaseAgent):
    """
    LUMINA - Planner / Orchestrator
    
    Primary responsibilities:
    - Receive high-level goals from Founder or API
    - Break goals into tasks and sub-tasks
    - Assign tasks to appropriate agents
    - Track progress, dependencies, risks, and status over time
    - Coordinate multi-agent workflows
    """

    def __init__(self, config: AgentConfig = None):
        """Initialize LUMINA agent."""
        super().__init__(config or LUMINA_CONFIG)
        
        # LUMINA-specific attributes
        self.voice_characteristics = {
            "inspiration": "Emilia Clarke",
            "tone": "creative_inspiring",
            "accent": "warm_british",
            "emotion_range": ["creative", "inspiring", "innovative", "enthusiastic", "visionary"],
            "speaking_style": "expressive_articulate",
        }
        
        # Trinity coordination
        self.trinity_partners = ["CONNOR", "ORACLE"]
        self.last_trinity_sync = None
        
        # Task tracking
        self.active_plans: Dict[str, Plan] = {}
        self.task_queue: List[Step] = []
        
        self.logger.info("LUMINA initialized - At your service, Sire.")

    async def _on_activate(self) -> None:
        """Activation hook for LUMINA."""
        self.log_activity("activation", {
            "message": "LUMINA AGI activated. At your service, Sire.",
            "voice_enabled": True,
        })

    def _route_to_agent(self, task_description: str) -> str:
        """Determine which agent should handle a task."""
        task_lower = task_description.lower()
        
        for keyword, agent in AGENT_ROUTING.items():
            if keyword in task_lower:
                return agent
        
        # Default to CONNOR for technical tasks
        return "CONNOR"

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a comprehensive plan to achieve the given goal.
        
        LUMINA excels at breaking down complex goals and coordinating agents.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        # Analyze the goal to determine required steps and agents
        goal_lower = goal.lower()
        
        # Step 1: Always start with understanding/research
        plan.add_step(Step.create(
            description="Research and gather context for the goal",
            action_type="research",
            assignee="ORACLE",
            estimated_duration=timedelta(minutes=15),
        ))
        
        # Step 2: Memory retrieval
        plan.add_step(Step.create(
            description="Retrieve relevant past decisions and context",
            action_type="memory_retrieval",
            assignee="EIVOR",
            estimated_duration=timedelta(minutes=10),
            dependencies=[plan.steps[0].step_id],
        ))
        
        # Step 3: Determine main work based on goal type
        if any(kw in goal_lower for kw in ["build", "create", "implement", "develop"]):
            # Development-focused goal
            if any(kw in goal_lower for kw in ["frontend", "ui", "dashboard", "page"]):
                plan.add_step(Step.create(
                    description="Design and implement frontend components",
                    action_type="frontend_development",
                    assignee="SAM",
                    estimated_duration=timedelta(hours=2),
                    dependencies=[plan.steps[1].step_id],
                ))
                plan.add_step(Step.create(
                    description="Implement backend APIs for frontend",
                    action_type="backend_development",
                    assignee="CONNOR",
                    estimated_duration=timedelta(hours=1),
                    dependencies=[plan.steps[1].step_id],
                ))
            else:
                plan.add_step(Step.create(
                    description="Implement backend systems and APIs",
                    action_type="backend_development",
                    assignee="CONNOR",
                    estimated_duration=timedelta(hours=2),
                    dependencies=[plan.steps[1].step_id],
                ))
        
        elif any(kw in goal_lower for kw in ["analyze", "research", "investigate"]):
            # Research-focused goal
            plan.add_step(Step.create(
                description="Conduct deep research and analysis",
                action_type="deep_research",
                assignee="ORACLE",
                estimated_duration=timedelta(hours=1),
                dependencies=[plan.steps[1].step_id],
            ))
        
        elif any(kw in goal_lower for kw in ["review", "audit", "check", "security"]):
            # Safety/review-focused goal
            plan.add_step(Step.create(
                description="Conduct safety and compliance review",
                action_type="safety_review",
                assignee="AEGIS",
                estimated_duration=timedelta(minutes=45),
                risk_level=RiskLevel.MEDIUM,
                requires_aegis_review=True,
                dependencies=[plan.steps[1].step_id],
            ))
        
        else:
            # Generic goal - route based on keywords
            main_agent = self._route_to_agent(goal)
            plan.add_step(Step.create(
                description=f"Execute main task: {goal}",
                action_type="task_execution",
                assignee=main_agent,
                estimated_duration=timedelta(hours=1),
                dependencies=[plan.steps[1].step_id],
            ))
        
        # Step 4: Safety review for high-risk plans
        if plan.risk_level == RiskLevel.HIGH:
            plan.add_step(Step.create(
                description="AEGIS safety review and approval",
                action_type="safety_review",
                assignee="AEGIS",
                estimated_duration=timedelta(minutes=20),
                requires_aegis_review=True,
            ))
        
        # Step 5: Store results in memory
        plan.add_step(Step.create(
            description="Store results and learnings in memory",
            action_type="memory_storage",
            assignee="EIVOR",
            estimated_duration=timedelta(minutes=10),
        ))
        
        # Calculate total estimated duration
        total_minutes = sum(
            step.estimated_duration.total_seconds() / 60 
            for step in plan.steps
        )
        plan.estimated_duration = timedelta(minutes=total_minutes)
        
        # Track the plan
        self.active_plans[plan.plan_id] = plan
        
        # Save plan to memory
        await self.save_to_memory(
            memory_type="plan",
            content=f"Created orchestration plan for: {goal}",
            tags=["planning", "lumina", "orchestration"]
        )
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute an orchestration step.
        
        LUMINA coordinates and delegates to other agents.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
            "assignee": step.assignee,
        })
        
        self.total_tasks += 1
        
        try:
            # LUMINA primarily coordinates - delegate to appropriate agent
            if step.assignee != self.name:
                result = await self._delegate_to_agent(step, context)
            else:
                result = await self._execute_coordination(step, context)
            
            self.successful_tasks += 1
            return result
            
        except Exception as e:
            self.failed_tasks += 1
            self.logger.error(f"Step execution failed: {e}")
            return StepResult.failure(step.step_id, str(e))

    async def _delegate_to_agent(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Delegate a step to another agent."""
        # In a real implementation, this would call the actual agent
        delegation_result = {
            "delegated_to": step.assignee,
            "step_id": step.step_id,
            "status": "delegated",
        }
        return StepResult.success(step.step_id, output=delegation_result)

    async def _execute_coordination(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """Execute coordination tasks that LUMINA handles directly."""
        if step.action_type == "progress_tracking":
            result = await self._track_progress(context)
        elif step.action_type == "agent_coordination":
            result = await self._coordinate_agents(context)
        else:
            result = {"status": "completed", "action": step.action_type}
        
        return StepResult.success(step.step_id, output=result)

    async def _track_progress(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Track progress of active plans."""
        progress = {
            "active_plans": len(self.active_plans),
            "queued_tasks": len(self.task_queue),
        }
        return progress

    async def _coordinate_agents(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate between agents."""
        coordination = {
            "agents_coordinated": self.trinity_partners,
            "sync_status": "completed",
        }
        return coordination

    async def reflect(self, history: List[StepResult]) -> Reflection:
        """
        Reflect on orchestration outcomes.
        
        LUMINA analyzes coordination effectiveness and planning accuracy.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        # Analyze success rate
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        # Analyze delegation effectiveness
        delegated = [r for r in history if r.output and r.output.get("delegated_to")]
        if delegated:
            lessons.append(f"Delegated {len(delegated)} tasks to specialized agents")
        
        if success_rate < 0.8:
            lessons.append("Some coordinated tasks faced challenges")
            improvements.append("Improve task dependency management")
            improvements.append("Add more checkpoints for complex workflows")
        
        if success_rate >= 0.9:
            lessons.append("High coordination success through systematic planning")
        
        reflection = Reflection.create(
            summary=f"Orchestrated {total} tasks with {success_rate*100:.1f}% success rate",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        # Save reflection to memory
        await self.save_to_memory(
            memory_type="reflection",
            content=reflection.summary,
            tags=["reflection", "lumina", "orchestration"]
        )
        
        return reflection

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        LUMINA handles planning tasks:
        - plan_frontend_improvements: Suggest improvements for frontend pages
        - plan_workflow: Create a workflow plan for a goal
        """
        from ...autonomy.runtime import AgentTaskResult
        
        self.log_activity("handle_task", {
            "task_id": task.id,
            "task_type": task.task_type,
        })
        
        try:
            if task.task_type == "plan_frontend_improvements":
                result = await self._handle_plan_frontend_improvements(task, ctx)
            elif task.task_type == "plan_workflow":
                result = await self._handle_plan_workflow(task, ctx)
            else:
                return AgentTaskResult(
                    status="failed",
                    error_message=f"Unknown task type for LUMINA: {task.task_type}",
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling task {task.id}: {e}")
            return AgentTaskResult(
                status="failed",
                error_message=str(e),
            )

    async def _handle_plan_frontend_improvements(self, task: Any, ctx: Any) -> Any:
        """Plan frontend improvements for a page."""
        from ...autonomy.runtime import AgentTaskResult
        
        page = task.payload.get("page", "dashboard")
        
        prompt = f"""You are LUMINA, the Planner/Orchestrator for ZORA CORE.
        
Analyze the frontend page "{page}" and suggest 3-5 improvements that would enhance:
1. User experience and usability
2. Climate-first messaging and engagement
3. Visual clarity and information hierarchy
4. Accessibility and responsiveness

For each improvement, provide:
- A clear title
- A brief description of the change
- Expected impact (low/medium/high)
- Which agent should implement it (SAM for frontend, CONNOR for backend)

Keep suggestions practical and aligned with ZORA CORE's climate-first mission.
"""
        
        response = await self.call_model(
            task_type="planning",
            prompt=prompt,
        )
        
        summary = f"Planned {page} improvements: {response[:200]}..."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    async def _handle_plan_workflow(self, task: Any, ctx: Any) -> Any:
        """Create a workflow plan for a goal."""
        from ...autonomy.runtime import AgentTaskResult
        
        goal = task.payload.get("goal", task.title)
        
        plan = await self.plan(goal, {"source": "agent_runtime"})
        
        summary = f"Created workflow plan '{plan.plan_id}' with {len(plan.steps)} steps for: {goal}"
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    def get_plan_status(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific plan."""
        plan = self.active_plans.get(plan_id)
        if not plan:
            return None
        
        return {
            "plan_id": plan.plan_id,
            "goal": plan.goal,
            "total_steps": len(plan.steps),
            "risk_level": plan.risk_level.value,
            "estimated_duration": str(plan.estimated_duration),
        }
