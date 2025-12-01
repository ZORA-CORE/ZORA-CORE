"""
ZORA CORE Impact Analytics Service - Global Impact & Data Aggregates v1.0

This service computes tenant-wide impact metrics across all ZORA CORE modules:
- Climate OS: profiles, missions, estimated/completed impact
- GOES GREEN: profiles, actions, energy savings
- ZORA SHOP: brands, products, projects, orders, GMV, commission
- THE ZORA FOUNDATION: projects, contributions, impact
- Climate Academy: topics, lessons, learning paths, user progress
- Autonomy & Agents: commands, tasks, schedules

The service supports:
- compute_tenant_impact_summary: Real-time aggregation from base tables
- compute_and_store_impact_snapshot: Store periodic snapshots for historical tracking
- get_impact_snapshots: Retrieve historical snapshots for time-series analysis
"""

import logging
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

logger = logging.getLogger("zora.analytics.impact")


@dataclass
class ClimateOSMetrics:
    """Climate OS module metrics."""
    climate_profiles_total: int = 0
    climate_missions_total: int = 0
    climate_missions_completed: int = 0
    climate_missions_in_progress: int = 0
    climate_missions_planned: int = 0
    climate_missions_estimated_impact_kgco2_total: float = 0.0
    climate_missions_completed_impact_kgco2_total: float = 0.0


@dataclass
class GoesGreenMetrics:
    """GOES GREEN module metrics."""
    goes_green_profiles_total: int = 0
    goes_green_actions_total: int = 0
    goes_green_actions_completed: int = 0
    goes_green_estimated_savings_kgco2_total: float = 0.0


@dataclass
class ZoraShopMetrics:
    """ZORA SHOP module metrics."""
    zora_shop_brands_total: int = 0
    zora_shop_products_total: int = 0
    zora_shop_projects_total: int = 0
    zora_shop_projects_launched: int = 0
    zora_shop_orders_total: int = 0
    zora_shop_gmv_total: float = 0.0
    zora_shop_commission_total: float = 0.0


@dataclass
class FoundationMetrics:
    """THE ZORA FOUNDATION module metrics."""
    foundation_projects_total: int = 0
    foundation_contributions_total_amount: float = 0.0
    foundation_impact_kgco2_total: float = 0.0


@dataclass
class AcademyMetrics:
    """Climate Academy module metrics."""
    academy_topics_total: int = 0
    academy_lessons_total: int = 0
    academy_learning_paths_total: int = 0
    academy_user_lessons_completed_total: int = 0
    academy_user_paths_completed_total: int = 0


@dataclass
class AutonomyMetrics:
    """Autonomy & Agents module metrics."""
    autonomy_commands_total: int = 0
    autonomy_tasks_total: int = 0
    autonomy_tasks_completed: int = 0
    autonomy_tasks_failed: int = 0
    autonomy_schedules_total: int = 0
    autonomy_tasks_pending_approval: int = 0


@dataclass
class ImpactSummary:
    """Complete impact summary across all modules."""
    tenant_id: str
    computed_at: str
    climate_os: ClimateOSMetrics = field(default_factory=ClimateOSMetrics)
    goes_green: GoesGreenMetrics = field(default_factory=GoesGreenMetrics)
    zora_shop: ZoraShopMetrics = field(default_factory=ZoraShopMetrics)
    foundation: FoundationMetrics = field(default_factory=FoundationMetrics)
    academy: AcademyMetrics = field(default_factory=AcademyMetrics)
    autonomy: AutonomyMetrics = field(default_factory=AutonomyMetrics)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "tenant_id": self.tenant_id,
            "computed_at": self.computed_at,
            "climate_os": asdict(self.climate_os),
            "goes_green": asdict(self.goes_green),
            "zora_shop": asdict(self.zora_shop),
            "foundation": asdict(self.foundation),
            "academy": asdict(self.academy),
            "autonomy": asdict(self.autonomy),
        }


