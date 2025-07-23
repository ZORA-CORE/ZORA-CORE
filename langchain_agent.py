from langchain.chat_models import ChatOpenAI

def get_langchain_agent(api_key):
    return ChatOpenAI(
        model_name="gpt-4-1106-preview",
        temperature=0,
        openai_api_key=api_key
    )
