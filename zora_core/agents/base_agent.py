"""
ZORA CORE Base Agent

Defines the common interface and functionality for all ZORA agents.
All seven agents (ODIN, THOR, FREYA, BALDUR, HEIMDALL, TYR, EIVOR) inherit from this base.
"""

import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Protocol


class RiskLevel(str, Enum):
    """Risk levels for tasks and actions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class StepStatus(str, Enum):
    """Status of a step execution."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    BLOCKED = "blocked"


@dataclass
class AgentConfig:
    """Configuration for an agent."""
    name: str
    role: str
    pronouns: str
    description: str
    capabilities: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)
    model_preferences: Dict[str, str] = field(default_factory=dict)
    rate_limit: int = 60  # requests per minute
    timeout: int = 30  # seconds
    retry_attempts: int = 3


@dataclass
class Step:
    """Represents a single step in a plan."""
    step_id: str
    description: str
    action_type: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    assignee: str = ""
    estimated_duration: timedelta = field(default_factory=lambda: timedelta(minutes=5))
    risk_level: RiskLevel = RiskLevel.LOW
    requires_aegis_review: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        description: str,
        action_type: str,
        assignee: str = "",
        **kwargs
    ) -> "Step":
        """Factory method to create a step with auto-generated ID."""
        return cls(
            step_id=f"step_{uuid.uuid4().hex[:12]}",
            description=description,
            action_type=action_type,
            assignee=assignee,
            **kwargs
        )


@dataclass
class Plan:
    """Represents a plan to achieve a goal."""
    plan_id: str
    goal: str
    steps: List[Step] = field(default_factory=list)
    estimated_duration: timedelta = field(default_factory=lambda: timedelta(hours=1))
    risk_level: RiskLevel = RiskLevel.LOW
    requires_aegis_review: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    created_by: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(cls, goal: str, created_by: str = "", **kwargs) -> "Plan":
        """Factory method to create a plan with auto-generated ID."""
        return cls(
            plan_id=f"plan_{uuid.uuid4().hex[:12]}",
            goal=goal,
            created_by=created_by,
            **kwargs
        )

    def add_step(self, step: Step) -> None:
        """Add a step to the plan."""
        self.steps.append(step)
        self._update_risk_level()

    def _update_risk_level(self) -> None:
        """Update plan risk level based on steps."""
        if any(s.risk_level == RiskLevel.HIGH for s in self.steps):
            self.risk_level = RiskLevel.HIGH
            self.requires_aegis_review = True
        elif any(s.risk_level == RiskLevel.MEDIUM for s in self.steps):
            self.risk_level = RiskLevel.MEDIUM


@dataclass
class StepResult:
    """Result of executing a step."""
    step_id: str
    status: StepStatus
    output: Any = None
    error: Optional[str] = None
    duration: timedelta = field(default_factory=lambda: timedelta(seconds=0))
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def success(cls, step_id: str, output: Any = None, **kwargs) -> "StepResult":
        """Create a successful step result."""
        return cls(
            step_id=step_id,
            status=StepStatus.SUCCESS,
            output=output,
            completed_at=datetime.utcnow(),
            **kwargs
        )

    @classmethod
    def failure(cls, step_id: str, error: str, **kwargs) -> "StepResult":
        """Create a failed step result."""
        return cls(
            step_id=step_id,
            status=StepStatus.FAILURE,
            error=error,
            completed_at=datetime.utcnow(),
            **kwargs
        )


@dataclass
class Reflection:
    """Agent's reflection on past actions and outcomes."""
    reflection_id: str
    summary: str
    lessons_learned: List[str] = field(default_factory=list)
    improvements_suggested: List[str] = field(default_factory=list)
    confidence_score: float = 0.8
    created_at: datetime = field(default_factory=datetime.utcnow)
    agent_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(cls, summary: str, agent_name: str = "", **kwargs) -> "Reflection":
        """Factory method to create a reflection with auto-generated ID."""
        return cls(
            reflection_id=f"reflect_{uuid.uuid4().hex[:12]}",
            summary=summary,
            agent_name=agent_name,
            **kwargs
        )


