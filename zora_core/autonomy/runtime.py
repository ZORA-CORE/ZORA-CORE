"""
ZORA CORE Agent Runtime v1

This module provides the Agent Runtime service that:
- Fetches pending tasks from the agent_tasks queue
- Dispatches tasks to the appropriate agent
- Runs LLM-based reasoning via ModelRouter
- Logs outcomes to journal and EIVOR memory

The runtime is designed to be run via CLI (run-once or run-loop mode).
"""

import asyncio
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, TYPE_CHECKING

# Supabase client import - optional dependency
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

if TYPE_CHECKING:
    from ..models.model_router import ModelRouter
    from ..memory.supabase_adapter import SupabaseMemoryAdapter

logger = logging.getLogger("zora.autonomy.runtime")


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class AgentTask:
    """Represents a task from the agent_tasks queue."""
    id: str
    tenant_id: str
    agent_id: str
    task_type: str
    status: str
    priority: int
    title: str
    description: Optional[str]
    payload: Dict[str, Any]
    result_summary: Optional[str]
    error_message: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    created_by_user_id: Optional[str]
    created_at: str
    updated_at: Optional[str]

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "AgentTask":
        """Create an AgentTask from a database row."""
        return cls(
            id=row["id"],
            tenant_id=row["tenant_id"],
            agent_id=row["agent_id"],
            task_type=row["task_type"],
            status=row["status"],
            priority=row.get("priority", 0),
            title=row["title"],
            description=row.get("description"),
            payload=row.get("payload", {}),
            result_summary=row.get("result_summary"),
            error_message=row.get("error_message"),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            created_by_user_id=row.get("created_by_user_id"),
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
        )


@dataclass
class AgentTaskResult:
    """Result of processing an agent task."""
    status: str  # 'completed' or 'failed'
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    memory_event_id: Optional[str] = None
    journal_entry_id: Optional[str] = None


