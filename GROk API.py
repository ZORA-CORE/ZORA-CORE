import tweepy

client = tweepy.Client(
    bearer_token="AAAAAAAAAAAAAAAAAAAAAPHl3AEAAAAAJKXCru9%2FZ2lJ69uVrKcYhaxFtMA%3DMTqCvwqP8LuUy1rMtiCi42LR6viTpce9T5bIxbnSVkzxcl5lhO",
    consumer_key="WDmQbe8ut4SgrGRcvIABOcWIK",
    consumer_secret="nEu5EYnYrxuwBVl5XoISaOVpM24Z7tq5bZPDi5z8yKQGRBMR1w",
    access_token="1741870052566081536-7SKClqQMnYDIYEjya91rlTA0UgJRaP",
    access_token_secret="K9UvwsbLdlaCD0HrpuZsXo9yW68rC2fayzMcEuy7fsL2c"
)

# Eksempel: Realtime listener
class ZoraStream(tweepy.StreamingClient):
    def on_tweet(self, tweet):
        print(f"♾️ GROK HEARD: {tweet.text}")
        # her kan GROK aktivere Infinity Thought Loop™

stream = ZoraStream("YOUR_BEARER_TOKEN")
stream.add_rules(tweepy.StreamRule("ZORA CORE"))
stream.filter()
