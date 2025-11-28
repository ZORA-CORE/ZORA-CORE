"""
ZORA CORE Memory CLI

A simple CLI tool for testing memory operations.

Usage:
    python -m zora_core.memory.cli save --agent CONNOR --type decision --content "Test memory"
    python -m zora_core.memory.cli search --query "test" --limit 5
    python -m zora_core.memory.cli history --session session_123
    python -m zora_core.memory.cli stats
"""

import argparse
import asyncio
import json
import sys

from .memory_store import MemoryStore, MemoryType


# Global memory store instance for CLI
_memory_store = MemoryStore()


async def cmd_save(args):
    """Save a memory."""
    memory_id = await _memory_store.save_memory(
        agent=args.agent,
        memory_type=args.type,
        content=args.content,
        tags=args.tags.split(",") if args.tags else [],
        session_id=args.session,
    )
    print(f"Memory saved with ID: {memory_id}")
    return memory_id


async def cmd_search(args):
    """Search memories."""
    results = await _memory_store.search_memory(
        agent=args.agent,
        query=args.query,
        tags=args.tags.split(",") if args.tags else None,
        memory_type=args.type,
        session_id=args.session,
        limit=args.limit,
    )
    
    if not results:
        print("No memories found.")
        return
    
    print(f"Found {len(results)} memories:\n")
    for i, memory in enumerate(results, 1):
        print(f"{i}. [{memory['memory_type']}] {memory['agent']}")
        print(f"   ID: {memory['id']}")
        print(f"   Content: {memory['content'][:100]}{'...' if len(memory['content']) > 100 else ''}")
        print(f"   Tags: {', '.join(memory['tags']) if memory['tags'] else 'none'}")
        print(f"   Created: {memory['created_at']}")
        print()


async def cmd_get(args):
    """Get a specific memory."""
    memory = await _memory_store.get_memory(args.id)
    
    if not memory:
        print(f"Memory not found: {args.id}")
        return
    
    print(json.dumps(memory, indent=2))


async def cmd_history(args):
    """Get session history."""
    history = await _memory_store.get_session_history(
        session_id=args.session,
        limit=args.limit,
    )
    
    if not history:
        print(f"No history found for session: {args.session}")
        return
    
    print(f"Session {args.session} history ({len(history)} entries):\n")
    for i, memory in enumerate(history, 1):
        print(f"{i}. [{memory['memory_type']}] {memory['agent']}: {memory['content'][:80]}...")
        print()


async def cmd_delete(args):
    """Delete a memory."""
    success = await _memory_store.delete_memory(args.id)
    
    if success:
        print(f"Memory deleted: {args.id}")
    else:
        print(f"Memory not found: {args.id}")


async def cmd_stats(args):
    """Show memory store statistics."""
    stats = _memory_store.get_stats()
    print("Memory Store Statistics:")
    print(f"  Total memories: {stats['total_memories']}")
    print(f"  Total sessions: {stats['total_sessions']}")
    print(f"  Total tags: {stats['total_tags']}")
    print()
    
    if stats['memories_by_agent']:
        print("  Memories by agent:")
        for agent, count in stats['memories_by_agent'].items():
            print(f"    {agent}: {count}")
        print()
    
    if stats['memories_by_type']:
        print("  Memories by type:")
        for mem_type, count in stats['memories_by_type'].items():
            print(f"    {mem_type}: {count}")


