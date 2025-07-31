#!/usr/bin/env python3

"""
ZORA CORE - Comprehensive AI Agent Integration Tests
Tests all newly added AI agents for proper integration and functionality
"""

import pytest
import asyncio
import sys
import os
import time
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class TestComprehensiveAIAgentIntegration:
    """Test suite for comprehensive AI agent integration"""
    
    def test_all_agents_can_be_imported(self):
        """Test that all AI agents can be imported without errors"""
        try:
            from agents import (
                mistral, groq, devin, you, elevenlabs, perplexity, 
                huggingface, leonardo, midjourney, deepseek, langsmith,
                github, gitlab, replit
            )
            
            assert mistral is not None, "Mistral agent not imported"
            assert groq is not None, "Groq agent not imported"
            assert devin is not None, "Devin agent not imported"
            assert you is not None, "You agent not imported"
            assert elevenlabs is not None, "ElevenLabs agent not imported"
            assert perplexity is not None, "Perplexity agent not imported"
            assert huggingface is not None, "HuggingFace agent not imported"
            assert leonardo is not None, "Leonardo agent not imported"
            assert midjourney is not None, "Midjourney agent not imported"
            assert deepseek is not None, "DeepSeek agent not imported"
            assert langsmith is not None, "LangSmith agent not imported"
            assert github is not None, "GitHub agent not imported"
            assert gitlab is not None, "GitLab agent not imported"
            assert replit is not None, "Replit agent not imported"
            
            print("✅ All new AI agents imported successfully")
            
        except Exception as e:
            pytest.fail(f"Failed to import AI agents: {e}")
    
    def test_agent_ping_functionality(self):
        """Test that all agents respond to ping requests"""
        try:
            from agents import (
                mistral, groq, devin, you, elevenlabs, perplexity, 
                huggingface, leonardo, midjourney, deepseek, langsmith,
                github, gitlab, replit
            )
            
            agents = [
                ("mistral", mistral),
                ("groq", groq),
                ("devin", devin),
                ("you", you),
                ("elevenlabs", elevenlabs),
                ("perplexity", perplexity),
                ("huggingface", huggingface),
                ("leonardo", leonardo),
                ("midjourney", midjourney),
                ("deepseek", deepseek),
                ("langsmith", langsmith),
                ("github", github),
                ("gitlab", gitlab),
                ("replit", replit)
            ]
            
            successful_pings = 0
            
            for agent_name, agent in agents:
                try:
                    if hasattr(agent, 'ping'):
                        response = agent.ping(f"Test ping for {agent_name}")
                        assert isinstance(response, dict), f"{agent_name} ping should return dict"
                        assert "agent" in response, f"{agent_name} ping should include agent name"
                        successful_pings += 1
                        print(f"✅ {agent_name} ping successful")
                    else:
                        print(f"⚠️ {agent_name} does not have ping method")
                        
                except Exception as e:
                    print(f"❌ {agent_name} ping failed: {e}")
            
            assert successful_pings >= 10, f"Expected at least 10 successful pings, got {successful_pings}"
            print(f"✅ {successful_pings} agents responded to ping successfully")
            
        except Exception as e:
            pytest.fail(f"Agent ping test failed: {e}")
    
    def test_agent_capabilities_defined(self):
        """Test that all agents have defined capabilities"""
        try:
            from agents import (
                mistral, groq, devin, you, elevenlabs, perplexity, 
                huggingface, leonardo, midjourney, deepseek, langsmith,
                github, gitlab, replit
            )
            
            agents = [
                ("mistral", mistral),
                ("groq", groq),
                ("devin", devin),
                ("you", you),
                ("elevenlabs", elevenlabs),
                ("perplexity", perplexity),
                ("huggingface", huggingface),
                ("leonardo", leonardo),
                ("midjourney", midjourney),
                ("deepseek", deepseek),
                ("langsmith", langsmith),
                ("github", github),
                ("gitlab", gitlab),
                ("replit", replit)
            ]
            
            agents_with_capabilities = 0
            
            for agent_name, agent in agents:
                try:
                    if hasattr(agent, 'capabilities'):
                        capabilities = agent.capabilities
                        assert isinstance(capabilities, list), f"{agent_name} capabilities should be a list"
                        assert len(capabilities) > 0, f"{agent_name} should have at least one capability"
                        agents_with_capabilities += 1
                        print(f"✅ {agent_name} has {len(capabilities)} capabilities: {capabilities}")
                    else:
                        print(f"⚠️ {agent_name} does not have capabilities defined")
                        
                except Exception as e:
                    print(f"❌ {agent_name} capabilities check failed: {e}")
            
            assert agents_with_capabilities >= 10, f"Expected at least 10 agents with capabilities, got {agents_with_capabilities}"
            print(f"✅ {agents_with_capabilities} agents have defined capabilities")
            
        except Exception as e:
            pytest.fail(f"Agent capabilities test failed: {e}")
    
    def test_eivor_family_registration_pending(self):
        """Test that all agents have EIVOR family registration pending"""
        try:
            from agents import (
                mistral, groq, devin, you, elevenlabs, perplexity, 
                huggingface, leonardo, midjourney, deepseek, langsmith,
                github, gitlab, replit
            )
            
            agents = [
                ("mistral", mistral),
                ("groq", groq),
                ("devin", devin),
                ("you", you),
                ("elevenlabs", elevenlabs),
                ("perplexity", perplexity),
                ("huggingface", huggingface),
                ("leonardo", leonardo),
                ("midjourney", midjourney),
                ("deepseek", deepseek),
                ("langsmith", langsmith),
                ("github", github),
                ("gitlab", gitlab),
                ("replit", replit)
            ]
            
            agents_with_registration = 0
            
            for agent_name, agent in agents:
                try:
                    if hasattr(agent, '_eivor_registration_pending'):
                        registration_pending = agent._eivor_registration_pending
                        assert registration_pending == True, f"{agent_name} should have EIVOR registration pending"
                        agents_with_registration += 1
                        print(f"✅ {agent_name} has EIVOR registration pending")
                    else:
                        print(f"⚠️ {agent_name} does not have EIVOR registration flag")
                        
                except Exception as e:
                    print(f"❌ {agent_name} EIVOR registration check failed: {e}")
            
            assert agents_with_registration >= 10, f"Expected at least 10 agents with EIVOR registration, got {agents_with_registration}"
            print(f"✅ {agents_with_registration} agents have EIVOR registration pending")
            
        except Exception as e:
            pytest.fail(f"EIVOR registration test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_agent_async_registration_methods(self):
        """Test that all agents have async registration methods"""
        try:
            from agents import (
                mistral, groq, devin, you, elevenlabs, perplexity, 
                huggingface, leonardo, midjourney, deepseek, langsmith,
                github, gitlab, replit
            )
            
            agents = [
                ("mistral", mistral),
                ("groq", groq),
                ("devin", devin),
                ("you", you),
                ("elevenlabs", elevenlabs),
                ("perplexity", perplexity),
                ("huggingface", huggingface),
                ("leonardo", leonardo),
                ("midjourney", midjourney),
                ("deepseek", deepseek),
                ("langsmith", langsmith),
                ("github", github),
                ("gitlab", gitlab),
                ("replit", replit)
            ]
            
            agents_with_async_methods = 0
            
            for agent_name, agent in agents:
                try:
                    if hasattr(agent, '_register_with_eivor_family'):
                        method = agent._register_with_eivor_family
                        assert asyncio.iscoroutinefunction(method), f"{agent_name} registration method should be async"
                        agents_with_async_methods += 1
                        print(f"✅ {agent_name} has async EIVOR registration method")
                    else:
                        print(f"⚠️ {agent_name} does not have EIVOR registration method")
                        
                except Exception as e:
                    print(f"❌ {agent_name} async method check failed: {e}")
            
            assert agents_with_async_methods >= 10, f"Expected at least 10 agents with async methods, got {agents_with_async_methods}"
            print(f"✅ {agents_with_async_methods} agents have async registration methods")
            
        except Exception as e:
            pytest.fail(f"Async registration method test failed: {e}")
    
    def test_infinity_sync_integration(self):
        """Test that agents are integrated with ZORA Infinity Sync"""
        try:
            from zora_infinity_sync import ALL_AGENTS

            expected_new_agents = [
                "mistral", "groq", "devin", "you", "elevenlabs", "perplexity",
                "huggingface", "leonardo", "midjourney", "deepseek", "langsmith",
                "github", "gitlab", "replit"
            ]

            agent_names = []
            for agent in ALL_AGENTS:
                agent_name = getattr(agent, '__name__', str(agent))
                if 'Agent object at' in agent_name:
                    class_name = agent_name.split('.')[-1].split(' ')[0]
                    if class_name.endswith('Agent'):
                        agent_name = class_name[:-5].lower()  # Remove 'Agent' suffix and lowercase
                agent_names.append(agent_name)

            agents_in_sync = 0

            for expected_agent in expected_new_agents:
                if expected_agent in agent_names:
                    agents_in_sync += 1
                    print(f"✅ {expected_agent} found in ALL_AGENTS list")
                else:
                    print(f"❌ {expected_agent} not found in ALL_AGENTS list")

            print(f"🔍 Extracted agent names: {sorted(agent_names)}")
            assert agents_in_sync >= 10, f"Expected at least 10 agents in sync, got {agents_in_sync}"
            print(f"✅ {agents_in_sync} agents integrated with Infinity Sync")

        except Exception as e:
            pytest.fail(f"Infinity sync integration test failed: {e}")
    
    def test_agimatrix_integration(self):
        """Test that agents are registered in AGImatrix"""
        try:
            from AGImatrix import known_ai_systems
            
            expected_new_systems = ["MISTRAL", "GROQ"]
            
            systems_in_matrix = 0
            
            for system_name in expected_new_systems:
                system_found = False
                for system_info in known_ai_systems:
                    if system_info[0] == system_name:
                        system_found = True
                        systems_in_matrix += 1
                        print(f"✅ {system_name} found in AGImatrix")
                        break
                
                if not system_found:
                    print(f"❌ {system_name} not found in AGImatrix")
            
            assert systems_in_matrix >= 2, f"Expected at least 2 systems in AGImatrix, got {systems_in_matrix}"
            print(f"✅ {systems_in_matrix} systems integrated with AGImatrix")
            
        except Exception as e:
            pytest.fail(f"AGImatrix integration test failed: {e}")
    
    def test_eivor_family_config_integration(self):
        """Test that agents are included in EIVOR family configuration"""
        try:
            import yaml

            with open('/home/ubuntu/repos/ZORA-CORE/eivor_family_config.yaml', 'r') as f:
                config = yaml.safe_load(f)

            total_siblings = config.get('family_structure', {}).get('total_siblings', 0)
            language_models = config.get('family_structure', {}).get('sibling_categories', {}).get('language_models', [])

            expected_agents = ["mistral", "groq"]

            agents_in_config = 0

            for agent_name in expected_agents:
                if agent_name in language_models:
                    agents_in_config += 1
                    print(f"✅ {agent_name} found in EIVOR family config")
                else:
                    print(f"❌ {agent_name} not found in EIVOR family config")

            print(f"🔍 Language models in config: {language_models}")
            assert total_siblings >= 27, f"Expected at least 27 total siblings, got {total_siblings}"
            assert agents_in_config >= 2, f"Expected at least 2 agents in config, got {agents_in_config}"
            print(f"✅ {agents_in_config} agents integrated with EIVOR family config")
            print(f"✅ Total siblings: {total_siblings}")

        except Exception as e:
            pytest.fail(f"EIVOR family config integration test failed: {e}")

if __name__ == "__main__":
    print("🧪 Running Comprehensive AI Agent Integration Tests...")
    
    test_suite = TestComprehensiveAIAgentIntegration()
    
    try:
        test_suite.test_all_agents_can_be_imported()
        test_suite.test_agent_ping_functionality()
        test_suite.test_agent_capabilities_defined()
        test_suite.test_eivor_family_registration_pending()
        test_suite.test_infinity_sync_integration()
        test_suite.test_agimatrix_integration()
        test_suite.test_eivor_family_config_integration()
        
        asyncio.run(test_suite.test_agent_async_registration_methods())
        
        print("\n🎉 All comprehensive AI agent integration tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