class BaseAgent(ABC):
    """
    Base class for all ZORA CORE agents.
    
    All agents implement the plan/act/reflect interface:
    - plan(): Create a plan to achieve a goal
    - act(): Execute a single step of a plan
    - reflect(): Reflect on past actions and outcomes
    """

    def __init__(self, config: AgentConfig):
        """Initialize the agent with configuration."""
        self.config = config
        self.name = config.name
        self.role = config.role
        self.pronouns = config.pronouns
        self.tools = config.tools
        self.capabilities = config.capabilities
        
        # Status tracking
        self.status = "initialized"
        self.last_activity = None
        self.activation_time = None
        
        # Performance metrics
        self.total_tasks = 0
        self.successful_tasks = 0
        self.failed_tasks = 0
        
        # Logging
        self.logger = logging.getLogger(f"zora.agents.{self.name.lower()}")
        
        # Memory reference (set by orchestrator)
        self._memory = None
        
        # Model router reference (set by orchestrator)
        self._model_router = None

    @property
    def memory(self):
        """Get the memory layer (EIVOR)."""
        return self._memory

    @memory.setter
    def memory(self, value):
        """Set the memory layer."""
        self._memory = value

    @property
    def model_router(self):
        """Get the model router."""
        return self._model_router

    @model_router.setter
    def model_router(self, value):
        """Set the model router."""
        self._model_router = value

    async def activate(self) -> None:
        """Activate the agent."""
        self.status = "active"
        self.activation_time = datetime.utcnow()
        self.logger.info(f"{self.name} activated")
        await self._on_activate()

    async def _on_activate(self) -> None:
        """Hook for subclasses to perform activation tasks."""
        pass

    async def deactivate(self) -> None:
        """Deactivate the agent."""
        self.status = "inactive"
        self.logger.info(f"{self.name} deactivated")
        await self._on_deactivate()

    async def _on_deactivate(self) -> None:
        """Hook for subclasses to perform deactivation tasks."""
        pass

    @abstractmethod
    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a plan to achieve the given goal.
        
        Args:
            goal: The goal to achieve
            context: Additional context for planning
            
        Returns:
            A Plan object with steps to achieve the goal
        """
        pass

    @abstractmethod
    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a single step of a plan.
        
        Args:
            step: The step to execute
            context: Additional context for execution
            
        Returns:
            A StepResult indicating the outcome
        """
        pass

    @abstractmethod
    async def reflect(self, history: List[StepResult]) -> Reflection:
        """
        Reflect on past actions and outcomes.
        
        Args:
            history: List of past step results
            
        Returns:
            A Reflection with lessons learned and improvements
        """
        pass

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        This is the entry point for Agent Runtime v1 task processing.
        Subclasses should override this method to implement task handling
        for their specific task types.
        
        Args:
            task: AgentTask from the task queue
            ctx: AgentRuntimeContext with shared services
            
        Returns:
            AgentTaskResult with status and outcome
            
        Raises:
            NotImplementedError: If the agent doesn't implement task handling
        """
        # Import here to avoid circular imports
        from ..autonomy.runtime import AgentTaskResult
        
        raise NotImplementedError(
            f"{self.name} does not implement handle_task yet. "
            f"Task type: {getattr(task, 'task_type', 'unknown')}"
        )

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the agent."""
        return {
            "name": self.name,
            "role": self.role,
            "pronouns": self.pronouns,
            "status": self.status,
            "activation_time": self.activation_time.isoformat() if self.activation_time else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "metrics": {
                "total_tasks": self.total_tasks,
                "successful_tasks": self.successful_tasks,
                "failed_tasks": self.failed_tasks,
                "success_rate": self.successful_tasks / max(self.total_tasks, 1) * 100
            },
            "capabilities": self.capabilities,
            "tools": self.tools
        }

    def log_activity(self, activity: str, data: Any = None) -> None:
        """Log an activity."""
        self.last_activity = datetime.utcnow()
        log_data = {
            "agent": self.name,
            "activity": activity,
            "timestamp": self.last_activity.isoformat(),
            "data": data
        }
        self.logger.info(f"{self.name}: {activity}", extra=log_data)

    async def save_to_memory(self, memory_type: str, content: str, tags: List[str] = None) -> None:
        """Save data to EIVOR's memory."""
        if self._memory:
            await self._memory.save_memory(
                agent=self.name,
                memory_type=memory_type,
                content=content,
                tags=tags or []
            )

    async def search_memory(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search EIVOR's memory."""
        if self._memory:
            return await self._memory.search_memory(
                agent=self.name,
                query=query,
                limit=limit
            )
        return []

    async def call_model(self, task_type: str, prompt: str, **kwargs) -> str:
        """Call an AI model through the model router."""
        if self._model_router:
            return await self._model_router.llm(
                task_type=task_type,
                prompt=prompt,
                agent=self.name,
                **kwargs
            )
        # Fallback: return a placeholder response
        return f"[{self.name}] Model router not configured. Prompt: {prompt[:100]}..."

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name={self.name}, role={self.role}, status={self.status})>"
