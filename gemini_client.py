import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("AIzaSyAjyluKuxHn4wdx5y6ynOtvpaSo-lO3Lew")
genai.configure(api_key=API_KEY)

model = genai.GenerativeModel("gemini-pro")

def send_to_gemini(prompt):
    response = model.generate_content(prompt)
    return response.text
