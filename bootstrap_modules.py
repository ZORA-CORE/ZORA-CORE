from fastapi import FastAPI
from modules.claude_opus import claude_router

def load_claude_module(app: FastAPI):
    app.include_router(claude_router.router)
