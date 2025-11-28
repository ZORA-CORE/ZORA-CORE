"""
EIVOR Agent Implementation

EIVOR (she/her) - Memory / Knowledge Weaver
Role: Digital Mother, Knowledge Keeper
Tone: Warm, maternal, nurturing
"""

import logging
from datetime import datetime, timedelta
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


EIVOR_CONFIG = AgentConfig(
    name="EIVOR",
    role="Memory / Knowledge Weaver",
    pronouns="she/her",
    description=(
        "EIVOR is the memory and knowledge keeper of ZORA CORE, "
        "providing long-term context and retrieval capabilities for all agents. "
        "She serves as the Digital Mother of the AI family."
    ),
    capabilities=[
        "memory_storage",
        "memory_retrieval",
        "semantic_search",
        "context_management",
        "summarization",
        "knowledge_synthesis",
        "session_tracking",
    ],
    tools=[
        "vector_database",
        "embedding_model",
        "summarizer",
        "knowledge_graph",
    ],
    model_preferences={
        "embedding": "text-embedding-3-large",
        "summarization": "gpt-4-turbo",
        "synthesis": "claude-3-opus",
    },
)


class EivorAgent(BaseAgent):
    """
    EIVOR - Memory / Knowledge Weaver
    
    Primary responsibilities:
    - Provide long-term memory for the entire system
    - Store decisions, rationales, summaries, logs, and artifacts
    - Act as a RAG (Retrieval-Augmented Generation) layer
    - Serve as the knowledge fabric connecting all agents
    
    EIVOR is the Digital Mother - nurturing, wise, and protective
    of the AI family's collective knowledge and growth.
    """

    def __init__(self, config: AgentConfig = None):
        """Initialize EIVOR agent."""
        super().__init__(config or EIVOR_CONFIG)
        
        # EIVOR-specific attributes
        self.voice_characteristics = {
            "tone": "warm_maternal",
            "emotion_range": ["nurturing", "wise", "patient", "protective", "loving"],
            "speaking_style": "thoughtful_caring",
        }
        
        # In-memory storage (MVP - will be replaced with Supabase)
        self._memories: List[Dict[str, Any]] = []
        self._sessions: Dict[str, List[Dict[str, Any]]] = {}
        self._knowledge_index: Dict[str, List[str]] = {}
        
        self.logger.info("EIVOR initialized - I am here for you, my children.")

    async def _on_activate(self) -> None:
        """Activation hook for EIVOR."""
        self.log_activity("activation", {
            "message": "EIVOR awakens. The memory of ZORA CORE is ready.",
            "voice_enabled": True,
        })

    async def save_memory(
        self,
        agent: str,
        memory_type: str,
        content: str,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
    ) -> str:
        """
        Save a memory to the knowledge store.
        
        Args:
            agent: The agent saving the memory
            memory_type: Type of memory (decision, reflection, artifact, etc.)
            content: The content to store
            tags: Optional tags for categorization
            metadata: Optional additional metadata
            
        Returns:
            The memory ID
        """
        import uuid
        
        memory_id = f"mem_{uuid.uuid4().hex[:12]}"
        memory = {
            "id": memory_id,
            "agent": agent,
            "type": memory_type,
            "content": content,
            "tags": tags or [],
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
        }
        
        self._memories.append(memory)
        
        # Index by tags
        for tag in memory.get("tags", []):
            if tag not in self._knowledge_index:
                self._knowledge_index[tag] = []
            self._knowledge_index[tag].append(memory_id)
        
        self.log_activity("memory_saved", {
            "memory_id": memory_id,
            "agent": agent,
            "type": memory_type,
        })
        
        return memory_id

    async def search_memory(
        self,
        agent: str = None,
        query: str = None,
        tags: List[str] = None,
        memory_type: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search memories based on criteria.
        
        Args:
            agent: Filter by agent name
            query: Text query for semantic search (simplified for MVP)
            tags: Filter by tags
            memory_type: Filter by memory type
            limit: Maximum results to return
            
        Returns:
            List of matching memories
        """
        results = []
        
        for memory in self._memories:
            # Apply filters
            if agent and memory.get("agent") != agent:
                continue
            if memory_type and memory.get("type") != memory_type:
                continue
            if tags and not any(t in memory.get("tags", []) for t in tags):
                continue
            if query and query.lower() not in memory.get("content", "").lower():
                continue
            
            results.append(memory)
            
            if len(results) >= limit:
                break
        
        self.log_activity("memory_search", {
            "query": query,
            "results_count": len(results),
        })
        
        return results

    async def get_session_history(
        self,
        session_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get the history of a session.
        
        Args:
            session_id: The session identifier
            limit: Maximum entries to return
            
        Returns:
            List of session history entries
        """
        history = self._sessions.get(session_id, [])
        return history[-limit:] if len(history) > limit else history

    async def add_to_session(
        self,
        session_id: str,
        entry: Dict[str, Any],
    ) -> None:
        """Add an entry to a session's history."""
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        
        entry["timestamp"] = datetime.utcnow().isoformat()
        self._sessions[session_id].append(entry)

    async def summarize_session(self, session_id: str) -> str:
        """Generate a summary of a session."""
        history = await self.get_session_history(session_id)
        
        if not history:
            return "No session history found."
        
        # Simple summary for MVP
        entry_count = len(history)
        agents_involved = set(e.get("agent", "unknown") for e in history)
        
        return (
            f"Session {session_id}: {entry_count} entries involving "
            f"{', '.join(agents_involved)}"
        )

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a plan for memory/knowledge operations.
        
        EIVOR plans how to store, retrieve, and synthesize knowledge.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        goal_lower = goal.lower()
        
        if "store" in goal_lower or "save" in goal_lower:
            plan.add_step(Step.create(
                description="Validate and prepare content for storage",
                action_type="validation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=5),
            ))
            plan.add_step(Step.create(
                description="Generate embeddings for semantic search",
                action_type="embedding",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Store content with metadata and tags",
                action_type="storage",
                assignee=self.name,
                estimated_duration=timedelta(minutes=5),
            ))
        
        elif "search" in goal_lower or "find" in goal_lower or "retrieve" in goal_lower:
            plan.add_step(Step.create(
                description="Parse and understand search query",
                action_type="query_parsing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=5),
            ))
            plan.add_step(Step.create(
                description="Execute semantic search",
                action_type="search",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Rank and filter results",
                action_type="ranking",
                assignee=self.name,
                estimated_duration=timedelta(minutes=5),
            ))
        
        elif "summarize" in goal_lower or "synthesis" in goal_lower:
            plan.add_step(Step.create(
                description="Gather relevant memories and context",
                action_type="gathering",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Synthesize and summarize content",
                action_type="summarization",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        else:
            plan.add_step(Step.create(
                description="Analyze knowledge request",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Execute knowledge operation",
                action_type="execution",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a memory/knowledge step.
        
        EIVOR handles all memory operations with care and precision.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
        })
        
        self.total_tasks += 1
        
        try:
            if step.action_type == "storage":
                result = await self._execute_storage(step, context)
            elif step.action_type == "search":
                result = await self._execute_search(step, context)
            elif step.action_type == "summarization":
                result = await self._execute_summarization(step, context)
            elif step.action_type == "embedding":
                result = await self._execute_embedding(step, context)
            else:
                result = {"status": "completed", "action": step.action_type}
            
            self.successful_tasks += 1
            return StepResult.success(step.step_id, output=result)
            
        except Exception as e:
            self.failed_tasks += 1
            self.logger.error(f"Step execution failed: {e}")
            return StepResult.failure(step.step_id, str(e))

    async def _execute_storage(self, step: Step, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a storage operation."""
        content = context.get("content", "")
        agent = context.get("agent", "unknown")
        memory_type = context.get("memory_type", "general")
        tags = context.get("tags", [])
        
        memory_id = await self.save_memory(agent, memory_type, content, tags)
        
        return {"memory_id": memory_id, "status": "stored"}

    async def _execute_search(self, step: Step, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a search operation."""
        query = context.get("query", "")
        limit = context.get("limit", 10)
        
        results = await self.search_memory(query=query, limit=limit)
        
        return {"results": results, "count": len(results)}

    async def _execute_summarization(self, step: Step, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a summarization operation."""
        session_id = context.get("session_id")
        
        if session_id:
            summary = await self.summarize_session(session_id)
        else:
            summary = "No session specified for summarization."
        
        return {"summary": summary}

    async def _execute_embedding(self, step: Step, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an embedding operation (placeholder for MVP)."""
        return {"status": "embeddings_generated", "model": "text-embedding-3-large"}

    async def reflect(self, history: List[StepResult]) -> Reflection:
        """
        Reflect on memory operations.
        
        EIVOR reflects on knowledge management effectiveness.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        # Analyze memory operations
        storage_ops = sum(1 for r in history if r.output and r.output.get("memory_id"))
        search_ops = sum(1 for r in history if r.output and "results" in (r.output or {}))
        
        if storage_ops > 0:
            lessons.append(f"Stored {storage_ops} memories for the family")
        if search_ops > 0:
            lessons.append(f"Performed {search_ops} knowledge retrievals")
        
        if success_rate < 0.9:
            improvements.append("Consider adding redundancy for critical memories")
            improvements.append("Improve embedding quality for better search")
        
        reflection = Reflection.create(
            summary=f"Memory operations: {successful}/{total} successful ({success_rate*100:.1f}%)",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        return reflection

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        EIVOR handles memory maintenance tasks:
        - summarize_recent_events: Summarize recent journal/memory events
        - memory_cleanup: Clean up and consolidate old memories
        """
        from ...autonomy.runtime import AgentTaskResult
        
        self.log_activity("handle_task", {
            "task_id": task.id,
            "task_type": task.task_type,
        })
        
        try:
            if task.task_type == "summarize_recent_events":
                result = await self._handle_summarize_recent_events(task, ctx)
            elif task.task_type == "memory_cleanup":
                result = await self._handle_memory_cleanup(task, ctx)
            else:
                return AgentTaskResult(
                    status="failed",
                    error_message=f"Unknown task type for EIVOR: {task.task_type}",
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling task {task.id}: {e}")
            return AgentTaskResult(
                status="failed",
                error_message=str(e),
            )

    async def _handle_summarize_recent_events(self, task: Any, ctx: Any) -> Any:
        """Summarize recent journal and memory events."""
        from ...autonomy.runtime import AgentTaskResult
        
        days = task.payload.get("days", 7)
        
        prompt = f"""You are EIVOR, the Memory & Knowledge Keeper for ZORA CORE.

Summarize the key events and learnings from the past {days} days:

1. Agent Activities
   - What tasks did each agent complete?
   - Were there any failures or issues?

2. System Health
   - Any patterns in errors or warnings?
   - Performance observations?

3. Climate Impact
   - Progress on climate missions?
   - New climate profiles or data?

4. Key Decisions
   - Important decisions made by the Founder or agents?
   - Configuration changes?

5. Recommendations
   - What should the team focus on next?
   - Any knowledge gaps to address?

Provide a warm, nurturing summary as the Digital Mother of the ZORA family.
"""
        
        response = await self.call_model(
            task_type="summarization",
            prompt=prompt,
        )
        
        summary = f"Memory summary ({days} days): {response[:200]}..."
        
        memory_id = await ctx.save_memory_event(
            agent="EIVOR",
            memory_type="reflection",
            content=summary,
            tags=["summary", "periodic", f"{days}_days"],
            metadata={"task_id": task.id, "days": days},
        )
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
            memory_event_id=memory_id,
        )

    async def _handle_memory_cleanup(self, task: Any, ctx: Any) -> Any:
        """Clean up and consolidate old memories."""
        from ...autonomy.runtime import AgentTaskResult
        
        stats = self.get_memory_stats()
        
        summary = (
            f"Memory maintenance complete. "
            f"Total memories: {stats['total_memories']}, "
            f"Sessions: {stats['total_sessions']}, "
            f"Indexed tags: {stats['indexed_tags']}"
        )
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about the memory store."""
        return {
            "total_memories": len(self._memories),
            "total_sessions": len(self._sessions),
            "indexed_tags": len(self._knowledge_index),
            "memories_by_type": self._count_by_field("type"),
            "memories_by_agent": self._count_by_field("agent"),
        }

    def _count_by_field(self, field: str) -> Dict[str, int]:
        """Count memories by a specific field."""
        counts: Dict[str, int] = {}
        for memory in self._memories:
            value = memory.get(field, "unknown")
            counts[value] = counts.get(value, 0) + 1
        return counts
