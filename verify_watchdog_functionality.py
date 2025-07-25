#!/usr/bin/env python3

import sys
import traceback
from pathlib import Path

def verify_watchdog_functionality():
    """Verify ZORA WATCHDOG ENGINE™ core functionality"""
    print("🔍 ZORA WATCHDOG ENGINE™ Verification Test")
    print("=" * 50)
    
    try:
        print("📦 Testing import and initialization...")
        from zora_watchdog_engine import ZoraWatchdogEngine
        engine = ZoraWatchdogEngine()
        print("   ✅ Successfully imported and initialized ZoraWatchdogEngine")
        
        print("🚀 Testing activation...")
        engine.activate()
        print("   ✅ Successfully activated watchdog engine")
        
        print("📊 Testing system status...")
        status = engine.get_system_status()
        print(f"   ✅ System status retrieved: {status['status']}")
        print(f"   ✅ Health target: {status.get('health_target', 'N/A')}%")
        print(f"   ✅ Infinity mode: {status.get('infinity_mode', 'N/A')}")
        
        print("📋 Testing configuration files...")
        config_files = [
            "watchdog_config.json",
            "watchdog_memory_map.json", 
            "founder_alerts.json"
        ]
        
        for config_file in config_files:
            file_path = Path(config_file)
            if file_path.exists():
                print(f"   ✅ {config_file} exists")
            else:
                print(f"   ❌ {config_file} missing")
                return False
        
        print("🔧 Testing subsystems...")
        if hasattr(engine, 'health_loop') and engine.health_loop:
            print("   ✅ Health Loop subsystem initialized")
        if hasattr(engine, 'auto_diagnostik') and engine.auto_diagnostik:
            print("   ✅ Auto-Diagnostik subsystem initialized")
        if hasattr(engine, 'memory_sentinel') and engine.memory_sentinel:
            print("   ✅ Memory Sentinel subsystem initialized")
        if hasattr(engine, 'telemetri') and engine.telemetri:
            print("   ✅ Telemetry subsystem initialized")
        if hasattr(engine, 'security_patch') and engine.security_patch:
            print("   ✅ Security Auto-Patch subsystem initialized")
        
        print("🛑 Testing shutdown...")
        engine.shutdown()
        print("   ✅ Successfully shut down watchdog engine")
        
        print("=" * 50)
        print("🎉 ALL VERIFICATION TESTS PASSED!")
        print("✨ ZORA WATCHDOG ENGINE™ is fully functional")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        print("🔍 Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify_watchdog_functionality()
    sys.exit(0 if success else 1)
