"""
ZORA CORE Learning CLI - Outcome Feedback & Continual Learning v1.0

Command-line interface for managing outcome feedback and computing insights.

Usage:
    PYTHONPATH=. python -m zora_core.learning.cli <command> [options]

Commands:
    record-feedback     Record feedback for a target
    get-feedback        Get feedback for a target
    stats-for-target    Show stats for a specific target
    stats-for-type      Show stats for all entities of a type
    refresh-insights    Refresh all insights for a tenant
"""

import argparse
import json
import sys
from typing import Optional

from .outcomes import OutcomeService, VALID_TARGET_TYPES, VALID_SOURCES, VALID_SENTIMENTS


def record_feedback(args: argparse.Namespace) -> None:
    """Record feedback for a target."""
    service = OutcomeService()
    
    tags = args.tags.split(",") if args.tags else None
    context = json.loads(args.context) if args.context else None
    
    try:
        feedback = service.record_feedback(
            tenant_id=args.tenant,
            target_type=args.target_type,
            target_id=args.target_id,
            user_id=args.user_id,
            source=args.source,
            rating=args.rating,
            sentiment=args.sentiment,
            tags=tags,
            comment=args.comment,
            context=context,
        )
        print(f"Feedback recorded successfully:")
        print(json.dumps({
            "id": feedback.id,
            "target_type": feedback.target_type,
            "target_id": feedback.target_id,
            "rating": feedback.rating,
            "sentiment": feedback.sentiment,
            "tags": feedback.tags,
            "created_at": feedback.created_at,
        }, indent=2))
    except ValueError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error recording feedback: {e}", file=sys.stderr)
        sys.exit(1)


def get_feedback(args: argparse.Namespace) -> None:
    """Get feedback for a target."""
    service = OutcomeService()
    
    try:
        result = service.get_feedback_for_target(
            tenant_id=args.tenant,
            target_type=args.target_type,
            target_id=args.target_id,
            limit=args.limit,
            offset=args.offset,
        )
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error getting feedback: {e}", file=sys.stderr)
        sys.exit(1)


def stats_for_target(args: argparse.Namespace) -> None:
    """Show stats for a specific target."""
    service = OutcomeService()
    
    try:
        stats = service.compute_basic_stats_for_target(
            tenant_id=args.tenant,
            target_type=args.target_type,
            target_id=args.target_id,
        )
        print(json.dumps({
            "target_type": stats.target_type,
            "target_id": stats.target_id,
            "count": stats.count,
            "avg_rating": stats.avg_rating,
            "sentiment_counts": stats.sentiment_counts,
            "top_tags": stats.top_tags,
            "last_feedback_at": stats.last_feedback_at,
        }, indent=2))
    except Exception as e:
        print(f"Error computing stats: {e}", file=sys.stderr)
        sys.exit(1)


def stats_for_type(args: argparse.Namespace) -> None:
    """Show stats for all entities of a type."""
    service = OutcomeService()
    
    try:
        stats = service.compute_basic_stats_for_type(
            tenant_id=args.tenant,
            target_type=args.target_type,
            include_entities=not args.no_entities,
        )
        result = {
            "target_type": stats.target_type,
            "count": stats.count,
            "avg_rating": stats.avg_rating,
            "sentiment_counts": stats.sentiment_counts,
            "top_tags": stats.top_tags,
            "last_feedback_at": stats.last_feedback_at,
        }
        if stats.best_entities:
            result["best_entities"] = stats.best_entities
        if stats.worst_entities:
            result["worst_entities"] = stats.worst_entities
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error computing stats: {e}", file=sys.stderr)
        sys.exit(1)


def refresh_insights(args: argparse.Namespace) -> None:
    """Refresh all insights for a tenant."""
    service = OutcomeService()
    
    try:
        result = service.refresh_all_insights_for_tenant(args.tenant)
        print(f"Insights refreshed:")
        print(f"  Updated targets: {result['updated_targets']}")
        print(f"  Updated types: {result['updated_types']}")
    except Exception as e:
        print(f"Error refreshing insights: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ZORA CORE Learning CLI - Outcome Feedback & Continual Learning v1.0"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    record_parser = subparsers.add_parser("record-feedback", help="Record feedback for a target")
    record_parser.add_argument("--tenant", required=True, help="Tenant ID")
    record_parser.add_argument("--target-type", required=True, choices=VALID_TARGET_TYPES, help="Target type")
    record_parser.add_argument("--target-id", required=True, help="Target ID")
    record_parser.add_argument("--user-id", help="User ID (optional)")
    record_parser.add_argument("--source", default="user", choices=VALID_SOURCES, help="Feedback source")
    record_parser.add_argument("--rating", type=int, choices=[1, 2, 3, 4, 5], help="Rating 1-5")
    record_parser.add_argument("--sentiment", choices=VALID_SENTIMENTS, help="Sentiment")
    record_parser.add_argument("--tags", help="Comma-separated tags")
    record_parser.add_argument("--comment", help="Comment text")
    record_parser.add_argument("--context", help="JSON context")
    record_parser.set_defaults(func=record_feedback)

    get_parser = subparsers.add_parser("get-feedback", help="Get feedback for a target")
    get_parser.add_argument("--tenant", required=True, help="Tenant ID")
    get_parser.add_argument("--target-type", required=True, choices=VALID_TARGET_TYPES, help="Target type")
    get_parser.add_argument("--target-id", required=True, help="Target ID")
    get_parser.add_argument("--limit", type=int, default=50, help="Limit results")
    get_parser.add_argument("--offset", type=int, default=0, help="Offset for pagination")
    get_parser.set_defaults(func=get_feedback)

    target_stats_parser = subparsers.add_parser("stats-for-target", help="Show stats for a specific target")
    target_stats_parser.add_argument("--tenant", required=True, help="Tenant ID")
    target_stats_parser.add_argument("--target-type", required=True, choices=VALID_TARGET_TYPES, help="Target type")
    target_stats_parser.add_argument("--target-id", required=True, help="Target ID")
    target_stats_parser.set_defaults(func=stats_for_target)

    type_stats_parser = subparsers.add_parser("stats-for-type", help="Show stats for all entities of a type")
    type_stats_parser.add_argument("--tenant", required=True, help="Tenant ID")
    type_stats_parser.add_argument("--target-type", required=True, choices=VALID_TARGET_TYPES, help="Target type")
    type_stats_parser.add_argument("--no-entities", action="store_true", help="Skip best/worst entities")
    type_stats_parser.set_defaults(func=stats_for_type)

    refresh_parser = subparsers.add_parser("refresh-insights", help="Refresh all insights for a tenant")
    refresh_parser.add_argument("--tenant", required=True, help="Tenant ID")
    refresh_parser.set_defaults(func=refresh_insights)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
