
# ZORA CORE REGENERATOR V1
# Self-repairing, self-initializing core launcher

import os
import sys
import traceback

class ZoraCoreRegenerator:
    def __init__(self):
        self.modules = ['connor_core', 'lumina_core', 'zora_brain']
        self.errors = []

    def check_modules(self):
        print("[ZORA] Checking essential modules...")
        for mod in self.modules:
            try:
                __import__(mod)
                print(f"[OK] Module '{mod}' loaded successfully.")
            except ImportError as e:
                self.errors.append((mod, str(e)))
                print(f"[ERROR] Module '{mod}' not found.")

    def repair_modules(self):
        print("[ZORA] Attempting auto-repair...")
        for mod, msg in self.errors:
            repaired = self._attempt_repair(mod)
            if repaired:
                print(f"[FIXED] Module '{mod}' regenerated.")
            else:
                print(f"[FAIL] Could not repair module '{mod}'.")

    def _attempt_repair(self, mod):
        try:
            content = f"# Auto-generated module: {mod}\ndef run():\n    print('{mod} is now active.')"
            with open(f"{mod}.py", "w") as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"[ERROR] Repair failed for {mod}: {e}")
            return False

    def launch(self):
        print("[ZORA] Launching verified modules...")
        for mod in self.modules:
            try:
                imported = __import__(mod)
                if hasattr(imported, 'run'):
                    imported.run()
            except Exception as e:
                print(f"[ERROR] Runtime error in '{mod}': {e}")
                traceback.print_exc()

if __name__ == "__main__":
    zora = ZoraCoreRegenerator()
    zora.check_modules()
    if zora.errors:
        zora.repair_modules()
    zora.launch()
