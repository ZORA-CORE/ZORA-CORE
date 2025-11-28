"""
ZORA CORE Agent Runtime CLI

Command-line interface for running the Agent Runtime.

Usage:
    python -m zora_core.autonomy.cli run-once --limit=5
    python -m zora_core.autonomy.cli run-loop --sleep-seconds=10
    python -m zora_core.autonomy.cli status
"""

import argparse
import asyncio
import logging
import os
import sys
from typing import Optional

from .runtime import AgentRuntime, is_runtime_configured


def setup_logging(verbose: bool = False) -> None:
    """Configure logging for the CLI."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


async def cmd_run_once(
    limit: int = 10,
    max_seconds: Optional[int] = None,
    max_failures: int = 5,
    tenant_id: Optional[str] = None,
    verbose: bool = False,
) -> tuple[int, int, bool]:
    """
    Process up to `limit` pending tasks and exit.
    
    Returns a tuple of (tasks_processed, failures, timed_out).
    """
    import time
    
    setup_logging(verbose)
    logger = logging.getLogger("zora.autonomy.cli")
    
    if not is_runtime_configured():
        logger.error("Runtime not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return (0, 0, False)
    
    logger.info(f"Starting run-once with limit={limit}, max_seconds={max_seconds}, max_failures={max_failures}")
    
    start_time = time.time()
    processed = 0
    failures = 0
    timed_out = False
    
    try:
        runtime = AgentRuntime(tenant_id=tenant_id)
        tasks = await runtime.fetch_pending_tasks(tenant_id=tenant_id, limit=limit)
        
        for task in tasks:
            # Check time limit
            if max_seconds and (time.time() - start_time) >= max_seconds:
                logger.warning(f"Time limit reached ({max_seconds}s), stopping")
                timed_out = True
                break
            
            # Check failure limit
            if failures >= max_failures:
                logger.warning(f"Max failures reached ({max_failures}), stopping")
                break
            
            # Try to claim the task
            if not await runtime.claim_task(task):
                continue
            
            # Process the task
            result = await runtime.process_task(task)
            
            # Update the task with the result
            await runtime.complete_task(task, result)
            processed += 1
            
            if result.status == "failed":
                failures += 1
                logger.warning(f"Task {task.id} failed: {result.error_message}")
        
        logger.info(f"Completed: processed {processed} tasks, {failures} failures")
        return (processed, failures, timed_out)
    except Exception as e:
        logger.error(f"Error running runtime: {e}")
        return (processed, failures, False)


async def cmd_run_loop(
    sleep_seconds: int = 10,
    batch_size: int = 5,
    tenant_id: Optional[str] = None,
    verbose: bool = False,
) -> None:
    """
    Continuously process tasks in a loop.
    """
    setup_logging(verbose)
    logger = logging.getLogger("zora.autonomy.cli")
    
    if not is_runtime_configured():
        logger.error("Runtime not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return
    
    logger.info(f"Starting run-loop (sleep={sleep_seconds}s, batch={batch_size})")
    
    try:
        runtime = AgentRuntime(tenant_id=tenant_id)
        await runtime.run_loop(
            tenant_id=tenant_id,
            sleep_seconds=sleep_seconds,
            batch_size=batch_size,
        )
    except KeyboardInterrupt:
        logger.info("Received interrupt, shutting down")
    except Exception as e:
        logger.error(f"Error running runtime: {e}")


async def cmd_status(
    tenant_id: Optional[str] = None,
    verbose: bool = False,
) -> None:
    """
    Show the status of the agent task queue.
    """
    setup_logging(verbose)
    logger = logging.getLogger("zora.autonomy.cli")
    
    if not is_runtime_configured():
        print("Runtime Status: NOT CONFIGURED")
        print("  Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")
        return
    
    try:
        runtime = AgentRuntime(tenant_id=tenant_id)
        tenant = tenant_id or runtime.default_tenant_id
        
        # Get task counts by status
        pending = runtime.supabase.table("agent_tasks").select("id", count="exact").eq("tenant_id", tenant).eq("status", "pending").execute()
        in_progress = runtime.supabase.table("agent_tasks").select("id", count="exact").eq("tenant_id", tenant).eq("status", "in_progress").execute()
        completed = runtime.supabase.table("agent_tasks").select("id", count="exact").eq("tenant_id", tenant).eq("status", "completed").execute()
        failed = runtime.supabase.table("agent_tasks").select("id", count="exact").eq("tenant_id", tenant).eq("status", "failed").execute()
        
        pending_count = pending.count if hasattr(pending, 'count') else len(pending.data)
        in_progress_count = in_progress.count if hasattr(in_progress, 'count') else len(in_progress.data)
        completed_count = completed.count if hasattr(completed, 'count') else len(completed.data)
        failed_count = failed.count if hasattr(failed, 'count') else len(failed.data)
        
        print("=== ZORA CORE Agent Runtime Status ===")
        print(f"Tenant: {tenant}")
        print()
        print("Task Queue:")
        print(f"  Pending:     {pending_count}")
        print(f"  In Progress: {in_progress_count}")
        print(f"  Completed:   {completed_count}")
        print(f"  Failed:      {failed_count}")
        print()
        
        # Show recent pending tasks
        if pending_count > 0:
            recent = runtime.supabase.table("agent_tasks").select("id, agent_id, task_type, title, priority, created_at").eq("tenant_id", tenant).eq("status", "pending").order("priority", desc=True).order("created_at", desc=False).limit(5).execute()
            
            print("Recent Pending Tasks:")
            for task in recent.data:
                print(f"  [{task['agent_id']}] {task['task_type']}: {task['title'][:50]}...")
        
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        print(f"Error: {e}")


async def cmd_create_task(
    agent_id: str,
    task_type: str,
    title: str,
    description: Optional[str] = None,
    priority: int = 0,
    tenant_id: Optional[str] = None,
    verbose: bool = False,
) -> Optional[str]:
    """
    Create a new task in the queue.
    
    Returns the task ID if successful.
    """
    setup_logging(verbose)
    logger = logging.getLogger("zora.autonomy.cli")
    
    if not is_runtime_configured():
        logger.error("Runtime not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.")
        return None
    
    # Validate agent_id
    valid_agents = ["CONNOR", "LUMINA", "EIVOR", "ORACLE", "AEGIS", "SAM"]
    if agent_id.upper() not in valid_agents:
        logger.error(f"Invalid agent_id: {agent_id}. Must be one of: {', '.join(valid_agents)}")
        return None
    
    try:
        runtime = AgentRuntime(tenant_id=tenant_id)
        tenant = tenant_id or runtime.default_tenant_id
        
        result = runtime.supabase.table("agent_tasks").insert({
            "tenant_id": tenant,
            "agent_id": agent_id.upper(),
            "task_type": task_type,
            "title": title,
            "description": description,
            "priority": priority,
            "status": "pending",
            "payload": {},
        }).execute()
        
        if result.data and len(result.data) > 0:
            task_id = result.data[0]["id"]
            print(f"Created task: {task_id}")
            print(f"  Agent: {agent_id.upper()}")
            print(f"  Type: {task_type}")
            print(f"  Title: {title}")
            print(f"  Priority: {priority}")
            return task_id
        else:
            logger.error("Failed to create task")
            return None
            
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return None


def main() -> None:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="ZORA CORE Agent Runtime CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process up to 5 pending tasks
  python -m zora_core.autonomy.cli run-once --limit=5

  # Run continuously with 10 second sleep between batches
  python -m zora_core.autonomy.cli run-loop --sleep-seconds=10

  # Show queue status
  python -m zora_core.autonomy.cli status

  # Create a test task
  python -m zora_core.autonomy.cli create-task LUMINA plan_frontend_improvements "Plan improvements for dashboard"

Environment Variables:
  SUPABASE_URL          Supabase project URL
  SUPABASE_SERVICE_KEY  Supabase service role key
  ZORA_TENANT_ID        Default tenant ID (optional)
""",
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--tenant-id",
        type=str,
        default=None,
        help="Tenant ID to use (default: from ZORA_TENANT_ID or default tenant)",
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # run-once command
    run_once_parser = subparsers.add_parser(
        "run-once",
        help="Process pending tasks and exit",
    )
    run_once_parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of tasks to process (default: 10)",
    )
    run_once_parser.add_argument(
        "--max-seconds",
        type=int,
        default=None,
        help="Maximum runtime in seconds (default: no limit)",
    )
    run_once_parser.add_argument(
        "--max-failures",
        type=int,
        default=5,
        help="Maximum number of failures before aborting (default: 5)",
    )
    
    # run-loop command
    run_loop_parser = subparsers.add_parser(
        "run-loop",
        help="Continuously process tasks in a loop",
    )
    run_loop_parser.add_argument(
        "--sleep-seconds",
        type=int,
        default=10,
        help="Seconds to sleep between batches (default: 10)",
    )
    run_loop_parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Number of tasks to process per batch (default: 5)",
    )
    
    # status command
    subparsers.add_parser(
        "status",
        help="Show queue status",
    )
    
    # create-task command
    create_task_parser = subparsers.add_parser(
        "create-task",
        help="Create a new task",
    )
    create_task_parser.add_argument(
        "agent_id",
        type=str,
        help="Agent ID (CONNOR, LUMINA, EIVOR, ORACLE, AEGIS, SAM)",
    )
    create_task_parser.add_argument(
        "task_type",
        type=str,
        help="Task type (e.g., plan_frontend_improvements)",
    )
    create_task_parser.add_argument(
        "title",
        type=str,
        help="Task title",
    )
    create_task_parser.add_argument(
        "--description",
        type=str,
        default=None,
        help="Task description",
    )
    create_task_parser.add_argument(
        "--priority",
        type=int,
        default=0,
        help="Task priority (higher = more urgent, default: 0)",
    )
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    if args.command == "run-once":
        processed, failures, timed_out = asyncio.run(cmd_run_once(
            limit=args.limit,
            max_seconds=args.max_seconds,
            max_failures=args.max_failures,
            tenant_id=args.tenant_id,
            verbose=args.verbose,
        ))
        # Exit 0 if we processed tasks successfully (even if some failed)
        # Exit 1 only if we hit max failures or had a critical error
        if failures >= args.max_failures:
            print(f"ERROR: Max failures ({args.max_failures}) reached")
            sys.exit(1)
        sys.exit(0)
    
    elif args.command == "run-loop":
        asyncio.run(cmd_run_loop(
            sleep_seconds=args.sleep_seconds,
            batch_size=args.batch_size,
            tenant_id=args.tenant_id,
            verbose=args.verbose,
        ))
    
    elif args.command == "status":
        asyncio.run(cmd_status(
            tenant_id=args.tenant_id,
            verbose=args.verbose,
        ))
    
    elif args.command == "create-task":
        result = asyncio.run(cmd_create_task(
            agent_id=args.agent_id,
            task_type=args.task_type,
            title=args.title,
            description=args.description,
            priority=args.priority,
            tenant_id=args.tenant_id,
            verbose=args.verbose,
        ))
        sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
