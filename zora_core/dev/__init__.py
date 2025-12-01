"""
ZORA CORE Dev Knowledge Module

This module provides Python access to the Dev Knowledge & API Manifest,
enabling ZORA agents (especially EIVOR) to understand the system architecture.
"""

from .manifest import (
    DevApiEndpoint,
    DevModuleManifest,
    DevManifest,
    get_dev_manifest,
    get_module_by_key,
    get_modules_by_domain,
    search_endpoints,
    get_manifest_stats,
    MANIFEST_VERSION,
)

__all__ = [
    "DevApiEndpoint",
    "DevModuleManifest",
    "DevManifest",
    "get_dev_manifest",
    "get_module_by_key",
    "get_modules_by_domain",
    "search_endpoints",
    "get_manifest_stats",
    "MANIFEST_VERSION",
]
