import tempfile
import unittest
from pathlib import Path

from swarm.execution import (
    ExecutionAdapterError,
    ExecutionStatus,
    PatchAdapter,
    WorkspaceSafetyError,
    make_default_adapter_suite,
)


class ExecutionAdaptersTests(unittest.TestCase):
    def test_build_adapter_runs_command(self) -> None:
        suite = make_default_adapter_suite(Path.cwd())
        result = suite.build.run({"command": ["python", "-c", "print('ok')"]})

        self.assertEqual(result.status, ExecutionStatus.SUCCESS)
        self.assertEqual(result.exit_code, 0)
        self.assertIn("ok", result.stdout)

    def test_test_adapter_runs_command(self) -> None:
        suite = make_default_adapter_suite(Path.cwd())
        result = suite.test.run({"command": ["python", "-c", "print('tests')"]})

        self.assertEqual(result.status, ExecutionStatus.SUCCESS)
        self.assertEqual(result.exit_code, 0)
        self.assertIn("tests", result.stdout)

    def test_patch_adapter_overwrite_and_append(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            patch = PatchAdapter(workspace_root=Path(tmpdir))
            patch.run(
                {
                    "file_path": "nested/demo.txt",
                    "content": "hello",
                    "mode": "overwrite",
                }
            )
            patch.run(
                {
                    "file_path": "nested/demo.txt",
                    "content": " world",
                    "mode": "append",
                }
            )

            text = Path(tmpdir, "nested/demo.txt").read_text(encoding="utf-8")
            self.assertEqual(text, "hello world")

    def test_patch_adapter_blocks_path_escape(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            patch = PatchAdapter(workspace_root=Path(tmpdir))
            with self.assertRaises(WorkspaceSafetyError):
                patch.run(
                    {
                        "file_path": "../escape.txt",
                        "content": "x",
                        "mode": "overwrite",
                    }
                )

    def test_build_adapter_rejects_bad_payload(self) -> None:
        suite = make_default_adapter_suite(Path.cwd())
        with self.assertRaises(ExecutionAdapterError):
            suite.build.run({"command": "python -V"})


if __name__ == "__main__":
    unittest.main()
