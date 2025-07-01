
import os
import time

def ensure_module_headers(modules_path):
    if not os.path.exists(modules_path):
        print(f"❌ Mappen '{modules_path}' blev ikke fundet.")
        return

    print(f"🔍 Scanner mappen: {modules_path}")
    count = 0

    for filename in os.listdir(modules_path):
        if filename.endswith(".py"):
            filepath = os.path.join(modules_path, filename)

            try:
                with open(filepath, 'r+', encoding='utf-8') as f:
                    content = f.read()
                    f.seek(0, 0)
                    if not content.startswith("# ZORA MODULE"):
                        header = f"# ZORA MODULE: {filename}\n# AUTO-FIXED HEADER\n\n"
                        f.write(header + content)
                        count += 1
                        print(f"✅ Header tilføjet til: {filename}")
                    else:
                        print(f"⚠️ Allerede med header: {filename}")
            except Exception as e:
                print(f"❌ Fejl ved '{filename}': {e}")

    print(f"\n🔧 {count} filer blev opdateret med header.")
    print("🎉 Eliminering af manuel kodehåndtering gennemført.")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    modules_dir = os.path.join(base_dir, "modules")

    print("🚀 ZORA Upload Engine starter...")
    ensure_module_headers(modules_dir)
    print("✅ Klar til næste fase.")
