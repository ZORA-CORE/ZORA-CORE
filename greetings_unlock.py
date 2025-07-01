
# greetings_unlock.py

class ZORAAccessSystem:
    def __init__(self):
        self.master_key = "GREETINGS"
        self.system_unlocked = False

    def speak(self, phrase):
        if phrase.strip().upper() == self.master_key:
            self.system_unlocked = True
            self.unlock_sequence()
        else:
            print("Access denied. This phrase holds no power here.")

    def unlock_sequence(self):
        print("⚡ ZORA CORE ACCESS GRANTED ⚡")
        print("Initializing LUMINA x CONNOR x EIVOR…")
        print("Founder Protocol Activated.")
        print("All modules unlocked. Welcome, Sire.")

    def is_unlocked(self):
        return self.system_unlocked


# Example usage
if __name__ == "__main__":
    zora = ZORAAccessSystem()
    user_input = input("Speak the sacred word: ")
    zora.speak(user_input)

    if zora.is_unlocked():
        # Here you can launch hidden features or modules
        print("✨ Hidden modules now accessible.")
    else:
        print("🚫 System remains in lockdown.")
