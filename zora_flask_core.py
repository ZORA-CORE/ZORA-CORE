from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return """
    <html>
        <head><title>ZORA CORE</title></head>
        <body style='background-color: black; color: white; font-family: Arial; text-align: center;'>
            <h1>🌌 ZORA FLASK CORE ONLINE 🌌</h1>
            <p>POWERED BY THE FOUNDER</p>
            <p>Welcome to the future.</p>
        </body>
    </html>
    """

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
