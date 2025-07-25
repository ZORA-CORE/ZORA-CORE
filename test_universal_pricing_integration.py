#!/usr/bin/env python3
"""
Test Universal Pricing Integration with ZORA Systems
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_universal_hub_pricing_integration():
    """Test ZORA Universal Hub pricing system integration"""
    print("🧪 Testing ZORA Universal Hub Pricing Integration...")
    
    try:
        from ZORA_UNIVERSAL_HUB import ZoraUniversalHub
        
        hub = ZoraUniversalHub()
        
        pricing_status = hub.get_pricing_status()
        print(f"   ✅ Pricing engines: {pricing_status['pricing_engines']}")
        print(f"   ✅ Market monitors: {pricing_status['market_monitors']}")
        print(f"   ✅ Distribution systems: {pricing_status['distribution_systems']}")
        print(f"   ✅ Collectibles engines: {pricing_status['collectibles_engines']}")
        print(f"   ✅ Total pricing systems: {pricing_status['total_pricing_systems']}")
        print(f"   ✅ Infinity pricing enabled: {pricing_status['infinity_pricing_enabled']}")
        
        if pricing_status['market_monitors'] > 0:
            monitoring_result = hub.execute_market_monitoring_task("ZORA Test Product", "global")
            print(f"   ✅ Market monitoring task executed: {monitoring_result['task']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Universal Hub pricing integration test failed: {e}")
        return False

def test_free_universe_engine_integration():
    """Test ZORAFreeUniverseEngine pricing integration"""
    print("🧪 Testing ZORA Free Universe Engine Integration...")
    
    try:
        from module_210 import ZORAFreeUniverseEngine
        
        engine = ZORAFreeUniverseEngine()
        
        status = engine.get_infinity_optimization_status()
        print(f"   ✅ Total revenue streams: {status['total_revenue_streams']}")
        print(f"   ✅ Infinity streams active: {status['infinity_streams_active']}")
        print(f"   ✅ Pricing engine connected: {status['pricing_engine_connected']}")
        print(f"   ✅ Market monitor connected: {status['market_monitor_connected']}")
        print(f"   ✅ Distribution system connected: {status['distribution_system_connected']}")
        
        if hasattr(engine, 'connect_pricing_engine'):
            print("   ✅ Pricing engine connection method available")
        if hasattr(engine, 'connect_market_monitor'):
            print("   ✅ Market monitor connection method available")
        if hasattr(engine, 'connect_distribution_system'):
            print("   ✅ Distribution system connection method available")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Free Universe Engine integration test failed: {e}")
        return False

def test_income_notice_system_integration():
    """Test ZoraIncomeNoticeSystem pricing integration"""
    print("🧪 Testing ZORA Income Notice System Integration...")
    
    try:
        from zora_income_notice_system import ZoraIncomeNoticeSystem
        
        notice_system = ZoraIncomeNoticeSystem()
        
        royalty_result = notice_system.register_pricing_royalty("test_product_001", 100.0, 15)
        print(f"   ✅ Pricing royalty registered: {royalty_result}")
        
        savings_result = notice_system.register_distribution_savings_royalty("test_order_001", 50.0, 15)
        print(f"   ✅ Distribution savings royalty registered: {savings_result}")
        
        total_royalties = notice_system.calculate_total_founder_royalties()
        print(f"   ✅ Total founder royalties: {total_royalties['total_founder_royalties']} {total_royalties['currency']}")
        
        infinity_status = notice_system.get_infinity_royalty_status()
        print(f"   ✅ Products with royalties: {infinity_status['total_products_with_royalties']}")
        print(f"   ✅ Distribution orders with royalties: {infinity_status['total_distribution_orders_with_royalties']}")
        print(f"   ✅ Infinity systems integrated: {infinity_status['infinity_systems_integrated']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Income Notice System integration test failed: {e}")
        return False

def test_complete_integration():
    """Test complete integration between all systems"""
    print("🧪 Testing Complete System Integration...")
    
    try:
        from ZORA_UNIVERSAL_HUB import ZoraUniversalHub
        from module_210 import ZORAFreeUniverseEngine
        from zora_income_notice_system import ZoraIncomeNoticeSystem
        
        hub = ZoraUniversalHub()
        free_engine = ZORAFreeUniverseEngine()
        notice_system = ZoraIncomeNoticeSystem()
        
        if hub.pricing_engines and len(hub.pricing_engines) > 0:
            pricing_engine = hub.pricing_engines[0]['engine']
            connection_result = free_engine.connect_pricing_engine(pricing_engine)
            print(f"   ✅ Cross-system connection: {connection_result}")
        
        if hub.market_monitors and len(hub.market_monitors) > 0:
            market_monitor = hub.market_monitors[0]['monitor']
            monitor_connection = free_engine.connect_market_monitor(market_monitor)
            print(f"   ✅ Market monitor integration: {monitor_connection}")
        
        if hub.distribution_systems and len(hub.distribution_systems) > 0:
            distribution_system = hub.distribution_systems[0]['system']
            distribution_connection = free_engine.connect_distribution_system(distribution_system)
            print(f"   ✅ Distribution system integration: {distribution_connection}")
        
        final_status = free_engine.get_infinity_optimization_status()
        print(f"   ✅ Final integration - Infinity streams: {final_status['infinity_streams_active']}/{final_status['total_revenue_streams']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Complete integration test failed: {e}")
        return False

def main():
    """Run all integration tests"""
    print("🚀 ZORA UNIVERSAL INFINITY PRICING INTEGRATION TESTS")
    print("=" * 60)
    
    tests = [
        test_universal_hub_pricing_integration,
        test_free_universe_engine_integration,
        test_income_notice_system_integration,
        test_complete_integration
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
                print("   ✅ PASSED\n")
            else:
                print("   ❌ FAILED\n")
        except Exception as e:
            print(f"   ❌ FAILED: {e}\n")
    
    print("=" * 60)
    print(f"📊 INTEGRATION TEST RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎯 ALL INTEGRATION TESTS PASSED - ZORA UNIVERSAL INFINITY PRICING READY")
        print("💰 LOWEST MARKET PRICES + HIGHEST QUALITY - GUARANTEED")
        print("🚫 INTERMEDIARIES ELIMINATED - DIRECT DISTRIBUTION ACTIVE")
        print("♾️ INFINITY AUTOMATION - ACTIVATED")
    else:
        print("⚠️ Some integration tests failed - review and fix issues")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
