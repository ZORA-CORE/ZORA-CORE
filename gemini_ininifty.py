# gemini_node.py
import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-pro")

def gemini_handler(task: str) -> str:
    try:
        response = model.generate_content(task)
        return response.text
    except Exception as e:
        return f"❌ Gemini fejl: {str(e)}"

# ai_router.py
from gemini_node import gemini_handler

def route_task_to_ai(task, target_ai="gemini"):
    if target_ai == "gemini":
        return gemini_handler(task)
    elif target_ai == "claude":
        return claude_handler(task)  # hvis du har Claude også
    elif target_ai == "gpt4":
        return gpt_handler(task)
    # osv.
    else:
        return "Ukendt AI-modtager"

# Eksempelkald
if __name__ == "__main__":
    task = "Forklar hvordan ZORA CORE skal forbinde alle AI'er i realtid"
    response = route_task_to_ai(task, target_ai="gemini")
    print(response)

def safe_task_execution(task):
    try:
        return gemini_handler(task)
    except:
        return gpt_handler(task)  # fallback