@dataclass
class ImpactSnapshot:
    """Stored impact snapshot for historical tracking."""
    id: str
    tenant_id: str
    snapshot_period: str
    period_start: str
    period_end: str
    metrics: Dict[str, Any]
    created_at: str
    
    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "ImpactSnapshot":
        """Create an ImpactSnapshot from a database row."""
        return cls(
            id=row["id"],
            tenant_id=row["tenant_id"],
            snapshot_period=row["snapshot_period"],
            period_start=row["period_start"],
            period_end=row["period_end"],
            metrics=row.get("metrics", {}),
            created_at=row["created_at"],
        )


def get_supabase_client() -> Client:
    """Get a Supabase client using environment variables."""
    if not SUPABASE_AVAILABLE:
        raise ImportError("supabase package is not installed")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    return create_client(url, key)


def _compute_climate_os_metrics(supabase: Client, tenant_id: str) -> ClimateOSMetrics:
    """Compute Climate OS metrics for a tenant."""
    metrics = ClimateOSMetrics()
    
    try:
        profiles_result = supabase.table("climate_profiles").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.climate_profiles_total = profiles_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching climate_profiles: {e}")
    
    try:
        missions_result = supabase.table("climate_missions").select(
            "id, status, estimated_impact_kgco2"
        ).eq("tenant_id", tenant_id).execute()
        
        missions = missions_result.data or []
        metrics.climate_missions_total = len(missions)
        
        for mission in missions:
            status = mission.get("status", "")
            estimated = mission.get("estimated_impact_kgco2") or 0
            
            metrics.climate_missions_estimated_impact_kgco2_total += estimated
            
            if status == "completed":
                metrics.climate_missions_completed += 1
                metrics.climate_missions_completed_impact_kgco2_total += estimated
            elif status == "in_progress":
                metrics.climate_missions_in_progress += 1
            elif status == "planned":
                metrics.climate_missions_planned += 1
    except Exception as e:
        logger.warning(f"Error fetching climate_missions: {e}")
    
    return metrics


def _compute_goes_green_metrics(supabase: Client, tenant_id: str) -> GoesGreenMetrics:
    """Compute GOES GREEN metrics for a tenant."""
    metrics = GoesGreenMetrics()
    
    try:
        profiles_result = supabase.table("goes_green_profiles").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.goes_green_profiles_total = profiles_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching goes_green_profiles: {e}")
    
    try:
        actions_result = supabase.table("goes_green_actions").select(
            "id, status, estimated_impact_kgco2"
        ).eq("tenant_id", tenant_id).execute()
        
        actions = actions_result.data or []
        metrics.goes_green_actions_total = len(actions)
        
        for action in actions:
            status = action.get("status", "")
            estimated = action.get("estimated_impact_kgco2") or 0
            
            metrics.goes_green_estimated_savings_kgco2_total += estimated
            
            if status == "completed":
                metrics.goes_green_actions_completed += 1
    except Exception as e:
        logger.warning(f"Error fetching goes_green_actions: {e}")
    
    return metrics


def _compute_zora_shop_metrics(supabase: Client, tenant_id: str) -> ZoraShopMetrics:
    """Compute ZORA SHOP metrics for a tenant."""
    metrics = ZoraShopMetrics()
    
    try:
        brands_result = supabase.table("brands").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.zora_shop_brands_total = brands_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching brands: {e}")
    
    try:
        products_result = supabase.table("products").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.zora_shop_products_total = products_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching products: {e}")
    
    try:
        projects_result = supabase.table("zora_shop_projects").select(
            "id, status"
        ).eq("tenant_id", tenant_id).execute()
        
        projects = projects_result.data or []
        metrics.zora_shop_projects_total = len(projects)
        
        for project in projects:
            if project.get("status") == "launched":
                metrics.zora_shop_projects_launched += 1
    except Exception as e:
        logger.warning(f"Error fetching zora_shop_projects: {e}")
    
    try:
        orders_result = supabase.table("zora_shop_orders").select(
            "id, total_amount, commission_amount"
        ).eq("tenant_id", tenant_id).execute()
        
        orders = orders_result.data or []
        metrics.zora_shop_orders_total = len(orders)
        
        for order in orders:
            total = order.get("total_amount") or 0
            commission = order.get("commission_amount") or 0
            metrics.zora_shop_gmv_total += total
            metrics.zora_shop_commission_total += commission
    except Exception as e:
        logger.warning(f"Error fetching zora_shop_orders: {e}")
    
    return metrics


