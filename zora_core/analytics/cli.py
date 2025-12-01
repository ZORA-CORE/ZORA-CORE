"""
ZORA CORE Analytics CLI - Global Impact & Data Aggregates v1.0

Command-line interface for computing and viewing tenant impact metrics.

Usage:
    PYTHONPATH=. python -m zora_core.analytics.cli summary --tenant <id>
    PYTHONPATH=. python -m zora_core.analytics.cli snapshot --tenant <id> --period monthly
    PYTHONPATH=. python -m zora_core.analytics.cli snapshots --tenant <id> --period monthly --limit 6
    PYTHONPATH=. python -m zora_core.analytics.cli timeseries --tenant <id> --period monthly --months 6
"""

import argparse
import json
import sys
from datetime import datetime, timedelta

from zora_core.analytics.impact import (
    compute_tenant_impact_summary,
    compute_and_store_impact_snapshot,
    get_impact_snapshots,
    compute_timeseries_from_base_tables,
)


def cmd_summary(args: argparse.Namespace) -> None:
    """Compute and display current impact summary for a tenant."""
    print(f"Computing impact summary for tenant: {args.tenant}")
    print("-" * 60)
    
    summary = compute_tenant_impact_summary(args.tenant)
    
    if args.json:
        print(json.dumps(summary.to_dict(), indent=2))
    else:
        print(f"Tenant ID: {summary.tenant_id}")
        print(f"Computed at: {summary.computed_at}")
        print()
        
        print("Climate OS:")
        print(f"  Profiles: {summary.climate_os.climate_profiles_total}")
        print(f"  Missions total: {summary.climate_os.climate_missions_total}")
        print(f"  Missions completed: {summary.climate_os.climate_missions_completed}")
        print(f"  Missions in progress: {summary.climate_os.climate_missions_in_progress}")
        print(f"  Missions planned: {summary.climate_os.climate_missions_planned}")
        print(f"  Estimated impact (kgCO2): {summary.climate_os.climate_missions_estimated_impact_kgco2_total:.2f}")
        print(f"  Completed impact (kgCO2): {summary.climate_os.climate_missions_completed_impact_kgco2_total:.2f}")
        print()
        
        print("GOES GREEN:")
        print(f"  Profiles: {summary.goes_green.goes_green_profiles_total}")
        print(f"  Actions total: {summary.goes_green.goes_green_actions_total}")
        print(f"  Actions completed: {summary.goes_green.goes_green_actions_completed}")
        print(f"  Estimated savings (kgCO2): {summary.goes_green.goes_green_estimated_savings_kgco2_total:.2f}")
        print()
        
        print("ZORA SHOP:")
        print(f"  Brands: {summary.zora_shop.zora_shop_brands_total}")
        print(f"  Products: {summary.zora_shop.zora_shop_products_total}")
        print(f"  Projects total: {summary.zora_shop.zora_shop_projects_total}")
        print(f"  Projects launched: {summary.zora_shop.zora_shop_projects_launched}")
        print(f"  Orders: {summary.zora_shop.zora_shop_orders_total}")
        print(f"  GMV total: {summary.zora_shop.zora_shop_gmv_total:.2f}")
        print(f"  Commission total: {summary.zora_shop.zora_shop_commission_total:.2f}")
        print()
        
        print("THE ZORA FOUNDATION:")
        print(f"  Projects: {summary.foundation.foundation_projects_total}")
        print(f"  Contributions total: {summary.foundation.foundation_contributions_total_amount:.2f}")
        print(f"  Impact (kgCO2): {summary.foundation.foundation_impact_kgco2_total:.2f}")
        print()
        
        print("Climate Academy:")
        print(f"  Topics: {summary.academy.academy_topics_total}")
        print(f"  Lessons: {summary.academy.academy_lessons_total}")
        print(f"  Learning paths: {summary.academy.academy_learning_paths_total}")
        print(f"  User lessons completed: {summary.academy.academy_user_lessons_completed_total}")
        print(f"  User paths completed: {summary.academy.academy_user_paths_completed_total}")
        print()
        
        print("Autonomy & Agents:")
        print(f"  Commands: {summary.autonomy.autonomy_commands_total}")
        print(f"  Tasks total: {summary.autonomy.autonomy_tasks_total}")
        print(f"  Tasks completed: {summary.autonomy.autonomy_tasks_completed}")
        print(f"  Tasks failed: {summary.autonomy.autonomy_tasks_failed}")
        print(f"  Schedules: {summary.autonomy.autonomy_schedules_total}")
        print(f"  Tasks pending approval: {summary.autonomy.autonomy_tasks_pending_approval}")


