#!/usr/bin/env python3
"""
ZORA CORE AI Integration Verification Script
Verifies all AI systems are properly integrated with correct contact information
"""

import sys
import os
import asyncio
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def verify_contact_information(agent_instance, agent_name: str) -> Dict[str, Any]:
    """Verify that an agent has the correct contact information"""
    expected_info = {
        "user_name": "Mads Pallisgaard Petersen",
        "user_address": "Fjordbakken 50, Dyves Bro, 4700 Næstved",
        "user_phone": "+45 22822450",
        "user_email": "mrpallis@gmail.com",
        "organization": "ZORA CORE"
    }
    
    result = {
        "agent": agent_name,
        "contact_info_present": True,
        "contact_info_correct": True,
        "missing_fields": [],
        "incorrect_fields": []
    }
    
    for field, expected_value in expected_info.items():
        if hasattr(agent_instance, field):
            actual_value = getattr(agent_instance, field)
            if actual_value != expected_value:
                result["contact_info_correct"] = False
                result["incorrect_fields"].append({
                    "field": field,
                    "expected": expected_value,
                    "actual": actual_value
                })
        else:
            result["contact_info_present"] = False
            result["missing_fields"].append(field)
    
    return result

def test_agent_ping(agent_instance, agent_name: str) -> Dict[str, Any]:
    """Test the ping method of an agent"""
    try:
        ping_result = agent_instance.ping("ZORA CORE Integration Test")
        return {
            "agent": agent_name,
            "ping_successful": True,
            "ping_response": ping_result,
            "status": ping_result.get("status", "unknown"),
            "infinity_ready": ping_result.get("infinity_ready", False)
        }
    except Exception as e:
        return {
            "agent": agent_name,
            "ping_successful": False,
            "error": str(e),
            "status": "error"
        }

def main():
    """Main verification function"""
    print("🔍 ZORA CORE AI Integration Verification")
    print("=" * 50)
    
    try:
        from agents import (
            meta_ai, gpt4, codex, sora, supergrok, gemini, copilot, pi, reka,
            devin, you, huggingface, midjourney, deepseek, langsmith, github, gitlab, replit
        )
        
        integrated_agents = {
            "meta_ai": meta_ai,
            "gpt4": gpt4,
            "codex": codex,
            "sora": sora,
            "supergrok": supergrok,
            "gemini": gemini,
            "copilot": copilot,
            "pi": pi,
            "reka": reka,
            "devin": devin,
            "you": you,
            "huggingface": huggingface,
            "midjourney": midjourney,
            "deepseek": deepseek,
            "langsmith": langsmith,
            "github": github,
            "gitlab": gitlab,
            "replit": replit
        }
        
        print(f"✅ Successfully imported {len(integrated_agents)} AI agents")
        
    except ImportError as e:
        print(f"❌ Failed to import agents: {e}")
        return False
    
    print("\n📋 Verifying Contact Information:")
    print("-" * 30)
    
    contact_verification_results = []
    for agent_name, agent_instance in integrated_agents.items():
        result = verify_contact_information(agent_instance, agent_name)
        contact_verification_results.append(result)
        
        status = "✅" if result["contact_info_present"] and result["contact_info_correct"] else "❌"
        print(f"{status} {agent_name}: Contact info {'✓' if result['contact_info_correct'] else '✗'}")
        
        if result["missing_fields"]:
            print(f"   Missing: {', '.join(result['missing_fields'])}")
        if result["incorrect_fields"]:
            for field_info in result["incorrect_fields"]:
                print(f"   Incorrect {field_info['field']}: got '{field_info['actual']}', expected '{field_info['expected']}'")
    
    print("\n🏓 Testing Ping Functionality:")
    print("-" * 30)
    
    ping_results = []
    for agent_name, agent_instance in integrated_agents.items():
        result = test_agent_ping(agent_instance, agent_name)
        ping_results.append(result)
        
        status = "✅" if result["ping_successful"] else "❌"
        infinity_status = "🔄" if result.get("infinity_ready", False) else "⏸️"
        print(f"{status} {infinity_status} {agent_name}: {result.get('status', 'unknown')}")
        
        if not result["ping_successful"]:
            print(f"   Error: {result.get('error', 'Unknown error')}")
    
    print("\n📊 Integration Summary:")
    print("-" * 30)
    
    total_agents = len(integrated_agents)
    contact_ok = sum(1 for r in contact_verification_results if r["contact_info_present"] and r["contact_info_correct"])
    ping_ok = sum(1 for r in ping_results if r["ping_successful"])
    infinity_ready = sum(1 for r in ping_results if r.get("infinity_ready", False))
    
    print(f"Total AI Systems: {total_agents}")
    print(f"Contact Info OK: {contact_ok}/{total_agents}")
    print(f"Ping Successful: {ping_ok}/{total_agents}")
    print(f"Infinity Ready: {infinity_ready}/{total_agents}")
    
    success_rate = (contact_ok + ping_ok) / (total_agents * 2) * 100
    print(f"Overall Success Rate: {success_rate:.1f}%")
    
    if contact_ok == total_agents and ping_ok == total_agents:
        print("\n🎉 All AI systems successfully integrated!")
        return True
    else:
        print("\n⚠️  Some integrations need attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
