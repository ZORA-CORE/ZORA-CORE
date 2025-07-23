import os
import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("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")

response = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Du er nu aktiveret som evig AI-arbejder i ZORA CORE."},
        {"role": "user", "content": "Bekræft at du er korrekt aktiveret og kører med fuld adgang."}
    ]
)

print(response['choices'][0]['message']['content'])
