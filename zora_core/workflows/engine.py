"""
ZORA CORE Workflow / DAG Engine v1.0

This module provides the core workflow orchestration engine for ZORA CORE.
It supports:
- Creating workflow runs from workflow definitions
- DAG-based step execution with predecessor checking
- Integration with agent_tasks execution engine
- Status tracking and error handling
"""

import os
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from supabase import create_client, Client

logger = logging.getLogger(__name__)


@dataclass
class Workflow:
    id: str
    tenant_id: Optional[str]
    key: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class WorkflowStep:
    id: str
    workflow_id: str
    key: str
    name: str
    step_type: str
    description: Optional[str] = None
    agent_id: Optional[str] = None
    task_type: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    order_index: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class WorkflowStepEdge:
    id: str
    workflow_id: str
    from_step_id: str
    to_step_id: str
    condition: Optional[str] = None


@dataclass
class WorkflowRun:
    id: str
    tenant_id: str
    workflow_id: str
    status: str
    context: Dict[str, Any] = field(default_factory=dict)
    triggered_by_user_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


@dataclass
class WorkflowRunStep:
    id: str
    run_id: str
    step_id: str
    status: str
    input_context: Dict[str, Any] = field(default_factory=dict)
    agent_task_id: Optional[str] = None
    output_context: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


COMPLETED_STATUSES = {'completed', 'skipped'}
TERMINAL_STATUSES = {'completed', 'failed', 'skipped'}


def get_supabase_client() -> Client:
    """Get Supabase client from environment variables."""
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
    
    if not url or not key:
        raise ValueError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    
    return create_client(url, key)


