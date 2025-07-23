import google.generativeai as genai
import os

genai.configure(api_key=os.getenv(AIzaSyCqCBbPy9qQ61GzxjkYdimQ4cn6AO1Bo58))

model = genai.GenerativeModel("gemini-pro")

response = model.generate_content("Aktiver Infinity Sync mellem alle ZORA CORE AI'er.")
print(response.text)
