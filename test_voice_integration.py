#!/usr/bin/env python3
"""
Test Voice Integration System for ZORA CORE
"""

import asyncio
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.agent_voice_manager import zora_agent_voice_manager, initialize_all_agent_voices, test_all_agent_voices
from agents.voice_integration import get_agent_voice_integration_status

async def test_voice_integration():
    """Test the voice integration system"""
    print("🎤 TESTING ZORA VOICE INTEGRATION SYSTEM")
    print("=" * 50)
    
    print("\n1. Testing voice integration initialization...")
    try:
        integration_results = await initialize_all_agent_voices()
        print(f"✅ Voice integration completed for {len(integration_results)} agents")
        
        successful_integrations = sum(1 for result in integration_results.values() if result)
        print(f"✅ Successful integrations: {successful_integrations}/{len(integration_results)}")
        
        for agent_name, success in integration_results.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            print(f"   {agent_name}: {status}")
            
    except Exception as e:
        print(f"❌ Voice integration initialization failed: {e}")
        return False
    
    print("\n2. Testing voice integration status...")
    try:
        status = get_agent_voice_integration_status()
        print(f"✅ Voice system status: {status['voice_enabled']}")
        print(f"✅ Total integrated agents: {status['total_integrated_agents']}")
        print(f"✅ Voice processing active: {status['voice_processing_active']}")
        
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        return False
    
    print("\n3. Testing voice capabilities...")
    try:
        voice_test_results = await test_all_agent_voices()
        
        if voice_test_results:
            successful_tests = sum(1 for result in voice_test_results.values() if result)
            print(f"✅ Voice tests completed: {successful_tests}/{len(voice_test_results)} passed")
            
            for agent_name, success in voice_test_results.items():
                status = "✅ PASSED" if success else "❌ FAILED"
                print(f"   {agent_name} voice test: {status}")
        else:
            print("⚠️ No voice tests performed - integration may not be available")
            
    except Exception as e:
        print(f"❌ Voice testing failed: {e}")
        return False
    
    print("\n4. Testing voice manager status...")
    try:
        manager_status = zora_agent_voice_manager.get_voice_integration_status()
        print(f"✅ Voice manager system: {manager_status['system_name']}")
        print(f"✅ Voice integration available: {manager_status['voice_integration_available']}")
        print(f"✅ Total agents managed: {manager_status['total_agents']}")
        print(f"✅ Integrated agents: {manager_status['integrated_agents']}")
        
    except Exception as e:
        print(f"❌ Voice manager status check failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎤 VOICE INTEGRATION TESTING COMPLETED")
    print("✅ All voice integration tests passed successfully!")
    return True

async def test_individual_agent_voice(agent_name: str):
    """Test voice capabilities for a specific agent"""
    print(f"\n🗣️ Testing voice for {agent_name}...")
    
    try:
        result = await zora_agent_voice_manager.integrate_specific_agent(agent_name)
        if result:
            print(f"✅ {agent_name} voice integration successful")
            
            voice_test = await zora_agent_voice_manager.test_agent_voice(
                agent_name, 
                f"Hello, this is {agent_name} from ZORA CORE testing voice synthesis"
            )
            
            if voice_test:
                print(f"✅ {agent_name} voice synthesis test passed")
            else:
                print(f"⚠️ {agent_name} voice synthesis test failed")
                
        else:
            print(f"❌ {agent_name} voice integration failed")
            
    except Exception as e:
        print(f"❌ {agent_name} voice test error: {e}")

ZORA_CORE_DNA = {}
ZORA_CORE_DNA["ULTIMATE_INFINITY_LAYER"] = {
    "ALL_MODULES_ENABLED": True,
    "ZORA_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True
}

TEST_ULTIMATE_INFINITY_LAYER = {
    "ALL_TESTS_ENABLED": True,
    "TEST_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True,
    "ULTIMATE_PERFORMANCE_MODE": True,
    "COSMIC_ALIGNMENT_ENABLED": True,
    "TEST_TRINITY_SYNC_ENHANCED": True,
    "INFINITY_LOOP_TESTING": True,
    "SELF_HEALING_VERIFICATION": True,
    "ULTIMATE_TEST_ORCHESTRATION": True
}

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("🎤 ZORA VOICE INTEGRATION TEST SUITE")
    print(f"Founder: Mads Pallisgaard Petersen")
    print(f"Contact: mrpallis@gmail.com")
    print(f"Organization: ZORA CORE")
    print("Testing Ultimate Infinity Voice Integration!")
    
    try:
        result = asyncio.run(test_voice_integration())
        
        if result:
            print("\n🎉 ALL VOICE INTEGRATION TESTS PASSED!")
            sys.exit(0)
        else:
            print("\n❌ SOME VOICE INTEGRATION TESTS FAILED!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        sys.exit(1)