def _compute_foundation_metrics(supabase: Client, tenant_id: str) -> FoundationMetrics:
    """Compute THE ZORA FOUNDATION metrics for a tenant."""
    metrics = FoundationMetrics()
    
    try:
        projects_result = supabase.table("foundation_projects").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.foundation_projects_total = projects_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching foundation_projects: {e}")
    
    try:
        contributions_result = supabase.table("foundation_contributions").select(
            "id, amount_cents"
        ).eq("tenant_id", tenant_id).execute()
        
        contributions = contributions_result.data or []
        for contribution in contributions:
            amount = contribution.get("amount_cents") or 0
            metrics.foundation_contributions_total_amount += amount / 100.0
    except Exception as e:
        logger.warning(f"Error fetching foundation_contributions: {e}")
    
    try:
        impact_result = supabase.table("foundation_impact_log").select(
            "id, impact_kgco2"
        ).eq("tenant_id", tenant_id).execute()
        
        impact_logs = impact_result.data or []
        for log in impact_logs:
            impact = log.get("impact_kgco2") or 0
            metrics.foundation_impact_kgco2_total += impact
    except Exception as e:
        logger.warning(f"Error fetching foundation_impact_log: {e}")
    
    return metrics


def _compute_academy_metrics(supabase: Client, tenant_id: str) -> AcademyMetrics:
    """Compute Climate Academy metrics for a tenant."""
    metrics = AcademyMetrics()
    
    try:
        topics_result = supabase.table("academy_topics").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.academy_topics_total = topics_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching academy_topics: {e}")
    
    try:
        lessons_result = supabase.table("academy_lessons").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.academy_lessons_total = lessons_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching academy_lessons: {e}")
    
    try:
        paths_result = supabase.table("academy_learning_paths").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.academy_learning_paths_total = paths_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching academy_learning_paths: {e}")
    
    try:
        progress_result = supabase.table("academy_user_progress").select(
            "id, lesson_id, learning_path_id, status"
        ).eq("tenant_id", tenant_id).execute()
        
        progress_records = progress_result.data or []
        for record in progress_records:
            if record.get("status") == "completed":
                if record.get("lesson_id"):
                    metrics.academy_user_lessons_completed_total += 1
                if record.get("learning_path_id") and not record.get("lesson_id"):
                    metrics.academy_user_paths_completed_total += 1
    except Exception as e:
        logger.warning(f"Error fetching academy_user_progress: {e}")
    
    return metrics


def _compute_autonomy_metrics(supabase: Client, tenant_id: str) -> AutonomyMetrics:
    """Compute Autonomy & Agents metrics for a tenant."""
    metrics = AutonomyMetrics()
    
    try:
        commands_result = supabase.table("agent_commands").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.autonomy_commands_total = commands_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching agent_commands: {e}")
    
    try:
        tasks_result = supabase.table("agent_tasks").select(
            "id, status, requires_approval, approved_at"
        ).eq("tenant_id", tenant_id).execute()
        
        tasks = tasks_result.data or []
        metrics.autonomy_tasks_total = len(tasks)
        
        for task in tasks:
            status = task.get("status", "")
            requires_approval = task.get("requires_approval", False)
            approved_at = task.get("approved_at")
            
            if status == "completed":
                metrics.autonomy_tasks_completed += 1
            elif status == "failed":
                metrics.autonomy_tasks_failed += 1
            
            if requires_approval and not approved_at and status == "pending":
                metrics.autonomy_tasks_pending_approval += 1
    except Exception as e:
        logger.warning(f"Error fetching agent_tasks: {e}")
    
    try:
        schedules_result = supabase.table("agent_schedules").select(
            "id", count="exact"
        ).eq("tenant_id", tenant_id).execute()
        metrics.autonomy_schedules_total = schedules_result.count or 0
    except Exception as e:
        logger.warning(f"Error fetching agent_schedules: {e}")
    
    return metrics


