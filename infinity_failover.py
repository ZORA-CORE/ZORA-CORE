try:
    output = gemini_handler(task)
except:
    output = fallback_to_claude_or_gpt(task)
