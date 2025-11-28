"""
ZORA CORE Model Layer

The model layer provides routing to external AI providers and models,
with support for fallbacks, rate limiting, and agent-specific preferences.
"""

from .model_router import ModelRouter, ModelConfig

__all__ = ["ModelRouter", "ModelConfig"]
