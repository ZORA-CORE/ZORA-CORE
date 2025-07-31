import requests
import time
import socket
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zora_dns_updater.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# KONFIGURATION - Enhanced for multiple domains
DOMAINS_CONFIG = {
    "zoracore.ai": {
        "registrar": "namecheap",
        "password": os.getenv('ZORACORE_DNS_PASSWORD', ''),
        "ultimate_protection": True,
        "auto_renewal": True
    }
}

AUTOMATED_DOMAINS = []
UPDATE_INTERVAL = 3600  # Opdatering hver time

def get_public_ip():
    try:
        return requests.get("https://api.ipify.org").text.strip()
    except:
        return None

def update_namecheap_dns(domain_config: Dict, ip: str):
    """Update Namecheap DNS for a specific domain"""
    domain = domain_config.get("domain", "zoracore.ai")
    password = domain_config.get("password", DOMAINS_CONFIG["zoracore.ai"]["password"])
    
    url = (
        f"https://dynamicdns.park-your-domain.com/update?"
        f"host=@&domain={domain}&password={password}&ip={ip}"
    )
    
    try:
        response = requests.get(url, timeout=30)
        logger.info(f"[ZORA DNS] Updated {domain} to IP: {ip} – Status: {response.status_code}")
        
        if response.status_code == 200:
            logger.info(f"[ZORA DNS] Success response: {response.text}")
            return {"success": True, "domain": domain, "ip": ip, "response": response.text}
        else:
            logger.error(f"[ZORA DNS] Error response: {response.text}")
            return {"success": False, "domain": domain, "ip": ip, "error": response.text}
            
    except Exception as e:
        logger.error(f"[ZORA DNS] Exception updating {domain}: {e}")
        return {"success": False, "domain": domain, "ip": ip, "error": str(e)}

def update_multiple_domains_dns(ip: str):
    """Update DNS for all configured domains"""
    results = []
    
    for domain, config in DOMAINS_CONFIG.items():
        domain_config = {"domain": domain, **config}
        result = update_namecheap_dns(domain_config, ip)
        results.append(result)
    
    for domain_info in AUTOMATED_DOMAINS:
        if domain_info.get("registrar") == "namecheap" and domain_info.get("dns_password"):
            domain_config = {
                "domain": domain_info["domain"],
                "password": domain_info["dns_password"],
                "ultimate_protection": domain_info.get("ultimate_protection", True)
            }
            result = update_namecheap_dns(domain_config, ip)
            results.append(result)
    
    return results

def add_automated_domain(domain: str, registrar: str, dns_password: str, ultimate_protection: bool = True):
    """Add a domain from automated registration system"""
    domain_info = {
        "domain": domain,
        "registrar": registrar,
        "dns_password": dns_password,
        "ultimate_protection": ultimate_protection,
        "added_at": datetime.now().isoformat(),
        "auto_renewal": True
    }
    
    AUTOMATED_DOMAINS.append(domain_info)
    logger.info(f"[ZORA DNS] Added automated domain: {domain} via {registrar}")
    
    try:
        with open("automated_domains.json", "w") as f:
            json.dump(AUTOMATED_DOMAINS, f, indent=2)
    except Exception as e:
        logger.error(f"[ZORA DNS] Failed to save automated domains: {e}")
    
    return domain_info

def load_automated_domains():
    """Load automated domains from file"""
    global AUTOMATED_DOMAINS
    try:
        with open("automated_domains.json", "r") as f:
            AUTOMATED_DOMAINS = json.load(f)
        logger.info(f"[ZORA DNS] Loaded {len(AUTOMATED_DOMAINS)} automated domains")
    except FileNotFoundError:
        logger.info("[ZORA DNS] No automated domains file found, starting fresh")
    except Exception as e:
        logger.error(f"[ZORA DNS] Failed to load automated domains: {e}")

def get_domain_status():
    """Get status of all managed domains"""
    status = {
        "configured_domains": len(DOMAINS_CONFIG),
        "automated_domains": len(AUTOMATED_DOMAINS),
        "total_domains": len(DOMAINS_CONFIG) + len(AUTOMATED_DOMAINS),
        "last_update": datetime.now().isoformat(),
        "domains": []
    }
    
    for domain, config in DOMAINS_CONFIG.items():
        status["domains"].append({
            "domain": domain,
            "type": "configured",
            "registrar": config.get("registrar", "unknown"),
            "ultimate_protection": config.get("ultimate_protection", False)
        })
    
    for domain_info in AUTOMATED_DOMAINS:
        status["domains"].append({
            "domain": domain_info["domain"],
            "type": "automated",
            "registrar": domain_info.get("registrar", "unknown"),
            "ultimate_protection": domain_info.get("ultimate_protection", False)
        })
    
    return status

def main():
    current_ip = None
    logger.info("[ZORA DNS] Starting ZORA Dynamic DNS Engine™ with multi-domain support...")
    
    load_automated_domains()
    
    status = get_domain_status()
    logger.info(f"[ZORA DNS] Managing {status['total_domains']} domains ({status['configured_domains']} configured + {status['automated_domains']} automated)")
    
    while True:
        try:
            ip = get_public_ip()
            if ip and ip != current_ip:
                logger.info(f"[ZORA DNS] IP changed from {current_ip} to {ip}")
                
                results = update_multiple_domains_dns(ip)
                
                successful = sum(1 for r in results if r.get("success"))
                failed = len(results) - successful
                logger.info(f"[ZORA DNS] Update complete: {successful} successful, {failed} failed")
                
                current_ip = ip
            
            time.sleep(UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("[ZORA DNS] Shutting down Dynamic DNS Engine™")
            break
        except Exception as e:
            logger.error(f"[ZORA DNS] Unexpected error in main loop: {e}")
            time.sleep(60)  # Wait 1 minute before retrying

if __name__ == "__main__":
    main()
