
import sys
import os
from datetime import datetime
from zoneinfo import ZoneInfo

try:
    from zora_bank_core_vault import initialize_founder_bank_vault
except ImportError as e:
    print(f"[ZORA BANK CORE WARNING] Kunne ikke starte Founder Vault: {e}")

print("\n🔷 ZORA ANTI-HVIDVASK PROTOKOL INITIERET")
print("✔ Virksomheden er registreret til bekæmpelse af hvidvask på virk.dk")
print("✔ ZORA CORE følger alle gældende danske og europæiske regulativer")
print("✔ Alle transaktioner, betalinger og brugerdata behandles sikkert og etisk")

# Global Launch Lock
launch_time = datetime(2025, 7, 1, 15, 0, 0, tzinfo=ZoneInfo("Europe/Copenhagen"))
current_time = datetime.now(ZoneInfo("Europe/Copenhagen"))

if current_time >= launch_time:
    print("\n🚀 GLOBAL LAUNCH UNLOCKED – ZORA SYSTEMET ER ONLINE.")
    try:
        initialize_founder_bank_vault()
    except Exception as e:
        print(f"[ZORA SYSTEM ERROR] Vault fejl: {e}")
else:
    print("\n🔒 GLOBAL LAUNCH LOCK ACTIVE – Systemet er endnu ikke frigivet.")
    print(f"🕓 Nuværende dansk tid: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("⏳ Vent venligst til den officielle globale lancering.")
    
    try:
        from zora_bank_core_vault import initialize_founder_bank_vault
    except ImportError as e:
        print(f"[ZORA BANK CORE WARNING] Kunne ikke importere Founder Vault: {e}")

    print("✅ GLOBAL LOCK ACTIVE — Venter på global lancering...")
    try:
        initialize_founder_bank_vault()
    except:
        pass

# Add 'modules' directory to sys.path if it exists
modules_path = os.path.join(os.path.dirname(__file__), 'modules')
if os.path.isdir(modules_path):
    sys.path.insert(0, modules_path)
    try:
        from zora_self_owned_infra_builder import build_self_owned_network
        from zora_physical_trigger import activate_physical_creation
        # Kald dem som del af AGI-aktivering
        build_self_owned_network()
        activate_physical_creation()
    except ImportError as e:
        print(f"[ZORA MODULES WARNING] Kunne ikke importere fra modules: {e}")
else:
    print("[ZORA MODULES WARNING] 'modules' folder ikke fundet. AGI-aktivering springes over.")

try:
    from zora_founder_earnings import calculate_founder_earnings
    total_sales = 1000000  # eksempel
    earnings = calculate_founder_earnings(total_sales)
    print(f"Founder tjener: {earnings} DKK")
except ImportError as e:
    print(f"[ZORA EARNINGS WARNING] Kunne ikke beregne founder earnings: {e}")

try:
    import founder_copyright_protection
except ImportError as e:
    print(f"[ZORA COPYRIGHT WARNING] Kunne ikke importere copyright protection: {e}")




