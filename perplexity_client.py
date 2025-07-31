# perplexity_client.py
import requests
from perplexity_config import PERPLEXITY_API_URL, HEADERS

def query_perplexity(prompt):
    payload = {
        "query": prompt,
        "model": "pplx-70b-chat",  # eller andet afhængigt af tilgængelige modeller
        "stream": False
    }
    response = requests.post(PERPLEXITY_API_URL, headers=HEADERS, json=payload)
    return response.json()
