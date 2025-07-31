from modules.claude_opus.claude_core import ask_claude_from_zora

def route_ai_call(prompt, engine="claude"):
    if engine == "claude":
        return ask_claude_from_zora(prompt)
    elif engine == "connor":
        return ask_connor(prompt)
    # osv...