def compute_tenant_impact_summary(
    tenant_id: str,
    supabase: Client = None,
) -> ImpactSummary:
    """
    Compute a complete impact summary for a tenant across all modules.
    
    This function queries all relevant tables and aggregates metrics in real-time.
    For historical tracking, use compute_and_store_impact_snapshot.
    
    Args:
        tenant_id: UUID of the tenant
        supabase: Optional Supabase client (will create one if not provided)
    
    Returns:
        ImpactSummary with all module metrics
    """
    if supabase is None:
        supabase = get_supabase_client()
    
    tenant_id_str = str(tenant_id)
    computed_at = datetime.utcnow().isoformat() + "Z"
    
    summary = ImpactSummary(
        tenant_id=tenant_id_str,
        computed_at=computed_at,
        climate_os=_compute_climate_os_metrics(supabase, tenant_id_str),
        goes_green=_compute_goes_green_metrics(supabase, tenant_id_str),
        zora_shop=_compute_zora_shop_metrics(supabase, tenant_id_str),
        foundation=_compute_foundation_metrics(supabase, tenant_id_str),
        academy=_compute_academy_metrics(supabase, tenant_id_str),
        autonomy=_compute_autonomy_metrics(supabase, tenant_id_str),
    )
    
    logger.info(f"Computed impact summary for tenant {tenant_id_str}")
    return summary


def compute_and_store_impact_snapshot(
    tenant_id: str,
    period: str,
    period_start: datetime,
    period_end: datetime,
    supabase: Client = None,
) -> ImpactSnapshot:
    """
    Compute and store an impact snapshot for a tenant.
    
    This function computes the current impact summary and stores it in the
    tenant_impact_snapshots table for historical tracking.
    
    Args:
        tenant_id: UUID of the tenant
        period: Snapshot period ('daily', 'weekly', 'monthly')
        period_start: Start of the period
        period_end: End of the period
        supabase: Optional Supabase client
    
    Returns:
        ImpactSnapshot record
    """
    if supabase is None:
        supabase = get_supabase_client()
    
    tenant_id_str = str(tenant_id)
    
    summary = compute_tenant_impact_summary(tenant_id_str, supabase)
    
    metrics_dict = {
        "climate_os": asdict(summary.climate_os),
        "goes_green": asdict(summary.goes_green),
        "zora_shop": asdict(summary.zora_shop),
        "foundation": asdict(summary.foundation),
        "academy": asdict(summary.academy),
        "autonomy": asdict(summary.autonomy),
    }
    
    snapshot_data = {
        "tenant_id": tenant_id_str,
        "snapshot_period": period,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "metrics": metrics_dict,
    }
    
    result = supabase.table("tenant_impact_snapshots").insert(snapshot_data).execute()
    
    if not result.data:
        raise RuntimeError("Failed to store impact snapshot")
    
    snapshot = ImpactSnapshot.from_db_row(result.data[0])
    logger.info(f"Stored {period} impact snapshot for tenant {tenant_id_str}")
    return snapshot


