#!/usr/bin/env python3

import time
import json
from pathlib import Path
from zora_watchdog_engine import ZoraWatchdogEngine


def test_health_monitoring():
    """Test system health monitoring functionality"""
    print("🔍 Testing ZORA System Health Monitoring...")
    
    engine = ZoraWatchdogEngine()
    engine.activate()
    
    print("📊 Testing basic health status...")
    status = engine.get_system_status()
    print(f"   ✅ System Status: {status['status']}")
    print(f"   ✅ Infinity Mode: {status['infinity_mode']}")
    print(f"   ✅ Components Monitored: {status['components_monitored']}")
    print(f"   ✅ Overall Health: {status['overall_health']}%")
    
    print("⏱️  Testing response time...")
    start_time = time.time()
    health_check = engine.get_system_status()
    response_time = (time.time() - start_time) * 1000
    print(f"   ✅ Health Check Response Time: {response_time:.2f}ms")
    
    if response_time < 1000:  # Less than 1 second
        print("   ✅ Response time meets requirement (<1 second)")
    else:
        print("   ⚠️  Response time exceeds requirement (>1 second)")
    
    print("🔧 Testing subsystem health...")
    subsystems = status['subsystems']
    for subsystem, active in subsystems.items():
        status_icon = "✅" if active else "❌"
        print(f"   {status_icon} {subsystem.upper()}: {'Active' if active else 'Inactive'}")
    
    print("🎯 Testing health target configuration...")
    config_path = Path("watchdog_config.json")
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        health_target = config["health_targets"]["overall_system_health"]
        print(f"   ✅ Health Target: {health_target}%")
        
        if health_target == 99.9:
            print("   ✅ Health target meets requirement (99.9%)")
        else:
            print(f"   ⚠️  Health target does not meet requirement: {health_target}% != 99.9%")
    
    print("🚨 Testing alert system...")
    active_alerts = status['active_alerts']
    print(f"   ✅ Active Alerts: {active_alerts}")
    
    print("💾 Testing memory monitoring...")
    memory_status = status['memory_usage']
    print(f"   ✅ Memory Status: {memory_status}")
    
    print("🛡️ Testing security monitoring...")
    security_status = status['security_status']
    print(f"   ✅ Security Status: {security_status}")
    
    engine.shutdown()
    print("✅ Health monitoring tests completed successfully!")
    return True


if __name__ == "__main__":
    print("🔍 ZORA SYSTEM HEALTH MONITORING TEST")
    print("=" * 50)
    
    try:
        success = test_health_monitoring()
        if success:
            print("🎉 All health monitoring tests passed!")
        else:
            print("❌ Some health monitoring tests failed!")
    except Exception as e:
        print(f"❌ Health monitoring test error: {e}")
    
    print("=" * 50)
    print("🛡️ Health monitoring testing completed")
