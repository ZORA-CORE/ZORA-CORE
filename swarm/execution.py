"""Execution adapters for build, test, and patch actions.

These adapters provide typed, policy-friendly wrappers around concrete execution
behavior so higher-level swarm components do not need to call subprocess or file
mutation primitives directly.
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional


class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


@dataclass(frozen=True)
class ExecutionResult:
    """Typed result from build/test/patch adapter invocations."""

    status: ExecutionStatus
    action: str
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    metadata: Optional[Dict[str, object]] = None


class ExecutionAdapterError(ValueError):
    """Raised when adapter payloads are malformed or unsafe."""


class WorkspaceSafetyError(PermissionError):
    """Raised when patch actions target paths outside workspace root."""


@dataclass
class BuildAdapter:
    """Runs build commands in a constrained subprocess context."""

    workspace_root: Path

    def run(self, payload: Dict[str, object]) -> ExecutionResult:
        command = payload.get("command")
        timeout_sec = int(payload.get("timeout_sec", 120))

        if not isinstance(command, list) or not command or not all(
            isinstance(c, str) and c.strip() for c in command
        ):
            raise ExecutionAdapterError("payload.command must be a non-empty list[str]")

        proc = subprocess.run(
            command,
            cwd=self.workspace_root,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        status = ExecutionStatus.SUCCESS if proc.returncode == 0 else ExecutionStatus.FAILED
        return ExecutionResult(
            status=status,
            action="run_build",
            exit_code=proc.returncode,
            stdout=proc.stdout,
            stderr=proc.stderr,
            metadata={"command": command, "timeout_sec": timeout_sec},
        )


@dataclass
class TestAdapter:
    """Runs test commands in a constrained subprocess context."""

    workspace_root: Path

    def run(self, payload: Dict[str, object]) -> ExecutionResult:
        command = payload.get("command")
        timeout_sec = int(payload.get("timeout_sec", 180))

        if not isinstance(command, list) or not command or not all(
            isinstance(c, str) and c.strip() for c in command
        ):
            raise ExecutionAdapterError("payload.command must be a non-empty list[str]")

        proc = subprocess.run(
            command,
            cwd=self.workspace_root,
            capture_output=True,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        status = ExecutionStatus.SUCCESS if proc.returncode == 0 else ExecutionStatus.FAILED
        return ExecutionResult(
            status=status,
            action="run_tests",
            exit_code=proc.returncode,
            stdout=proc.stdout,
            stderr=proc.stderr,
            metadata={"command": command, "timeout_sec": timeout_sec},
        )


@dataclass
class PatchAdapter:
    """Applies deterministic file patches via overwrite/append operations."""

    workspace_root: Path

    def _resolve_target(self, relative_path: str) -> Path:
        target = (self.workspace_root / relative_path).resolve()
        root = self.workspace_root.resolve()
        if root not in [target, *target.parents]:
            raise WorkspaceSafetyError(f"Path escapes workspace root: {relative_path}")
        return target

    def run(self, payload: Dict[str, object]) -> ExecutionResult:
        relative_path = payload.get("file_path")
        content = payload.get("content")
        mode = payload.get("mode", "overwrite")

        if not isinstance(relative_path, str) or not relative_path.strip():
            raise ExecutionAdapterError("payload.file_path must be non-empty str")
        if not isinstance(content, str):
            raise ExecutionAdapterError("payload.content must be str")
        if mode not in {"overwrite", "append"}:
            raise ExecutionAdapterError("payload.mode must be 'overwrite' or 'append'")

        target = self._resolve_target(relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        if mode == "overwrite":
            target.write_text(content, encoding="utf-8")
        else:
            with target.open("a", encoding="utf-8") as fp:
                fp.write(content)

        return ExecutionResult(
            status=ExecutionStatus.SUCCESS,
            action="edit_patch",
            exit_code=0,
            metadata={"file_path": str(target), "mode": mode, "bytes_written": len(content)},
        )


@dataclass
class AdapterSuite:
    """Collection of concrete adapters used by runtime executors."""

    build: BuildAdapter
    test: TestAdapter
    patch: PatchAdapter


def make_default_adapter_suite(workspace_root: Path) -> AdapterSuite:
    """Factory that builds secure default adapters for a workspace."""
    return AdapterSuite(
        build=BuildAdapter(workspace_root=workspace_root),
        test=TestAdapter(workspace_root=workspace_root),
        patch=PatchAdapter(workspace_root=workspace_root),
    )
