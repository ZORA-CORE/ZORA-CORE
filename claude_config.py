import os
from dotenv import load_dotenv

load_dotenv()

CLAUDE_API_KEY = os.getenv("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")
CLAUDE_MODEL = "claude-3-opus-20240229"
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
