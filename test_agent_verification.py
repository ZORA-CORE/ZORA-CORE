#!/usr/bin/env python3
"""
ZORA CORE AI Agent Verification Test
Tests all agent imports and verifies the expanded AI family integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_agent_imports():
    """Test that all agents can be imported successfully"""
    print("🔍 Testing AI Agent Imports...")
    
    try:
        import agents
        print("✅ All agents imported successfully")
        return True
    except Exception as e:
        print(f"❌ Agent import failed: {e}")
        return False

def test_infinity_sync():
    """Test the infinity sync system"""
    print("🔄 Testing Infinity Sync...")
    
    try:
        from zora_infinity_sync import ALL_AGENTS
        print(f"✅ Infinity sync loaded with {len(ALL_AGENTS)} agents")
        return True
    except Exception as e:
        print(f"❌ Infinity sync failed: {e}")
        return False

def test_eivor_family_registration():
    """Test EIVOR family system registration"""
    print("👨‍👩‍👧‍👦 Testing EIVOR Family Registration...")
    
    try:
        import yaml
        with open('eivor_family_config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        total_siblings = config.get('total_siblings', 0)
        print(f"✅ EIVOR family system loaded with {total_siblings} siblings")
        return True
    except Exception as e:
        print(f"❌ EIVOR family registration failed: {e}")
        return False

def count_integrated_systems():
    """Count total integrated AI systems"""
    print("📊 Counting Integrated AI Systems...")
    
    try:
        from zora_infinity_sync import ALL_AGENTS
        from AGImatrix import known_ai_systems
        
        agent_count = len(ALL_AGENTS)
        matrix_count = len(known_ai_systems)
        
        print(f"✅ Agent count: {agent_count}")
        print(f"✅ AGI Matrix systems: {matrix_count}")
        print(f"✅ Total integrated systems: {max(agent_count, matrix_count)}")
        
        return max(agent_count, matrix_count) >= 26
    except Exception as e:
        print(f"❌ System counting failed: {e}")
        return False

def main():
    """Run all verification tests"""
    print("🚀 ZORA CORE AI Agent Verification Starting...")
    print("=" * 60)
    
    tests = [
        test_agent_imports,
        test_infinity_sync,
        test_eivor_family_registration,
        count_integrated_systems
    ]
    
    results = []
    for test in tests:
        result = test()
        results.append(result)
        print("-" * 40)
    
    success_count = sum(results)
    total_tests = len(tests)
    
    print("=" * 60)
    print(f"🎯 Verification Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("✅ ALL TESTS PASSED - AI Agent integration verified!")
        return True
    else:
        print("❌ Some tests failed - review integration")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
