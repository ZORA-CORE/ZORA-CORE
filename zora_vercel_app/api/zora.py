from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "ZORA CORE API is live — Powered by CONNOR & LUMINA"}

@app.get("/status")
def status():
    return {"status": "OK", "source": "FastAPI on Vercel"}
