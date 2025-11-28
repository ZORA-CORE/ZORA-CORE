"""
ZORA CORE Agent Command Planner v1

This module provides the command planning functionality that:
- Takes freeform prompts from the Founder
- Uses LUMINA to analyze and plan tasks
- Creates structured agent_tasks from the plan

The command planner is the bridge between natural language commands
and the Agent Runtime task queue.
"""

import json
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

logger = logging.getLogger("zora.autonomy.commands")


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class PlannedTask:
    """A task planned by LUMINA from a command."""
    agent_id: str
    task_type: str
    title: str
    description: str
    payload: Dict[str, Any] = field(default_factory=dict)
    priority: int = 0


@dataclass
class CommandPlanResult:
    """Result of planning a command."""
    success: bool
    tasks: List[PlannedTask] = field(default_factory=list)
    summary: str = ""
    error_message: Optional[str] = None


@dataclass
class AgentCommand:
    """Represents a command from the agent_commands table."""
    id: str
    tenant_id: str
    raw_prompt: str
    target_agents: Optional[List[str]]
    status: str
    parsed_summary: Optional[str]
    tasks_created_count: int
    error_message: Optional[str]
    created_by_user_id: Optional[str]
    created_at: str
    updated_at: Optional[str]
    metadata: Dict[str, Any]

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "AgentCommand":
        """Create an AgentCommand from a database row."""
        return cls(
            id=row["id"],
            tenant_id=row["tenant_id"],
            raw_prompt=row["raw_prompt"],
            target_agents=row.get("target_agents"),
            status=row["status"],
            parsed_summary=row.get("parsed_summary"),
            tasks_created_count=row.get("tasks_created_count", 0),
            error_message=row.get("error_message"),
            created_by_user_id=row.get("created_by_user_id"),
            created_at=row["created_at"],
            updated_at=row.get("updated_at"),
            metadata=row.get("metadata", {}),
        )


# =============================================================================
# Agent Task Types Reference
# =============================================================================

# Known task types per agent - used to help LUMINA understand what each agent can do
AGENT_TASK_TYPES = {
    "ORACLE": {
        "propose_new_climate_missions": "Analyze a climate profile and suggest new climate missions",
        "research_topic": "Research a specific topic related to climate, sustainability, or strategy",
        "analyze_climate_data": "Analyze climate data and provide insights",
    },
    "SAM": {
        "review_climate_page": "Review the /climate page and suggest UX improvements",
        "review_accessibility": "Review a page for accessibility issues",
        "design_component": "Design a new UI component or feature",
        "review_frontend_page": "Review any frontend page and suggest improvements",
    },
    "LUMINA": {
        "plan_frontend_improvements": "Plan improvements for a frontend page",
        "plan_workflow": "Create a workflow plan for a complex goal",
        "coordinate_agents": "Coordinate multiple agents for a complex task",
    },
    "EIVOR": {
        "summarize_recent_activity": "Summarize recent system activity and decisions",
        "search_memories": "Search memories for relevant context",
        "create_knowledge_summary": "Create a summary of knowledge on a topic",
    },
    "CONNOR": {
        "review_system_health": "Review system health and suggest improvements",
        "analyze_api_performance": "Analyze API performance and suggest optimizations",
        "review_database_schema": "Review database schema and suggest improvements",
    },
    "AEGIS": {
        "review_climate_claims": "Review climate claims for greenwashing",
        "safety_audit": "Conduct a safety audit of a feature or system",
        "compliance_check": "Check compliance with climate standards",
    },
}


# =============================================================================
# Command Planner
# =============================================================================

