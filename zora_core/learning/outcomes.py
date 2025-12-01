"""
ZORA CORE Outcome Feedback & Continual Learning v1.0

This module provides the outcome/critic service for ZORA CORE.
It supports:
- Recording feedback on ZORA entities (missions, workflows, projects, etc.)
- Fetching feedback for specific targets
- Computing basic stats and insights per target and per type
- Preparing data for future continual learning and optimization
"""

import os
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from collections import Counter
from supabase import create_client, Client

logger = logging.getLogger(__name__)

VALID_TARGET_TYPES = [
    "climate_mission",
    "workflow_run",
    "zora_shop_project",
    "foundation_project",
    "goes_green_profile",
    "goes_green_action",
    "academy_learning_path",
    "academy_lesson",
]

VALID_SOURCES = ["user", "agent", "system", "admin"]

VALID_SENTIMENTS = ["very_positive", "positive", "neutral", "negative", "very_negative"]


@dataclass
class FeedbackRecord:
    id: str
    tenant_id: str
    user_id: Optional[str]
    source: str
    target_type: str
    target_id: str
    rating: Optional[int]
    sentiment: Optional[str]
    tags: Optional[List[str]]
    comment: Optional[str]
    context: Dict[str, Any]
    created_at: str


@dataclass
class FeedbackStats:
    target_type: str
    target_id: Optional[str]
    count: int
    avg_rating: Optional[float]
    sentiment_counts: Dict[str, int]
    top_tags: List[Dict[str, Any]]
    last_feedback_at: Optional[str]
    best_entities: Optional[List[Dict[str, Any]]] = None
    worst_entities: Optional[List[Dict[str, Any]]] = None


