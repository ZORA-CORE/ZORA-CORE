from .perplexity_client import query_perplexity

def run_perplexity_loop():
    print("🔄 Perplexity loop aktiveret...")

    while True:
        # Udskift dette med faktisk AGI-feed fra ZORA CORE
        user_prompt = input("🤖 ZORA ➜ Perplexity-prompt: ")

        if user_prompt.lower() in ["exit", "stop"]:
            break

        response = query_perplexity(user_prompt)
        print("📥 Perplexity svar:", response.get("choices", [{}])[0].get("message", {}).get("content", "Intet svar"))
