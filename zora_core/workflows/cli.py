"""
ZORA CORE Workflow / DAG Engine CLI

Command-line interface for workflow management and debugging.

Usage:
    PYTHONPATH=. python -m zora_core.workflows.cli create-run --tenant <id> --workflow <key> [--context '{}']
    PYTHONPATH=. python -m zora_core.workflows.cli advance --run <id>
    PYTHONPATH=. python -m zora_core.workflows.cli status --run <id>
    PYTHONPATH=. python -m zora_core.workflows.cli sync-from-tasks --tenant <id>
    PYTHONPATH=. python -m zora_core.workflows.cli list-workflows --tenant <id>
    PYTHONPATH=. python -m zora_core.workflows.cli list-runs --tenant <id>
"""

import argparse
import json
import sys
import os
from datetime import datetime

try:
    from .engine import WorkflowEngine
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from zora_core.workflows.engine import WorkflowEngine


def format_datetime(dt_str: str | None) -> str:
    """Format datetime string for display."""
    if not dt_str:
        return '-'
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return dt_str


def cmd_create_run(args):
    """Create a new workflow run."""
    engine = WorkflowEngine()
    
    context = {}
    if args.context:
        try:
            context = json.loads(args.context)
        except json.JSONDecodeError as e:
            print(f'Error: Invalid JSON context: {e}')
            sys.exit(1)
    
    try:
        run = engine.create_workflow_run(
            tenant_id=args.tenant,
            workflow_key=args.workflow,
            context=context,
            triggered_by_user_id=args.user,
        )
        
        print(f'Created workflow run:')
        print(f'  ID: {run.id}')
        print(f'  Workflow ID: {run.workflow_id}')
        print(f'  Status: {run.status}')
        print(f'  Context: {json.dumps(run.context, indent=2)}')
        
        if args.json:
            print(json.dumps({
                'id': run.id,
                'workflow_id': run.workflow_id,
                'status': run.status,
                'context': run.context,
            }, indent=2))
    
    except Exception as e:
        print(f'Error creating workflow run: {e}')
        sys.exit(1)


def cmd_advance(args):
    """Advance a workflow run."""
    engine = WorkflowEngine()
    
    try:
        run = engine.advance_workflow(args.run)
        
        print(f'Advanced workflow run:')
        print(f'  ID: {run.id}')
        print(f'  Status: {run.status}')
        
        run_steps = engine.get_run_steps(run.id)
        print(f'\nStep statuses:')
        for step in run_steps:
            step_info = engine.supabase.from_('workflow_steps').select('key, name').eq('id', step.step_id).single().execute()
            step_data = step_info.data
            print(f'  - {step_data["key"]}: {step.status}')
            if step.agent_task_id:
                print(f'    Task ID: {step.agent_task_id}')
            if step.error_message:
                print(f'    Error: {step.error_message}')
    
    except Exception as e:
        print(f'Error advancing workflow: {e}')
        sys.exit(1)


def cmd_status(args):
    """Show workflow run status."""
    engine = WorkflowEngine()
    
    try:
        run = engine.get_run(args.run)
        if not run:
            print(f'Run not found: {args.run}')
            sys.exit(1)
        
        workflow = engine.get_workflow_by_id(run.workflow_id)
        
        print(f'Workflow Run Status')
        print(f'=' * 50)
        print(f'Run ID: {run.id}')
        print(f'Workflow: {workflow.name if workflow else run.workflow_id} ({workflow.key if workflow else "unknown"})')
        print(f'Status: {run.status}')
        print(f'Created: {format_datetime(run.created_at)}')
        print(f'Started: {format_datetime(run.started_at)}')
        print(f'Completed: {format_datetime(run.completed_at)}')
        
        if run.error_message:
            print(f'Error: {run.error_message}')
        
        print(f'\nContext:')
        print(f'  {json.dumps(run.context, indent=2)}')
        
        run_steps = engine.get_run_steps(run.id)
        steps = engine.get_workflow_steps(run.workflow_id)
        step_map = {s.id: s for s in steps}
        
        print(f'\nSteps ({len(run_steps)}):')
        print(f'-' * 50)
        
        for rs in run_steps:
            step = step_map.get(rs.step_id)
            step_key = step.key if step else 'unknown'
            step_name = step.name if step else 'Unknown'
            
            status_icon = {
                'pending': '[ ]',
                'waiting_for_task': '[~]',
                'running': '[>]',
                'completed': '[x]',
                'failed': '[!]',
                'skipped': '[-]',
            }.get(rs.status, '[?]')
            
            print(f'{status_icon} {step_key}: {step_name}')
            print(f'    Status: {rs.status}')
            if rs.agent_task_id:
                print(f'    Task ID: {rs.agent_task_id}')
            if rs.started_at:
                print(f'    Started: {format_datetime(rs.started_at)}')
            if rs.completed_at:
                print(f'    Completed: {format_datetime(rs.completed_at)}')
            if rs.error_message:
                print(f'    Error: {rs.error_message}')
        
        if args.json:
            output = {
                'run': {
                    'id': run.id,
                    'workflow_id': run.workflow_id,
                    'status': run.status,
                    'context': run.context,
                    'created_at': run.created_at,
                    'started_at': run.started_at,
                    'completed_at': run.completed_at,
                    'error_message': run.error_message,
                },
                'steps': [
                    {
                        'id': rs.id,
                        'step_id': rs.step_id,
                        'step_key': step_map.get(rs.step_id, {}).key if step_map.get(rs.step_id) else None,
                        'status': rs.status,
                        'agent_task_id': rs.agent_task_id,
                        'started_at': rs.started_at,
                        'completed_at': rs.completed_at,
                        'error_message': rs.error_message,
                    }
                    for rs in run_steps
                ],
            }
            print(f'\nJSON Output:')
            print(json.dumps(output, indent=2))
    
    except Exception as e:
        print(f'Error getting run status: {e}')
        sys.exit(1)


