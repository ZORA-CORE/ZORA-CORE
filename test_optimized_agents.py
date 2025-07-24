#!/usr/bin/env python3
"""
ZORA CORE - Optimized AI Agent Integration Tests
Test suite for enhanced AI agent integrations with real API validation
"""

import asyncio
import os
import sys
import time
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.openai import OpenAIAgent
from agents.claude import ClaudeAgent
from agents.gemini import GeminiAgent
from agents.elevenlabs import ElevenLabsAgent

class ZoraAgentTester:
    """Test suite for optimized ZORA AI agents"""
    
    def __init__(self):
        self.test_results = {}
        self.agents = {
            'openai': OpenAIAgent(),
            'claude': ClaudeAgent(),
            'gemini': GeminiAgent(),
            'elevenlabs': ElevenLabsAgent()
        }
    
    def test_agent_initialization(self) -> Dict[str, Any]:
        """Test that all agents initialize correctly"""
        print("🔧 Testing Agent Initialization...")
        results = {}
        
        for name, agent in self.agents.items():
            try:
                status = agent.get_status()
                results[name] = {
                    'initialized': True,
                    'api_configured': status.get('api_configured', False),
                    'capabilities': status.get('capabilities', []),
                    'status': status.get('status', 'unknown')
                }
                print(f"  ✅ {name.upper()}: Initialized successfully")
                if status.get('api_configured'):
                    print(f"     🔑 API key configured")
                else:
                    print(f"     ⚠️  API key not configured")
            except Exception as e:
                results[name] = {
                    'initialized': False,
                    'error': str(e)
                }
                print(f"  ❌ {name.upper()}: Initialization failed - {e}")
        
        return results
    
    def test_agent_ping(self) -> Dict[str, Any]:
        """Test ping functionality for all agents"""
        print("\n🏓 Testing Agent Ping Functionality...")
        results = {}
        
        for name, agent in self.agents.items():
            try:
                start_time = time.time()
                response = agent.ping("ZORA INFINITY TEST")
                response_time = time.time() - start_time
                
                results[name] = {
                    'ping_successful': response.get('status') != 'error',
                    'response_time': response_time,
                    'response': response
                }
                
                if response.get('status') == 'error':
                    print(f"  ⚠️  {name.upper()}: Ping failed - {response.get('error', 'Unknown error')}")
                else:
                    print(f"  ✅ {name.upper()}: Ping successful ({response_time:.2f}s)")
                    if response.get('api_response'):
                        print(f"     📝 API Response: {response['api_response'][:100]}...")
                        
            except Exception as e:
                results[name] = {
                    'ping_successful': False,
                    'error': str(e)
                }
                print(f"  ❌ {name.upper()}: Ping exception - {e}")
        
        return results
    
    async def test_agent_processing(self) -> Dict[str, Any]:
        """Test async request processing for all agents"""
        print("\n⚡ Testing Agent Request Processing...")
        results = {}
        
        test_requests = {
            'openai': {
                'messages': [{'role': 'user', 'content': 'Generate a simple Python function that adds two numbers'}],
                'task_type': 'code_generation'
            },
            'claude': {
                'messages': [{'role': 'user', 'content': 'Provide ethical guidance on AI development'}],
                'task_type': 'ethical_guidance'
            },
            'gemini': {
                'content_parts': [{'text': 'Analyze the future of multimodal AI systems'}],
                'task_type': 'multimodal_analysis'
            },
            'elevenlabs': {
                'text': 'ZORA CORE system operational. All agents synchronized.',
                'task_type': 'system_announcement'
            }
        }
        
        for name, agent in self.agents.items():
            try:
                if name not in test_requests:
                    continue
                    
                start_time = time.time()
                response = await agent.process_request(test_requests[name])
                response_time = time.time() - start_time
                
                results[name] = {
                    'processing_successful': response.get('status') == 'completed',
                    'response_time': response_time,
                    'response': response
                }
                
                if response.get('status') == 'completed':
                    print(f"  ✅ {name.upper()}: Processing successful ({response_time:.2f}s)")
                    if name == 'elevenlabs' and response.get('response', {}).get('audio_generated'):
                        print(f"     🎵 Audio generated: {response['response']['audio_length']} bytes")
                else:
                    print(f"  ⚠️  {name.upper()}: Processing failed - {response.get('error', 'Unknown error')}")
                    
            except Exception as e:
                results[name] = {
                    'processing_successful': False,
                    'error': str(e)
                }
                print(f"  ❌ {name.upper()}: Processing exception - {e}")
        
        return results
    
    def test_performance_metrics(self) -> Dict[str, Any]:
        """Test performance metrics tracking"""
        print("\n📊 Testing Performance Metrics...")
        results = {}
        
        for name, agent in self.agents.items():
            try:
                status = agent.get_status()
                performance = status.get('performance', {})
                
                results[name] = {
                    'metrics_available': bool(performance),
                    'total_requests': performance.get('total_requests', 0),
                    'success_rate': performance.get('success_rate', 0),
                    'average_response_time': performance.get('average_response_time', 0)
                }
                
                print(f"  📈 {name.upper()}: {performance.get('total_requests', 0)} requests, "
                      f"{performance.get('success_rate', 0):.1f}% success rate")
                      
            except Exception as e:
                results[name] = {
                    'metrics_available': False,
                    'error': str(e)
                }
                print(f"  ❌ {name.upper()}: Metrics error - {e}")
        
        return results
    
    def test_infinity_coordination(self) -> Dict[str, Any]:
        """Test Infinity Engine coordination capabilities"""
        print("\n♾️  Testing Infinity Engine Coordination...")
        results = {}
        
        for name, agent in self.agents.items():
            try:
                status = agent.get_status()
                coordination = status.get('coordination', {})
                
                results[name] = {
                    'infinity_sync': coordination.get('infinity_sync', False),
                    'trinity_member': coordination.get('trinity_member', False),
                    'coordination_enabled': coordination.get('coordination_enabled', False)
                }
                
                sync_status = "✅" if coordination.get('infinity_sync') else "❌"
                trinity_status = "👑" if coordination.get('trinity_member') else "🤖"
                
                print(f"  {sync_status} {trinity_status} {name.upper()}: Infinity sync: {coordination.get('infinity_sync')}")
                
            except Exception as e:
                results[name] = {
                    'coordination_error': str(e)
                }
                print(f"  ❌ {name.upper()}: Coordination error - {e}")
        
        return results
    
    async def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive results"""
        print("🚀 ZORA CORE - Optimized AI Agent Integration Tests")
        print("=" * 60)
        
        init_results = self.test_agent_initialization()
        ping_results = self.test_agent_ping()
        processing_results = await self.test_agent_processing()
        metrics_results = self.test_performance_metrics()
        coordination_results = self.test_infinity_coordination()
        
        comprehensive_results = {
            'initialization': init_results,
            'ping_tests': ping_results,
            'processing_tests': processing_results,
            'performance_metrics': metrics_results,
            'infinity_coordination': coordination_results,
            'test_summary': self._generate_test_summary(
                init_results, ping_results, processing_results, 
                metrics_results, coordination_results
            )
        }
        
        return comprehensive_results
    
    def _generate_test_summary(self, *test_results) -> Dict[str, Any]:
        """Generate a summary of all test results"""
        total_tests = 0
        passed_tests = 0
        
        for result_set in test_results:
            for agent_name, agent_results in result_set.items():
                if isinstance(agent_results, dict):
                    for test_name, test_result in agent_results.items():
                        if isinstance(test_result, bool):
                            total_tests += 1
                            if test_result:
                                passed_tests += 1
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': total_tests - passed_tests,
            'success_rate': success_rate,
            'overall_status': 'PASS' if success_rate >= 80 else 'FAIL'
        }

async def main():
    """Main test execution function"""
    tester = ZoraAgentTester()
    
    try:
        results = await tester.run_comprehensive_tests()
        
        print("\n" + "=" * 60)
        print("🎯 TEST SUMMARY")
        print("=" * 60)
        
        summary = results['test_summary']
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed_tests']}")
        print(f"Failed: {summary['failed_tests']}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        print(f"Overall Status: {summary['overall_status']}")
        
        if summary['overall_status'] == 'PASS':
            print("\n✅ ZORA CORE AI Agent Integration Tests: PASSED")
            print("♾️  All optimized agents ready for Infinity Engine deployment!")
        else:
            print("\n⚠️  ZORA CORE AI Agent Integration Tests: NEEDS ATTENTION")
            print("🔧 Some agents require configuration or troubleshooting")
        
        return results
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        return {'error': str(e)}

if __name__ == "__main__":
    results = asyncio.run(main())