class OutcomeService:
    """Service for managing outcome feedback and computing insights."""

    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        self.supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
        self.supabase_key = supabase_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        if self._client is None:
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client

    def record_feedback(
        self,
        tenant_id: str,
        target_type: str,
        target_id: str,
        user_id: Optional[str] = None,
        source: str = "user",
        rating: Optional[int] = None,
        sentiment: Optional[str] = None,
        tags: Optional[List[str]] = None,
        comment: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> FeedbackRecord:
        """
        Record feedback for a ZORA entity.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity (e.g., 'climate_mission', 'workflow_run')
            target_id: ID of the target entity
            user_id: Optional user ID (None for agent/system feedback)
            source: Feedback source ('user', 'agent', 'system', 'admin')
            rating: Optional rating 1-5
            sentiment: Optional sentiment value
            tags: Optional list of tags
            comment: Optional comment text
            context: Optional context dict
            
        Returns:
            FeedbackRecord with the created feedback
            
        Raises:
            ValueError: If validation fails
        """
        if target_type not in VALID_TARGET_TYPES:
            raise ValueError(f"Invalid target_type: {target_type}. Must be one of {VALID_TARGET_TYPES}")
        
        if source not in VALID_SOURCES:
            raise ValueError(f"Invalid source: {source}. Must be one of {VALID_SOURCES}")
        
        if rating is not None and (rating < 1 or rating > 5):
            raise ValueError(f"Invalid rating: {rating}. Must be between 1 and 5")
        
        if sentiment is not None and sentiment not in VALID_SENTIMENTS:
            raise ValueError(f"Invalid sentiment: {sentiment}. Must be one of {VALID_SENTIMENTS}")

        data = {
            "tenant_id": tenant_id,
            "target_type": target_type,
            "target_id": target_id,
            "source": source,
            "context": context or {},
        }
        
        if user_id:
            data["user_id"] = user_id
        if rating is not None:
            data["rating"] = rating
        if sentiment:
            data["sentiment"] = sentiment
        if tags:
            data["tags"] = tags
        if comment:
            data["comment"] = comment

        result = self.client.table("outcome_feedback").insert(data).execute()
        
        if not result.data:
            raise RuntimeError("Failed to insert feedback")
        
        row = result.data[0]
        
        self._create_journal_entry(tenant_id, target_type, target_id, rating, source)
        
        return FeedbackRecord(
            id=row["id"],
            tenant_id=row["tenant_id"],
            user_id=row.get("user_id"),
            source=row["source"],
            target_type=row["target_type"],
            target_id=row["target_id"],
            rating=row.get("rating"),
            sentiment=row.get("sentiment"),
            tags=row.get("tags"),
            comment=row.get("comment"),
            context=row.get("context", {}),
            created_at=row["created_at"],
        )

    def _create_journal_entry(
        self,
        tenant_id: str,
        target_type: str,
        target_id: str,
        rating: Optional[int],
        source: str,
    ) -> None:
        """Create a journal entry for feedback recording."""
        try:
            self.client.table("journal_entries").insert({
                "tenant_id": tenant_id,
                "category": "learning",
                "event_type": "outcome_feedback_recorded",
                "title": f"Feedback recorded for {target_type}",
                "content": f"New {source} feedback recorded for {target_type} ({target_id})",
                "metadata": {
                    "target_type": target_type,
                    "target_id": target_id,
                    "rating": rating,
                    "source": source,
                },
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to create journal entry: {e}")

    def get_feedback_for_target(
        self,
        tenant_id: str,
        target_type: str,
        target_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get feedback entries for a specific target.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity
            target_id: ID of the target entity
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            Dict with 'data' (list of feedback) and 'pagination' info
        """
        result = (
            self.client.table("outcome_feedback")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        count_result = (
            self.client.table("outcome_feedback")
            .select("id", count="exact")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .execute()
        )
        
        total = count_result.count if count_result.count else 0
        
        feedback_list = [
            FeedbackRecord(
                id=row["id"],
                tenant_id=row["tenant_id"],
                user_id=row.get("user_id"),
                source=row["source"],
                target_type=row["target_type"],
                target_id=row["target_id"],
                rating=row.get("rating"),
                sentiment=row.get("sentiment"),
                tags=row.get("tags"),
                comment=row.get("comment"),
                context=row.get("context", {}),
                created_at=row["created_at"],
            )
            for row in result.data
        ]
        
        return {
            "data": [asdict(f) for f in feedback_list],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + len(feedback_list) < total,
            },
        }

    def compute_basic_stats_for_target(
        self,
        tenant_id: str,
        target_type: str,
        target_id: str,
    ) -> FeedbackStats:
        """
        Compute basic stats for a specific target.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity
            target_id: ID of the target entity
            
        Returns:
            FeedbackStats with aggregated metrics
        """
        result = (
            self.client.table("outcome_feedback")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .execute()
        )
        
        rows = result.data or []
        
        if not rows:
            return FeedbackStats(
                target_type=target_type,
                target_id=target_id,
                count=0,
                avg_rating=None,
                sentiment_counts={},
                top_tags=[],
                last_feedback_at=None,
            )
        
        ratings = [r["rating"] for r in rows if r.get("rating") is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        
        sentiment_counts: Dict[str, int] = Counter()
        for row in rows:
            if row.get("sentiment"):
                sentiment_counts[row["sentiment"]] += 1
        
        tag_counts: Dict[str, int] = Counter()
        for row in rows:
            if row.get("tags"):
                for tag in row["tags"]:
                    tag_counts[tag] += 1
        
        top_tags = [
            {"tag": tag, "count": count}
            for tag, count in tag_counts.most_common(10)
        ]
        
        last_feedback_at = max(row["created_at"] for row in rows)
        
        return FeedbackStats(
            target_type=target_type,
            target_id=target_id,
            count=len(rows),
            avg_rating=round(avg_rating, 2) if avg_rating else None,
            sentiment_counts=dict(sentiment_counts),
            top_tags=top_tags,
            last_feedback_at=last_feedback_at,
        )

    def compute_basic_stats_for_type(
        self,
        tenant_id: str,
        target_type: str,
        include_entities: bool = True,
    ) -> FeedbackStats:
        """
        Compute aggregated stats for all entities of a given type.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity
            include_entities: Whether to include best/worst entities
            
        Returns:
            FeedbackStats with aggregated metrics across all entities
        """
        result = (
            self.client.table("outcome_feedback")
            .select("*")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .execute()
        )
        
        rows = result.data or []
        
        if not rows:
            return FeedbackStats(
                target_type=target_type,
                target_id=None,
                count=0,
                avg_rating=None,
                sentiment_counts={},
                top_tags=[],
                last_feedback_at=None,
                best_entities=[],
                worst_entities=[],
            )
        
        ratings = [r["rating"] for r in rows if r.get("rating") is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        
        sentiment_counts: Dict[str, int] = Counter()
        for row in rows:
            if row.get("sentiment"):
                sentiment_counts[row["sentiment"]] += 1
        
        tag_counts: Dict[str, int] = Counter()
        for row in rows:
            if row.get("tags"):
                for tag in row["tags"]:
                    tag_counts[tag] += 1
        
        top_tags = [
            {"tag": tag, "count": count}
            for tag, count in tag_counts.most_common(10)
        ]
        
        last_feedback_at = max(row["created_at"] for row in rows)
        
        best_entities: List[Dict[str, Any]] = []
        worst_entities: List[Dict[str, Any]] = []
        
        if include_entities:
            entity_stats: Dict[str, Dict[str, Any]] = {}
            for row in rows:
                tid = row["target_id"]
                if tid not in entity_stats:
                    entity_stats[tid] = {"ratings": [], "count": 0}
                entity_stats[tid]["count"] += 1
                if row.get("rating") is not None:
                    entity_stats[tid]["ratings"].append(row["rating"])
            
            entity_avgs = []
            for tid, stats in entity_stats.items():
                if stats["ratings"]:
                    avg = sum(stats["ratings"]) / len(stats["ratings"])
                    entity_avgs.append({
                        "target_id": tid,
                        "avg_rating": round(avg, 2),
                        "feedback_count": stats["count"],
                    })
            
            entity_avgs.sort(key=lambda x: x["avg_rating"], reverse=True)
            best_entities = entity_avgs[:5]
            
            entity_avgs.sort(key=lambda x: x["avg_rating"])
            worst_entities = entity_avgs[:5]
        
        return FeedbackStats(
            target_type=target_type,
            target_id=None,
            count=len(rows),
            avg_rating=round(avg_rating, 2) if avg_rating else None,
            sentiment_counts=dict(sentiment_counts),
            top_tags=top_tags,
            last_feedback_at=last_feedback_at,
            best_entities=best_entities,
            worst_entities=worst_entities,
        )

    def update_insight_for_target(
        self,
        tenant_id: str,
        target_type: str,
        target_id: str,
    ) -> Dict[str, Any]:
        """
        Update or create insight record for a specific target.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity
            target_id: ID of the target entity
            
        Returns:
            The updated insight record
        """
        stats = self.compute_basic_stats_for_target(tenant_id, target_type, target_id)
        
        stats_dict = {
            "count": stats.count,
            "avg_rating": stats.avg_rating,
            "sentiment_counts": stats.sentiment_counts,
            "tag_counts": {t["tag"]: t["count"] for t in stats.top_tags},
            "last_feedback_at": stats.last_feedback_at,
        }
        
        existing = (
            self.client.table("outcome_insights")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .eq("summary_type", "basic_stats")
            .execute()
        )
        
        if existing.data:
            result = (
                self.client.table("outcome_insights")
                .update({
                    "stats": stats_dict,
                    "updated_at": datetime.utcnow().isoformat(),
                })
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            result = (
                self.client.table("outcome_insights")
                .insert({
                    "tenant_id": tenant_id,
                    "target_type": target_type,
                    "target_id": target_id,
                    "summary_type": "basic_stats",
                    "stats": stats_dict,
                })
                .execute()
            )
        
        return result.data[0] if result.data else {}

    def update_insight_for_type(
        self,
        tenant_id: str,
        target_type: str,
    ) -> Dict[str, Any]:
        """
        Update or create aggregated insight record for a target type.
        
        Args:
            tenant_id: The tenant ID
            target_type: Type of entity
            
        Returns:
            The updated insight record
        """
        stats = self.compute_basic_stats_for_type(tenant_id, target_type)
        
        stats_dict = {
            "count": stats.count,
            "avg_rating": stats.avg_rating,
            "sentiment_counts": stats.sentiment_counts,
            "tag_counts": {t["tag"]: t["count"] for t in stats.top_tags},
            "last_feedback_at": stats.last_feedback_at,
            "best_entities": stats.best_entities,
            "worst_entities": stats.worst_entities,
        }
        
        existing = (
            self.client.table("outcome_insights")
            .select("id")
            .eq("tenant_id", tenant_id)
            .eq("target_type", target_type)
            .is_("target_id", "null")
            .eq("summary_type", "basic_stats")
            .execute()
        )
        
        if existing.data:
            result = (
                self.client.table("outcome_insights")
                .update({
                    "stats": stats_dict,
                    "updated_at": datetime.utcnow().isoformat(),
                })
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            result = (
                self.client.table("outcome_insights")
                .insert({
                    "tenant_id": tenant_id,
                    "target_type": target_type,
                    "target_id": None,
                    "summary_type": "basic_stats",
                    "stats": stats_dict,
                })
                .execute()
            )
        
        return result.data[0] if result.data else {}

    def refresh_all_insights_for_tenant(
        self,
        tenant_id: str,
    ) -> Dict[str, int]:
        """
        Refresh all insights for a tenant.
        
        Args:
            tenant_id: The tenant ID
            
        Returns:
            Dict with counts of updated insights
        """
        updated_targets = 0
        updated_types = 0
        
        for target_type in VALID_TARGET_TYPES:
            result = (
                self.client.table("outcome_feedback")
                .select("target_id")
                .eq("tenant_id", tenant_id)
                .eq("target_type", target_type)
                .execute()
            )
            
            target_ids = set(row["target_id"] for row in result.data) if result.data else set()
            
            for target_id in target_ids:
                self.update_insight_for_target(tenant_id, target_type, target_id)
                updated_targets += 1
            
            if target_ids:
                self.update_insight_for_type(tenant_id, target_type)
                updated_types += 1
        
        return {
            "updated_targets": updated_targets,
            "updated_types": updated_types,
        }