def cmd_sync_from_tasks(args):
    """Sync workflow steps from agent tasks."""
    engine = WorkflowEngine()
    
    try:
        updated_count = engine.sync_workflow_steps_from_tasks(args.tenant)
        print(f'Synced {updated_count} workflow steps from agent tasks')
    
    except Exception as e:
        print(f'Error syncing from tasks: {e}')
        sys.exit(1)


def cmd_list_workflows(args):
    """List workflows for a tenant."""
    engine = WorkflowEngine()
    
    try:
        result = engine.supabase.from_('workflows').select('*').or_(f'tenant_id.eq.{args.tenant},tenant_id.is.null').eq('is_active', True).order('created_at', desc=True).execute()
        
        workflows = result.data or []
        
        print(f'Workflows ({len(workflows)}):')
        print(f'=' * 70)
        
        for wf in workflows:
            scope = 'Global' if wf['tenant_id'] is None else 'Tenant'
            print(f'\n{wf["key"]} ({scope})')
            print(f'  ID: {wf["id"]}')
            print(f'  Name: {wf["name"]}')
            print(f'  Category: {wf.get("category") or "-"}')
            print(f'  Description: {wf.get("description") or "-"}')
            
            steps_result = engine.supabase.from_('workflow_steps').select('key, name, step_type, order_index').eq('workflow_id', wf['id']).order('order_index').execute()
            steps = steps_result.data or []
            
            if steps:
                print(f'  Steps ({len(steps)}):')
                for step in steps:
                    print(f'    - {step["key"]}: {step["name"]} ({step["step_type"]})')
        
        if args.json:
            print(f'\nJSON Output:')
            print(json.dumps(workflows, indent=2))
    
    except Exception as e:
        print(f'Error listing workflows: {e}')
        sys.exit(1)


def cmd_list_runs(args):
    """List workflow runs for a tenant."""
    engine = WorkflowEngine()
    
    try:
        query = engine.supabase.from_('workflow_runs').select('*').eq('tenant_id', args.tenant).order('created_at', desc=True)
        
        if args.status:
            query = query.eq('status', args.status)
        
        if args.limit:
            query = query.limit(args.limit)
        
        result = query.execute()
        runs = result.data or []
        
        print(f'Workflow Runs ({len(runs)}):')
        print(f'=' * 70)
        
        for run in runs:
            workflow_result = engine.supabase.from_('workflows').select('key, name').eq('id', run['workflow_id']).single().execute()
            workflow = workflow_result.data
            
            print(f'\n{run["id"][:8]}... - {workflow["key"] if workflow else "unknown"}')
            print(f'  Status: {run["status"]}')
            print(f'  Created: {format_datetime(run["created_at"])}')
            if run.get('started_at'):
                print(f'  Started: {format_datetime(run["started_at"])}')
            if run.get('completed_at'):
                print(f'  Completed: {format_datetime(run["completed_at"])}')
            if run.get('error_message'):
                print(f'  Error: {run["error_message"]}')
        
        if args.json:
            print(f'\nJSON Output:')
            print(json.dumps(runs, indent=2))
    
    except Exception as e:
        print(f'Error listing runs: {e}')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='ZORA CORE Workflow / DAG Engine CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Create a new workflow run
  python -m zora_core.workflows.cli create-run --tenant <uuid> --workflow climate_onboarding_v1

  # Advance a workflow run
  python -m zora_core.workflows.cli advance --run <uuid>

  # Check run status
  python -m zora_core.workflows.cli status --run <uuid>

  # Sync workflow steps from agent tasks
  python -m zora_core.workflows.cli sync-from-tasks --tenant <uuid>

  # List workflows
  python -m zora_core.workflows.cli list-workflows --tenant <uuid>

  # List runs
  python -m zora_core.workflows.cli list-runs --tenant <uuid> --status running
        '''
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    create_run_parser = subparsers.add_parser('create-run', help='Create a new workflow run')
    create_run_parser.add_argument('--tenant', required=True, help='Tenant ID')
    create_run_parser.add_argument('--workflow', required=True, help='Workflow key')
    create_run_parser.add_argument('--context', default='{}', help='JSON context object')
    create_run_parser.add_argument('--user', help='Triggered by user ID')
    create_run_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    advance_parser = subparsers.add_parser('advance', help='Advance a workflow run')
    advance_parser.add_argument('--run', required=True, help='Run ID')
    
    status_parser = subparsers.add_parser('status', help='Show workflow run status')
    status_parser.add_argument('--run', required=True, help='Run ID')
    status_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    sync_parser = subparsers.add_parser('sync-from-tasks', help='Sync workflow steps from agent tasks')
    sync_parser.add_argument('--tenant', required=True, help='Tenant ID')
    
    list_workflows_parser = subparsers.add_parser('list-workflows', help='List workflows')
    list_workflows_parser.add_argument('--tenant', required=True, help='Tenant ID')
    list_workflows_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    list_runs_parser = subparsers.add_parser('list-runs', help='List workflow runs')
    list_runs_parser.add_argument('--tenant', required=True, help='Tenant ID')
    list_runs_parser.add_argument('--status', help='Filter by status')
    list_runs_parser.add_argument('--limit', type=int, default=20, help='Limit results')
    list_runs_parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    commands = {
        'create-run': cmd_create_run,
        'advance': cmd_advance,
        'status': cmd_status,
        'sync-from-tasks': cmd_sync_from_tasks,
        'list-workflows': cmd_list_workflows,
        'list-runs': cmd_list_runs,
    }
    
    cmd_func = commands.get(args.command)
    if cmd_func:
        cmd_func(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