class CommandPlanner:
    """
    Plans agent tasks from freeform commands using LUMINA.
    
    Usage:
        planner = CommandPlanner()
        result = await planner.plan_command(
            raw_prompt="Ask ORACLE to propose new climate missions",
            target_agents=["ORACLE"],
            tenant_id="...",
        )
    """

    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
    ):
        """
        Initialize the Command Planner.
        
        Args:
            supabase_url: Supabase project URL (or set SUPABASE_URL env var)
            supabase_key: Supabase API key (or set SUPABASE_SERVICE_KEY env var)
        """
        if not SUPABASE_AVAILABLE:
            raise ImportError(
                "Supabase client not installed. "
                "Install with: pip install supabase"
            )
        
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Supabase URL and key are required. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
            )
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.logger = logging.getLogger("zora.autonomy.commands")
        
        # Initialize model router lazily
        self._model_router: Optional["ModelRouter"] = None
        
        self.logger.info("CommandPlanner initialized")

    def _get_model_router(self) -> "ModelRouter":
        """Get or create the ModelRouter instance."""
        if self._model_router is None:
            from ..models.model_router import ModelRouter
            self._model_router = ModelRouter()
        return self._model_router

    def _build_planning_prompt(
        self,
        raw_prompt: str,
        target_agents: Optional[List[str]] = None,
    ) -> str:
        """Build the prompt for LUMINA to plan tasks."""
        
        # Build agent capabilities section
        if target_agents:
            agents_to_use = [a.upper() for a in target_agents if a.upper() in AGENT_TASK_TYPES]
        else:
            agents_to_use = list(AGENT_TASK_TYPES.keys())
        
        capabilities_text = ""
        for agent_id in agents_to_use:
            tasks = AGENT_TASK_TYPES.get(agent_id, {})
            if tasks:
                capabilities_text += f"\n{agent_id}:\n"
                for task_type, description in tasks.items():
                    capabilities_text += f"  - {task_type}: {description}\n"
        
        prompt = f"""You are LUMINA, the Planner/Orchestrator for ZORA CORE.

The Founder has given you a command in natural language. Your job is to analyze this command and create a plan of agent tasks that will accomplish the goal.

## Founder's Command:
"{raw_prompt}"

## Available Agents and Their Task Types:
{capabilities_text}

## Instructions:
1. Analyze the command to understand what the Founder wants
2. Decide which agent(s) should handle this and what task type(s) to use
3. Create 1-5 tasks that together will accomplish the goal
4. Each task should be specific and actionable

## Output Format:
Return a JSON object with this structure:
{{
  "summary": "Brief summary of what will be done",
  "tasks": [
    {{
      "agent_id": "AGENT_NAME",
      "task_type": "task_type_from_list_above",
      "title": "Short descriptive title",
      "description": "Detailed description of what this task should accomplish",
      "payload": {{}},
      "priority": 0
    }}
  ]
}}

If the command is unclear or cannot be mapped to tasks, return:
{{
  "summary": "Unable to plan: [reason]",
  "tasks": []
}}

Return ONLY the JSON object, no other text.
"""
        return prompt

    async def plan_command(
        self,
        raw_prompt: str,
        target_agents: Optional[List[str]] = None,
        tenant_id: Optional[str] = None,
    ) -> CommandPlanResult:
        """
        Plan tasks from a freeform command using LUMINA.
        
        Args:
            raw_prompt: The freeform command from the Founder
            target_agents: Optional list of agents to use (or let LUMINA choose)
            tenant_id: Optional tenant ID for context
            
        Returns:
            CommandPlanResult with planned tasks or error
        """
        self.logger.info(f"Planning command: {raw_prompt[:100]}...")
        
        try:
            # Build the planning prompt
            prompt = self._build_planning_prompt(raw_prompt, target_agents)
            
            # Call LUMINA via ModelRouter
            model_router = self._get_model_router()
            response = await model_router.route_request(
                task_type="planning",
                prompt=prompt,
                agent_name="LUMINA",
            )
            
            # Parse the response
            response_text = response.strip()
            
            # Handle markdown code blocks
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # Remove first line (```json or ```) and last line (```)
                if lines[-1].strip() == "```":
                    lines = lines[1:-1]
                else:
                    lines = lines[1:]
                response_text = "\n".join(lines)
            
            # Parse JSON
            plan_data = json.loads(response_text)
            
            summary = plan_data.get("summary", "")
            tasks_data = plan_data.get("tasks", [])
            
            # Convert to PlannedTask objects
            tasks = []
            for task_data in tasks_data:
                agent_id = task_data.get("agent_id", "").upper()
                
                # Validate agent_id
                if agent_id not in AGENT_TASK_TYPES:
                    self.logger.warning(f"Unknown agent_id: {agent_id}, skipping task")
                    continue
                
                task = PlannedTask(
                    agent_id=agent_id,
                    task_type=task_data.get("task_type", "general"),
                    title=task_data.get("title", "Untitled Task"),
                    description=task_data.get("description", ""),
                    payload=task_data.get("payload", {}),
                    priority=task_data.get("priority", 0),
                )
                tasks.append(task)
            
            return CommandPlanResult(
                success=True,
                tasks=tasks,
                summary=summary,
            )
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse LUMINA response: {e}")
            return CommandPlanResult(
                success=False,
                error_message=f"Failed to parse planning response: {e}",
            )
        except Exception as e:
            self.logger.error(f"Error planning command: {e}")
            return CommandPlanResult(
                success=False,
                error_message=str(e),
            )

    async def execute_command(
        self,
        command_id: str,
        tenant_id: str,
        raw_prompt: str,
        target_agents: Optional[List[str]] = None,
        created_by_user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute a command by planning and creating tasks.
        
        This is the main entry point for processing commands.
        
        Args:
            command_id: The ID of the agent_commands row
            tenant_id: The tenant ID
            raw_prompt: The freeform command
            target_agents: Optional list of agents to use
            created_by_user_id: Optional user ID who created the command
            
        Returns:
            Dict with command result and created tasks
        """
        self.logger.info(f"Executing command {command_id}")
        
        try:
            # Update status to parsing
            self.supabase.table("agent_commands").update({
                "status": "parsing",
            }).eq("id", command_id).execute()
            
            # Plan the command
            plan_result = await self.plan_command(
                raw_prompt=raw_prompt,
                target_agents=target_agents,
                tenant_id=tenant_id,
            )
            
            if not plan_result.success:
                # Update status to failed
                self.supabase.table("agent_commands").update({
                    "status": "failed",
                    "error_message": plan_result.error_message,
                }).eq("id", command_id).execute()
                
                return {
                    "success": False,
                    "command_id": command_id,
                    "error": plan_result.error_message,
                    "tasks_created": [],
                }
            
            # Create agent_tasks from the plan
            created_tasks = []
            for task in plan_result.tasks:
                # Add command reference to payload
                task_payload = task.payload.copy()
                task_payload["source_command_id"] = command_id
                
                task_data = {
                    "tenant_id": tenant_id,
                    "agent_id": task.agent_id,
                    "task_type": task.task_type,
                    "title": task.title,
                    "description": task.description,
                    "payload": task_payload,
                    "priority": task.priority,
                    "status": "pending",
                    "created_by_user_id": created_by_user_id,
                }
                
                result = self.supabase.table("agent_tasks").insert(task_data).select().single().execute()
                
                if result.data:
                    created_tasks.append(result.data)
                    self.logger.info(f"Created task {result.data['id']}: {task.title}")
            
            # Update command status
            self.supabase.table("agent_commands").update({
                "status": "tasks_created",
                "parsed_summary": plan_result.summary,
                "tasks_created_count": len(created_tasks),
            }).eq("id", command_id).execute()
            
            # Create journal entry
            self.supabase.table("journal_entries").insert({
                "tenant_id": tenant_id,
                "category": "agent_action",
                "title": f"Command executed: {len(created_tasks)} tasks created",
                "body": f"Command: {raw_prompt[:200]}...\n\nSummary: {plan_result.summary}",
                "details": {
                    "event_type": "agent_command_executed",
                    "command_id": command_id,
                    "tasks_created": len(created_tasks),
                    "task_ids": [t["id"] for t in created_tasks],
                },
                "author": "LUMINA",
            }).execute()
            
            return {
                "success": True,
                "command_id": command_id,
                "summary": plan_result.summary,
                "tasks_created": created_tasks,
            }
            
        except Exception as e:
            self.logger.error(f"Error executing command {command_id}: {e}")
            
            # Update status to failed
            try:
                self.supabase.table("agent_commands").update({
                    "status": "failed",
                    "error_message": str(e),
                }).eq("id", command_id).execute()
            except Exception:
                pass
            
            return {
                "success": False,
                "command_id": command_id,
                "error": str(e),
                "tasks_created": [],
            }


# =============================================================================
# Utility Functions
# =============================================================================

def is_command_planner_configured() -> bool:
    """Check if the command planner can be initialized."""
    return bool(
        os.environ.get("SUPABASE_URL") and
        os.environ.get("SUPABASE_SERVICE_KEY")
    )


async def process_command(
    raw_prompt: str,
    tenant_id: str,
    target_agents: Optional[List[str]] = None,
    created_by_user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    High-level function to process a command end-to-end.
    
    Creates the command record, plans tasks, and returns results.
    
    Args:
        raw_prompt: The freeform command
        tenant_id: The tenant ID
        target_agents: Optional list of agents to use
        created_by_user_id: Optional user ID
        
    Returns:
        Dict with command result
    """
    planner = CommandPlanner()
    
    # Create command record
    command_data = {
        "tenant_id": tenant_id,
        "raw_prompt": raw_prompt,
        "target_agents": target_agents,
        "status": "received",
        "created_by_user_id": created_by_user_id,
    }
    
    result = planner.supabase.table("agent_commands").insert(command_data).select().single().execute()
    
    if not result.data:
        return {
            "success": False,
            "error": "Failed to create command record",
        }
    
    command_id = result.data["id"]
    
    # Execute the command
    return await planner.execute_command(
        command_id=command_id,
        tenant_id=tenant_id,
        raw_prompt=raw_prompt,
        target_agents=target_agents,
        created_by_user_id=created_by_user_id,
    )
