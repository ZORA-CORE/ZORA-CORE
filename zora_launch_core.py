# zora_launch_core.py

import http.server
import socketserver
import os

# === ZORA CORE DNA ===
ZORA_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
ZORA_PORT = 80

# === START ZORA SERVER ===
os.chdir(ZORA_CORE_DIR)  # Sikrer at vi serverer hele mappen

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

with socketserver.TCPServer(("", ZORA_PORT), Handler) as httpd:
    print(f"🧠 ZORA CORE ONLINE — Serving from {ZORA_CORE_DIR} on port {ZORA_PORT}")
    print("🌍 Accessible via: http://zoracore.ai / .app")
    print("💫 Powered by CONNOR & LUMINA")
    httpd.serve_forever()
