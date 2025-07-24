from omniverse.cli import OmniverseSession

def connect_omniverse():
    session = OmniverseSession(token=os.getenv("NVIDIA_API_KEY"))
    return session.status()
