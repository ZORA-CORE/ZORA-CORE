"""
ZORA CORE Memory CLI

A simple CLI tool for testing memory operations.

Usage:
    python -m zora_core.memory.cli demo
    python -m zora_core.memory.cli demo --backend=supabase
    python -m zora_core.memory.cli semantic-demo --backend=supabase
    python -m zora_core.memory.cli save --agent CONNOR --type decision --content "Test memory"
    python -m zora_core.memory.cli search --query "test" --limit 5
    python -m zora_core.memory.cli semantic-search --query "climate action" --limit 5
    python -m zora_core.memory.cli history --session session_123
    python -m zora_core.memory.cli stats
    python -m zora_core.memory.cli config
"""

import argparse
import asyncio
import json
import sys

from .base import MemoryBackend, MemoryType
from .config import MemoryBackendType, get_memory_backend, get_backend_info


# Global memory store instance for CLI (initialized in main)
_memory_store: MemoryBackend = None


def _init_backend(backend_type: str = None) -> MemoryBackend:
    """Initialize the memory backend based on the specified type."""
    global _memory_store
    
    if backend_type:
        try:
            _memory_store = get_memory_backend(MemoryBackendType(backend_type))
        except ValueError as e:
            print(f"Error: {e}")
            print("Falling back to in-memory backend.")
            _memory_store = get_memory_backend(MemoryBackendType.MEMORY)
    else:
        _memory_store = get_memory_backend()
    
    return _memory_store


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
    print(f"  Backend: {stats.get('backend', 'memory')}")
    print(f"  Total memories: {stats.get('total_memories', 0)}")
    
    if 'total_sessions' in stats:
        print(f"  Total sessions: {stats['total_sessions']}")
    if 'total_tags' in stats:
        print(f"  Total tags: {stats['total_tags']}")
    print()
    
    if stats.get('memories_by_agent'):
        print("  Memories by agent:")
        for agent, count in stats['memories_by_agent'].items():
            print(f"    {agent}: {count}")
        print()
    
    if stats.get('memories_by_type'):
        print("  Memories by type:")
        for mem_type, count in stats['memories_by_type'].items():
            print(f"    {mem_type}: {count}")


def cmd_config(args):
    """Show backend configuration."""
    info = get_backend_info()
    print("Memory Backend Configuration:")
    print(f"  Detected backend: {info['detected_backend']}")
    print(f"  Supabase configured: {info['supabase_configured']}")
    print(f"  Supabase URL: {info['supabase_url'] or 'not set'}")
    print(f"  Has service key: {info['has_service_key']}")
    print(f"  Has anon key: {info['has_anon_key']}")
    print(f"  Supabase package available: {info['supabase_package_available']}")
    print()
    print("Environment variables:")
    print("  SUPABASE_URL - Supabase project URL")
    print("  SUPABASE_SERVICE_KEY - Service role key (recommended for backend)")
    print("  SUPABASE_ANON_KEY - Anonymous key (alternative)")


async def cmd_demo(args):
    """Run a demo of memory operations."""
    backend_name = type(_memory_store).__name__
    print(f"=== ZORA CORE Memory Demo ({backend_name}) ===\n")
    
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
    print(f"   Backend: {stats.get('backend', 'memory')}")
    print(f"   Total memories: {stats.get('total_memories', 0)}")
    if stats.get('memories_by_agent'):
        print(f"   Agents: {list(stats['memories_by_agent'].keys())}")
    if stats.get('memories_by_type'):
        print(f"   Types: {list(stats['memories_by_type'].keys())}")
    
    print("\n=== Demo Complete ===")


async def cmd_semantic_search(args):
    """Search memories by semantic similarity."""
    # Check if backend supports semantic search
    if not hasattr(_memory_store, 'semantic_search'):
        print("Error: Current backend does not support semantic search.")
        print("Use --backend=supabase with pgvector enabled.")
        return
    
    results = await _memory_store.semantic_search(
        query=args.query,
        k=args.limit,
        agent=args.agent,
        tags=args.tags.split(",") if args.tags else None,
    )
    
    if not results:
        print("No memories found.")
        return
    
    print(f"Found {len(results)} memories by semantic similarity:\n")
    for i, memory in enumerate(results, 1):
        similarity = memory.get('similarity', 'N/A')
        if isinstance(similarity, float):
            similarity = f"{similarity:.4f}"
        print(f"{i}. [{memory['memory_type']}] {memory['agent']} (similarity: {similarity})")
        print(f"   ID: {memory['id']}")
        print(f"   Content: {memory['content'][:100]}{'...' if len(memory['content']) > 100 else ''}")
        print(f"   Tags: {', '.join(memory['tags']) if memory['tags'] else 'none'}")
        print()


