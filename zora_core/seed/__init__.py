"""
ZORA CORE Seed Data & Onboarding Module

This module provides seed data functionality for initializing tenants
with high-quality default data so the app feels alive and climate-focused
out of the box.

Seed Sets (v1):
- climate_default_missions_v1: Default climate missions for new tenants
- hemp_materials_v1: Hemp-based and sustainable materials
- zora_shop_starter_v1: Example brands, products, and projects
- foundation_starter_v1: Example foundation projects
- academy_starter_v1: Basic learning content
- goes_green_starter_v1: Example GOES GREEN profiles and actions
"""

from .service import (
    SeedResult,
    seed_climate_default_missions,
    seed_hemp_materials,
    seed_zora_shop_starter,
    seed_foundation_starter,
    seed_academy_starter,
    seed_goes_green_starter,
    seed_all_v1,
    get_available_seeds,
    SEED_SETS_V1,
)

__all__ = [
    "SeedResult",
    "seed_climate_default_missions",
    "seed_hemp_materials",
    "seed_zora_shop_starter",
    "seed_foundation_starter",
    "seed_academy_starter",
    "seed_goes_green_starter",
    "seed_all_v1",
    "get_available_seeds",
    "SEED_SETS_V1",
]