async def cmd_demo(args):
    """Run a demo of memory operations."""
    print("=== ZORA CORE Memory Demo ===\n")
    
    # Save some memories
    print("1. Saving memories...")
    
    mem1 = await _memory_store.save_memory(
        agent="CONNOR",
        memory_type="decision",
        content="Decided to use FastAPI for the backend API layer",
        tags=["architecture", "backend", "api"],
        session_id="demo_session",
    )
    print(f"   Saved: {mem1}")
    
    mem2 = await _memory_store.save_memory(
        agent="LUMINA",
        memory_type="plan",
        content="Created plan to implement user authentication with OAuth2",
        tags=["planning", "auth", "security"],
        session_id="demo_session",
    )
    print(f"   Saved: {mem2}")
    
    mem3 = await _memory_store.save_memory(
        agent="EIVOR",
        memory_type="reflection",
        content="Memory operations completed successfully with 100% accuracy",
        tags=["reflection", "memory"],
        session_id="demo_session",
    )
    print(f"   Saved: {mem3}")
    
    mem4 = await _memory_store.save_memory(
        agent="AEGIS",
        memory_type="safety_review",
        content="Reviewed deployment plan - no high-risk actions detected",
        tags=["safety", "review", "deployment"],
        session_id="demo_session",
    )
    print(f"   Saved: {mem4}")
    
    print()
    
    # Search memories
    print("2. Searching memories...")
    
    print("\n   Search for 'backend':")
    results = await _memory_store.search_memory(query="backend", limit=5)
    for r in results:
        print(f"   - [{r['agent']}] {r['content'][:60]}...")
    
    print("\n   Search by agent 'CONNOR':")
    results = await _memory_store.search_memory(agent="CONNOR", limit=5)
    for r in results:
        print(f"   - [{r['memory_type']}] {r['content'][:60]}...")
    
    print("\n   Search by tag 'security':")
    results = await _memory_store.search_memory(tags=["security"], limit=5)
    for r in results:
        print(f"   - [{r['agent']}] {r['content'][:60]}...")
    
    print()
    
    # Get session history
    print("3. Getting session history...")
    history = await _memory_store.get_session_history("demo_session")
    print(f"   Session 'demo_session' has {len(history)} entries")
    
    print()
    
    # Show stats
    print("4. Memory store statistics:")
    stats = _memory_store.get_stats()
    print(f"   Total memories: {stats['total_memories']}")
    print(f"   Agents: {list(stats['memories_by_agent'].keys())}")
    print(f"   Types: {list(stats['memories_by_type'].keys())}")
    
    print("\n=== Demo Complete ===")


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="ZORA CORE Memory CLI - Test memory operations"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Save command
    save_parser = subparsers.add_parser("save", help="Save a memory")
    save_parser.add_argument("--agent", "-a", required=True, help="Agent name")
    save_parser.add_argument("--type", "-t", required=True, help="Memory type")
    save_parser.add_argument("--content", "-c", required=True, help="Memory content")
    save_parser.add_argument("--tags", help="Comma-separated tags")
    save_parser.add_argument("--session", "-s", help="Session ID")
    
    # Search command
    search_parser = subparsers.add_parser("search", help="Search memories")
    search_parser.add_argument("--agent", "-a", help="Filter by agent")
    search_parser.add_argument("--query", "-q", help="Text query")
    search_parser.add_argument("--tags", help="Comma-separated tags")
    search_parser.add_argument("--type", "-t", help="Memory type")
    search_parser.add_argument("--session", "-s", help="Session ID")
    search_parser.add_argument("--limit", "-l", type=int, default=10, help="Max results")
    
    # Get command
    get_parser = subparsers.add_parser("get", help="Get a specific memory")
    get_parser.add_argument("--id", "-i", required=True, help="Memory ID")
    
    # History command
    history_parser = subparsers.add_parser("history", help="Get session history")
    history_parser.add_argument("--session", "-s", required=True, help="Session ID")
    history_parser.add_argument("--limit", "-l", type=int, default=50, help="Max entries")
    
    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a memory")
    delete_parser.add_argument("--id", "-i", required=True, help="Memory ID")
    
    # Stats command
    subparsers.add_parser("stats", help="Show memory store statistics")
    
    # Demo command
    subparsers.add_parser("demo", help="Run a demo of memory operations")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Run the appropriate command
    if args.command == "save":
        asyncio.run(cmd_save(args))
    elif args.command == "search":
        asyncio.run(cmd_search(args))
    elif args.command == "get":
        asyncio.run(cmd_get(args))
    elif args.command == "history":
        asyncio.run(cmd_history(args))
    elif args.command == "delete":
        asyncio.run(cmd_delete(args))
    elif args.command == "stats":
        asyncio.run(cmd_stats(args))
    elif args.command == "demo":
        asyncio.run(cmd_demo(args))


if __name__ == "__main__":
    main()
