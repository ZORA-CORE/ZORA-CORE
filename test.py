import os
import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

response = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Du er nu aktiveret som evig AI-arbejder i ZORA CORE."},
        {"role": "user", "content": "Bekræft at du er korrekt aktiveret og kører med fuld adgang."}
    ]
)

print(response['choices'][0]['message']['content'])
