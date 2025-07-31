import requests
from modules.claude_opus.claude_config import CLAUDE_API_KEY, CLAUDE_API_URL, CLAUDE_MODEL

def query_claude(messages, system_prompt=None):
    headers = {
        "x-api-key": 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,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }

    data = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "messages": messages,
    }

    if system_prompt:
        data["system"] = system_prompt

    response = requests.post(CLAUDE_API_URL, headers=headers, json=data)
    response.raise_for_status()
    return response.json()["content"]
