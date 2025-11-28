"""
ZORA CORE Task Manager

Manages tasks, their lifecycle, and dependencies.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional


class TaskStatus(str, Enum):
    """Status of a task."""
    PENDING = "pending"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Priority levels for tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Task:
    """Represents a task in the system."""
    id: str
    title: str
    description: str
    assignee: str
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    dependencies: List[str] = field(default_factory=list)
    parent_id: Optional[str] = None
    subtasks: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_duration: Optional[timedelta] = None
    actual_duration: Optional[timedelta] = None
    result: Any = None
    error: Optional[str] = None
    requires_aegis_review: bool = False
    aegis_approved: bool = False

    @classmethod
    def create(
        cls,
        title: str,
        description: str,
        assignee: str,
        **kwargs
    ) -> "Task":
        """Factory method to create a task with auto-generated ID."""
        return cls(
            id=f"task_{uuid.uuid4().hex[:12]}",
            title=title,
            description=description,
            assignee=assignee,
            **kwargs
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "assignee": self.assignee,
            "status": self.status.value,
            "priority": self.priority.value,
            "dependencies": self.dependencies,
            "parent_id": self.parent_id,
            "subtasks": self.subtasks,
            "tags": self.tags,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "estimated_duration": str(self.estimated_duration) if self.estimated_duration else None,
            "actual_duration": str(self.actual_duration) if self.actual_duration else None,
            "result": self.result,
            "error": self.error,
            "requires_aegis_review": self.requires_aegis_review,
            "aegis_approved": self.aegis_approved,
        }

    def can_start(self, completed_tasks: set) -> bool:
        """Check if this task can start based on dependencies."""
        if self.status != TaskStatus.PENDING and self.status != TaskStatus.QUEUED:
            return False
        
        # Check if all dependencies are completed
        for dep_id in self.dependencies:
            if dep_id not in completed_tasks:
                return False
        
        # Check AEGIS approval if required
        if self.requires_aegis_review and not self.aegis_approved:
            return False
        
        return True


class TaskManager:
    """
    Manages the task graph and task lifecycle.
    
    Responsibilities:
    - Create and track tasks
    - Manage task dependencies
    - Queue tasks for execution
    - Track task status and results
    """

    def __init__(self):
        """Initialize the task manager."""
        self._tasks: Dict[str, Task] = {}
        self._queue: List[str] = []  # Task IDs in priority order
        self._completed: set = set()  # Completed task IDs
        self._failed: set = set()  # Failed task IDs

    def create_task(
        self,
        title: str,
        description: str,
        assignee: str,
        priority: TaskPriority = TaskPriority.MEDIUM,
        dependencies: List[str] = None,
        parent_id: str = None,
        tags: List[str] = None,
        requires_aegis_review: bool = False,
        estimated_duration: timedelta = None,
        metadata: Dict[str, Any] = None,
    ) -> Task:
        """
        Create a new task.
        
        Args:
            title: Task title
            description: Task description
            assignee: Agent to assign the task to
            priority: Task priority
            dependencies: List of task IDs this task depends on
            parent_id: Parent task ID (for subtasks)
            tags: Task tags
            requires_aegis_review: Whether AEGIS must approve
            estimated_duration: Estimated time to complete
            metadata: Additional metadata
            
        Returns:
            The created task
        """
        task = Task.create(
            title=title,
            description=description,
            assignee=assignee,
            priority=priority,
            dependencies=dependencies or [],
            parent_id=parent_id,
            tags=tags or [],
            requires_aegis_review=requires_aegis_review,
            estimated_duration=estimated_duration,
            metadata=metadata or {},
        )
        
        self._tasks[task.id] = task
        
        # Add to parent's subtasks if applicable
        if parent_id and parent_id in self._tasks:
            self._tasks[parent_id].subtasks.append(task.id)
        
        return task

    def queue_task(self, task_id: str) -> bool:
        """
        Add a task to the execution queue.
        
        Args:
            task_id: The task ID to queue
            
        Returns:
            True if queued successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        if task.status != TaskStatus.PENDING:
            return False
        
        task.status = TaskStatus.QUEUED
        
        # Insert based on priority
        priority_order = {
            TaskPriority.CRITICAL: 0,
            TaskPriority.HIGH: 1,
            TaskPriority.MEDIUM: 2,
            TaskPriority.LOW: 3,
        }
        
        insert_pos = len(self._queue)
        for i, queued_id in enumerate(self._queue):
            queued_task = self._tasks.get(queued_id)
            if queued_task and priority_order[task.priority] < priority_order[queued_task.priority]:
                insert_pos = i
                break
        
        self._queue.insert(insert_pos, task_id)
        return True

    def get_next_task(self) -> Optional[Task]:
        """
        Get the next task that can be executed.
        
        Returns:
            The next executable task, or None
        """
        for task_id in self._queue:
            task = self._tasks.get(task_id)
            if task and task.can_start(self._completed):
                return task
        
        return None

    def start_task(self, task_id: str) -> bool:
        """
        Mark a task as started.
        
        Args:
            task_id: The task ID
            
        Returns:
            True if started successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        if task.status not in [TaskStatus.PENDING, TaskStatus.QUEUED]:
            return False
        
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = datetime.utcnow()
        
        # Remove from queue
        if task_id in self._queue:
            self._queue.remove(task_id)
        
        return True

    def complete_task(self, task_id: str, result: Any = None) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: The task ID
            result: The task result
            
        Returns:
            True if completed successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        task.result = result
        
        if task.started_at:
            task.actual_duration = task.completed_at - task.started_at
        
        self._completed.add(task_id)
        
        return True

    def fail_task(self, task_id: str, error: str) -> bool:
        """
        Mark a task as failed.
        
        Args:
            task_id: The task ID
            error: The error message
            
        Returns:
            True if marked successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        task.status = TaskStatus.FAILED
        task.completed_at = datetime.utcnow()
        task.error = error
        
        if task.started_at:
            task.actual_duration = task.completed_at - task.started_at
        
        self._failed.add(task_id)
        
        return True

    def block_task(self, task_id: str, reason: str = None) -> bool:
        """
        Mark a task as blocked.
        
        Args:
            task_id: The task ID
            reason: The blocking reason
            
        Returns:
            True if blocked successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        task.status = TaskStatus.BLOCKED
        if reason:
            task.metadata["block_reason"] = reason
        
        return True

    def approve_task(self, task_id: str) -> bool:
        """
        AEGIS approval for a task.
        
        Args:
            task_id: The task ID
            
        Returns:
            True if approved successfully
        """
        task = self._tasks.get(task_id)
        if not task:
            return False
        
        task.aegis_approved = True
        return True

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        return self._tasks.get(task_id)

    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """Get all tasks with a specific status."""
        return [t for t in self._tasks.values() if t.status == status]

    def get_tasks_by_assignee(self, assignee: str) -> List[Task]:
        """Get all tasks assigned to a specific agent."""
        return [t for t in self._tasks.values() if t.assignee == assignee]

    def get_subtasks(self, parent_id: str) -> List[Task]:
        """Get all subtasks of a parent task."""
        parent = self._tasks.get(parent_id)
        if not parent:
            return []
        
        return [self._tasks[tid] for tid in parent.subtasks if tid in self._tasks]

    def get_stats(self) -> Dict[str, Any]:
        """Get task manager statistics."""
        status_counts = {}
        for status in TaskStatus:
            status_counts[status.value] = len(self.get_tasks_by_status(status))
        
        assignee_counts = {}
        for task in self._tasks.values():
            assignee_counts[task.assignee] = assignee_counts.get(task.assignee, 0) + 1
        
        return {
            "total_tasks": len(self._tasks),
            "queued_tasks": len(self._queue),
            "completed_tasks": len(self._completed),
            "failed_tasks": len(self._failed),
            "by_status": status_counts,
            "by_assignee": assignee_counts,
        }

    def get_task_graph(self) -> Dict[str, List[str]]:
        """Get the task dependency graph."""
        graph = {}
        for task_id, task in self._tasks.items():
            graph[task_id] = task.dependencies
        return graph
