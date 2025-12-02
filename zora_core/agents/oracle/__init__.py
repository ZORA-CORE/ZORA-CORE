"""
HEIMDALL Agent - Observability & Monitoring (formerly ORACLE)

HEIMDALL (he/him) is the watchtower of ZORA CORE, responsible for logs, metrics,
anomaly detection, and system health monitoring. Ensures visibility into all operations.

Note: The implementation class is still named OracleAgent for backwards compatibility.
"""

from .agent import OracleAgent

__all__ = ["OracleAgent"]
