import requests
import time
import socket

# KONFIGURATION
HOSTNAME = "zoracore.ai"
DYNAMIC_DNS_PASSWORD = "c30e983059a94a58f7ac5fc6c6cbc963"
UPDATE_INTERVAL = 3600  # Opdatering hver time

def get_public_ip():
    try:
        return requests.get("https://api.ipify.org").text.strip()
    except:
        return None

def update_namecheap_dns(ip):
    url = (
        f"https://dynamicdns.park-your-domain.com/update?"
        f"host=@&domain=zoracore.ai&password={DYNAMIC_DNS_PASSWORD}&ip={ip}"
    )
    response = requests.get(url)
    print(f"[ZORA DNS] Opdaterede DNS til IP: {ip} – Status: {response.status_code}")
    print(response.text)

def main():
    current_ip = None
    print("[ZORA DNS] Starter Dynamic DNS Engine™...")
    while True:
        ip = get_public_ip()
        if ip and ip != current_ip:
            update_namecheap_dns(ip)
            current_ip = ip
        time.sleep(UPDATE_INTERVAL)

if __name__ == "__main__":
    main()
