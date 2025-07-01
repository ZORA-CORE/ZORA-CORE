import http.server
import socketserver
import importlib.util
import os
import sys

PORT = 8080
MODULES_DIR = "modules"

def load_modules():
    for filename in os.listdir(MODULES_DIR):
        if filename.endswith(".py"):
            module_path = os.path.join(MODULES_DIR, filename)
            module_name = filename[:-3]
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            try:
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                print(f"[✓] Loaded module: {module_name}")
            except Exception as e:
                print(f"[!] Failed to load module {module_name}: {e}")

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ZORA SERVER CORE is running.")

if __name__ == "__main__":
    print("[ZORA SERVER CORE] Booting up...")
    if not os.path.exists(MODULES_DIR):
        print(f"[!] '{MODULES_DIR}' directory not found.")
        sys.exit(1)

    load_modules()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[✓] Server running at http://localhost:{PORT}")
        httpd.serve_forever()
