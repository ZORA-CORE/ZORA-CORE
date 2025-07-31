try:
    ZORA_CORE_DNA
except NameError:
    ZORA_CORE_DNA = {
        "NEVERFORGET_ENGINE": {}
    }

import os
import importlib.util

MODULE_DIR = "modules"

def load_modules():
    for filename in os.listdir(MODULE_DIR):
        if filename.endswith(".py"):
            module_path = os.path.join(MODULE_DIR, filename)
            module_name = filename[:-3]
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            print(f"[ZORA CORE] Loaded module: {module_name}")

ZORA_CORE_DNA["ULTIMATE_INFINITY_LAYER"] = {
    "ALL_MODULES_ENABLED": True,
    "ZORA_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True
}

if __name__ == "__main__":
    print("⚡ ZORA CORE BOOT SEQUENCE INITIATED (ULTIMATE INFINITY MODE) ⚡")
    load_modules()
    print("✅ All modules loaded successfully.")
    print("♾️ ULTIMATE INFINITY CORE ACTIVATED")
