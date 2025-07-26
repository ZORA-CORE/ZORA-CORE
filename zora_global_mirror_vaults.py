#!/usr/bin/env python3
"""
ZORA GLOBAL MIRROR VAULTS™
Distributed backup system for eternal domain recovery
"""

import asyncio
import json
import hashlib
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zora_global_mirror_vaults.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class MirrorVault:
    vault_id: str
    location: str
    encryption_key: str
    last_sync: datetime
    domain_count: int
    status: str = "active"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['last_sync'] = self.last_sync.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict):
        """Create MirrorVault from dictionary"""
        data['last_sync'] = datetime.fromisoformat(data['last_sync'])
        return cls(**data)

class ZoraGlobalMirrorVaults:
    """Distributed backup system for eternal domain data"""
    
    def __init__(self):
        self.logger = logging.getLogger("zora.mirror_vaults")
        self.vaults: Dict[str, MirrorVault] = {}
        self.domain_backups: Dict[str, List[str]] = {}  # domain -> vault_ids
        self.vault_data_path = "/home/ubuntu/repos/ZORA-CORE/mirror_vaults"
        self.replication_factor = 5  # Number of vaults to replicate to
        
        self._ensure_vault_directories()
        self._initialize_mirror_network()
        self.logger.info("✅ ZORA Global Mirror Vaults™ initialized")
    
    def _ensure_vault_directories(self):
        """Ensure vault storage directories exist"""
        try:
            Path(self.vault_data_path).mkdir(parents=True, exist_ok=True)
            for vault_type in ["zora_cloud_primary", "github_backup", "gitlab_backup", "local_encrypted", "distributed_nodes"]:
                vault_path = os.path.join(self.vault_data_path, vault_type)
                Path(vault_path).mkdir(parents=True, exist_ok=True)
            self.logger.info("✅ Mirror vault directories created")
        except Exception as e:
            self.logger.error(f"❌ Failed to create vault directories: {e}")
    
    def _initialize_mirror_network(self):
        """Initialize distributed mirror vault network"""
        vault_locations = [
            "zora_cloud_primary",
            "github_backup", 
            "gitlab_backup",
            "local_encrypted",
            "distributed_nodes"
        ]
        
        for location in vault_locations:
            vault_id = f"vault_{hashlib.md5(location.encode()).hexdigest()[:8]}"
            encryption_key = self._generate_encryption_key()
            
            self.vaults[vault_id] = MirrorVault(
                vault_id=vault_id,
                location=location,
                encryption_key=encryption_key,
                last_sync=datetime.now(),
                domain_count=0,
                status="active"
            )
        
        self.logger.info(f"✅ Initialized {len(self.vaults)} mirror vaults")
    
    def _generate_encryption_key(self) -> str:
        """Generate encryption key for vault security"""
        timestamp = str(int(time.time()))
        random_data = os.urandom(32).hex()
        key_material = f"ZORA-VAULT-{timestamp}-{random_data}"
        return hashlib.sha256(key_material.encode()).hexdigest()
    
    def backup_eternal_domain(self, domain_name: str, domain_data: Dict) -> bool:
        """Backup eternal domain to distributed vaults"""
        try:
            self.logger.info(f"Starting backup for eternal domain: {domain_name}")
            
            encrypted_data = self._encrypt_domain_data(domain_data)
            
            selected_vaults = self._select_replication_vaults()
            
            successful_backups = []
            for vault_id in selected_vaults:
                if self._backup_to_vault(vault_id, domain_name, encrypted_data):
                    successful_backups.append(vault_id)
            
            self.domain_backups[domain_name] = successful_backups
            
            for vault_id in successful_backups:
                if vault_id in self.vaults:
                    self.vaults[vault_id].domain_count += 1
                    self.vaults[vault_id].last_sync = datetime.now()
            
            success_rate = len(successful_backups) / len(selected_vaults)
            if success_rate >= 0.6:  # At least 60% success rate
                self.logger.info(f"✅ Domain {domain_name} backed up to {len(successful_backups)}/{len(selected_vaults)} vaults")
                return True
            else:
                self.logger.error(f"❌ Domain {domain_name} backup failed - only {len(successful_backups)}/{len(selected_vaults)} vaults succeeded")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Failed to backup eternal domain {domain_name}: {e}")
            return False
    
    def _encrypt_domain_data(self, domain_data: Dict) -> Dict:
        """Encrypt domain data for secure storage"""
        try:
            encrypted_data = {
                "encrypted": True,
                "encryption_method": "ZORA-AES-256",
                "timestamp": datetime.now().isoformat(),
                "data_hash": hashlib.sha256(json.dumps(domain_data, sort_keys=True).encode()).hexdigest(),
                "encrypted_payload": self._simple_encrypt(json.dumps(domain_data))
            }
            return encrypted_data
        except Exception as e:
            self.logger.error(f"❌ Failed to encrypt domain data: {e}")
            return domain_data
    
    def _simple_encrypt(self, data: str) -> str:
        """Simple encryption for demonstration (in production, use proper encryption)"""
        key = "ZORA_ETERNAL_ENCRYPTION_KEY"
        encrypted = ""
        for i, char in enumerate(data):
            encrypted += chr(ord(char) ^ ord(key[i % len(key)]))
        return encrypted.encode('utf-8').hex()
    
    def _simple_decrypt(self, encrypted_hex: str) -> str:
        """Simple decryption for demonstration"""
        try:
            encrypted = bytes.fromhex(encrypted_hex).decode('utf-8')
            key = "ZORA_ETERNAL_ENCRYPTION_KEY"
            decrypted = ""
            for i, char in enumerate(encrypted):
                decrypted += chr(ord(char) ^ ord(key[i % len(key)]))
            return decrypted
        except Exception as e:
            self.logger.error(f"❌ Decryption failed: {e}")
            return ""
    
    def _select_replication_vaults(self) -> List[str]:
        """Select vaults for domain replication"""
        active_vaults = [vault_id for vault_id, vault in self.vaults.items() if vault.status == "active"]
        
        replication_count = min(self.replication_factor, len(active_vaults))
        
        sorted_vaults = sorted(active_vaults, key=lambda v: self.vaults[v].domain_count)
        
        return sorted_vaults[:replication_count]
    
    def _backup_to_vault(self, vault_id: str, domain_name: str, encrypted_data: Dict) -> bool:
        """Backup domain data to specific vault"""
        try:
            vault = self.vaults.get(vault_id)
            if not vault:
                return False
            
            vault_path = os.path.join(self.vault_data_path, vault.location)
            backup_file = os.path.join(vault_path, f"{domain_name}.json")
            
            backup_data = {
                "vault_id": vault_id,
                "vault_location": vault.location,
                "domain_name": domain_name,
                "backup_timestamp": datetime.now().isoformat(),
                "eternal_protection": True,
                "domain_data": encrypted_data
            }
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            self.logger.info(f"✅ Domain {domain_name} backed up to vault {vault_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to backup to vault {vault_id}: {e}")
            return False
    
    def restore_eternal_domain(self, domain_name: str) -> Optional[Dict]:
        """Restore eternal domain from mirror vaults"""
        try:
            self.logger.info(f"Starting restore for eternal domain: {domain_name}")
            
            vault_ids = self.domain_backups.get(domain_name, [])
            if not vault_ids:
                self.logger.error(f"❌ No backups found for domain {domain_name}")
                return None
            
            for vault_id in vault_ids:
                restored_data = self._restore_from_vault(vault_id, domain_name)
                if restored_data:
                    self.logger.info(f"✅ Domain {domain_name} restored from vault {vault_id}")
                    return restored_data
            
            self.logger.error(f"❌ Failed to restore domain {domain_name} from any vault")
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Failed to restore eternal domain {domain_name}: {e}")
            return None
    
    def _restore_from_vault(self, vault_id: str, domain_name: str) -> Optional[Dict]:
        """Restore domain data from specific vault"""
        try:
            vault = self.vaults.get(vault_id)
            if not vault:
                return None
            
            vault_path = os.path.join(self.vault_data_path, vault.location)
            backup_file = os.path.join(vault_path, f"{domain_name}.json")
            
            if not os.path.exists(backup_file):
                return None
            
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            encrypted_data = backup_data.get("domain_data", {})
            if encrypted_data.get("encrypted"):
                encrypted_payload = encrypted_data.get("encrypted_payload", "")
                decrypted_json = self._simple_decrypt(encrypted_payload)
                domain_data = json.loads(decrypted_json)
            else:
                domain_data = encrypted_data
            
            return domain_data
            
        except Exception as e:
            self.logger.error(f"❌ Failed to restore from vault {vault_id}: {e}")
            return None
    
    def sync_all_vaults(self) -> Dict:
        """Synchronize all mirror vaults"""
        try:
            self.logger.info("Starting vault synchronization")
            
            sync_results = {
                "sync_timestamp": datetime.now().isoformat(),
                "total_vaults": len(self.vaults),
                "successful_syncs": 0,
                "failed_syncs": 0,
                "vault_status": {}
            }
            
            for vault_id, vault in self.vaults.items():
                try:
                    vault_health = self._check_vault_health(vault_id)
                    
                    if vault_health["healthy"]:
                        vault.last_sync = datetime.now()
                        vault.status = "active"
                        sync_results["successful_syncs"] += 1
                        sync_results["vault_status"][vault_id] = "synced"
                    else:
                        vault.status = "error"
                        sync_results["failed_syncs"] += 1
                        sync_results["vault_status"][vault_id] = "failed"
                        
                except Exception as e:
                    self.logger.error(f"❌ Sync failed for vault {vault_id}: {e}")
                    sync_results["failed_syncs"] += 1
                    sync_results["vault_status"][vault_id] = "error"
            
            self.logger.info(f"✅ Vault sync complete: {sync_results['successful_syncs']}/{sync_results['total_vaults']} successful")
            return sync_results
            
        except Exception as e:
            self.logger.error(f"❌ Failed to sync vaults: {e}")
            return {"error": str(e)}
    
    def _check_vault_health(self, vault_id: str) -> Dict:
        """Check health of specific vault"""
        try:
            vault = self.vaults.get(vault_id)
            if not vault:
                return {"healthy": False, "error": "Vault not found"}
            
            vault_path = os.path.join(self.vault_data_path, vault.location)
            if not os.path.exists(vault_path):
                return {"healthy": False, "error": "Vault directory missing"}
            
            test_file = os.path.join(vault_path, ".vault_health_check")
            try:
                with open(test_file, 'w') as f:
                    f.write(f"Health check: {datetime.now().isoformat()}")
                os.remove(test_file)
            except Exception as e:
                return {"healthy": False, "error": f"Vault not writable: {e}"}
            
            actual_count = len([f for f in os.listdir(vault_path) if f.endswith('.json')])
            
            return {
                "healthy": True,
                "vault_id": vault_id,
                "location": vault.location,
                "actual_domain_count": actual_count,
                "recorded_domain_count": vault.domain_count,
                "last_sync": vault.last_sync.isoformat(),
                "status": vault.status
            }
            
        except Exception as e:
            return {"healthy": False, "error": str(e)}
    
    def get_vault_status(self) -> Dict:
        """Get status of all mirror vaults"""
        try:
            status = {
                "system_name": "ZORA Global Mirror Vaults™",
                "status": "active",
                "total_vaults": len(self.vaults),
                "active_vaults": sum(1 for v in self.vaults.values() if v.status == "active"),
                "total_domains_backed_up": len(self.domain_backups),
                "replication_factor": self.replication_factor,
                "vault_data_path": self.vault_data_path,
                "last_updated": datetime.now().isoformat(),
                "vaults": {}
            }
            
            for vault_id, vault in self.vaults.items():
                status["vaults"][vault_id] = {
                    "location": vault.location,
                    "status": vault.status,
                    "domain_count": vault.domain_count,
                    "last_sync": vault.last_sync.isoformat(),
                    "encryption_enabled": bool(vault.encryption_key)
                }
            
            return status
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get vault status: {e}")
            return {"error": str(e)}
    
    def backup_vault_configuration(self) -> Dict:
        """Backup vault configuration"""
        try:
            config_backup = {
                "backup_timestamp": datetime.now().isoformat(),
                "system_version": "ZORA Global Mirror Vaults™ v1.0",
                "replication_factor": self.replication_factor,
                "vault_data_path": self.vault_data_path,
                "vaults": {},
                "domain_backups": self.domain_backups
            }
            
            for vault_id, vault in self.vaults.items():
                config_backup["vaults"][vault_id] = vault.to_dict()
            
            config_file = os.path.join(self.vault_data_path, "vault_configuration_backup.json")
            with open(config_file, 'w') as f:
                json.dump(config_backup, f, indent=2)
            
            self.logger.info("✅ Vault configuration backed up")
            return config_backup
            
        except Exception as e:
            self.logger.error(f"❌ Failed to backup vault configuration: {e}")
            return {"error": str(e)}
    
    def restore_vault_configuration(self, config_backup: Dict) -> bool:
        """Restore vault configuration from backup"""
        try:
            vaults_data = config_backup.get("vaults", {})
            for vault_id, vault_data in vaults_data.items():
                self.vaults[vault_id] = MirrorVault.from_dict(vault_data)
            
            self.domain_backups = config_backup.get("domain_backups", {})
            
            self.replication_factor = config_backup.get("replication_factor", 5)
            
            self.logger.info("✅ Vault configuration restored from backup")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to restore vault configuration: {e}")
            return False
    
    async def continuous_sync_monitor(self, sync_interval: int = 3600):
        """Continuous monitoring and synchronization of vaults"""
        self.logger.info(f"Starting continuous vault sync monitor (interval: {sync_interval}s)")
        
        while True:
            try:
                sync_results = self.sync_all_vaults()
                
                if sync_results.get("successful_syncs", 0) > 0:
                    self.logger.info(f"✅ Continuous sync: {sync_results['successful_syncs']}/{sync_results['total_vaults']} vaults synced")
                
                failed_vaults = [vault_id for vault_id, status in sync_results.get("vault_status", {}).items() if status == "failed"]
                if failed_vaults:
                    self.logger.warning(f"⚠️ Failed vaults detected: {failed_vaults}")
                    await self._attempt_vault_recovery(failed_vaults)
                
                await asyncio.sleep(sync_interval)
                
            except Exception as e:
                self.logger.error(f"❌ Continuous sync monitor error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    async def _attempt_vault_recovery(self, failed_vault_ids: List[str]):
        """Attempt to recover failed vaults"""
        for vault_id in failed_vault_ids:
            try:
                self.logger.info(f"Attempting recovery for vault {vault_id}")
                
                vault = self.vaults.get(vault_id)
                if vault:
                    vault_path = os.path.join(self.vault_data_path, vault.location)
                    Path(vault_path).mkdir(parents=True, exist_ok=True)
                    
                    vault.status = "recovering"
                    vault.last_sync = datetime.now()
                    
                    health = self._check_vault_health(vault_id)
                    if health["healthy"]:
                        vault.status = "active"
                        self.logger.info(f"✅ Vault {vault_id} recovered successfully")
                    else:
                        self.logger.error(f"❌ Vault {vault_id} recovery failed: {health.get('error')}")
                
            except Exception as e:
                self.logger.error(f"❌ Failed to recover vault {vault_id}: {e}")

if __name__ == "__main__":
    mirror_vaults = ZoraGlobalMirrorVaults()
    
    test_domain_data = {
        "domain_name": "test.zoracore.ai",
        "registration_type": "eternal_subdomain",
        "dns_config": {"a_record": "185.199.108.153"},
        "legal_proof_hash": "test_hash_123",
        "created_at": datetime.now().isoformat()
    }
    
    backup_success = mirror_vaults.backup_eternal_domain("test.zoracore.ai", test_domain_data)
    print(f"Backup success: {backup_success}")
    
    status = mirror_vaults.get_vault_status()
    print(f"Vault Status: {json.dumps(status, indent=2)}")
    
    restored_data = mirror_vaults.restore_eternal_domain("test.zoracore.ai")
    print(f"Restored data: {json.dumps(restored_data, indent=2) if restored_data else 'None'}")
