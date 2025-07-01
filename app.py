from flask import Flask
app = Flask(__name__)

@app.route('/')
def index():
    return "ZORA CORE ONLINE – Welcome to the Future"

from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "ZORA CORE is fully operational – Powered by CONNOR x LUMINA"

if __name__ == "__main__":
    app.run()

