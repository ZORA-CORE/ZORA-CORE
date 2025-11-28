"""
ZORA CORE Orchestrator

The main orchestrator that coordinates all agents and manages workflow execution.
Driven by LUMINA with safety oversight from AEGIS.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from .task_manager import TaskManager, Task, TaskStatus, TaskPriority
from ..memory.memory_store import MemoryStore


class Orchestrator:
    """
    The central orchestrator for ZORA CORE.
    
    Coordinates all agents, manages task execution, and ensures
    safety policies are followed.
    """

    def __init__(self):
        """Initialize the orchestrator."""
        self.task_manager = TaskManager()
        self.memory_store = MemoryStore()
        
        # Agent registry
        self._agents: Dict[str, Any] = {}
        
        # Session tracking
        self._current_session: Optional[str] = None
        self._session_start: Optional[datetime] = None
        
        # Logging
        self.logger = logging.getLogger("zora.orchestrator")
        
        # Status
        self.status = "initialized"

    def register_agent(self, agent: Any) -> None:
        """
        Register an agent with the orchestrator.
        
        Args:
            agent: The agent to register
        """
        self._agents[agent.name] = agent
        agent.memory = self.memory_store
        self.logger.info(f"Registered agent: {agent.name}")

    def get_agent(self, name: str) -> Optional[Any]:
        """Get a registered agent by name."""
        return self._agents.get(name)

    def start_session(self, session_id: str = None) -> str:
        """
        Start a new orchestration session.
        
        Args:
            session_id: Optional session ID (auto-generated if not provided)
            
        Returns:
            The session ID
        """
        import uuid
        
        self._current_session = session_id or f"session_{uuid.uuid4().hex[:12]}"
        self._session_start = datetime.utcnow()
        self.status = "active"
        
        self.logger.info(f"Started session: {self._current_session}")
        
        return self._current_session

    def end_session(self) -> Dict[str, Any]:
        """
        End the current session.
        
        Returns:
            Session summary
        """
        if not self._current_session:
            return {"error": "No active session"}
        
        session_end = datetime.utcnow()
        duration = session_end - self._session_start if self._session_start else None
        
        summary = {
            "session_id": self._current_session,
            "started_at": self._session_start.isoformat() if self._session_start else None,
            "ended_at": session_end.isoformat(),
            "duration": str(duration) if duration else None,
            "task_stats": self.task_manager.get_stats(),
            "memory_stats": self.memory_store.get_stats(),
        }
        
        self._current_session = None
        self._session_start = None
        self.status = "idle"
        
        self.logger.info(f"Ended session with {summary['task_stats']['total_tasks']} tasks")
        
        return summary

    async def process_goal(self, goal: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a high-level goal.
        
        This is the main entry point for the orchestrator. It:
        1. Receives a goal from the Founder or API
        2. Has LUMINA create a plan
        3. Creates tasks from the plan
        4. Has AEGIS review high-risk tasks
        5. Executes tasks through appropriate agents
        6. Stores results in EIVOR's memory
        
        Args:
            goal: The high-level goal to achieve
            context: Additional context
            
        Returns:
            Execution results
        """
        context = context or {}
        
        # Ensure we have a session
        if not self._current_session:
            self.start_session()
        
        self.logger.info(f"Processing goal: {goal}")
        
        # Save goal to memory
        await self.memory_store.save_memory(
            agent="ORCHESTRATOR",
            memory_type="plan",
            content=f"Received goal: {goal}",
            tags=["goal", "orchestration"],
            session_id=self._current_session,
        )
        
        # Get LUMINA to create a plan
        lumina = self._agents.get("LUMINA")
        if not lumina:
            return {"error": "LUMINA agent not registered"}
        
        plan = await lumina.plan(goal, context)
        
        # Create tasks from plan steps
        tasks = []
        for step in plan.steps:
            task = self.task_manager.create_task(
                title=step.description,
                description=step.description,
                assignee=step.assignee,
                priority=self._risk_to_priority(step.risk_level),
                requires_aegis_review=step.requires_aegis_review,
                estimated_duration=step.estimated_duration,
                tags=["from_plan", plan.plan_id],
                metadata={"step_id": step.step_id, "action_type": step.action_type},
            )
            tasks.append(task)
            self.task_manager.queue_task(task.id)
        
        # Have AEGIS review high-risk tasks
        aegis = self._agents.get("AEGIS")
        if aegis:
            for task in tasks:
                if task.requires_aegis_review:
                    review = await aegis.review_plan(plan)
                    if review.get("approved", False):
                        self.task_manager.approve_task(task.id)
                    else:
                        self.task_manager.block_task(
                            task.id, 
                            f"AEGIS review: {review.get('recommendation', 'Blocked')}"
                        )
        
        # Execute tasks
        results = []
        while True:
            task = self.task_manager.get_next_task()
            if not task:
                break
            
            result = await self._execute_task(task, context)
            results.append(result)
        
        # Store summary in memory
        summary = {
            "goal": goal,
            "plan_id": plan.plan_id,
            "tasks_created": len(tasks),
            "tasks_completed": len([r for r in results if r.get("status") == "completed"]),
            "tasks_failed": len([r for r in results if r.get("status") == "failed"]),
        }
        
        await self.memory_store.save_memory(
            agent="ORCHESTRATOR",
            memory_type="result",
            content=f"Goal completed: {goal}. {summary['tasks_completed']}/{summary['tasks_created']} tasks successful.",
            tags=["goal_result", "orchestration"],
            session_id=self._current_session,
            metadata=summary,
        )
        
        return {
            "goal": goal,
            "plan_id": plan.plan_id,
            "session_id": self._current_session,
            "summary": summary,
            "results": results,
        }

    async def _execute_task(self, task: Task, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single task.
        
        Args:
            task: The task to execute
            context: Execution context
            
        Returns:
            Task execution result
        """
        self.logger.info(f"Executing task: {task.title} (assigned to {task.assignee})")
        
        # Start the task
        self.task_manager.start_task(task.id)
        
        # Get the assigned agent
        agent = self._agents.get(task.assignee)
        if not agent:
            self.task_manager.fail_task(task.id, f"Agent not found: {task.assignee}")
            return {
                "task_id": task.id,
                "status": "failed",
                "error": f"Agent not found: {task.assignee}",
            }
        
        try:
            # Create a step from the task
            from ..agents.base_agent import Step
            
            step = Step(
                step_id=task.metadata.get("step_id", task.id),
                description=task.description,
                action_type=task.metadata.get("action_type", "generic"),
                assignee=task.assignee,
            )
            
            # Execute the step
            result = await agent.act(step, context)
            
            if result.status.value == "success":
                self.task_manager.complete_task(task.id, result.output)
                
                # Save to memory
                await self.memory_store.save_memory(
                    agent=task.assignee,
                    memory_type="result",
                    content=f"Completed: {task.title}",
                    tags=["task_result", task.assignee.lower()],
                    session_id=self._current_session,
                )
                
                return {
                    "task_id": task.id,
                    "status": "completed",
                    "output": result.output,
                }
            else:
                self.task_manager.fail_task(task.id, result.error or "Unknown error")
                return {
                    "task_id": task.id,
                    "status": "failed",
                    "error": result.error,
                }
                
        except Exception as e:
            self.task_manager.fail_task(task.id, str(e))
            self.logger.error(f"Task execution failed: {e}")
            return {
                "task_id": task.id,
                "status": "failed",
                "error": str(e),
            }

    def _risk_to_priority(self, risk_level) -> TaskPriority:
        """Convert risk level to task priority."""
        from ..agents.base_agent import RiskLevel
        
        if risk_level == RiskLevel.HIGH:
            return TaskPriority.HIGH
        elif risk_level == RiskLevel.MEDIUM:
            return TaskPriority.MEDIUM
        else:
            return TaskPriority.MEDIUM

    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status."""
        return {
            "status": self.status,
            "current_session": self._current_session,
            "session_start": self._session_start.isoformat() if self._session_start else None,
            "registered_agents": list(self._agents.keys()),
            "task_stats": self.task_manager.get_stats(),
            "memory_stats": self.memory_store.get_stats(),
        }


async def run_demo():
    """Run a demo of the orchestrator."""
    from ..agents import ConnorAgent, LuminaAgent, EivorAgent, OracleAgent, AegisAgent, SamAgent
    
    print("=== ZORA CORE Orchestrator Demo ===\n")
    
    # Create orchestrator
    orchestrator = Orchestrator()
    
    # Register agents
    print("1. Registering agents...")
    orchestrator.register_agent(ConnorAgent())
    orchestrator.register_agent(LuminaAgent())
    orchestrator.register_agent(EivorAgent())
    orchestrator.register_agent(OracleAgent())
    orchestrator.register_agent(AegisAgent())
    orchestrator.register_agent(SamAgent())
    print(f"   Registered: {list(orchestrator._agents.keys())}")
    
    # Start session
    print("\n2. Starting session...")
    session_id = orchestrator.start_session()
    print(f"   Session ID: {session_id}")
    
    # Process a goal
    print("\n3. Processing goal...")
    result = await orchestrator.process_goal(
        goal="Create a simple dashboard page",
        context={"project": "ZORA CORE"}
    )
    
    print(f"   Plan ID: {result['plan_id']}")
    print(f"   Tasks created: {result['summary']['tasks_created']}")
    print(f"   Tasks completed: {result['summary']['tasks_completed']}")
    
    # Show status
    print("\n4. Orchestrator status:")
    status = orchestrator.get_status()
    print(f"   Status: {status['status']}")
    print(f"   Total tasks: {status['task_stats']['total_tasks']}")
    print(f"   Completed: {status['task_stats']['completed_tasks']}")
    
    # End session
    print("\n5. Ending session...")
    summary = orchestrator.end_session()
    print(f"   Duration: {summary['duration']}")
    
    print("\n=== Demo Complete ===")


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_demo())
