import os
import requests

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
headers = {
    "Authorization": f"Bearer {NVIDIA_API_KEY}",
    "Content-Type": "application/json"
}

response = requests.get("https://api.nvidia.com/v1/ai/status", headers=headers)
print(response.json())
