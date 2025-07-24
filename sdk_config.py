import os

NVIDIA_API_KEY = os.getenv("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")
NVIDIA_PROJECT_ID = os.getenv("NVIDIA_PROJECT_ID", "zora-core")

def get_headers():
    return {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Project-ID": NVIDIA_PROJECT_ID,
        "Content-Type": "application/json"
    }