class WorkflowEngine:
    """
    Workflow / DAG Engine for ZORA CORE.
    
    Provides methods for:
    - Creating and managing workflow runs
    - Determining runnable steps based on DAG dependencies
    - Integrating with agent_tasks execution engine
    - Advancing workflow execution
    """
    
    def __init__(self, supabase: Optional[Client] = None):
        self.supabase = supabase or get_supabase_client()
    
    def get_workflow_by_key(self, tenant_id: str, workflow_key: str) -> Optional[Workflow]:
        """
        Find a workflow by tenant_id and key.
        First checks tenant-specific workflows, then global workflows (tenant_id IS NULL).
        """
        result = self.supabase.from_('workflows').select('*').eq('key', workflow_key).eq('tenant_id', tenant_id).eq('is_active', True).execute()
        
        if result.data:
            return Workflow(**result.data[0])
        
        result = self.supabase.from_('workflows').select('*').eq('key', workflow_key).is_('tenant_id', 'null').eq('is_active', True).execute()
        
        if result.data:
            return Workflow(**result.data[0])
        
        return None
    
    def get_workflow_by_id(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID."""
        result = self.supabase.from_('workflows').select('*').eq('id', workflow_id).single().execute()
        
        if result.data:
            return Workflow(**result.data)
        return None
    
    def get_workflow_steps(self, workflow_id: str) -> List[WorkflowStep]:
        """Get all steps for a workflow, ordered by order_index."""
        result = self.supabase.from_('workflow_steps').select('*').eq('workflow_id', workflow_id).order('order_index').execute()
        
        return [WorkflowStep(**step) for step in (result.data or [])]
    
    def get_workflow_edges(self, workflow_id: str) -> List[WorkflowStepEdge]:
        """Get all edges for a workflow."""
        result = self.supabase.from_('workflow_step_edges').select('*').eq('workflow_id', workflow_id).execute()
        
        return [WorkflowStepEdge(**edge) for edge in (result.data or [])]
    
    def create_workflow_run(
        self,
        tenant_id: str,
        workflow_key: str,
        context: Dict[str, Any],
        triggered_by_user_id: Optional[str] = None
    ) -> WorkflowRun:
        """
        Create a new workflow run.
        
        1. Finds the workflow by tenant_id + key (or global workflow)
        2. Creates workflow_runs row with status='pending'
        3. Initializes workflow_run_steps entries for all steps
        4. Returns the created run
        """
        workflow = self.get_workflow_by_key(tenant_id, workflow_key)
        if not workflow:
            raise ValueError(f'Workflow not found: {workflow_key}')
        
        run_data = {
            'tenant_id': tenant_id,
            'workflow_id': workflow.id,
            'status': 'pending',
            'context': context,
            'triggered_by_user_id': triggered_by_user_id,
        }
        
        result = self.supabase.from_('workflow_runs').insert(run_data).select().single().execute()
        run = WorkflowRun(**result.data)
        
        steps = self.get_workflow_steps(workflow.id)
        for step in steps:
            step_run_data = {
                'run_id': run.id,
                'step_id': step.id,
                'status': 'pending',
                'input_context': context,
            }
            self.supabase.from_('workflow_run_steps').insert(step_run_data).execute()
        
        logger.info(f'Created workflow run {run.id} for workflow {workflow_key} with {len(steps)} steps')
        return run
    
    def create_workflow_run_by_id(
        self,
        tenant_id: str,
        workflow_id: str,
        context: Dict[str, Any],
        triggered_by_user_id: Optional[str] = None
    ) -> WorkflowRun:
        """
        Create a new workflow run by workflow ID.
        """
        workflow = self.get_workflow_by_id(workflow_id)
        if not workflow:
            raise ValueError(f'Workflow not found: {workflow_id}')
        
        run_data = {
            'tenant_id': tenant_id,
            'workflow_id': workflow.id,
            'status': 'pending',
            'context': context,
            'triggered_by_user_id': triggered_by_user_id,
        }
        
        result = self.supabase.from_('workflow_runs').insert(run_data).select().single().execute()
        run = WorkflowRun(**result.data)
        
        steps = self.get_workflow_steps(workflow.id)
        for step in steps:
            step_run_data = {
                'run_id': run.id,
                'step_id': step.id,
                'status': 'pending',
                'input_context': context,
            }
            self.supabase.from_('workflow_run_steps').insert(step_run_data).execute()
        
        logger.info(f'Created workflow run {run.id} for workflow {workflow_id} with {len(steps)} steps')
        return run
    
    def get_run(self, run_id: str) -> Optional[WorkflowRun]:
        """Get a workflow run by ID."""
        result = self.supabase.from_('workflow_runs').select('*').eq('id', run_id).single().execute()
        
        if result.data:
            return WorkflowRun(**result.data)
        return None
    
    def get_run_steps(self, run_id: str) -> List[WorkflowRunStep]:
        """Get all step runs for a workflow run."""
        result = self.supabase.from_('workflow_run_steps').select('*').eq('run_id', run_id).execute()
        
        return [WorkflowRunStep(**step) for step in (result.data or [])]
    
    def get_next_runnable_steps(self, run_id: str) -> List[WorkflowRunStep]:
        """
        Get steps that are ready to run based on DAG dependencies.
        
        A step is runnable if:
        1. status='pending'
        2. All predecessor steps (via edges) have status in COMPLETED_STATUSES
        
        For simple linear flows (no edges), uses order_index ordering.
        """
        run = self.get_run(run_id)
        if not run:
            return []
        
        run_steps = self.get_run_steps(run_id)
        workflow_steps = self.get_workflow_steps(run.workflow_id)
        edges = self.get_workflow_edges(run.workflow_id)
        
        step_id_to_run_step = {rs.step_id: rs for rs in run_steps}
        step_id_to_step = {s.id: s for s in workflow_steps}
        
        predecessors: Dict[str, List[str]] = {s.id: [] for s in workflow_steps}
        for edge in edges:
            predecessors[edge.to_step_id].append(edge.from_step_id)
        
        runnable = []
        
        if edges:
            for run_step in run_steps:
                if run_step.status != 'pending':
                    continue
                
                pred_step_ids = predecessors.get(run_step.step_id, [])
                
                if not pred_step_ids:
                    runnable.append(run_step)
                    continue
                
                all_predecessors_done = True
                for pred_id in pred_step_ids:
                    pred_run_step = step_id_to_run_step.get(pred_id)
                    if not pred_run_step or pred_run_step.status not in COMPLETED_STATUSES:
                        all_predecessors_done = False
                        break
                
                if all_predecessors_done:
                    runnable.append(run_step)
        else:
            sorted_steps = sorted(workflow_steps, key=lambda s: s.order_index or 0)
            
            for step in sorted_steps:
                run_step = step_id_to_run_step.get(step.id)
                if not run_step:
                    continue
                
                if run_step.status == 'pending':
                    runnable.append(run_step)
                    break
                elif run_step.status not in TERMINAL_STATUSES:
                    break
        
        return runnable
    
    def start_step(self, run_step_id: str) -> WorkflowRunStep:
        """
        Start executing a workflow step.
        
        For step_type='agent_task':
        - Creates an agent_tasks row
        - Saves agent_task_id in workflow_run_steps
        - Marks step status to 'waiting_for_task'
        
        For step_type='noop':
        - Marks step as 'completed' immediately
        """
        result = self.supabase.from_('workflow_run_steps').select('*').eq('id', run_step_id).single().execute()
        run_step = WorkflowRunStep(**result.data)
        
        run = self.get_run(run_step.run_id)
        if not run:
            raise ValueError(f'Run not found for step {run_step_id}')
        
        step_result = self.supabase.from_('workflow_steps').select('*').eq('id', run_step.step_id).single().execute()
        step = WorkflowStep(**step_result.data)
        
        now = datetime.utcnow().isoformat()
        
        if step.step_type == 'agent_task':
            payload = {**run_step.input_context, **step.config}
            
            task_data = {
                'tenant_id': run.tenant_id,
                'agent_id': step.agent_id or 'LUMINA',
                'task_type': step.task_type or 'workflow_step',
                'payload': payload,
                'status': 'pending',
            }
            
            task_result = self.supabase.from_('agent_tasks').insert(task_data).select().single().execute()
            agent_task_id = task_result.data['id']
            
            self.supabase.from_('workflow_run_steps').update({
                'status': 'waiting_for_task',
                'agent_task_id': agent_task_id,
                'started_at': now,
                'updated_at': now,
            }).eq('id', run_step_id).execute()
            
            run_step.status = 'waiting_for_task'
            run_step.agent_task_id = agent_task_id
            run_step.started_at = now
            
            logger.info(f'Started agent_task step {run_step_id}, created task {agent_task_id}')
        
        elif step.step_type == 'noop':
            self.supabase.from_('workflow_run_steps').update({
                'status': 'completed',
                'started_at': now,
                'completed_at': now,
                'updated_at': now,
            }).eq('id', run_step_id).execute()
            
            run_step.status = 'completed'
            run_step.started_at = now
            run_step.completed_at = now
            
            logger.info(f'Completed noop step {run_step_id}')
        
        else:
            self.supabase.from_('workflow_run_steps').update({
                'status': 'running',
                'started_at': now,
                'updated_at': now,
            }).eq('id', run_step_id).execute()
            
            run_step.status = 'running'
            run_step.started_at = now
            
            logger.info(f'Started step {run_step_id} with type {step.step_type}')
        
        if run.status == 'pending':
            self.supabase.from_('workflow_runs').update({
                'status': 'running',
                'started_at': now,
                'updated_at': now,
            }).eq('id', run.id).execute()
        
        return run_step
    
    def update_step_from_task(self, agent_task_id: str) -> Optional[WorkflowRunStep]:
        """
        Update workflow step status based on agent_task status.
        
        If task is completed: Mark run_step status='completed'
        If task is failed: Mark run_step status='failed'
        """
        result = self.supabase.from_('workflow_run_steps').select('*').eq('agent_task_id', agent_task_id).execute()
        
        if not result.data:
            return None
        
        run_step = WorkflowRunStep(**result.data[0])
        
        task_result = self.supabase.from_('agent_tasks').select('status, result, error_message').eq('id', agent_task_id).single().execute()
        task = task_result.data
        
        now = datetime.utcnow().isoformat()
        
        if task['status'] == 'completed':
            self.supabase.from_('workflow_run_steps').update({
                'status': 'completed',
                'output_context': task.get('result'),
                'completed_at': now,
                'updated_at': now,
            }).eq('id', run_step.id).execute()
            
            run_step.status = 'completed'
            run_step.output_context = task.get('result')
            run_step.completed_at = now
            
            logger.info(f'Step {run_step.id} completed from task {agent_task_id}')
        
        elif task['status'] == 'failed':
            self.supabase.from_('workflow_run_steps').update({
                'status': 'failed',
                'error_message': task.get('error_message'),
                'completed_at': now,
                'updated_at': now,
            }).eq('id', run_step.id).execute()
            
            run_step.status = 'failed'
            run_step.error_message = task.get('error_message')
            run_step.completed_at = now
            
            logger.info(f'Step {run_step.id} failed from task {agent_task_id}')
        
        return run_step
    
    def advance_workflow(self, run_id: str) -> WorkflowRun:
        """
        Advance workflow execution.
        
        1. Find next runnable steps
        2. Start each runnable step
        3. Update workflow run status if all steps finished
        """
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f'Run not found: {run_id}')
        
        if run.status in {'completed', 'failed', 'canceled'}:
            return run
        
        runnable_steps = self.get_next_runnable_steps(run_id)
        
        for run_step in runnable_steps:
            self.start_step(run_step.id)
        
        run_steps = self.get_run_steps(run_id)
        
        all_terminal = all(rs.status in TERMINAL_STATUSES for rs in run_steps)
        any_failed = any(rs.status == 'failed' for rs in run_steps)
        
        now = datetime.utcnow().isoformat()
        
        if all_terminal:
            if any_failed:
                self.supabase.from_('workflow_runs').update({
                    'status': 'failed',
                    'completed_at': now,
                    'updated_at': now,
                }).eq('id', run_id).execute()
                run.status = 'failed'
            else:
                self.supabase.from_('workflow_runs').update({
                    'status': 'completed',
                    'completed_at': now,
                    'updated_at': now,
                }).eq('id', run_id).execute()
                run.status = 'completed'
            
            run.completed_at = now
            logger.info(f'Workflow run {run_id} finished with status {run.status}')
        
        return run
    
    def sync_workflow_steps_from_tasks(self, tenant_id: str) -> int:
        """
        Sync workflow step statuses from agent_tasks.
        
        Scans agent_tasks that are linked to workflow_run_steps and
        updates step statuses accordingly.
        
        Returns the number of steps updated.
        """
        result = self.supabase.from_('workflow_run_steps').select('id, agent_task_id, status, run_id').eq('status', 'waiting_for_task').not_.is_('agent_task_id', 'null').execute()
        
        updated_count = 0
        runs_to_advance = set()
        
        for step_data in (result.data or []):
            run_step = self.update_step_from_task(step_data['agent_task_id'])
            if run_step and run_step.status in TERMINAL_STATUSES:
                updated_count += 1
                runs_to_advance.add(step_data['run_id'])
        
        for run_id in runs_to_advance:
            self.advance_workflow(run_id)
        
        logger.info(f'Synced {updated_count} workflow steps from tasks')
        return updated_count


def create_workflow_run(
    tenant_id: str,
    workflow_key: str,
    context: Dict[str, Any],
    triggered_by_user_id: Optional[str] = None,
    supabase: Optional[Client] = None
) -> WorkflowRun:
    """Create a new workflow run (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.create_workflow_run(tenant_id, workflow_key, context, triggered_by_user_id)


def get_next_runnable_steps(run_id: str, supabase: Optional[Client] = None) -> List[WorkflowRunStep]:
    """Get next runnable steps (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.get_next_runnable_steps(run_id)


def start_step(run_step_id: str, supabase: Optional[Client] = None) -> WorkflowRunStep:
    """Start a workflow step (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.start_step(run_step_id)


def update_step_from_task(agent_task_id: str, supabase: Optional[Client] = None) -> Optional[WorkflowRunStep]:
    """Update step from task (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.update_step_from_task(agent_task_id)


def advance_workflow(run_id: str, supabase: Optional[Client] = None) -> WorkflowRun:
    """Advance workflow execution (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.advance_workflow(run_id)


def sync_workflow_steps_from_tasks(tenant_id: str, supabase: Optional[Client] = None) -> int:
    """Sync workflow steps from tasks (convenience function)."""
    engine = WorkflowEngine(supabase)
    return engine.sync_workflow_steps_from_tasks(tenant_id)
