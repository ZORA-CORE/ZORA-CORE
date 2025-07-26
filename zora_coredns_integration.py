#!/usr/bin/env python3
"""
ZORA CoreDNS Integration™
Self-hosted DNS server for eternal domain management
"""

import yaml
import subprocess
import logging
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zora_coredns.log'),
        logging.StreamHandler()
    ]
)

class ZoraCoreDNSManager:
    """Manages CoreDNS for self-hosted domain resolution"""
    
    def __init__(self):
        self.logger = logging.getLogger("zora.coredns")
        self.config_path = "/home/ubuntu/repos/ZORA-CORE/coredns/Corefile"
        self.zones_path = "/home/ubuntu/repos/ZORA-CORE/coredns/zones"
        self.base_domains = ["zoracore.ai", "zoracore.app"]
        self.eternal_subdomains = {}
        
        self._ensure_directories()
        self._generate_base_config()
        self._generate_zone_files()
        self.logger.info("✅ ZORA CoreDNS Manager initialized")
    
    def _ensure_directories(self):
        """Ensure CoreDNS configuration directories exist"""
        try:
            Path(self.config_path).parent.mkdir(parents=True, exist_ok=True)
            Path(self.zones_path).mkdir(parents=True, exist_ok=True)
            self.logger.info("✅ CoreDNS directories created")
        except Exception as e:
            self.logger.error(f"❌ Failed to create directories: {e}")
    
    def _generate_base_config(self):
        """Generate CoreDNS configuration"""
        corefile_content = """.:53 {
    errors
    health {
        lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
        max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}

zoracore.ai:53 {
    file /etc/coredns/zones/zoracore.ai.zone
    log
    errors
    reload
}

zoracore.app:53 {
    file /etc/coredns/zones/zoracore.app.zone  
    log
    errors
    reload
}

*.zoracore.ai:53 {
    file /etc/coredns/zones/eternal-subdomains.zone
    log
    errors
    reload
}

*.zoracore.app:53 {
    file /etc/coredns/zones/eternal-subdomains.zone
    log
    errors
    reload
}
"""
        
        try:
            with open(self.config_path, 'w') as f:
                f.write(corefile_content)
            self.logger.info("✅ CoreDNS Corefile generated")
        except Exception as e:
            self.logger.error(f"❌ Failed to generate Corefile: {e}")
    
    def _generate_zone_files(self):
        """Generate DNS zone files for base domains"""
        for domain in self.base_domains:
            self._create_zone_file(domain)
        
        self._create_eternal_subdomains_zone()
    
    def _create_zone_file(self, domain: str):
        """Create DNS zone file for a domain"""
        zone_content = f"""$ORIGIN {domain}.
$TTL 3600

@ IN SOA ns1.{domain}. admin.{domain}. (
    {int(datetime.now().timestamp())} ; Serial
    3600                              ; Refresh
    1800                              ; Retry
    604800                            ; Expire
    86400                             ; Minimum TTL
)

; Name servers
@ IN NS ns1.{domain}.
@ IN NS ns2.{domain}.

; A records
@ IN A 185.199.108.153
ns1 IN A 185.199.108.153
ns2 IN A 185.199.109.153
www IN A 185.199.108.153

; AAAA records
@ IN AAAA 2606:50c0:8000::153
www IN AAAA 2606:50c0:8000::153

; MX records
@ IN MX 10 mail.{domain}.

; TXT records
@ IN TXT "v=spf1 include:{domain} ~all"
@ IN TXT "ZORA-CORE-ETERNAL-DOMAIN-VERIFICATION"

; CNAME records
mail IN CNAME {domain}.
ftp IN CNAME {domain}.
"""
        
        zone_file_path = os.path.join(self.zones_path, f"{domain}.zone")
        try:
            with open(zone_file_path, 'w') as f:
                f.write(zone_content)
            self.logger.info(f"✅ Zone file created for {domain}")
        except Exception as e:
            self.logger.error(f"❌ Failed to create zone file for {domain}: {e}")
    
    def _create_eternal_subdomains_zone(self):
        """Create zone file for eternal subdomains"""
        zone_content = """$ORIGIN zoracore.ai.
$TTL 300

; Eternal subdomain wildcard records
* IN A 185.199.108.153
* IN AAAA 2606:50c0:8000::153
* IN TXT "ZORA-ETERNAL-DOMAIN-PROTECTION"

; Specific eternal subdomain records will be added dynamically
"""
        
        zone_file_path = os.path.join(self.zones_path, "eternal-subdomains.zone")
        try:
            with open(zone_file_path, 'w') as f:
                f.write(zone_content)
            self.logger.info("✅ Eternal subdomains zone file created")
        except Exception as e:
            self.logger.error(f"❌ Failed to create eternal subdomains zone: {e}")
    
    def add_subdomain_zone(self, subdomain: str, dns_config: Dict):
        """Add a specific subdomain to the eternal zone"""
        try:
            self.eternal_subdomains[subdomain] = dns_config
            
            self._update_eternal_subdomains_zone()
            
            self._reload_coredns()
            
            self.logger.info(f"✅ Subdomain {subdomain} added to DNS")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to add subdomain {subdomain}: {e}")
            return False
    
    def _update_eternal_subdomains_zone(self):
        """Update the eternal subdomains zone file with all registered subdomains"""
        zone_content = """$ORIGIN zoracore.ai.
$TTL 300

; Eternal subdomain wildcard records
* IN A 185.199.108.153
* IN AAAA 2606:50c0:8000::153
* IN TXT "ZORA-ETERNAL-DOMAIN-PROTECTION"

; Specific eternal subdomain records
"""
        
        for subdomain, config in self.eternal_subdomains.items():
            subdomain_name = subdomain.replace('.zoracore.ai', '')
            a_record = config.get('a_record', '185.199.108.153')
            aaaa_record = config.get('aaaa_record', '2606:50c0:8000::153')
            
            zone_content += f"""
{subdomain_name} IN A {a_record}
{subdomain_name} IN AAAA {aaaa_record}
{subdomain_name} IN TXT "ZORA-ETERNAL-SUBDOMAIN-{subdomain_name.upper()}"
"""
        
        zone_file_path = os.path.join(self.zones_path, "eternal-subdomains.zone")
        try:
            with open(zone_file_path, 'w') as f:
                f.write(zone_content)
            self.logger.info("✅ Eternal subdomains zone updated")
        except Exception as e:
            self.logger.error(f"❌ Failed to update eternal subdomains zone: {e}")
    
    def _reload_coredns(self):
        """Reload CoreDNS configuration"""
        try:
            result = subprocess.run(['pkill', '-SIGUSR1', 'coredns'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.logger.info("✅ CoreDNS configuration reloaded")
            else:
                self.logger.warning("⚠️ CoreDNS reload signal sent (process may not be running)")
        except Exception as e:
            self.logger.error(f"❌ Failed to reload CoreDNS: {e}")
    
    def start_coredns(self):
        """Start CoreDNS server"""
        try:
            result = subprocess.run(['pgrep', 'coredns'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.logger.info("✅ CoreDNS is already running")
                return True
            
            cmd = ['coredns', '-conf', self.config_path]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, 
                                     stderr=subprocess.PIPE)
            
            self.logger.info(f"✅ CoreDNS started with PID: {process.pid}")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to start CoreDNS: {e}")
            return False
    
    def stop_coredns(self):
        """Stop CoreDNS server"""
        try:
            result = subprocess.run(['pkill', 'coredns'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                self.logger.info("✅ CoreDNS stopped")
            else:
                self.logger.info("ℹ️ CoreDNS was not running")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to stop CoreDNS: {e}")
            return False
    
    def get_dns_status(self) -> Dict:
        """Get DNS server status"""
        try:
            result = subprocess.run(['pgrep', 'coredns'], 
                                  capture_output=True, text=True)
            is_running = result.returncode == 0
            
            pid = result.stdout.strip() if is_running else None
            
            status = {
                "dns_server": "CoreDNS",
                "status": "running" if is_running else "stopped",
                "pid": pid,
                "config_path": self.config_path,
                "zones_path": self.zones_path,
                "base_domains": self.base_domains,
                "eternal_subdomains_count": len(self.eternal_subdomains),
                "last_updated": datetime.now().isoformat()
            }
            
            return status
        except Exception as e:
            self.logger.error(f"❌ Failed to get DNS status: {e}")
            return {"status": "error", "error": str(e)}
    
    def test_dns_resolution(self, domain: str) -> Dict:
        """Test DNS resolution for a domain"""
        try:
            import socket
            
            try:
                ip = socket.gethostbyname(domain)
                a_record_success = True
                a_record_ip = ip
            except socket.gaierror:
                a_record_success = False
                a_record_ip = None
            
            try:
                if a_record_ip:
                    hostname = socket.gethostbyaddr(a_record_ip)[0]
                    reverse_dns_success = True
                    reverse_dns_hostname = hostname
                else:
                    reverse_dns_success = False
                    reverse_dns_hostname = None
            except socket.herror:
                reverse_dns_success = False
                reverse_dns_hostname = None
            
            test_result = {
                "domain": domain,
                "a_record": {
                    "success": a_record_success,
                    "ip": a_record_ip
                },
                "reverse_dns": {
                    "success": reverse_dns_success,
                    "hostname": reverse_dns_hostname
                },
                "test_timestamp": datetime.now().isoformat()
            }
            
            return test_result
        except Exception as e:
            self.logger.error(f"❌ DNS resolution test failed for {domain}: {e}")
            return {"domain": domain, "error": str(e)}
    
    def backup_dns_config(self) -> Dict:
        """Backup DNS configuration"""
        try:
            backup_data = {
                "backup_timestamp": datetime.now().isoformat(),
                "config_path": self.config_path,
                "zones_path": self.zones_path,
                "base_domains": self.base_domains,
                "eternal_subdomains": self.eternal_subdomains,
                "corefile_content": "",
                "zone_files": {}
            }
            
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    backup_data["corefile_content"] = f.read()
            
            if os.path.exists(self.zones_path):
                for filename in os.listdir(self.zones_path):
                    if filename.endswith('.zone'):
                        zone_path = os.path.join(self.zones_path, filename)
                        with open(zone_path, 'r') as f:
                            backup_data["zone_files"][filename] = f.read()
            
            self.logger.info("✅ DNS configuration backed up")
            return backup_data
        except Exception as e:
            self.logger.error(f"❌ Failed to backup DNS configuration: {e}")
            return {"error": str(e)}
    
    def restore_dns_config(self, backup_data: Dict) -> bool:
        """Restore DNS configuration from backup"""
        try:
            self.eternal_subdomains = backup_data.get("eternal_subdomains", {})
            
            corefile_content = backup_data.get("corefile_content", "")
            if corefile_content:
                with open(self.config_path, 'w') as f:
                    f.write(corefile_content)
            
            zone_files = backup_data.get("zone_files", {})
            for filename, content in zone_files.items():
                zone_path = os.path.join(self.zones_path, filename)
                with open(zone_path, 'w') as f:
                    f.write(content)
            
            self._reload_coredns()
            
            self.logger.info("✅ DNS configuration restored from backup")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to restore DNS configuration: {e}")
            return False

if __name__ == "__main__":
    dns_manager = ZoraCoreDNSManager()
    
    test_config = {
        "type": "subdomain",
        "a_record": "185.199.108.153",
        "aaaa_record": "2606:50c0:8000::153"
    }
    
    dns_manager.add_subdomain_zone("test.zoracore.ai", test_config)
    
    status = dns_manager.get_dns_status()
    print(f"DNS Status: {json.dumps(status, indent=2)}")
    
    test_result = dns_manager.test_dns_resolution("zoracore.ai")
    print(f"DNS Test: {json.dumps(test_result, indent=2)}")
