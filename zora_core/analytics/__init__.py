"""
ZORA CORE Analytics Module - Global Impact & Data Aggregates v1.0

This module provides analytics services for computing tenant-wide impact metrics
across all ZORA CORE modules (Climate OS, GOES GREEN, ZORA SHOP, Foundation,
Academy, Autonomy).
"""

from zora_core.analytics.impact import (
    compute_tenant_impact_summary,
    compute_and_store_impact_snapshot,
    get_impact_snapshots,
    ImpactSummary,
    ImpactSnapshot,
)

__all__ = [
    "compute_tenant_impact_summary",
    "compute_and_store_impact_snapshot",
    "get_impact_snapshots",
    "ImpactSummary",
    "ImpactSnapshot",
]
