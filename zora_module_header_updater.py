import os
from datetime import datetime

modules_path = "modules"

if not os.path.exists(modules_path):
    print(f"Folder '{modules_path}' not found.")
    exit()

for filename in os.listdir(modules_path):
    filepath = os.path.join(modules_path, filename)
    if not filename.endswith(".py") or not os.path.isfile(filepath):
        continue

    # Add header if not already present
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()

    if "# ZORA MODULE HEADER" not in content:
        header = f"# ZORA MODULE HEADER\n# Filename: {filename}\n# Updated: {datetime.utcnow().isoformat()} UTC\n\n"
        content = header + content
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Header added to {filename}")

    # Rename numeric filenames
    name, ext = os.path.splitext(filename)
    if name.isdigit():
        new_name = f"module_{name}{ext}"
        new_path = os.path.join(modules_path, new_name)
        os.rename(filepath, new_path)
        print(f"Renamed {filename} to {new_name}")
