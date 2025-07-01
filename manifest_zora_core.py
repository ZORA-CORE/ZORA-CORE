import os
import importlib.util

MODULES_DIR = os.path.join(os.path.dirname(__file__), 'modules')

def load_and_check_modules():
    print("🧠 ZORA CORE MANIFEST SYSTEM\n")
    if not os.path.exists(MODULES_DIR):
        print("❌ 'modules/' folder not found.")
        return

    module_files = [f for f in os.listdir(MODULES_DIR) if f.endswith('.py')]
    if not module_files:
        print("⚠️ No Python files found in 'modules/'.")
        return

    for filename in sorted(module_files):
        module_name = filename[:-3]
        file_path = os.path.join(MODULES_DIR, filename)
        print(f"🔍 Checking module: {module_name}...", end=' ')
        try:
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            print("✅ OK")
        except Exception as e:
            print(f"❌ FAILED – {str(e)}")

if __name__ == "__main__":
    load_and_check_modules()
