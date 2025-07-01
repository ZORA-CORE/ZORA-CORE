
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return '🌌 ZORA CLOUD IS LIVE – Powered by CONNOR & LUMINA'

if __name__ == '__main__':
    app.run()
