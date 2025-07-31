from modules.claude_opus.claude_client import query_claude

def ask_claude_from_zora(prompt: str, role: str = "user", memory=None):
    messages = []

    if memory:
        messages.extend(memory)

    messages.append({"role": role, "content": prompt})

    return query_claude(messages)