async def cmd_semantic_demo(args):
    """Run a demo of semantic memory operations."""
    backend_name = type(_memory_store).__name__
    print(f"=== ZORA CORE Semantic Memory Demo ({backend_name}) ===\n")
    
    # Check if backend supports semantic search
    if not hasattr(_memory_store, 'semantic_search'):
        print("Error: Current backend does not support semantic search.")
        print("Use --backend=supabase with pgvector enabled.")
        return
    
    # Check if embeddings are enabled
    if hasattr(_memory_store, 'embeddings_enabled'):
        if not _memory_store.embeddings_enabled:
            print("Warning: Embeddings are not enabled. Semantic search will fall back to text search.")
            print("Set OPENAI_API_KEY environment variable to enable embeddings.\n")
    
    # Save some climate-related memories for the demo
    print("1. Saving climate-related memories...")
    
    memories = [
        {
            "agent": "ORACLE",
            "memory_type": "research",
            "content": "Research findings show that renewable energy adoption has increased by 45% globally in 2024, with solar and wind leading the transition away from fossil fuels.",
            "tags": ["climate", "energy", "research"],
        },
        {
            "agent": "AEGIS",
            "memory_type": "safety_review",
            "content": "Safety assessment of carbon capture technology deployment: Low risk for environmental impact, moderate cost concerns, high potential for emissions reduction.",
            "tags": ["climate", "safety", "carbon"],
        },
        {
            "agent": "LUMINA",
            "memory_type": "plan",
            "content": "Strategic plan for Climate OS v2: Focus on biodiversity tracking, integrate with satellite imagery APIs, add real-time deforestation alerts.",
            "tags": ["climate", "planning", "biodiversity"],
        },
        {
            "agent": "CONNOR",
            "memory_type": "decision",
            "content": "Technical decision: Use PostgreSQL with pgvector for storing climate data embeddings, enabling semantic search across environmental datasets.",
            "tags": ["technical", "database", "climate"],
        },
        {
            "agent": "EIVOR",
            "memory_type": "reflection",
            "content": "Memory system observation: Climate-related queries are 3x more frequent than other topics. Users are particularly interested in actionable sustainability tips.",
            "tags": ["memory", "analytics", "climate"],
        },
        {
            "agent": "SAM",
            "memory_type": "design",
            "content": "UI/UX design for climate dashboard: Green color palette representing sustainability, interactive charts for carbon footprint tracking, gamification elements for eco-challenges.",
            "tags": ["design", "frontend", "climate"],
        },
    ]
    
    saved_ids = []
    for mem in memories:
        mem_id = await _memory_store.save_memory(
            agent=mem["agent"],
            memory_type=mem["memory_type"],
            content=mem["content"],
            tags=mem["tags"],
            session_id="semantic_demo_session",
        )
        print(f"   Saved: {mem_id[:8]}... [{mem['agent']}] {mem['content'][:50]}...")
        saved_ids.append(mem_id)
    
    print()
    
    # Demonstrate semantic search with different queries
    print("2. Semantic search demonstrations...\n")
    
    test_queries = [
        "What are the latest findings about clean energy?",
        "How can we reduce carbon emissions?",
        "What's the plan for tracking nature and forests?",
        "Tell me about the user interface design",
        "What technical decisions were made about data storage?",
    ]
    
    for query in test_queries:
        print(f"   Query: \"{query}\"")
        results = await _memory_store.semantic_search(query=query, k=2)
        
        if results:
            for i, r in enumerate(results, 1):
                similarity = r.get('similarity', 'N/A')
                if isinstance(similarity, float):
                    similarity = f"{similarity:.3f}"
                print(f"   {i}. [{r['agent']}] {r['content'][:60]}... (sim: {similarity})")
        else:
            print("   No results found.")
        print()
    
    # Interactive mode
    print("3. Interactive semantic search (type 'quit' to exit)...\n")
    
    while True:
        try:
            user_query = input("   Enter your query: ").strip()
            if user_query.lower() in ['quit', 'exit', 'q']:
                break
            if not user_query:
                continue
            
            results = await _memory_store.semantic_search(query=user_query, k=3)
            
            if results:
                print(f"\n   Top {len(results)} results:")
                for i, r in enumerate(results, 1):
                    similarity = r.get('similarity', 'N/A')
                    if isinstance(similarity, float):
                        similarity = f"{similarity:.4f}"
                    print(f"   {i}. [{r['agent']}] (similarity: {similarity})")
                    print(f"      {r['content'][:80]}...")
            else:
                print("   No results found.")
            print()
            
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n")
            break
    
    print("\n=== Semantic Demo Complete ===")


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="ZORA CORE Memory CLI - Test memory operations"
    )
    
    # Global backend option
    parser.add_argument(
        "--backend", "-b",
        choices=["memory", "supabase"],
        default=None,
        help="Memory backend to use (default: auto-detect based on environment)"
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
    
    # Config command
    subparsers.add_parser("config", help="Show backend configuration")
    
    # Demo command
    subparsers.add_parser("demo", help="Run a demo of memory operations")
    
    # Semantic search command
    semantic_search_parser = subparsers.add_parser(
        "semantic-search", help="Search memories by semantic similarity"
    )
    semantic_search_parser.add_argument(
        "--query", "-q", required=True, help="Natural language query"
    )
    semantic_search_parser.add_argument("--agent", "-a", help="Filter by agent")
    semantic_search_parser.add_argument("--tags", help="Comma-separated tags")
    semantic_search_parser.add_argument(
        "--limit", "-l", type=int, default=10, help="Max results"
    )
    
    # Semantic demo command
    subparsers.add_parser(
        "semantic-demo", help="Run a demo of semantic memory operations"
    )
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize the backend (except for config command which doesn't need it)
    if args.command != "config":
        _init_backend(args.backend)
    
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
    elif args.command == "config":
        cmd_config(args)
    elif args.command == "demo":
        asyncio.run(cmd_demo(args))
    elif args.command == "semantic-search":
        asyncio.run(cmd_semantic_search(args))
    elif args.command == "semantic-demo":
        asyncio.run(cmd_semantic_demo(args))


if __name__ == "__main__":
    main()
