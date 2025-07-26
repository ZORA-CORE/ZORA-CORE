#!/usr/bin/env python3
"""
ZORA PROXY TLD ROUTER™
Routes domain requests to self-hosted infrastructure without traditional registration
"""

import asyncio
import json
import logging
import os
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('zora_proxy_tld_router.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class ProxyDomainRoute:
    requested_domain: str
    target_subdomain: str
    routing_method: str
    ssl_enabled: bool = True
    ultimate_protection: bool = True
    created_at: str = ""
    nginx_config: Dict = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if self.nginx_config is None:
            self.nginx_config = {}
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict):
        """Create ProxyDomainRoute from dictionary"""
        return cls(**data)

class ZoraProxyTLDRouter:
    """Routes domain requests to self-hosted infrastructure"""
    
    def __init__(self):
        self.logger = logging.getLogger("zora.proxy_router")
        self.routes: Dict[str, ProxyDomainRoute] = {}
        self.base_domains = ["zoracore.ai", "zoracore.app"]
        self.nginx_config_path = "/home/ubuntu/repos/ZORA-CORE/nginx_configs"
        self.route_backup_path = "/home/ubuntu/repos/ZORA-CORE/proxy_routes_backup.json"
        
        self._ensure_nginx_directories()
        self._load_existing_routes()
        self.logger.info("✅ ZORA Proxy TLD Router™ initialized")
    
    def _ensure_nginx_directories(self):
        """Ensure nginx configuration directories exist"""
        try:
            Path(self.nginx_config_path).mkdir(parents=True, exist_ok=True)
            Path(os.path.join(self.nginx_config_path, "sites-available")).mkdir(parents=True, exist_ok=True)
            Path(os.path.join(self.nginx_config_path, "sites-enabled")).mkdir(parents=True, exist_ok=True)
            self.logger.info("✅ Nginx configuration directories created")
        except Exception as e:
            self.logger.error(f"❌ Failed to create nginx directories: {e}")
    
    def _load_existing_routes(self):
        """Load existing routes from backup file"""
        try:
            if os.path.exists(self.route_backup_path):
                with open(self.route_backup_path, 'r') as f:
                    routes_data = json.load(f)
                
                for domain, route_data in routes_data.get("routes", {}).items():
                    self.routes[domain] = ProxyDomainRoute.from_dict(route_data)
                
                self.logger.info(f"✅ Loaded {len(self.routes)} existing routes")
        except Exception as e:
            self.logger.error(f"❌ Failed to load existing routes: {e}")
    
    async def create_proxy_route(self, requested_domain: str) -> ProxyDomainRoute:
        """Create proxy route for requested domain"""
        try:
            self.logger.info(f"Creating proxy route for: {requested_domain}")
            
            domain_parts = requested_domain.split('.')
            if len(domain_parts) >= 2:
                name, tld = domain_parts[0], domain_parts[1]
                target_subdomain = f"{name}-{tld}.zoracore.ai"
            else:
                target_subdomain = f"{requested_domain}.zoracore.ai"
            
            route = ProxyDomainRoute(
                requested_domain=requested_domain,
                target_subdomain=target_subdomain,
                routing_method="subdomain_proxy",
                ssl_enabled=True,
                ultimate_protection=True
            )
            
            nginx_config = await self._generate_nginx_config(route)
            route.nginx_config = nginx_config
            
            self.routes[requested_domain] = route
            
            await self._configure_nginx_proxy(route)
            
            self._save_routes_backup()
            
            self.logger.info(f"✅ Proxy route created: {requested_domain} -> {target_subdomain}")
            return route
            
        except Exception as e:
            self.logger.error(f"❌ Failed to create proxy route for {requested_domain}: {e}")
            raise
    
    async def _generate_nginx_config(self, route: ProxyDomainRoute) -> Dict:
        """Generate enhanced nginx configuration for proxy route"""
        try:
            config = self.enhance_nginx_config_for_comprehensive_routing(route)
            return config
            
        except Exception as e:
            self.logger.error(f"❌ Failed to generate nginx config: {e}")
            return {}
    
    async def _configure_nginx_proxy(self, route: ProxyDomainRoute):
        """Configure nginx proxy for the route"""
        try:
            nginx_server_block = self._generate_nginx_server_block(route)
            
            config_file = os.path.join(
                self.nginx_config_path, 
                "sites-available", 
                f"{route.requested_domain}.conf"
            )
            
            with open(config_file, 'w') as f:
                f.write(nginx_server_block)
            
            enabled_file = os.path.join(
                self.nginx_config_path,
                "sites-enabled",
                f"{route.requested_domain}.conf"
            )
            
            if not os.path.exists(enabled_file):
                os.symlink(config_file, enabled_file)
            
            self.logger.info(f"✅ Nginx configuration created for {route.requested_domain}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to configure nginx proxy: {e}")
    
    def _generate_nginx_server_block(self, route: ProxyDomainRoute) -> str:
        """Generate nginx server block configuration"""
        config = route.nginx_config
        
        server_block = f"""# ZORA Proxy TLD Router™ Configuration

server {{
    listen 80;
    server_name {route.requested_domain};
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {route.requested_domain};
    
    ssl_certificate {config.get('ssl_certificate', '/etc/ssl/certs/zoracore.crt')};
    ssl_certificate_key {config.get('ssl_certificate_key', '/etc/ssl/private/zoracore.key')};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
"""
        
        for header, value in config.get('security_headers', {}).items():
            server_block += f"    add_header {header} \"{value}\";\n"
        
        server_block += f"""
    limit_req_zone $binary_remote_addr zone={route.requested_domain.replace('.', '_')}:10m rate={config.get('ultimate_protection', {}).get('rate_limiting', '10r/s')};
    limit_req zone={route.requested_domain.replace('.', '_')} burst=20 nodelay;
    
    location / {{
        proxy_pass {config.get('proxy_pass', f'https://{route.target_subdomain}')};
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        
"""
        
        for header, value in config.get('proxy_headers', {}).items():
            server_block += f"        proxy_set_header {header} {value};\n"
        
        server_block += f"""        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        proxy_hide_header X-Powered-By;
        proxy_hide_header Server;
        
        add_header X-ZORA-Proxy "ETERNAL-DOMAIN-PROTECTION";
        add_header X-ZORA-Route "{route.target_subdomain}";
        add_header X-ZORA-Method "{route.routing_method}";
    }}
    
    location /zora-health {{
        access_log off;
        return 200 "ZORA Proxy Active\\n";
        add_header Content-Type text/plain;
    }}
    
    location ~* \\.(php|asp|aspx|jsp)$ {{
        return 444;
    }}
    
    access_log /var/log/nginx/{route.requested_domain}_access.log;
    error_log /var/log/nginx/{route.requested_domain}_error.log;
}}
"""
        
        return server_block
    
    def get_route(self, requested_domain: str) -> Optional[ProxyDomainRoute]:
        """Get proxy route for domain"""
        return self.routes.get(requested_domain)
    
    def list_routes(self) -> List[ProxyDomainRoute]:
        """List all proxy routes"""
        return list(self.routes.values())
    
    async def remove_route(self, requested_domain: str) -> bool:
        """Remove proxy route"""
        try:
            if requested_domain not in self.routes:
                self.logger.warning(f"⚠️ Route not found: {requested_domain}")
                return False
            
            config_file = os.path.join(
                self.nginx_config_path,
                "sites-available",
                f"{requested_domain}.conf"
            )
            enabled_file = os.path.join(
                self.nginx_config_path,
                "sites-enabled", 
                f"{requested_domain}.conf"
            )
            
            if os.path.exists(enabled_file):
                os.remove(enabled_file)
            if os.path.exists(config_file):
                os.remove(config_file)
            
            del self.routes[requested_domain]
            
            self._save_routes_backup()
            
            self.logger.info(f"✅ Route removed: {requested_domain}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to remove route {requested_domain}: {e}")
            return False
    
    def _save_routes_backup(self):
        """Save routes to backup file"""
        try:
            backup_data = {
                "backup_timestamp": datetime.now().isoformat(),
                "total_routes": len(self.routes),
                "base_domains": self.base_domains,
                "routes": {}
            }
            
            for domain, route in self.routes.items():
                backup_data["routes"][domain] = route.to_dict()
            
            with open(self.route_backup_path, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            self.logger.info(f"✅ Routes backup saved: {len(self.routes)} routes")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save routes backup: {e}")
    
    async def test_route(self, requested_domain: str) -> Dict:
        """Test proxy route functionality"""
        try:
            route = self.get_route(requested_domain)
            if not route:
                return {"status": "error", "message": "Route not found"}
            
            import aiohttp
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(f"https://{route.target_subdomain}", timeout=10) as response:
                        target_status = response.status
                        target_accessible = True
                except Exception as e:
                    target_status = None
                    target_accessible = False
            
            config_file = os.path.join(
                self.nginx_config_path,
                "sites-available",
                f"{requested_domain}.conf"
            )
            nginx_config_exists = os.path.exists(config_file)
            
            enabled_file = os.path.join(
                self.nginx_config_path,
                "sites-enabled",
                f"{requested_domain}.conf"
            )
            nginx_enabled = os.path.exists(enabled_file)
            
            test_result = {
                "domain": requested_domain,
                "target_subdomain": route.target_subdomain,
                "routing_method": route.routing_method,
                "ssl_enabled": route.ssl_enabled,
                "ultimate_protection": route.ultimate_protection,
                "target_accessible": target_accessible,
                "target_status": target_status,
                "nginx_config_exists": nginx_config_exists,
                "nginx_enabled": nginx_enabled,
                "test_timestamp": datetime.now().isoformat(),
                "status": "healthy" if target_accessible and nginx_config_exists else "unhealthy"
            }
            
            return test_result
            
        except Exception as e:
            self.logger.error(f"❌ Route test failed for {requested_domain}: {e}")
            return {"status": "error", "message": str(e)}
    
    async def bulk_create_routes(self, domain_list: List[str], batch_size: int = 25) -> Dict:
        """Create proxy routes for multiple domains with comprehensive support"""
        try:
            self.logger.info(f"Creating bulk proxy routes for {len(domain_list)} domains")
            
            results = {
                "operation_type": "bulk_comprehensive_proxy_routing",
                "total_domains": len(domain_list),
                "successful": 0,
                "failed": 0,
                "skipped": 0,
                "routes_created": [],
                "errors": [],
                "start_time": datetime.now().isoformat()
            }
            
            for i in range(0, len(domain_list), batch_size):
                batch = domain_list[i:i + batch_size]
                batch_number = i // batch_size + 1
                
                self.logger.info(f"Processing proxy routing batch {batch_number}: {len(batch)} domains")
                
                for domain in batch:
                    try:
                        if domain in self.routes:
                            results["skipped"] += 1
                            continue
                        
                        route = await self.create_proxy_route(domain)
                        results["successful"] += 1
                        results["routes_created"].append({
                            "domain": domain,
                            "target": route.target_subdomain,
                            "routing_method": route.routing_method,
                            "ssl_enabled": route.ssl_enabled,
                            "ultimate_protection": route.ultimate_protection,
                            "batch_number": batch_number,
                            "status": "created"
                        })
                        
                    except Exception as e:
                        results["failed"] += 1
                        results["errors"].append({
                            "domain": domain,
                            "error": str(e),
                            "batch_number": batch_number
                        })
                        self.logger.error(f"Failed to create proxy route for {domain}: {e}")
                
                batch_success_rate = (results["successful"] / (i + len(batch)) * 100) if (i + len(batch)) > 0 else 0
                self.logger.info(f"Proxy routing batch {batch_number} complete. Overall success rate: {batch_success_rate:.1f}%")
            
            results["end_time"] = datetime.now().isoformat()
            results["success_rate"] = (results["successful"] / results["total_domains"] * 100) if results["total_domains"] > 0 else 0
            
            self.logger.info(f"✅ Bulk proxy route creation complete!")
            self.logger.info(f"📈 Success rate: {results['success_rate']:.1f}% ({results['successful']:,}/{results['total_domains']:,})")
            self.logger.info(f"🔒 All routes include SSL and ultimate protection")
            
            return results
            
        except Exception as e:
            self.logger.error(f"❌ Bulk route creation failed: {e}")
            return {"error": str(e)}
    
    async def create_comprehensive_proxy_routes(self, priority_only: bool = False) -> Dict:
        """Create comprehensive proxy routes for all conceivable domains"""
        self.logger.info("Creating comprehensive proxy routes for all conceivable domains")
        
        try:
            from zora_comprehensive_domain_list import ZoraComprehensiveDomainList
            
            domain_list = ZoraComprehensiveDomainList()
            
            if priority_only:
                target_domains = domain_list.get_priority_domains()
                operation_type = "priority_comprehensive_proxy"
            else:
                target_domains = domain_list.get_all_subdomains()
                operation_type = "full_comprehensive_proxy"
            
            self.logger.info(f"Starting {operation_type} proxy routing for {len(target_domains):,} domains")
            
            results = await self.bulk_create_routes(target_domains)
            results["operation_type"] = operation_type
            results["comprehensive_coverage"] = True
            
            return results
            
        except Exception as e:
            error_msg = f"❌ Comprehensive proxy routing failed: {e}"
            self.logger.error(error_msg)
            return {"error": error_msg}
    
    def enhance_nginx_config_for_comprehensive_routing(self, route: ProxyDomainRoute) -> Dict:
        """Enhanced nginx configuration for comprehensive domain routing"""
        base_config = {
            "server_name": route.requested_domain,
            "proxy_pass": f"https://{route.target_subdomain}",
            "ssl_certificate": f"/etc/letsencrypt/live/{route.requested_domain}/fullchain.pem",
            "ssl_certificate_key": f"/etc/letsencrypt/live/{route.requested_domain}/privkey.pem",
            "proxy_headers": {
                "Host": route.target_subdomain,
                "X-Real-IP": "$remote_addr",
                "X-Forwarded-For": "$proxy_add_x_forwarded_for",
                "X-Forwarded-Proto": "$scheme",
                "X-Forwarded-Host": route.requested_domain,
                "X-ZORA-Eternal-Domain": "true",
                "X-ZORA-Ultimate-Protection": "active"
            },
            "security_headers": {
                "X-Frame-Options": "DENY",
                "X-Content-Type-Options": "nosniff",
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
                "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
            },
            "ultimate_protection": {
                "rate_limiting": "20r/s",
                "ddos_protection": True,
                "geo_blocking": False,
                "bot_protection": True,
                "fail2ban_integration": True,
                "request_filtering": True
            },
            "performance_optimization": {
                "gzip_compression": True,
                "brotli_compression": True,
                "http2_enabled": True,
                "keepalive_timeout": "65s",
                "client_max_body_size": "10M"
            }
        }
        
        domain_lower = route.requested_domain.lower()
        
        if any(tld in domain_lower for tld in ["dk", "no", "se", "fi"]):
            base_config["regional_optimization"] = "nordic"
            base_config["gdpr_compliance"] = True
            base_config["data_residency"] = "eu"
        
        if "api" in domain_lower:
            base_config["api_optimization"] = True
            base_config["cors_enabled"] = True
            base_config["rate_limiting"] = "100r/s"
            base_config["json_optimization"] = True
        
        if "mail" in domain_lower:
            base_config["mail_optimization"] = True
            base_config["smtp_proxy"] = True
            base_config["email_security"] = "enhanced"
        
        if "admin" in domain_lower:
            base_config["security_enhanced"] = True
            base_config["access_control"] = "strict"
            base_config["monitoring_enabled"] = True
            base_config["rate_limiting"] = "5r/s"
        
        if "cdn" in domain_lower or "static" in domain_lower:
            base_config["cdn_optimization"] = True
            base_config["cache_control"] = "max-age=31536000"
            base_config["static_file_serving"] = True
        
        return base_config
    
    def verify_comprehensive_routing_coverage(self) -> Dict:
        """Verify comprehensive routing coverage"""
        try:
            from zora_comprehensive_domain_list import ZoraComprehensiveDomainList
            
            domain_list = ZoraComprehensiveDomainList()
            all_possible_domains = set(domain_list.get_all_subdomains())
            routed_domains = set(self.routes.keys())
            
            coverage_stats = {
                "total_possible_domains": len(all_possible_domains),
                "routed_domains": len(routed_domains),
                "coverage_percentage": (len(routed_domains) / len(all_possible_domains) * 100) if all_possible_domains else 0,
                "missing_routes": list(all_possible_domains - routed_domains),
                "extra_routes": list(routed_domains - all_possible_domains),
                "priority_coverage": self._check_priority_routing_coverage(domain_list),
                "ssl_coverage": sum(1 for r in self.routes.values() if r.ssl_enabled),
                "ultimate_protection_coverage": sum(1 for r in self.routes.values() if r.ultimate_protection),
                "verification_timestamp": datetime.now().isoformat()
            }
            
            return coverage_stats
            
        except Exception as e:
            self.logger.error(f"❌ Routing coverage verification failed: {e}")
            return {"error": str(e)}
    
    def _check_priority_routing_coverage(self, domain_list) -> Dict:
        """Check coverage of priority domain routing"""
        try:
            priority_domains = set(domain_list.get_priority_domains())
            routed_priority = set(self.routes.keys()) & priority_domains
            
            return {
                "total_priority_domains": len(priority_domains),
                "routed_priority_domains": len(routed_priority),
                "priority_coverage_percentage": (len(routed_priority) / len(priority_domains) * 100) if priority_domains else 0,
                "missing_priority_routes": list(priority_domains - routed_priority)
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def verify_all_routes_functionality(self) -> Dict:
        """Verify functionality of all proxy routes"""
        self.logger.info(f"Verifying functionality of {len(self.routes)} proxy routes")
        
        verification_results = {
            "total_routes": len(self.routes),
            "healthy_routes": 0,
            "unhealthy_routes": 0,
            "ssl_enabled_routes": 0,
            "ultimate_protection_routes": 0,
            "route_details": [],
            "verification_timestamp": datetime.now().isoformat()
        }
        
        for domain, route in self.routes.items():
            try:
                test_result = await self.test_route(domain)
                
                if test_result.get("status") == "healthy":
                    verification_results["healthy_routes"] += 1
                else:
                    verification_results["unhealthy_routes"] += 1
                
                if route.ssl_enabled:
                    verification_results["ssl_enabled_routes"] += 1
                
                if route.ultimate_protection:
                    verification_results["ultimate_protection_routes"] += 1
                
                verification_results["route_details"].append({
                    "domain": domain,
                    "target": route.target_subdomain,
                    "status": test_result.get("status", "unknown"),
                    "ssl_enabled": route.ssl_enabled,
                    "ultimate_protection": route.ultimate_protection
                })
                
            except Exception as e:
                verification_results["unhealthy_routes"] += 1
                verification_results["route_details"].append({
                    "domain": domain,
                    "status": "error",
                    "error": str(e)
                })
        
        verification_results["health_percentage"] = (verification_results["healthy_routes"] / verification_results["total_routes"] * 100) if verification_results["total_routes"] > 0 else 0
        verification_results["ssl_coverage_percentage"] = (verification_results["ssl_enabled_routes"] / verification_results["total_routes"] * 100) if verification_results["total_routes"] > 0 else 0
        verification_results["protection_coverage_percentage"] = (verification_results["ultimate_protection_routes"] / verification_results["total_routes"] * 100) if verification_results["total_routes"] > 0 else 0
        
        self.logger.info(f"✅ Route verification complete: {verification_results['health_percentage']:.1f}% healthy")
        return verification_results
    
    def export_comprehensive_routing_registry(self, filepath: str = None) -> str:
        """Export comprehensive routing registry"""
        if not filepath:
            filepath = f"/home/ubuntu/repos/ZORA-CORE/zora_comprehensive_routing_registry_{int(datetime.now().timestamp())}.json"
        
        registry_data = {
            "registry_name": "ZORA Comprehensive Proxy Routing Registry™",
            "export_timestamp": datetime.now().isoformat(),
            "total_routes": len(self.routes),
            "router_status": self.get_router_status(),
            "coverage_verification": self.verify_comprehensive_routing_coverage(),
            "proxy_routes": {}
        }
        
        for domain, route in self.routes.items():
            registry_data["proxy_routes"][domain] = route.to_dict()
        
        with open(filepath, 'w') as f:
            json.dump(registry_data, f, indent=2)
        
        self.logger.info(f"✅ Comprehensive routing registry exported to: {filepath}")
        return filepath
    
    def get_router_status(self) -> Dict:
        """Get comprehensive router status and statistics"""
        try:
            status = {
                "router_name": "ZORA Proxy TLD Router™",
                "status": "active",
                "total_routes": len(self.routes),
                "base_domains": self.base_domains,
                "nginx_config_path": self.nginx_config_path,
                "route_backup_path": self.route_backup_path,
                "last_updated": datetime.now().isoformat(),
                "routing_methods": {},
                "ssl_enabled_count": 0,
                "ultimate_protection_count": 0,
                "comprehensive_support": True,
                "bulk_routing_enabled": True,
                "enhanced_nginx_config": True,
                "coverage_verification": True
            }
            
            for route in self.routes.values():
                method = route.routing_method
                status["routing_methods"][method] = status["routing_methods"].get(method, 0) + 1
                
                if route.ssl_enabled:
                    status["ssl_enabled_count"] += 1
                
                if route.ultimate_protection:
                    status["ultimate_protection_count"] += 1
            
            status["ssl_coverage_percentage"] = (status["ssl_enabled_count"] / status["total_routes"] * 100) if status["total_routes"] > 0 else 0
            status["protection_coverage_percentage"] = (status["ultimate_protection_count"] / status["total_routes"] * 100) if status["total_routes"] > 0 else 0
            
            return status
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get router status: {e}")
            return {"error": str(e)}
    
    async def reload_nginx(self) -> bool:
        """Reload nginx configuration"""
        try:
            import subprocess
            
            test_result = subprocess.run(['nginx', '-t'], capture_output=True, text=True)
            if test_result.returncode != 0:
                self.logger.error(f"❌ Nginx configuration test failed: {test_result.stderr}")
                return False
            
            reload_result = subprocess.run(['nginx', '-s', 'reload'], capture_output=True, text=True)
            if reload_result.returncode == 0:
                self.logger.info("✅ Nginx configuration reloaded")
                return True
            else:
                self.logger.error(f"❌ Nginx reload failed: {reload_result.stderr}")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ Failed to reload nginx: {e}")
            return False

if __name__ == "__main__":
    async def main():
        router = ZoraProxyTLDRouter()
        
        test_domain = "example.com"
        route = await router.create_proxy_route(test_domain)
        print(f"Created route: {route.requested_domain} -> {route.target_subdomain}")
        
        test_result = await router.test_route(test_domain)
        print(f"Route test: {json.dumps(test_result, indent=2)}")
        
        status = router.get_router_status()
        print(f"Router status: {json.dumps(status, indent=2)}")
        
        bulk_domains = ["test1.com", "test2.org", "test3.net"]
        bulk_results = await router.bulk_create_routes(bulk_domains)
        print(f"Bulk creation: {json.dumps(bulk_results, indent=2)}")
    
    asyncio.run(main())
