import riva.client

def init_riva():
    auth = riva.client.Auth(uri=os.getenv("RIVA_URI"), token=os.getenv("NVIDIA_API_KEY"))
    asr = riva.client.ASRService(auth)
    return asr.streaming_response("Zora, connect me to the infinite.")
