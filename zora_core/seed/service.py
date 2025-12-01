"""
ZORA CORE Seed Service - Seed Data & Onboarding Backend v1.0

This service provides functions to seed high-quality default data for tenants.
Each seed set is tenant-scoped and idempotent (tracked via seed_runs table).

Seed Sets (v1):
- climate_default_missions_v1: Default climate missions
- hemp_materials_v1: Hemp-based and sustainable materials
- zora_shop_starter_v1: Example brands, products, and projects
- foundation_starter_v1: Example foundation projects
- academy_starter_v1: Basic learning content
- goes_green_starter_v1: Example GOES GREEN profiles and actions
"""

import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from supabase import create_client, Client


@dataclass
class SeedResult:
    """Result of a seed operation."""
    seed_key: str
    status: str  # 'completed', 'skipped_already_run', 'error'
    details: Optional[str] = None


SEED_SETS_V1 = {
    "climate_default_missions_v1": "Default climate missions for new tenants (energy, transport, food, products)",
    "hemp_materials_v1": "Hemp-based and sustainable materials for ZORA SHOP",
    "zora_shop_starter_v1": "Example brands, products, and ZORA SHOP projects",
    "foundation_starter_v1": "Example ZORA FOUNDATION projects",
    "academy_starter_v1": "Basic Climate Academy learning content",
    "goes_green_starter_v1": "Example GOES GREEN profiles and energy actions",
}


