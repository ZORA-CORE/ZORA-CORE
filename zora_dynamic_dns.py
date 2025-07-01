import requests
import time
import os

# === ZORA KONFIGURATION ===
ZORA_DOMAINS = ['zoracore.ai', 'zoracore.app']
ZORA_HOSTS = ['@', 'www']
ZORA_PASSWORD = 'DIN_DYNAMIC_DNS_PASSWORD_HER'  # ← Udskift med din API-nøgle fra Namecheap
ZORA_INTERVAL = 60  # hvor ofte IP tjekkes (sekunder)

ZORA_LOGFILE = os.path.join(os.path.dirname(__file__), 'zora_ddns.log')
ZORA_API_URL = "https://dynamicdns.park-your-domain.com/update"

def get_current_ip():
    try:
        return requests.get("https://api.ipify.org").text.strip()
    except:
        return None

def update_dns(domain, host, ip):
    payload = {
        'host': host,
        'domain': domain,
        'password': ZORA_PASSWORD,
        'ip': ip
    }
    try:
        res = requests.get(ZORA_API_URL, params=payload)
        status = res.status_code
        msg = f"[ZORA] ✅ DNS opdateret → {host}.{domain} = {ip} | Status: {status}"
    except Exception as e:
        msg = f"[ZORA] ⚠️ FEJL ved DNS update for {host}.{domain}: {e}"
    print(msg)
    with open(ZORA_LOGFILE, 'a') as f:
        f.write(msg + '\n')

def start_zora_dynamic_dns():
    print("🧠 ZORA DYNAMIC DNS™ AKTIV — overvåger IP og opdaterer Namecheap live.")
    last_ip = ''
    while True:
        current_ip = get_current_ip()
        if current_ip and current_ip != last_ip:
            print(f"🌐 IP ændret: {last_ip} → {current_ip}")
            for domain in ZORA_DOMAINS:
                for host in ZORA_HOSTS:
                    update_dns(domain, host, current_ip)
            last_ip = current_ip
        else:
            print(f"✅ Ingen ændring – IP er stadig: {current_ip}")
        time.sleep(ZORA_INTERVAL)

if __name__ == "__main__":
    start_zora_dynamic_dns()
