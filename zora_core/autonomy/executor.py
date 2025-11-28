"""
ZORA CORE Agent Task Executor v1.0

This module provides the Task Execution Engine that:
- Fetches pending tasks from the agent_tasks queue
- Executes tasks based on task_type using domain-specific handlers
- Updates task status, result, and error fields
- Creates journal entries for task lifecycle events

Supported v1 task types:
- climate.create_missions_from_plan: Create missions from a weekly plan
- climate.create_single_mission: Create a single mission for a profile
- zora_shop.create_project: Create a ZORA SHOP project
- zora_shop.update_product_climate_meta: Update product climate metadata

The executor is designed to be run via CLI or called programmatically.
"""

import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Callable

# Supabase client import - optional dependency
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

logger = logging.getLogger("zora.autonomy.executor")


# =============================================================================
# Task Type Definitions
# =============================================================================

class TaskType(str, Enum):
    """Supported v1 task types for the Task Execution Engine."""
    
    # Climate OS task types
    CLIMATE_CREATE_MISSIONS_FROM_PLAN = "climate.create_missions_from_plan"
    CLIMATE_CREATE_SINGLE_MISSION = "climate.create_single_mission"
    
    # ZORA SHOP task types
    ZORA_SHOP_CREATE_PROJECT = "zora_shop.create_project"
    ZORA_SHOP_UPDATE_PRODUCT_CLIMATE_META = "zora_shop.update_product_climate_meta"


# Set of supported task types for fast lookup
SUPPORTED_TASK_TYPES = {t.value for t in TaskType}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class AgentTaskPolicy:
    """Represents a task execution policy from agent_task_policies."""
    id: Optional[str]
    tenant_id: Optional[str]  # None = global policy
    task_type: str
    auto_execute: bool
    max_risk_level: Optional[int]
    description: Optional[str]
    
    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "AgentTaskPolicy":
        """Create an AgentTaskPolicy from a database row."""
        return cls(
            id=row.get("id"),
            tenant_id=row.get("tenant_id"),
            task_type=row["task_type"],
            auto_execute=row.get("auto_execute", False),
            max_risk_level=row.get("max_risk_level"),
            description=row.get("description"),
        )
    
    @classmethod
    def default_policy(cls, task_type: str) -> "AgentTaskPolicy":
        """Create a default policy (auto_execute=False) when no policy exists."""
        return cls(
            id=None,
            tenant_id=None,
            task_type=task_type,
            auto_execute=False,
            max_risk_level=None,
            description="Default policy - requires manual approval",
        )


@dataclass
class ExecutorTask:
    """Represents a task from the agent_tasks queue for execution."""
    id: str
    tenant_id: str
    command_id: Optional[str]
    agent_id: str
    task_type: str
    status: str
    priority: int
    title: str
    description: Optional[str]
    payload: Dict[str, Any]
    result: Optional[Dict[str, Any]]
    result_summary: Optional[str]
    error_message: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_by_user_id: Optional[str]
    created_at: str
    updated_at: Optional[str]
    # Safety Layer v1 fields
    requires_approval: bool = False
    approved_by_user_id: Optional[str] = None
    approved_at: Optional[str] = None
    rejected_by_user_id: Optional[str] = None
    rejected_at: Optional[str] = None
    decision_reason: Optional[str] = None

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "ExecutorTask":
        """Create an ExecutorTask from a database row."""
        return cls(
            id=row["id"],
            tenant_id=row["tenant_id"],
            command_id=row.get("command_id"),
            agent_id=row["agent_id"],
            task_type=row["task_type"],
            status=row["status"],
            priority=row.get("priority", 0),
            title=row["title"],
            description=row.get("description"),
            payload=row.get("payload", {}),
            result=row.get("result"),
            result_summary=row.get("result_summary"),
            error_message=row.get("error_message"),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            created_by_user_id=row.get("created_by_user_id"),
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
            # Safety Layer v1 fields
            requires_approval=row.get("requires_approval", False),
            approved_by_user_id=row.get("approved_by_user_id"),
            approved_at=row.get("approved_at"),
            rejected_by_user_id=row.get("rejected_by_user_id"),
            rejected_at=row.get("rejected_at"),
            decision_reason=row.get("decision_reason"),
        )
    
    @property
    def is_approved(self) -> bool:
        """Check if the task has been manually approved."""
        return self.approved_by_user_id is not None and self.approved_at is not None
    
    @property
    def is_rejected(self) -> bool:
        """Check if the task has been rejected."""
        return self.rejected_by_user_id is not None and self.rejected_at is not None
    
    @property
    def can_auto_execute(self) -> bool:
        """
        Check if the task can be auto-executed.
        
        A task can auto-execute if:
        - It doesn't require approval, OR
        - It has been manually approved
        
        A task cannot auto-execute if:
        - It has been rejected
        """
        if self.is_rejected:
            return False
        if not self.requires_approval:
            return True
        return self.is_approved