def get_supabase_client() -> Client:
    """Get a Supabase client using environment variables."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


def get_available_seeds() -> dict:
    """Return available seed sets with descriptions."""
    return SEED_SETS_V1.copy()


def _check_seed_already_run(supabase: Client, tenant_id: UUID, seed_key: str) -> bool:
    """Check if a seed has already been run for this tenant."""
    result = supabase.table("seed_runs").select("id").eq(
        "tenant_id", str(tenant_id)
    ).eq("seed_key", seed_key).eq("status", "completed").execute()
    return len(result.data) > 0


def _record_seed_run(
    supabase: Client, tenant_id: UUID, seed_key: str, status: str, details: Optional[str] = None
) -> None:
    """Record a seed run in the seed_runs table."""
    supabase.table("seed_runs").upsert({
        "tenant_id": str(tenant_id),
        "seed_key": seed_key,
        "status": status,
        "details": details,
        "created_at": datetime.utcnow().isoformat(),
    }, on_conflict="tenant_id,seed_key").execute()


def seed_climate_default_missions(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed default climate missions for a tenant.
    Creates ~10 missions spanning energy, transport, food, and products.
    """
    seed_key = "climate_default_missions_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        profiles_result = supabase.table("climate_profiles").select("id").eq(
            "tenant_id", str(tenant_id)
        ).limit(1).execute()
        
        if not profiles_result.data:
            profile_result = supabase.table("climate_profiles").insert({
                "tenant_id": str(tenant_id),
                "name": "Default Climate Profile",
                "scope": "individual",
                "is_primary": True,
                "baseline_kgco2_per_year": 8000,
                "target_kgco2_per_year": 4000,
            }).execute()
            profile_id = profile_result.data[0]["id"]
        else:
            profile_id = profiles_result.data[0]["id"]
        
        base_date = datetime.utcnow()
        missions = [
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Switch to renewable energy provider",
                "category": "energy",
                "status": "planned",
                "estimated_impact_kgco2": 1200,
                "due_date": (base_date + timedelta(days=30)).date().isoformat(),
                "notes": "Research green energy providers in your area and switch to 100% renewable electricity.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Install LED lighting throughout home",
                "category": "energy",
                "status": "planned",
                "estimated_impact_kgco2": 150,
                "due_date": (base_date + timedelta(days=14)).date().isoformat(),
                "notes": "Replace all incandescent and CFL bulbs with energy-efficient LED alternatives.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Reduce car usage by 50%",
                "category": "transport",
                "status": "planned",
                "estimated_impact_kgco2": 800,
                "due_date": (base_date + timedelta(days=60)).date().isoformat(),
                "notes": "Use public transport, cycling, or walking for at least half of your trips.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Try one meat-free day per week",
                "category": "food",
                "status": "planned",
                "estimated_impact_kgco2": 200,
                "due_date": (base_date + timedelta(days=7)).date().isoformat(),
                "notes": "Start with one vegetarian or vegan day per week to reduce food-related emissions.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Buy local and seasonal produce",
                "category": "food",
                "status": "planned",
                "estimated_impact_kgco2": 300,
                "due_date": (base_date + timedelta(days=21)).date().isoformat(),
                "notes": "Choose locally grown, seasonal fruits and vegetables to reduce transport emissions.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Reduce single-use plastics",
                "category": "products",
                "status": "planned",
                "estimated_impact_kgco2": 50,
                "due_date": (base_date + timedelta(days=14)).date().isoformat(),
                "notes": "Use reusable bags, bottles, and containers instead of single-use plastics.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Choose sustainable clothing brands",
                "category": "products",
                "status": "planned",
                "estimated_impact_kgco2": 250,
                "due_date": (base_date + timedelta(days=45)).date().isoformat(),
                "notes": "When buying new clothes, choose brands with verified sustainable practices.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Optimize home heating/cooling",
                "category": "energy",
                "status": "planned",
                "estimated_impact_kgco2": 400,
                "due_date": (base_date + timedelta(days=30)).date().isoformat(),
                "notes": "Install a smart thermostat and reduce heating/cooling by 1-2 degrees.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Calculate your carbon footprint",
                "category": "general",
                "status": "planned",
                "estimated_impact_kgco2": 0,
                "due_date": (base_date + timedelta(days=3)).date().isoformat(),
                "notes": "Use ZORA CORE to understand your current carbon footprint baseline.",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "title": "Share climate goals with friends/family",
                "category": "general",
                "status": "planned",
                "estimated_impact_kgco2": 0,
                "due_date": (base_date + timedelta(days=7)).date().isoformat(),
                "notes": "Inspire others by sharing your climate journey and goals.",
            },
        ]
        
        supabase.table("climate_missions").insert(missions).execute()
        
        _record_seed_run(supabase, tenant_id, seed_key, "completed", f"Created {len(missions)} missions")
        return SeedResult(seed_key=seed_key, status="completed", details=f"Created {len(missions)} missions")
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_hemp_materials(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed hemp-based and sustainable materials for ZORA SHOP.
    """
    seed_key = "hemp_materials_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        materials = [
            {
                "tenant_id": str(tenant_id),
                "name": "Organic Hemp Fleece",
                "description": "Soft, warm fleece made from 100% organic hemp fibers. Naturally antibacterial and breathable.",
                "is_hemp_or_cannabis_material": True,
                "hemp_category": "textile",
                "climate_benefit_note": "Hemp requires 50% less water than cotton and sequesters CO2 during growth.",
                "co2_intensity_kg_per_kg": 2.5,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp-Cotton Blend (55/45)",
                "description": "Durable blend combining hemp strength with cotton softness. Ideal for everyday wear.",
                "is_hemp_or_cannabis_material": True,
                "hemp_category": "textile",
                "climate_benefit_note": "Blending hemp with organic cotton reduces overall water and pesticide use.",
                "co2_intensity_kg_per_kg": 3.2,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp Canvas",
                "description": "Heavy-duty hemp canvas for bags, accessories, and outerwear. Extremely durable.",
                "is_hemp_or_cannabis_material": True,
                "hemp_category": "textile",
                "climate_benefit_note": "Hemp canvas lasts 3x longer than cotton canvas, reducing replacement frequency.",
                "co2_intensity_kg_per_kg": 2.8,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp Packaging Board",
                "description": "Sturdy packaging material made from hemp hurds. Fully biodegradable.",
                "is_hemp_or_cannabis_material": True,
                "hemp_category": "packaging",
                "climate_benefit_note": "Replaces plastic packaging and decomposes within 90 days.",
                "co2_intensity_kg_per_kg": 1.5,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hempcrete Block",
                "description": "Building material made from hemp hurds and lime. Carbon-negative construction.",
                "is_hemp_or_cannabis_material": True,
                "hemp_category": "building_material",
                "climate_benefit_note": "Hempcrete is carbon-negative, absorbing more CO2 than emitted during production.",
                "co2_intensity_kg_per_kg": -0.5,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Organic Cotton",
                "description": "GOTS-certified organic cotton grown without synthetic pesticides or fertilizers.",
                "is_hemp_or_cannabis_material": False,
                "hemp_category": None,
                "climate_benefit_note": "Organic cotton uses 91% less water than conventional cotton.",
                "co2_intensity_kg_per_kg": 5.0,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Recycled Polyester (rPET)",
                "description": "Polyester made from recycled plastic bottles. Diverts waste from landfills.",
                "is_hemp_or_cannabis_material": False,
                "hemp_category": None,
                "climate_benefit_note": "Uses 59% less energy than virgin polyester production.",
                "co2_intensity_kg_per_kg": 4.5,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Tencel Lyocell",
                "description": "Sustainable fiber made from wood pulp in a closed-loop process.",
                "is_hemp_or_cannabis_material": False,
                "hemp_category": None,
                "climate_benefit_note": "Production uses 80% less water than cotton and solvents are recycled.",
                "co2_intensity_kg_per_kg": 3.8,
            },
        ]
        
        supabase.table("materials").insert(materials).execute()
        
        _record_seed_run(supabase, tenant_id, seed_key, "completed", f"Created {len(materials)} materials")
        return SeedResult(seed_key=seed_key, status="completed", details=f"Created {len(materials)} materials")
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_zora_shop_starter(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed example brands, products, and ZORA SHOP projects.
    """
    seed_key = "zora_shop_starter_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        brands = [
            {
                "tenant_id": str(tenant_id),
                "name": "ZORA CORE Demo Brand",
                "description": "The official ZORA CORE demonstration brand showcasing climate-first fashion.",
                "website_url": "https://zoracore.dk",
                "climate_commitment": "100% carbon-neutral operations by 2025",
                "is_verified": True,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Green Fiber Co.",
                "description": "Sustainable textile manufacturer specializing in hemp and organic materials.",
                "website_url": "https://example.com/greenfiber",
                "climate_commitment": "Using only renewable energy in production",
                "is_verified": True,
            },
        ]
        
        brand_results = supabase.table("brands").insert(brands).execute()
        brand_ids = [b["id"] for b in brand_results.data]
        
        products = [
            {
                "tenant_id": str(tenant_id),
                "name": "Climate Action Hoodie",
                "description": "Comfortable hoodie made from organic hemp fleece. Features the ZORA climate mission logo.",
                "sku": "ZORA-HOODIE-001",
                "price_amount": 599,
                "price_currency": "DKK",
                "category": "apparel",
                "is_active": True,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp Essential T-Shirt",
                "description": "Classic fit t-shirt made from hemp-cotton blend. Soft, durable, and sustainable.",
                "sku": "ZORA-TEE-001",
                "price_amount": 299,
                "price_currency": "DKK",
                "category": "apparel",
                "is_active": True,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Eco Canvas Cap",
                "description": "Adjustable cap made from hemp canvas. Perfect for everyday wear.",
                "sku": "ZORA-CAP-001",
                "price_amount": 199,
                "price_currency": "DKK",
                "category": "accessories",
                "is_active": True,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Sustainable Tote Bag",
                "description": "Large tote bag made from heavy-duty hemp canvas. Replaces single-use plastic bags.",
                "sku": "ZORA-TOTE-001",
                "price_amount": 149,
                "price_currency": "DKK",
                "category": "accessories",
                "is_active": True,
            },
        ]
        
        product_results = supabase.table("products").insert(products).execute()
        product_ids = [p["id"] for p in product_results.data]
        
        product_brands = []
        for i, product_id in enumerate(product_ids):
            product_brands.append({
                "product_id": product_id,
                "brand_id": brand_ids[0],
                "is_primary": True,
            })
            if i < 2:
                product_brands.append({
                    "product_id": product_id,
                    "brand_id": brand_ids[1],
                    "is_primary": False,
                })
        
        supabase.table("product_brands").insert(product_brands).execute()
        
        climate_meta = []
        for product_id in product_ids:
            climate_meta.append({
                "product_id": product_id,
                "climate_label": "climate-neutral",
                "co2_footprint_kg": 2.5,
                "offset_verified": True,
                "materials_sustainable": True,
                "production_renewable_energy": True,
                "notes": "Verified climate-neutral through certified carbon offsets and sustainable production.",
            })
        
        supabase.table("product_climate_meta").insert(climate_meta).execute()
        
        projects = [
            {
                "tenant_id": str(tenant_id),
                "title": "ZORA x Green Fiber Hemp Capsule",
                "description": "Limited edition capsule collection featuring hemp-based essentials.",
                "primary_brand_id": brand_ids[0],
                "secondary_brand_id": brand_ids[1],
                "status": "in_progress",
                "climate_story": "This collaboration brings together ZORA's climate mission with Green Fiber's sustainable materials expertise.",
            },
            {
                "tenant_id": str(tenant_id),
                "title": "GOES GREEN Energy Hoodie Collection",
                "description": "Hoodies designed to promote renewable energy adoption.",
                "primary_brand_id": brand_ids[0],
                "status": "planned",
                "climate_story": "Each hoodie sold contributes to solar panel installations in underserved communities.",
            },
        ]
        
        supabase.table("zora_shop_projects").insert(projects).execute()
        
        details = f"Created {len(brands)} brands, {len(products)} products, {len(projects)} projects"
        _record_seed_run(supabase, tenant_id, seed_key, "completed", details)
        return SeedResult(seed_key=seed_key, status="completed", details=details)
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_foundation_starter(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed example ZORA FOUNDATION projects.
    """
    seed_key = "foundation_starter_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        projects = [
            {
                "tenant_id": str(tenant_id),
                "name": "Urban Tree Planting (City Demo)",
                "description": "Plant 1,000 trees in urban areas to improve air quality and provide shade.",
                "status": "active",
                "climate_focus_domain": "reforestation",
                "sdg_tags": ["SDG 11", "SDG 13", "SDG 15"],
                "impact_estimates": {
                    "trees_planted": 1000,
                    "kgco2_sequestered_per_year": 22000,
                    "area_m2": 5000,
                },
                "target_amount": 500000,
                "target_currency": "DKK",
                "current_amount": 125000,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Coastal Restoration (Demo)",
                "description": "Restore 10 hectares of coastal wetlands to protect against flooding and store carbon.",
                "status": "active",
                "climate_focus_domain": "ecosystem_restoration",
                "sdg_tags": ["SDG 13", "SDG 14", "SDG 15"],
                "impact_estimates": {
                    "area_restored_m2": 100000,
                    "kgco2_sequestered_per_year": 50000,
                    "species_protected": 25,
                },
                "target_amount": 1000000,
                "target_currency": "DKK",
                "current_amount": 350000,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Solar For Schools (Demo)",
                "description": "Install solar panels on 50 schools to reduce energy costs and emissions.",
                "status": "planned",
                "climate_focus_domain": "renewable_energy",
                "sdg_tags": ["SDG 4", "SDG 7", "SDG 13"],
                "impact_estimates": {
                    "schools_equipped": 50,
                    "kwh_generated_per_year": 500000,
                    "kgco2_avoided_per_year": 200000,
                },
                "target_amount": 2500000,
                "target_currency": "DKK",
                "current_amount": 0,
            },
        ]
        
        supabase.table("foundation_projects").insert(projects).execute()
        
        _record_seed_run(supabase, tenant_id, seed_key, "completed", f"Created {len(projects)} foundation projects")
        return SeedResult(seed_key=seed_key, status="completed", details=f"Created {len(projects)} foundation projects")
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_academy_starter(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed basic Climate Academy learning content.
    """
    seed_key = "academy_starter_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        topics = [
            {
                "tenant_id": str(tenant_id),
                "name": "Climate Basics",
                "description": "Understand the fundamentals of climate change, greenhouse gases, and global warming.",
                "icon": "globe",
                "sort_order": 1,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp & Materials",
                "description": "Learn about sustainable materials, with a focus on hemp and its climate benefits.",
                "icon": "leaf",
                "sort_order": 2,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "GOES GREEN Energy",
                "description": "Explore renewable energy options for homes and businesses.",
                "icon": "zap",
                "sort_order": 3,
            },
        ]
        
        topic_results = supabase.table("academy_topics").insert(topics).execute()
        topic_ids = {t["name"]: t["id"] for t in topic_results.data}
        
        lessons = [
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Climate Basics"],
                "title": "What is Climate Change?",
                "description": "An introduction to climate change, its causes, and effects on our planet.",
                "content_type": "video",
                "external_url": "https://www.youtube.com/watch?v=dcBXmj1nMTQ",
                "difficulty": "beginner",
                "duration_minutes": 15,
                "sort_order": 1,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Climate Basics"],
                "title": "Understanding Carbon Footprints",
                "description": "Learn how to measure and understand your personal carbon footprint.",
                "content_type": "article",
                "external_url": "https://www.nature.org/en-us/get-involved/how-to-help/carbon-footprint-calculator/",
                "difficulty": "beginner",
                "duration_minutes": 10,
                "sort_order": 2,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Climate Basics"],
                "title": "The Paris Agreement Explained",
                "description": "Understand the global climate agreement and its targets.",
                "content_type": "article",
                "external_url": "https://unfccc.int/process-and-meetings/the-paris-agreement",
                "difficulty": "intermediate",
                "duration_minutes": 20,
                "sort_order": 3,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Hemp & Materials"],
                "title": "Introduction to Hemp",
                "description": "Discover hemp as a sustainable material and its many applications.",
                "content_type": "article",
                "external_url": "https://www.hempfoundation.net/hemp-basics/",
                "difficulty": "beginner",
                "duration_minutes": 15,
                "sort_order": 1,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Hemp & Materials"],
                "title": "Hemp vs Cotton: Environmental Impact",
                "description": "Compare the environmental footprints of hemp and cotton production.",
                "content_type": "article",
                "external_url": "https://www.sustainablejungle.com/sustainable-fashion/hemp-vs-cotton/",
                "difficulty": "intermediate",
                "duration_minutes": 12,
                "sort_order": 2,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["GOES GREEN Energy"],
                "title": "Solar Energy Basics",
                "description": "Learn how solar panels work and their benefits for homes.",
                "content_type": "video",
                "external_url": "https://www.youtube.com/watch?v=xKxrkht7CpY",
                "difficulty": "beginner",
                "duration_minutes": 10,
                "sort_order": 1,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["GOES GREEN Energy"],
                "title": "Heat Pumps Explained",
                "description": "Understand how heat pumps can efficiently heat and cool your home.",
                "content_type": "article",
                "external_url": "https://www.energy.gov/energysaver/heat-pump-systems",
                "difficulty": "intermediate",
                "duration_minutes": 15,
                "sort_order": 2,
            },
        ]
        
        lesson_results = supabase.table("academy_lessons").insert(lessons).execute()
        lesson_ids = [l["id"] for l in lesson_results.data]
        
        modules = [
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Climate Basics"],
                "name": "Climate Fundamentals",
                "description": "Core concepts every climate-conscious person should know.",
                "sort_order": 1,
            },
            {
                "tenant_id": str(tenant_id),
                "topic_id": topic_ids["Hemp & Materials"],
                "name": "Sustainable Materials 101",
                "description": "Introduction to sustainable materials and their benefits.",
                "sort_order": 1,
            },
        ]
        
        module_results = supabase.table("academy_modules").insert(modules).execute()
        module_ids = [m["id"] for m in module_results.data]
        
        paths = [
            {
                "tenant_id": str(tenant_id),
                "name": "Climate Basics for Individuals",
                "description": "A beginner-friendly path to understanding climate change and taking action.",
                "difficulty": "beginner",
                "estimated_hours": 2,
                "is_published": True,
            },
            {
                "tenant_id": str(tenant_id),
                "name": "Hemp & Materials 101",
                "description": "Learn about sustainable materials with a focus on hemp.",
                "difficulty": "intermediate",
                "estimated_hours": 1,
                "is_published": True,
            },
        ]
        
        supabase.table("academy_learning_paths").insert(paths).execute()
        
        details = f"Created {len(topics)} topics, {len(lessons)} lessons, {len(modules)} modules, {len(paths)} paths"
        _record_seed_run(supabase, tenant_id, seed_key, "completed", details)
        return SeedResult(seed_key=seed_key, status="completed", details=details)
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_goes_green_starter(tenant_id: UUID, supabase: Client = None) -> SeedResult:
    """
    Seed example GOES GREEN profiles and energy actions.
    """
    seed_key = "goes_green_starter_v1"
    
    if supabase is None:
        supabase = get_supabase_client()
    
    if _check_seed_already_run(supabase, tenant_id, seed_key):
        return SeedResult(seed_key=seed_key, status="skipped_already_run")
    
    try:
        profiles = [
            {
                "tenant_id": str(tenant_id),
                "name": "Demo Home",
                "profile_type": "household",
                "location_country": "DK",
                "location_city": "Copenhagen",
                "annual_energy_kwh": 4500,
                "current_energy_source": "grid_mixed",
            },
        ]
        
        profile_results = supabase.table("goes_green_profiles").insert(profiles).execute()
        profile_id = profile_results.data[0]["id"]
        
        actions = [
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "action_type": "switch_to_green_tariff",
                "title": "Switch to 100% Green Electricity",
                "description": "Change your electricity provider to one offering 100% renewable energy.",
                "status": "planned",
                "estimated_cost_amount": 0,
                "estimated_cost_currency": "DKK",
                "estimated_savings_kgco2": 1200,
                "payback_years": 0,
                "priority": "high",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "action_type": "install_solar_pv",
                "title": "Install Rooftop Solar Panels",
                "description": "Install a 6kW solar PV system to generate your own clean electricity.",
                "status": "planned",
                "estimated_cost_amount": 85000,
                "estimated_cost_currency": "DKK",
                "estimated_savings_kgco2": 2000,
                "payback_years": 8,
                "priority": "medium",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "action_type": "install_heat_pump",
                "title": "Replace Gas Boiler with Heat Pump",
                "description": "Install an air-source heat pump to replace your gas heating system.",
                "status": "under_evaluation",
                "estimated_cost_amount": 120000,
                "estimated_cost_currency": "DKK",
                "estimated_savings_kgco2": 3000,
                "payback_years": 10,
                "priority": "medium",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "action_type": "improve_insulation",
                "title": "Improve Home Insulation",
                "description": "Add insulation to walls, roof, and floors to reduce heating needs.",
                "status": "under_evaluation",
                "estimated_cost_amount": 50000,
                "estimated_cost_currency": "DKK",
                "estimated_savings_kgco2": 800,
                "payback_years": 6,
                "priority": "high",
            },
            {
                "tenant_id": str(tenant_id),
                "profile_id": profile_id,
                "action_type": "smart_thermostat",
                "title": "Install Smart Thermostat",
                "description": "Install a smart thermostat to optimize heating schedules and reduce waste.",
                "status": "completed",
                "estimated_cost_amount": 2500,
                "estimated_cost_currency": "DKK",
                "estimated_savings_kgco2": 200,
                "payback_years": 2,
                "priority": "low",
            },
        ]
        
        supabase.table("goes_green_actions").insert(actions).execute()
        
        details = f"Created {len(profiles)} profiles, {len(actions)} actions"
        _record_seed_run(supabase, tenant_id, seed_key, "completed", details)
        return SeedResult(seed_key=seed_key, status="completed", details=details)
    
    except Exception as e:
        _record_seed_run(supabase, tenant_id, seed_key, "error", str(e))
        return SeedResult(seed_key=seed_key, status="error", details=str(e))


def seed_all_v1(tenant_id: UUID, supabase: Client = None) -> List[SeedResult]:
    """
    Run all v1 seed sets for a tenant.
    Returns a list of SeedResult objects.
    """
    if supabase is None:
        supabase = get_supabase_client()
    
    results = []
    
    results.append(seed_climate_default_missions(tenant_id, supabase))
    results.append(seed_hemp_materials(tenant_id, supabase))
    results.append(seed_zora_shop_starter(tenant_id, supabase))
    results.append(seed_foundation_starter(tenant_id, supabase))
    results.append(seed_academy_starter(tenant_id, supabase))
    results.append(seed_goes_green_starter(tenant_id, supabase))
    
    return results
