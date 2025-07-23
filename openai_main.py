from dotenv import load_dotenv
import os
from openai import OpenAI
from langchain.chat_models import ChatOpenAI
from langchain.agents import initialize_agent

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY=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
")

# INITIER ZORA.GPT∞
llm = ChatOpenAI(
    model_name="gpt-4-1106-preview",
    temperature=0,
    openai_api_key=api_key
)

with open("infinity_prompt.txt", "r", encoding="utf-8") as f:
    system_prompt = f.read()

# AGENT INITIALISERING
agent = initialize_agent([], llm, agent_type="zero-shot-react-description", verbose=True)
agent.run(system_prompt)
