import requests
from .perplexity_config import PERPLEXITY_API_KEY, BASE_URL

HEADERS = {
    "Authorization": f"Bearer {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}",
    "Content-Type": "application/json"
}

def query_perplexity(prompt):
    payload = {
        "model": "pplx-7b-chat",  # Udskift med faktisk model hvis kendt
        "messages": [{"role": "user", "content": prompt}],
    }

    response = requests.post(
        f"{BASE_URL}/v1/chat/completions", json=payload, headers=HEADERS
    )

    if response.status_code == 200:
        return response.json()
    else:
        return {"error": response.text, "status": response.status_code}
