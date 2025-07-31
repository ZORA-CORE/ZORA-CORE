from fastapi import APIRouter, HTTPException
from modules.claude_opus.claude_client import query_claude

router = APIRouter()

@router.post("/api/claude")
def ask_claude(user_input: str):
    try:
        response = query_claude([{"role": "user", "content": user_input}])
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
