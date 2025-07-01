
import os
import socket
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "ZORA CLOUD is now running directly from your machine."

if __name__ == '__main__':
    host_ip = socket.gethostbyname(socket.gethostname())
    print(f"ZORA CLOUD IP (use this in your DNS settings): {host_ip}")
    app.run(host='0.0.0.0', port=80)