def cmd_snapshot(args: argparse.Namespace) -> None:
    """Compute and store an impact snapshot for a tenant."""
    print(f"Creating {args.period} snapshot for tenant: {args.tenant}")
    print("-" * 60)
    
    now = datetime.utcnow()
    
    if args.period == "daily":
        period_start = datetime(now.year, now.month, now.day)
        period_end = period_start + timedelta(days=1)
    elif args.period == "weekly":
        days_since_monday = now.weekday()
        period_start = datetime(now.year, now.month, now.day) - timedelta(days=days_since_monday)
        period_end = period_start + timedelta(days=7)
    else:
        period_start = datetime(now.year, now.month, 1)
        next_month = now.month + 1
        next_year = now.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        period_end = datetime(next_year, next_month, 1)
    
    snapshot = compute_and_store_impact_snapshot(
        args.tenant,
        args.period,
        period_start,
        period_end,
    )
    
    print(f"Snapshot created: {snapshot.id}")
    print(f"Period: {snapshot.period_start} to {snapshot.period_end}")
    
    if args.json:
        print(json.dumps({
            "id": snapshot.id,
            "tenant_id": snapshot.tenant_id,
            "snapshot_period": snapshot.snapshot_period,
            "period_start": snapshot.period_start,
            "period_end": snapshot.period_end,
            "metrics": snapshot.metrics,
            "created_at": snapshot.created_at,
        }, indent=2))


def cmd_snapshots(args: argparse.Namespace) -> None:
    """List historical impact snapshots for a tenant."""
    print(f"Retrieving {args.period} snapshots for tenant: {args.tenant}")
    print("-" * 60)
    
    snapshots = get_impact_snapshots(args.tenant, args.period, args.limit)
    
    if args.json:
        print(json.dumps([{
            "id": s.id,
            "tenant_id": s.tenant_id,
            "snapshot_period": s.snapshot_period,
            "period_start": s.period_start,
            "period_end": s.period_end,
            "metrics": s.metrics,
            "created_at": s.created_at,
        } for s in snapshots], indent=2))
    else:
        if not snapshots:
            print("No snapshots found.")
            return
        
        for snapshot in snapshots:
            print(f"Snapshot: {snapshot.id}")
            print(f"  Period: {snapshot.period_start} to {snapshot.period_end}")
            print(f"  Created: {snapshot.created_at}")
            
            metrics = snapshot.metrics
            climate_os = metrics.get("climate_os", {})
            print(f"  Climate missions: {climate_os.get('climate_missions_total', 0)}")
            print(f"  Climate impact (kgCO2): {climate_os.get('climate_missions_completed_impact_kgco2_total', 0):.2f}")
            print()


def cmd_timeseries(args: argparse.Namespace) -> None:
    """Compute time-series data from base tables."""
    print(f"Computing {args.period} time-series for tenant: {args.tenant}")
    print(f"Looking back {args.months} months")
    print("-" * 60)
    
    points = compute_timeseries_from_base_tables(
        args.tenant,
        args.period,
        args.months,
    )
    
    if args.json:
        print(json.dumps({"period": args.period, "points": points}, indent=2))
    else:
        if not points:
            print("No data points found.")
            return
        
        for point in points:
            print(f"Period: {point['period_start'][:10]} to {point['period_end'][:10]}")
            print(f"  Climate missions created: {point['climate_os'].get('climate_missions_created', 0)}")
            print(f"  GOES GREEN actions created: {point['goes_green'].get('actions_created', 0)}")
            print(f"  ZORA SHOP orders created: {point['zora_shop'].get('orders_created', 0)}")
            print(f"  Foundation contributions: {point['foundation'].get('contributions_created', 0)}")
            print(f"  Academy lessons completed: {point['academy'].get('lessons_completed', 0)}")
            print(f"  Agent tasks created: {point['autonomy'].get('tasks_created', 0)}")
            print()


def main() -> None:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="ZORA CORE Analytics CLI - Global Impact & Data Aggregates v1.0"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    summary_parser = subparsers.add_parser("summary", help="Compute current impact summary")
    summary_parser.add_argument("--tenant", required=True, help="Tenant UUID")
    summary_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    snapshot_parser = subparsers.add_parser("snapshot", help="Create and store impact snapshot")
    snapshot_parser.add_argument("--tenant", required=True, help="Tenant UUID")
    snapshot_parser.add_argument("--period", choices=["daily", "weekly", "monthly"], default="monthly", help="Snapshot period")
    snapshot_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    snapshots_parser = subparsers.add_parser("snapshots", help="List historical snapshots")
    snapshots_parser.add_argument("--tenant", required=True, help="Tenant UUID")
    snapshots_parser.add_argument("--period", choices=["daily", "weekly", "monthly"], default="monthly", help="Snapshot period")
    snapshots_parser.add_argument("--limit", type=int, default=12, help="Maximum snapshots to return")
    snapshots_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    timeseries_parser = subparsers.add_parser("timeseries", help="Compute time-series from base tables")
    timeseries_parser.add_argument("--tenant", required=True, help="Tenant UUID")
    timeseries_parser.add_argument("--period", choices=["daily", "weekly", "monthly"], default="monthly", help="Time bucket period")
    timeseries_parser.add_argument("--months", type=int, default=6, help="Months to look back")
    timeseries_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    if args.command == "summary":
        cmd_summary(args)
    elif args.command == "snapshot":
        cmd_snapshot(args)
    elif args.command == "snapshots":
        cmd_snapshots(args)
    elif args.command == "timeseries":
        cmd_timeseries(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