@dataclass
class AgentRuntimeContext:
    """
    Context passed to agents when handling tasks.
    
    Provides access to shared services without agents needing to
    know implementation details.
    """
    tenant_id: str
    supabase: Any  # supabase.Client
    model_router: "ModelRouter"
    memory_backend: Optional["SupabaseMemoryAdapter"]
    logger: logging.Logger

    async def create_journal_entry(
        self,
        *,
        category: str,
        title: str,
        body: str = "",
        details: Optional[Dict[str, Any]] = None,
        author: str = "system",
        related_entity_ids: Optional[List[str]] = None,
    ) -> Optional[str]:
        """
        Create a journal entry for this tenant.
        
        Returns the journal entry ID or None on failure.
        """
        try:
            result = self.supabase.table("journal_entries").insert({
                "tenant_id": self.tenant_id,
                "category": category,
                "title": title,
                "body": body,
                "details": details or {},
                "author": author,
                "related_entity_ids": related_entity_ids or [],
            }).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]["id"]
            return None
        except Exception as e:
            self.logger.error(f"Failed to create journal entry: {e}")
            return None

    async def save_memory_event(
        self,
        *,
        agent: str,
        memory_type: str,
        content: str,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Save a memory event for EIVOR.
        
        Returns the memory event ID or None on failure.
        """
        if self.memory_backend:
            try:
                memory_id = await self.memory_backend.save_memory(
                    agent=agent,
                    memory_type=memory_type,
                    content=content,
                    tags=tags or [],
                    metadata=metadata or {},
                )
                return memory_id
            except Exception as e:
                self.logger.error(f"Failed to save memory event: {e}")
                return None
        else:
            # Fallback to direct Supabase insert if memory backend not available
            try:
                result = self.supabase.table("memory_events").insert({
                    "tenant_id": self.tenant_id,
                    "agent": agent,
                    "memory_type": memory_type,
                    "content": content,
                    "tags": tags or [],
                    "metadata": metadata or {},
                }).execute()
                
                if result.data and len(result.data) > 0:
                    return result.data[0]["id"]
                return None
            except Exception as e:
                self.logger.error(f"Failed to save memory event via Supabase: {e}")
                return None

    async def get_recent_agent_tasks(
        self,
        *,
        agent_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Get recent agent tasks for review."""
        try:
            query = (
                self.supabase.table("agent_tasks")
                .select("*")
                .eq("tenant_id", self.tenant_id)
                .order("created_at", desc=True)
                .limit(limit)
            )
            
            if agent_id:
                query = query.eq("agent_id", agent_id)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            self.logger.error(f"Failed to get recent agent tasks: {e}")
            return []

    async def create_agent_insight(
        self,
        *,
        agent_id: str,
        category: str,
        title: str,
        body: str = "",
        source_task_id: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        related_entity_ref: Optional[str] = None,
        impact_estimate_kgco2: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Create an agent insight record.
        
        Agent insights are structured, actionable suggestions from agents
        tied to Climate OS, Mashup Shop, and frontend domains.
        
        Args:
            agent_id: The agent creating the insight (CONNOR, LUMINA, etc.)
            category: Insight category (climate_mission_suggestion, frontend_improvement, etc.)
            title: Short human-readable title
            body: Longer markdown/text description
            source_task_id: Optional FK to agent_tasks.id
            related_entity_type: e.g. climate_profile, climate_mission, frontend_page
            related_entity_ref: Flexible reference like "profile:<uuid>", "page:home"
            impact_estimate_kgco2: For climate-related insights
            metadata: Any extra structured data
            
        Returns:
            The insight ID or None on failure.
        """
        try:
            insert_data = {
                "tenant_id": self.tenant_id,
                "agent_id": agent_id,
                "category": category,
                "title": title,
                "body": body,
                "status": "proposed",
                "metadata": metadata or {},
            }
            
            if source_task_id:
                insert_data["source_task_id"] = source_task_id
            if related_entity_type:
                insert_data["related_entity_type"] = related_entity_type
            if related_entity_ref:
                insert_data["related_entity_ref"] = related_entity_ref
            if impact_estimate_kgco2 is not None:
                insert_data["impact_estimate_kgco2"] = impact_estimate_kgco2
            
            result = self.supabase.table("agent_insights").insert(insert_data).execute()
            
            if result.data and len(result.data) > 0:
                insight_id = result.data[0]["id"]
                self.logger.info(f"Created agent insight {insight_id}: {category}/{title}")
                return insight_id
            return None
        except Exception as e:
            self.logger.error(f"Failed to create agent insight: {e}")
            return None

    async def get_climate_profiles(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get climate profiles for the tenant."""
        try:
            result = (
                self.supabase.table("climate_profiles")
                .select("*")
                .eq("tenant_id", self.tenant_id)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            self.logger.error(f"Failed to get climate profiles: {e}")
            return []

    async def get_climate_missions(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get climate missions for the tenant."""
        try:
            result = (
                self.supabase.table("climate_missions")
                .select("*")
                .eq("tenant_id", self.tenant_id)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            self.logger.error(f"Failed to get climate missions: {e}")
            return []

    async def get_frontend_config(self, page_key: str) -> Optional[Dict[str, Any]]:
        """Get frontend config for a specific page."""
        try:
            result = (
                self.supabase.table("frontend_configs")
                .select("*")
                .eq("tenant_id", self.tenant_id)
                .eq("page_key", page_key)
                .limit(1)
                .execute()
            )
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            self.logger.error(f"Failed to get frontend config for {page_key}: {e}")
            return None


# =============================================================================
# Agent Runtime
# =============================================================================

class AgentRuntime:
    """
    The Agent Runtime service that processes tasks from the queue.
    
    Usage:
        runtime = AgentRuntime()
        await runtime.run_once(limit=5)  # Process up to 5 tasks
        # or
        await runtime.run_loop(sleep_seconds=10)  # Continuous processing
    """

    # Map of agent IDs to their module paths
    AGENT_MODULES = {
        "CONNOR": "zora_core.agents.connor.agent",
        "LUMINA": "zora_core.agents.lumina.agent",
        "EIVOR": "zora_core.agents.eivor.agent",
        "ORACLE": "zora_core.agents.oracle.agent",
        "AEGIS": "zora_core.agents.aegis.agent",
        "SAM": "zora_core.agents.sam.agent",
    }

    AGENT_CLASSES = {
        "CONNOR": "ConnorAgent",
        "LUMINA": "LuminaAgent",
        "EIVOR": "EivorAgent",
        "ORACLE": "OracleAgent",
        "AEGIS": "AegisAgent",
        "SAM": "SamAgent",
    }

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ):
        """
        Initialize the Agent Runtime.
        
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
        self.logger = logging.getLogger("zora.autonomy.runtime")
        
        # Initialize model router
        self._model_router: Optional["ModelRouter"] = None
        self._memory_backend: Optional["SupabaseMemoryAdapter"] = None
        
        # Agent instance cache
        self._agents: Dict[str, Any] = {}
        
        self.logger.info(f"AgentRuntime initialized for {self.supabase_url}")

    def _get_model_router(self) -> "ModelRouter":
        """Get or create the ModelRouter instance."""
        if self._model_router is None:
            from ..models.model_router import ModelRouter
            self._model_router = ModelRouter()
        return self._model_router

    def _get_memory_backend(self) -> Optional["SupabaseMemoryAdapter"]:
        """Get or create the SupabaseMemoryAdapter instance."""
        if self._memory_backend is None:
            try:
                from ..memory.supabase_adapter import SupabaseMemoryAdapter, is_supabase_configured
                if is_supabase_configured():
                    self._memory_backend = SupabaseMemoryAdapter()
            except Exception as e:
                self.logger.warning(f"Could not initialize memory backend: {e}")
        return self._memory_backend

    def _get_agent(self, agent_id: str) -> Any:
        """
        Get or create an agent instance.
        
        Args:
            agent_id: The agent ID (CONNOR, LUMINA, etc.)
            
        Returns:
            The agent instance
        """
        if agent_id in self._agents:
            return self._agents[agent_id]
        
        if agent_id not in self.AGENT_MODULES:
            raise ValueError(f"Unknown agent: {agent_id}")
        
        # Import the agent module dynamically
        import importlib
        module_path = self.AGENT_MODULES[agent_id]
        class_name = self.AGENT_CLASSES[agent_id]
        
        try:
            module = importlib.import_module(module_path)
            agent_class = getattr(module, class_name)
            agent = agent_class()
            
            # Set up the agent with model router and memory
            agent.model_router = self._get_model_router()
            memory_backend = self._get_memory_backend()
            if memory_backend:
                from ..memory.base import Memory
                agent.memory = Memory(backend=memory_backend)
            
            self._agents[agent_id] = agent
            return agent
        except Exception as e:
            self.logger.error(f"Failed to load agent {agent_id}: {e}")
            raise

    async def fetch_pending_tasks(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[AgentTask]:
        """
        Fetch pending tasks from the queue.
        
        Args:
            tenant_id: Filter by tenant (or use default)
            limit: Maximum number of tasks to fetch
            
        Returns:
            List of pending AgentTask objects
        """
        tenant = tenant_id or self.default_tenant_id
        
        try:
            result = (
                self.supabase.table("agent_tasks")
                .select("*")
                .eq("tenant_id", tenant)
                .eq("status", "pending")
                .order("priority", desc=True)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            
            tasks = [AgentTask.from_db_row(row) for row in result.data]
            self.logger.info(f"Fetched {len(tasks)} pending tasks for tenant {tenant}")
            return tasks
        except Exception as e:
            self.logger.error(f"Failed to fetch pending tasks: {e}")
            return []

    async def claim_task(self, task: AgentTask) -> bool:
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

    async def process_task(self, task: AgentTask) -> AgentTaskResult:
        """
        Process a single task by dispatching to the appropriate agent.
        
        Args:
            task: The task to process
            
        Returns:
            AgentTaskResult with status and outcome
        """
        self.logger.info(f"Processing task {task.id}: {task.agent_id}/{task.task_type}")
        
        # Create runtime context
        ctx = AgentRuntimeContext(
            tenant_id=task.tenant_id,
            supabase=self.supabase,
            model_router=self._get_model_router(),
            memory_backend=self._get_memory_backend(),
            logger=self.logger,
        )
        
        try:
            # Get the agent
            agent = self._get_agent(task.agent_id)
            
            # Call the agent's handle_task method
            result = await agent.handle_task(task, ctx)
            
            # Create journal entry for the task run
            journal_id = await ctx.create_journal_entry(
                category="agent_action",
                title=f"{task.agent_id} task: {task.task_type} ({result.status})",
                body=result.result_summary or result.error_message or "",
                details={
                    "task_id": task.id,
                    "agent_id": task.agent_id,
                    "task_type": task.task_type,
                    "status": result.status,
                    "priority": task.priority,
                },
                author=task.agent_id.lower(),
                related_entity_ids=[task.id],
            )
            result.journal_entry_id = journal_id
            
            # Create EIVOR memory event for the task run
            memory_id = await ctx.save_memory_event(
                agent="EIVOR",
                memory_type="result",
                content=f"Task {task.task_type} by {task.agent_id}: {result.result_summary or result.error_message}",
                tags=["agent_task", task.agent_id, task.task_type, result.status],
                metadata={
                    "task_id": task.id,
                    "tenant_id": task.tenant_id,
                    "agent_id": task.agent_id,
                    "task_type": task.task_type,
                    "status": result.status,
                },
            )
            result.memory_event_id = memory_id
            
            return result
            
        except NotImplementedError as e:
            error_msg = f"Agent {task.agent_id} does not implement handle_task: {e}"
            self.logger.error(error_msg)
            return AgentTaskResult(
                status="failed",
                error_message=error_msg,
            )
        except Exception as e:
            error_msg = f"Error processing task {task.id}: {e}"
            self.logger.error(error_msg)
            return AgentTaskResult(
                status="failed",
                error_message=error_msg,
            )

    async def complete_task(self, task: AgentTask, result: AgentTaskResult) -> bool:
        """
        Update a task with its final status and result.
        
        Args:
            task: The task to complete
            result: The result of processing
            
        Returns:
            True if successfully updated, False otherwise
        """
        now = datetime.utcnow().isoformat()
        
        update_data = {
            "status": result.status,
            "completed_at": now,
        }
        
        if result.result_summary:
            update_data["result_summary"] = result.result_summary
        if result.error_message:
            update_data["error_message"] = result.error_message
        
        try:
            self.supabase.table("agent_tasks").update(update_data).eq("id", task.id).execute()
            self.logger.info(f"Completed task {task.id} with status {result.status}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to complete task {task.id}: {e}")
            return False

    async def run_once(
        self,
        tenant_id: Optional[str] = None,
        limit: int = 10,
    ) -> int:
        """
        Process up to `limit` pending tasks and exit.
        
        Args:
            tenant_id: Filter by tenant (or use default)
            limit: Maximum number of tasks to process
            
        Returns:
            Number of tasks processed
        """
        self.logger.info(f"Running once with limit={limit}")
        
        tasks = await self.fetch_pending_tasks(tenant_id=tenant_id, limit=limit)
        processed = 0
        
        for task in tasks:
            # Try to claim the task
            if not await self.claim_task(task):
                continue
            
            # Process the task
            result = await self.process_task(task)
            
            # Update the task with the result
            await self.complete_task(task, result)
            processed += 1
        
        self.logger.info(f"Processed {processed} tasks")
        return processed

    async def run_loop(
        self,
        tenant_id: Optional[str] = None,
        sleep_seconds: int = 10,
        batch_size: int = 5,
    ) -> None:
        """
        Continuously process tasks in a loop.
        
        Args:
            tenant_id: Filter by tenant (or use default)
            sleep_seconds: Seconds to sleep between batches
            batch_size: Number of tasks to process per batch
        """
        self.logger.info(f"Starting run loop (sleep={sleep_seconds}s, batch={batch_size})")
        
        while True:
            try:
                processed = await self.run_once(tenant_id=tenant_id, limit=batch_size)
                
                if processed == 0:
                    self.logger.debug(f"No tasks to process, sleeping for {sleep_seconds}s")
                
                await asyncio.sleep(sleep_seconds)
            except KeyboardInterrupt:
                self.logger.info("Received interrupt, stopping run loop")
                break
            except Exception as e:
                self.logger.error(f"Error in run loop: {e}")
                await asyncio.sleep(sleep_seconds)


# =============================================================================
# Utility Functions
# =============================================================================

def is_runtime_configured() -> bool:
    """Check if the runtime environment is configured."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    return bool(url and key)


async def demo():
    """Demo the Agent Runtime."""
    print("=== ZORA CORE Agent Runtime Demo ===\n")
    
    if not is_runtime_configured():
        print("Runtime not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return
    
    runtime = AgentRuntime()
    
    print("1. Fetching pending tasks...")
    tasks = await runtime.fetch_pending_tasks(limit=5)
    print(f"   Found {len(tasks)} pending tasks\n")
    
    if tasks:
        print("2. Processing first task...")
        task = tasks[0]
        print(f"   Task: {task.agent_id}/{task.task_type} - {task.title}")
        
        if await runtime.claim_task(task):
            result = await runtime.process_task(task)
            await runtime.complete_task(task, result)
            print(f"   Result: {result.status}")
            if result.result_summary:
                print(f"   Summary: {result.result_summary[:100]}...")
    else:
        print("2. No tasks to process")
    
    print("\n=== Demo Complete ===")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(demo())
