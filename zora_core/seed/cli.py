"""
ZORA CORE Seed CLI - Seed Data & Onboarding Backend v1.0

Command-line interface for managing seed data.

Usage:
    PYTHONPATH=. python -m zora_core.seed.cli list-seeds
    PYTHONPATH=. python -m zora_core.seed.cli run-seed --tenant <tenant-id> --key <seed_key>
    PYTHONPATH=. python -m zora_core.seed.cli run-all --tenant <tenant-id>
"""

import argparse
import sys
from uuid import UUID

from .service import (
    get_available_seeds,
    seed_climate_default_missions,
    seed_hemp_materials,
    seed_zora_shop_starter,
    seed_foundation_starter,
    seed_academy_starter,
    seed_goes_green_starter,
    seed_all_v1,
    SEED_SETS_V1,
)


SEED_FUNCTIONS = {
    "climate_default_missions_v1": seed_climate_default_missions,
    "hemp_materials_v1": seed_hemp_materials,
    "zora_shop_starter_v1": seed_zora_shop_starter,
    "foundation_starter_v1": seed_foundation_starter,
    "academy_starter_v1": seed_academy_starter,
    "goes_green_starter_v1": seed_goes_green_starter,
}


def cmd_list_seeds(args):
    """List available seed sets with descriptions."""
    print("\nAvailable Seed Sets (v1):")
    print("=" * 60)
    
    seeds = get_available_seeds()
    for key, description in seeds.items():
        print(f"\n  {key}")
        print(f"    {description}")
    
    print("\n" + "=" * 60)
    print(f"Total: {len(seeds)} seed sets available")
    print()


def cmd_run_seed(args):
    """Run a specific seed for a tenant."""
    try:
        tenant_id = UUID(args.tenant)
    except ValueError:
        print(f"Error: Invalid tenant ID format: {args.tenant}")
        sys.exit(1)
    
    seed_key = args.key
    
    if seed_key not in SEED_FUNCTIONS:
        print(f"Error: Unknown seed key: {seed_key}")
        print(f"Available keys: {', '.join(SEED_FUNCTIONS.keys())}")
        sys.exit(1)
    
    print(f"\nRunning seed '{seed_key}' for tenant {tenant_id}...")
    
    try:
        seed_func = SEED_FUNCTIONS[seed_key]
        result = seed_func(tenant_id)
        
        print(f"\nResult:")
        print(f"  Seed Key: {result.seed_key}")
        print(f"  Status: {result.status}")
        if result.details:
            print(f"  Details: {result.details}")
        
        if result.status == "error":
            sys.exit(1)
        
    except Exception as e:
        print(f"\nError running seed: {e}")
        sys.exit(1)


def cmd_run_all(args):
    """Run all v1 seeds for a tenant."""
    try:
        tenant_id = UUID(args.tenant)
    except ValueError:
        print(f"Error: Invalid tenant ID format: {args.tenant}")
        sys.exit(1)
    
    print(f"\nRunning all v1 seeds for tenant {tenant_id}...")
    print("=" * 60)
    
    try:
        results = seed_all_v1(tenant_id)
        
        print("\nResults:")
        print("-" * 60)
        
        completed = 0
        skipped = 0
        errors = 0
        
        for result in results:
            status_icon = {
                "completed": "[OK]",
                "skipped_already_run": "[SKIP]",
                "error": "[ERR]",
            }.get(result.status, "[?]")
            
            print(f"  {status_icon} {result.seed_key}")
            if result.details:
                print(f"       {result.details}")
            
            if result.status == "completed":
                completed += 1
            elif result.status == "skipped_already_run":
                skipped += 1
            else:
                errors += 1
        
        print("-" * 60)
        print(f"\nSummary: {completed} completed, {skipped} skipped, {errors} errors")
        
        if errors > 0:
            sys.exit(1)
        
    except Exception as e:
        print(f"\nError running seeds: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="ZORA CORE Seed CLI - Manage seed data for tenants"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    list_parser = subparsers.add_parser(
        "list-seeds",
        help="List available seed sets"
    )
    list_parser.set_defaults(func=cmd_list_seeds)
    
    run_seed_parser = subparsers.add_parser(
        "run-seed",
        help="Run a specific seed for a tenant"
    )
    run_seed_parser.add_argument(
        "--tenant", "-t",
        required=True,
        help="Tenant ID (UUID)"
    )
    run_seed_parser.add_argument(
        "--key", "-k",
        required=True,
        help="Seed key to run"
    )
    run_seed_parser.set_defaults(func=cmd_run_seed)
    
    run_all_parser = subparsers.add_parser(
        "run-all",
        help="Run all v1 seeds for a tenant"
    )
    run_all_parser.add_argument(
        "--tenant", "-t",
        required=True,
        help="Tenant ID (UUID)"
    )
    run_all_parser.set_defaults(func=cmd_run_all)
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    args.func(args)


if __name__ == "__main__":
    main()
