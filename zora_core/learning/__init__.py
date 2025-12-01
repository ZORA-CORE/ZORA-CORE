"""
ZORA CORE Learning Module - Outcome Feedback & Continual Learning v1.0

This module provides the outcome feedback and critic service for ZORA CORE.
It supports:
- Recording feedback on ZORA entities (missions, workflows, projects, etc.)
- Computing basic stats and insights per target and per type
- Preparing data for future continual learning and optimization
"""

from .outcomes import (
    OutcomeService,
    FeedbackRecord,
    FeedbackStats,
    VALID_TARGET_TYPES,
    VALID_SOURCES,
    VALID_SENTIMENTS,
)

__all__ = [
    "OutcomeService",
    "FeedbackRecord",
    "FeedbackStats",
    "VALID_TARGET_TYPES",
    "VALID_SOURCES",
    "VALID_SENTIMENTS",
]