def get_impact_snapshots(
    tenant_id: str,
    period: str = "monthly",
    limit: int = 12,
    supabase: Client = None,
) -> List[ImpactSnapshot]:
    """
    Retrieve historical impact snapshots for a tenant.
    
    Args:
        tenant_id: UUID of the tenant
        period: Snapshot period to filter ('daily', 'weekly', 'monthly')
        limit: Maximum number of snapshots to return
        supabase: Optional Supabase client
    
    Returns:
        List of ImpactSnapshot records, ordered by period_start descending
    """
    if supabase is None:
        supabase = get_supabase_client()
    
    tenant_id_str = str(tenant_id)
    
    result = supabase.table("tenant_impact_snapshots").select("*").eq(
        "tenant_id", tenant_id_str
    ).eq(
        "snapshot_period", period
    ).order(
        "period_start", desc=True
    ).limit(limit).execute()
    
    snapshots = [ImpactSnapshot.from_db_row(row) for row in (result.data or [])]
    logger.info(f"Retrieved {len(snapshots)} {period} snapshots for tenant {tenant_id_str}")
    return snapshots


def compute_timeseries_from_base_tables(
    tenant_id: str,
    period: str = "monthly",
    months: int = 6,
    supabase: Client = None,
) -> List[Dict[str, Any]]:
    """
    Compute time-series data by bucketing base table records by date.
    
    This is a fallback when no snapshots exist. It groups records by their
    created_at timestamp to show how metrics evolved over time.
    
    Note: This is less accurate than stored snapshots since it only shows
    when records were created, not the state at each point in time.
    
    Args:
        tenant_id: UUID of the tenant
        period: Time bucket ('daily', 'weekly', 'monthly')
        months: Number of months to look back
        supabase: Optional Supabase client
    
    Returns:
        List of time-bucketed metric points
    """
    if supabase is None:
        supabase = get_supabase_client()
    
    tenant_id_str = str(tenant_id)
    
    from datetime import timedelta
    now = datetime.utcnow()
    start_date = now - timedelta(days=months * 30)
    
    points = []
    
    if period == "monthly":
        current = datetime(start_date.year, start_date.month, 1)
        while current <= now:
            next_month = current.month + 1
            next_year = current.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            period_end = datetime(next_year, next_month, 1)
            
            point = {
                "period_start": current.isoformat() + "Z",
                "period_end": period_end.isoformat() + "Z",
                "climate_os": {"climate_missions_created": 0},
                "goes_green": {"actions_created": 0},
                "zora_shop": {"orders_created": 0},
                "foundation": {"contributions_created": 0},
                "academy": {"lessons_completed": 0},
                "autonomy": {"tasks_created": 0},
            }
            
            try:
                missions_result = supabase.table("climate_missions").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).gte(
                    "created_at", current.isoformat()
                ).lt("created_at", period_end.isoformat()).execute()
                point["climate_os"]["climate_missions_created"] = missions_result.count or 0
            except Exception:
                pass
            
            try:
                actions_result = supabase.table("goes_green_actions").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).gte(
                    "created_at", current.isoformat()
                ).lt("created_at", period_end.isoformat()).execute()
                point["goes_green"]["actions_created"] = actions_result.count or 0
            except Exception:
                pass
            
            try:
                orders_result = supabase.table("zora_shop_orders").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).gte(
                    "created_at", current.isoformat()
                ).lt("created_at", period_end.isoformat()).execute()
                point["zora_shop"]["orders_created"] = orders_result.count or 0
            except Exception:
                pass
            
            try:
                contributions_result = supabase.table("foundation_contributions").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).gte(
                    "created_at", current.isoformat()
                ).lt("created_at", period_end.isoformat()).execute()
                point["foundation"]["contributions_created"] = contributions_result.count or 0
            except Exception:
                pass
            
            try:
                progress_result = supabase.table("academy_user_progress").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).eq("status", "completed").gte(
                    "completed_at", current.isoformat()
                ).lt("completed_at", period_end.isoformat()).execute()
                point["academy"]["lessons_completed"] = progress_result.count or 0
            except Exception:
                pass
            
            try:
                tasks_result = supabase.table("agent_tasks").select(
                    "id", count="exact"
                ).eq("tenant_id", tenant_id_str).gte(
                    "created_at", current.isoformat()
                ).lt("created_at", period_end.isoformat()).execute()
                point["autonomy"]["tasks_created"] = tasks_result.count or 0
            except Exception:
                pass
            
            points.append(point)
            current = period_end
    
    return points