@dataclass
class TaskExecutionResult:
    """Result of executing a task."""
    success: bool
    result: Optional[Dict[str, Any]] = None
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    
    @property
    def status(self) -> str:
        return "completed" if self.success else "failed"


@dataclass
class ExecutionSummary:
    """Summary of a batch execution run."""
    total_fetched: int = 0
    total_executed: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    task_results: List[Dict[str, Any]] = field(default_factory=list)


# =============================================================================
# Task Handlers
# =============================================================================

class TaskHandlers:
    """
    Collection of task handlers for v1 task types.
    
    Each handler receives the task and supabase client, and returns a TaskExecutionResult.
    """
    
    @staticmethod
    async def handle_climate_create_missions_from_plan(
        task: ExecutorTask,
        supabase: Client,
    ) -> TaskExecutionResult:
        """
        Create missions from a previously suggested weekly plan.
        
        Payload:
            profile_id: UUID of the climate profile
            plan_id: UUID of the climate plan to apply
        """
        payload = task.payload
        profile_id = payload.get("profile_id")
        plan_id = payload.get("plan_id")
        
        if not profile_id or not plan_id:
            return TaskExecutionResult(
                success=False,
                error_message="Missing required fields: profile_id and plan_id",
            )
        
        try:
            # Verify plan exists and belongs to the same tenant
            plan_result = supabase.table("climate_plans").select("*").eq("id", plan_id).eq("tenant_id", task.tenant_id).single().execute()
            
            if not plan_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Plan {plan_id} not found or does not belong to tenant",
                )
            
            plan = plan_result.data
            
            # Verify profile matches
            if plan.get("profile_id") != profile_id:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Plan {plan_id} does not belong to profile {profile_id}",
                )
            
            # Get plan items
            items_result = supabase.table("climate_plan_items").select("*").eq("plan_id", plan_id).execute()
            
            if not items_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"No items found for plan {plan_id}",
                )
            
            # Create missions from plan items
            created_missions = []
            for item in items_result.data:
                mission_data = {
                    "tenant_id": task.tenant_id,
                    "profile_id": profile_id,
                    "title": item.get("title", "Untitled Mission"),
                    "category": item.get("category", "general"),
                    "status": "planned",
                    "estimated_impact_kgco2": item.get("estimated_impact_kgco2"),
                    "due_date": item.get("suggested_date"),
                    "notes": item.get("notes", ""),
                }
                
                mission_result = supabase.table("climate_missions").insert(mission_data).execute()
                
                if mission_result.data:
                    created_missions.append(mission_result.data[0])
            
            # Update plan status to applied
            supabase.table("climate_plans").update({
                "status": "applied",
            }).eq("id", plan_id).execute()
            
            # Create journal entry
            supabase.table("journal_entries").insert({
                "tenant_id": task.tenant_id,
                "category": "climate_action",
                "title": f"Created {len(created_missions)} missions from weekly plan",
                "body": f"Applied plan {plan_id} to profile {profile_id}",
                "details": {
                    "event_type": "climate_missions_created_from_plan",
                    "plan_id": plan_id,
                    "profile_id": profile_id,
                    "missions_created": len(created_missions),
                    "mission_ids": [m["id"] for m in created_missions],
                    "task_id": task.id,
                },
                "author": task.agent_id,
            }).execute()
            
            return TaskExecutionResult(
                success=True,
                result={
                    "plan_id": plan_id,
                    "profile_id": profile_id,
                    "missions_created": len(created_missions),
                    "mission_ids": [m["id"] for m in created_missions],
                },
                result_summary=f"Created {len(created_missions)} missions from plan {plan_id}",
            )
            
        except Exception as e:
            logger.error(f"Error creating missions from plan: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )
    
    @staticmethod
    async def handle_climate_create_single_mission(
        task: ExecutorTask,
        supabase: Client,
    ) -> TaskExecutionResult:
        """
        Create a single mission for a given profile.
        
        Payload:
            profile_id: UUID of the climate profile
            title: Mission title
            category: Mission category (energy, transport, food, etc.)
            estimated_impact_kgco2: Estimated CO2 impact (optional)
            due_date: Due date (optional)
            notes: Additional notes (optional)
        """
        payload = task.payload
        profile_id = payload.get("profile_id")
        title = payload.get("title")
        
        if not profile_id or not title:
            return TaskExecutionResult(
                success=False,
                error_message="Missing required fields: profile_id and title",
            )
        
        try:
            # Verify profile exists and belongs to the same tenant
            profile_result = supabase.table("climate_profiles").select("id, name").eq("id", profile_id).eq("tenant_id", task.tenant_id).single().execute()
            
            if not profile_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Profile {profile_id} not found or does not belong to tenant",
                )
            
            profile = profile_result.data
            
            # Create the mission
            mission_data = {
                "tenant_id": task.tenant_id,
                "profile_id": profile_id,
                "title": title,
                "category": payload.get("category", "general"),
                "status": "planned",
                "estimated_impact_kgco2": payload.get("estimated_impact_kgco2"),
                "due_date": payload.get("due_date"),
                "notes": payload.get("notes", ""),
            }
            
            mission_result = supabase.table("climate_missions").insert(mission_data).execute()
            
            if not mission_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message="Failed to create mission",
                )
            
            mission = mission_result.data[0]
            
            # Create journal entry
            supabase.table("journal_entries").insert({
                "tenant_id": task.tenant_id,
                "category": "climate_action",
                "title": f"Created mission: {title}",
                "body": f"New mission for profile '{profile.get('name', profile_id)}'",
                "details": {
                    "event_type": "climate_mission_created",
                    "mission_id": mission["id"],
                    "profile_id": profile_id,
                    "category": mission_data["category"],
                    "task_id": task.id,
                },
                "author": task.agent_id,
            }).execute()
            
            return TaskExecutionResult(
                success=True,
                result={
                    "mission_id": mission["id"],
                    "profile_id": profile_id,
                    "title": title,
                    "category": mission_data["category"],
                },
                result_summary=f"Created mission '{title}' for profile {profile_id}",
            )
            
        except Exception as e:
            logger.error(f"Error creating single mission: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )
    
    @staticmethod
    async def handle_zora_shop_create_project(
        task: ExecutorTask,
        supabase: Client,
    ) -> TaskExecutionResult:
        """
        Create a new ZORA SHOP Project from a structured brief.
        
        Payload:
            title: Project title
            description: Project description
            primary_brand_id: UUID of the primary brand
            secondary_brand_id: UUID of the secondary brand (optional)
            status: Project status (default: idea)
            theme: Project theme (optional)
            target_launch_date: Target launch date (optional)
        """
        payload = task.payload
        title = payload.get("title")
        primary_brand_id = payload.get("primary_brand_id")
        
        if not title or not primary_brand_id:
            return TaskExecutionResult(
                success=False,
                error_message="Missing required fields: title and primary_brand_id",
            )
        
        try:
            # Verify primary brand exists and belongs to the same tenant
            brand_result = supabase.table("brands").select("id, name").eq("id", primary_brand_id).eq("tenant_id", task.tenant_id).single().execute()
            
            if not brand_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Primary brand {primary_brand_id} not found or does not belong to tenant",
                )
            
            primary_brand = brand_result.data
            
            # Verify secondary brand if provided
            secondary_brand_id = payload.get("secondary_brand_id")
            secondary_brand = None
            if secondary_brand_id:
                secondary_result = supabase.table("brands").select("id, name").eq("id", secondary_brand_id).eq("tenant_id", task.tenant_id).single().execute()
                
                if not secondary_result.data:
                    return TaskExecutionResult(
                        success=False,
                        error_message=f"Secondary brand {secondary_brand_id} not found or does not belong to tenant",
                    )
                secondary_brand = secondary_result.data
            
            # Create the project
            project_data = {
                "tenant_id": task.tenant_id,
                "title": title,
                "description": payload.get("description", ""),
                "primary_brand_id": primary_brand_id,
                "secondary_brand_id": secondary_brand_id,
                "status": payload.get("status", "idea"),
                "theme": payload.get("theme"),
                "target_launch_date": payload.get("target_launch_date"),
            }
            
            project_result = supabase.table("zora_shop_projects").insert(project_data).execute()
            
            if not project_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message="Failed to create project",
                )
            
            project = project_result.data[0]
            
            # Create journal entry
            brand_names = primary_brand.get("name", primary_brand_id)
            if secondary_brand:
                brand_names += f" x {secondary_brand.get('name', secondary_brand_id)}"
            
            supabase.table("journal_entries").insert({
                "tenant_id": task.tenant_id,
                "category": "zora_shop",
                "title": f"Created ZORA SHOP project: {title}",
                "body": f"New collaboration project with {brand_names}",
                "details": {
                    "event_type": "zora_shop_project_created",
                    "project_id": project["id"],
                    "primary_brand_id": primary_brand_id,
                    "secondary_brand_id": secondary_brand_id,
                    "status": project_data["status"],
                    "task_id": task.id,
                },
                "author": task.agent_id,
            }).execute()
            
            return TaskExecutionResult(
                success=True,
                result={
                    "project_id": project["id"],
                    "title": title,
                    "primary_brand_id": primary_brand_id,
                    "secondary_brand_id": secondary_brand_id,
                    "status": project_data["status"],
                },
                result_summary=f"Created ZORA SHOP project '{title}' with {brand_names}",
            )
            
        except Exception as e:
            logger.error(f"Error creating ZORA SHOP project: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )
    
    @staticmethod
    async def handle_zora_shop_update_product_climate_meta(
        task: ExecutorTask,
        supabase: Client,
    ) -> TaskExecutionResult:
        """
        Update the climate metadata for a given product.
        
        Payload:
            product_id: UUID of the product
            climate_label: Climate label (low_impact, climate_neutral, climate_positive)
            estimated_impact_kgco2: Estimated CO2 impact (optional)
            certifications: Certifications string (optional)
            notes: Additional notes (optional)
        """
        payload = task.payload
        product_id = payload.get("product_id")
        
        if not product_id:
            return TaskExecutionResult(
                success=False,
                error_message="Missing required field: product_id",
            )
        
        try:
            # Verify product exists and belongs to the same tenant
            product_result = supabase.table("products").select("id, name").eq("id", product_id).eq("tenant_id", task.tenant_id).single().execute()
            
            if not product_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Product {product_id} not found or does not belong to tenant",
                )
            
            product = product_result.data
            
            # Validate climate_label if provided
            climate_label = payload.get("climate_label")
            valid_labels = ["low_impact", "climate_neutral", "climate_positive"]
            if climate_label and climate_label not in valid_labels:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Invalid climate_label: {climate_label}. Must be one of: {', '.join(valid_labels)}",
                )
            
            # Check if climate meta already exists for this product
            existing_meta = supabase.table("product_climate_meta").select("id").eq("product_id", product_id).eq("tenant_id", task.tenant_id).execute()
            
            meta_data = {
                "tenant_id": task.tenant_id,
                "product_id": product_id,
            }
            
            if climate_label:
                meta_data["climate_label"] = climate_label
            if "estimated_impact_kgco2" in payload:
                meta_data["estimated_impact_kgco2"] = payload["estimated_impact_kgco2"]
            if "certifications" in payload:
                meta_data["certifications"] = payload["certifications"]
            if "notes" in payload:
                meta_data["notes"] = payload["notes"]
            
            if existing_meta.data and len(existing_meta.data) > 0:
                # Update existing meta
                meta_id = existing_meta.data[0]["id"]
                meta_result = supabase.table("product_climate_meta").update(meta_data).eq("id", meta_id).execute()
                action = "updated"
            else:
                # Insert new meta
                meta_result = supabase.table("product_climate_meta").insert(meta_data).execute()
                action = "created"
            
            if not meta_result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Failed to {action} product climate meta",
                )
            
            meta = meta_result.data[0]
            
            # Create journal entry
            supabase.table("journal_entries").insert({
                "tenant_id": task.tenant_id,
                "category": "zora_shop",
                "title": f"Updated climate metadata for product: {product.get('name', product_id)}",
                "body": f"Climate label: {climate_label or 'unchanged'}",
                "details": {
                    "event_type": "shop_product_climate_meta_updated",
                    "product_id": product_id,
                    "climate_meta_id": meta["id"],
                    "climate_label": climate_label,
                    "action": action,
                    "task_id": task.id,
                },
                "author": task.agent_id,
            }).execute()
            
            return TaskExecutionResult(
                success=True,
                result={
                    "product_id": product_id,
                    "climate_meta_id": meta["id"],
                    "climate_label": climate_label,
                    "action": action,
                },
                result_summary=f"{action.capitalize()} climate metadata for product '{product.get('name', product_id)}'",
            )
            
        except Exception as e:
            logger.error(f"Error updating product climate meta: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )


# =============================================================================
# Task Executor
# =============================================================================

class TaskExecutor:
    """
    The Task Execution Engine that processes tasks from the queue.
    
    Usage:
        executor = TaskExecutor()
        summary = await executor.execute_pending_tasks(limit=10)
    """
    
    # Map of task types to handler functions
    TASK_HANDLERS: Dict[str, Callable] = {
        TaskType.CLIMATE_CREATE_MISSIONS_FROM_PLAN.value: TaskHandlers.handle_climate_create_missions_from_plan,
        TaskType.CLIMATE_CREATE_SINGLE_MISSION.value: TaskHandlers.handle_climate_create_single_mission,
        TaskType.ZORA_SHOP_CREATE_PROJECT.value: TaskHandlers.handle_zora_shop_create_project,
        TaskType.ZORA_SHOP_UPDATE_PRODUCT_CLIMATE_META.value: TaskHandlers.handle_zora_shop_update_product_climate_meta,
    }
    
    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ):
        """
        Initialize the Task Executor.
        
        Args:
            supabase_url: Supabase project URL (or set SUPABASE_URL env var)
            supabase_key: Supabase API key (or set SUPABASE_SERVICE_KEY env var)
            tenant_id: Default tenant ID (or set ZORA_TENANT_ID env var)
        """
        if not SUPABASE_AVAILABLE:
            raise ImportError(
                "Supabase client not installed. "
                "Install with: pip install supabase"
            )
        
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_KEY")
        self.default_tenant_id = tenant_id or os.environ.get(
            "ZORA_TENANT_ID", 
            "00000000-0000-0000-0000-000000000001"
        )
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Supabase URL and key are required. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
            )
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.logger = logging.getLogger("zora.autonomy.executor")
        
        self.logger.info(f"TaskExecutor initialized for {self.supabase_url}")
        
        # Cache for policies to avoid repeated DB lookups
        self._policy_cache: Dict[str, AgentTaskPolicy] = {}
    
    async def get_task_policy(
        self,
        task_type: str,
        tenant_id: str,
    ) -> AgentTaskPolicy:
        """
        Resolve the execution policy for a given task_type and tenant.
        
        Policy resolution order:
        1. Tenant-specific policy (if exists)
        2. Global policy (tenant_id IS NULL)
        3. Default policy (auto_execute=False)
        
        Args:
            task_type: The task type to get policy for
            tenant_id: The tenant ID
            
        Returns:
            AgentTaskPolicy with resolved settings
        """
        # Check cache first
        cache_key = f"{tenant_id}:{task_type}"
        if cache_key in self._policy_cache:
            return self._policy_cache[cache_key]
        
        try:
            # First, try to find tenant-specific policy
            tenant_policy_result = (
                self.supabase.table("agent_task_policies")
                .select("*")
                .eq("tenant_id", tenant_id)
                .eq("task_type", task_type)
                .execute()
            )
            
            if tenant_policy_result.data and len(tenant_policy_result.data) > 0:
                policy = AgentTaskPolicy.from_db_row(tenant_policy_result.data[0])
                self._policy_cache[cache_key] = policy
                self.logger.debug(f"Found tenant-specific policy for {task_type}: auto_execute={policy.auto_execute}")
                return policy
            
            # Fall back to global policy (tenant_id IS NULL)
            global_policy_result = (
                self.supabase.table("agent_task_policies")
                .select("*")
                .is_("tenant_id", "null")
                .eq("task_type", task_type)
                .execute()
            )
            
            if global_policy_result.data and len(global_policy_result.data) > 0:
                policy = AgentTaskPolicy.from_db_row(global_policy_result.data[0])
                self._policy_cache[cache_key] = policy
                self.logger.debug(f"Found global policy for {task_type}: auto_execute={policy.auto_execute}")
                return policy
            
            # No policy found - return default (auto_execute=False)
            policy = AgentTaskPolicy.default_policy(task_type)
            self._policy_cache[cache_key] = policy
            self.logger.debug(f"No policy found for {task_type}, using default: auto_execute=False")
            return policy
            
        except Exception as e:
            self.logger.error(f"Error fetching policy for {task_type}: {e}")
            # On error, return default policy (safe default)
            return AgentTaskPolicy.default_policy(task_type)
    
    async def should_task_execute(
        self,
        task: ExecutorTask,
    ) -> tuple[bool, str]:
        """
        Determine if a task should be executed based on policy and approval status.
        
        Args:
            task: The task to check
            
        Returns:
            Tuple of (should_execute, reason)
        """
        # Check if task has been rejected
        if task.is_rejected:
            return False, "task_rejected"
        
        # Check if task has been manually approved
        if task.is_approved:
            return True, "manually_approved"
        
        # Get the policy for this task type
        policy = await self.get_task_policy(task.task_type, task.tenant_id)
        
        # If auto_execute is enabled, task can run
        if policy.auto_execute:
            return True, "auto_execute_enabled"
        
        # Task requires approval but hasn't been approved yet
        return False, "requires_approval"
    
    async def mark_task_requires_approval(
        self,
        task: ExecutorTask,
    ) -> bool:
        """
        Mark a task as requiring approval (set requires_approval=true).
        
        Args:
            task: The task to mark
            
        Returns:
            True if successfully updated, False otherwise
        """
        try:
            self.supabase.table("agent_tasks").update({
                "requires_approval": True,
                "result_summary": "Awaiting manual approval",
            }).eq("id", task.id).execute()
            
            self.logger.info(f"Marked task {task.id} as requiring approval")
            return True
        except Exception as e:
            self.logger.error(f"Error marking task {task.id} as requiring approval: {e}")
            return False
    
    async def fetch_pending_tasks(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        task_type: Optional[str] = None,
    ) -> List[ExecutorTask]:
        """
        Fetch pending tasks from the queue.
        
        Args:
            tenant_id: Filter by tenant (or use default)
            limit: Maximum number of tasks to fetch
            task_type: Filter by task type (optional)
            
        Returns:
            List of pending ExecutorTask objects
        """
        tenant = tenant_id or self.default_tenant_id
        
        try:
            query = (
                self.supabase.table("agent_tasks")
                .select("*")
                .eq("tenant_id", tenant)
                .eq("status", "pending")
                .order("priority", desc=True)
                .order("created_at", desc=False)
                .limit(limit)
            )
            
            if task_type:
                query = query.eq("task_type", task_type)
            
            result = query.execute()
            
            tasks = [ExecutorTask.from_db_row(row) for row in result.data]
            self.logger.info(f"Fetched {len(tasks)} pending tasks for tenant {tenant}")
            return tasks
        except Exception as e:
            self.logger.error(f"Failed to fetch pending tasks: {e}")
            return []
    
    async def claim_task(self, task: ExecutorTask) -> bool:
        """
        Attempt to claim a task by setting status to in_progress.
        
        Uses a conditional update to ensure only one worker can claim a task.
        
        Args:
            task: The task to claim
            
        Returns:
            True if successfully claimed, False otherwise
        """
        now = datetime.utcnow().isoformat()
        
        try:
            result = (
                self.supabase.table("agent_tasks")
                .update({"status": "in_progress", "started_at": now})
                .eq("id", task.id)
                .eq("status", "pending")  # Only claim if still pending
                .execute()
            )
            
            # Check if we successfully claimed the task
            if result.data and len(result.data) > 0:
                self.logger.info(f"Claimed task {task.id} ({task.task_type})")
                return True
            else:
                self.logger.warning(f"Failed to claim task {task.id} - already claimed or not found")
                return False
        except Exception as e:
            self.logger.error(f"Error claiming task {task.id}: {e}")
            return False
    
    async def execute_task(self, task: ExecutorTask) -> TaskExecutionResult:
        """
        Execute a single task by dispatching to the appropriate handler.
        
        Args:
            task: The task to execute
            
        Returns:
            TaskExecutionResult with status and outcome
        """
        self.logger.info(f"Executing task {task.id}: {task.task_type}")
        
        # Check if task type is supported
        if task.task_type not in self.TASK_HANDLERS:
            return TaskExecutionResult(
                success=False,
                error_message=f"Unsupported task type: {task.task_type}. Supported types: {', '.join(SUPPORTED_TASK_TYPES)}",
            )
        
        # Get the handler
        handler = self.TASK_HANDLERS[task.task_type]
        
        try:
            # Execute the handler
            result = await handler(task, self.supabase)
            return result
        except Exception as e:
            self.logger.error(f"Error executing task {task.id}: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )
    
    async def complete_task(
        self,
        task: ExecutorTask,
        result: TaskExecutionResult,
    ) -> bool:
        """
        Update a task with its execution result.
        
        Args:
            task: The task that was executed
            result: The execution result
            
        Returns:
            True if successfully updated, False otherwise
        """
        now = datetime.utcnow().isoformat()
        
        update_data = {
            "status": result.status,
            "completed_at": now,
        }
        
        if result.result:
            update_data["result"] = result.result
        if result.result_summary:
            update_data["result_summary"] = result.result_summary
        if result.error_message:
            update_data["error_message"] = result.error_message
        
        try:
            self.supabase.table("agent_tasks").update(update_data).eq("id", task.id).execute()
            self.logger.info(f"Completed task {task.id} with status {result.status}")
            return True
        except Exception as e:
            self.logger.error(f"Error completing task {task.id}: {e}")
            return False
    
    async def execute_single_task_by_id(
        self,
        task_id: str,
        tenant_id: Optional[str] = None,
    ) -> TaskExecutionResult:
        """
        Execute a specific task by ID.
        
        This is useful for manual execution via API or CLI.
        
        Args:
            task_id: The task ID to execute
            tenant_id: The tenant ID (for validation)
            
        Returns:
            TaskExecutionResult with status and outcome
        """
        tenant = tenant_id or self.default_tenant_id
        
        try:
            # Fetch the task
            result = (
                self.supabase.table("agent_tasks")
                .select("*")
                .eq("id", task_id)
                .eq("tenant_id", tenant)
                .single()
                .execute()
            )
            
            if not result.data:
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Task {task_id} not found or does not belong to tenant",
                )
            
            task = ExecutorTask.from_db_row(result.data)
            
            # Check if task is already completed or failed
            if task.status in ("completed", "failed"):
                return TaskExecutionResult(
                    success=False,
                    error_message=f"Task {task_id} is already {task.status}",
                )
            
            # Claim the task if pending
            if task.status == "pending":
                if not await self.claim_task(task):
                    return TaskExecutionResult(
                        success=False,
                        error_message=f"Failed to claim task {task_id}",
                    )
            
            # Execute the task
            exec_result = await self.execute_task(task)
            
            # Complete the task
            await self.complete_task(task, exec_result)
            
            return exec_result
            
        except Exception as e:
            self.logger.error(f"Error executing task {task_id}: {e}")
            return TaskExecutionResult(
                success=False,
                error_message=str(e),
            )
    
    async def execute_pending_tasks(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
        task_type: Optional[str] = None,
    ) -> ExecutionSummary:
        """
        Fetch and execute pending tasks.
        
        Args:
            tenant_id: Filter by tenant (or use default)
            limit: Maximum number of tasks to process
            task_type: Filter by task type (optional)
            
        Returns:
            ExecutionSummary with counts and results
        """
        summary = ExecutionSummary()
        
        # Fetch pending tasks
        tasks = await self.fetch_pending_tasks(
            tenant_id=tenant_id,
            limit=limit,
            task_type=task_type,
        )
        summary.total_fetched = len(tasks)
        
        for task in tasks:
            # Check if task type is supported
            if task.task_type not in SUPPORTED_TASK_TYPES:
                self.logger.warning(f"Skipping unsupported task type: {task.task_type}")
                summary.skipped += 1
                summary.task_results.append({
                    "task_id": task.id,
                    "task_type": task.task_type,
                    "status": "skipped",
                    "reason": "unsupported_task_type",
                })
                continue
            
            # Safety Layer v1: Check if task should execute based on policy
            should_execute, reason = await self.should_task_execute(task)
            
            if not should_execute:
                if reason == "task_rejected":
                    self.logger.info(f"Skipping rejected task {task.id}")
                    summary.skipped += 1
                    summary.task_results.append({
                        "task_id": task.id,
                        "task_type": task.task_type,
                        "status": "skipped",
                        "reason": "task_rejected",
                    })
                elif reason == "requires_approval":
                    # Mark task as requiring approval and skip
                    self.logger.info(f"Task {task.id} requires approval, marking and skipping")
                    await self.mark_task_requires_approval(task)
                    summary.skipped += 1
                    summary.task_results.append({
                        "task_id": task.id,
                        "task_type": task.task_type,
                        "status": "skipped",
                        "reason": "requires_approval",
                    })
                else:
                    summary.skipped += 1
                    summary.task_results.append({
                        "task_id": task.id,
                        "task_type": task.task_type,
                        "status": "skipped",
                        "reason": reason,
                    })
                continue
            
            # Try to claim the task
            if not await self.claim_task(task):
                summary.skipped += 1
                summary.task_results.append({
                    "task_id": task.id,
                    "task_type": task.task_type,
                    "status": "skipped",
                    "reason": "claim_failed",
                })
                continue
            
            # Execute the task
            result = await self.execute_task(task)
            
            # Complete the task
            await self.complete_task(task, result)
            
            summary.total_executed += 1
            if result.success:
                summary.completed += 1
            else:
                summary.failed += 1
            
            summary.task_results.append({
                "task_id": task.id,
                "task_type": task.task_type,
                "status": result.status,
                "result_summary": result.result_summary,
                "error_message": result.error_message,
                "execution_reason": reason,  # Include why task was allowed to execute
            })
        
        self.logger.info(
            f"Execution summary: fetched={summary.total_fetched}, "
            f"executed={summary.total_executed}, completed={summary.completed}, "
            f"failed={summary.failed}, skipped={summary.skipped}"
        )
        
        return summary


# =============================================================================
# Utility Functions
# =============================================================================

def is_executor_configured() -> bool:
    """Check if the task executor can be initialized."""
    return bool(
        os.environ.get("SUPABASE_URL") and
        os.environ.get("SUPABASE_SERVICE_KEY")
    )


def is_supported_task_type(task_type: str) -> bool:
    """Check if a task type is supported by the v1 executor."""
    return task_type in SUPPORTED_TASK_TYPES


def get_supported_task_types() -> List[str]:
    """Get list of supported task types."""
    return list(SUPPORTED_TASK_TYPES)
