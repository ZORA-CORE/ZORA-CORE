#!/usr/bin/env python3
"""
Test suite for DEVINUS Universal GitHub Command System
"""

import asyncio
import unittest
from unittest.mock import Mock, patch
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from devinus_universal_github_command import (
        DevinusUniversalGitHubCommand,
        execute_github_command,
        get_github_commands
    )
    DEVINUS_GITHUB_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import DEVINUS GitHub Command: {e}")
    DEVINUS_GITHUB_AVAILABLE = False

class TestDevinusUniversalGitHubCommand(unittest.TestCase):
    """Test DEVINUS Universal GitHub Command System"""
    
    def setUp(self):
        """Set up test environment"""
        if DEVINUS_GITHUB_AVAILABLE:
            self.command_system = DevinusUniversalGitHubCommand()
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    def test_command_system_initialization(self):
        """Test command system initialization"""
        self.assertIsNotNone(self.command_system.command_id)
        self.assertIn("devinus_github_", self.command_system.command_id)
        self.assertEqual(len(self.command_system.zora_repositories), 4)
        self.assertIn("ZORA-CORE", self.command_system.zora_repositories)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    def test_get_available_commands(self):
        """Test getting available commands"""
        commands = self.command_system.get_available_commands()
        
        self.assertIn("command_categories", commands)
        self.assertIn("repositories", commands)
        self.assertIn("user_info", commands)
        self.assertIn("examples", commands)
        
        categories = commands["command_categories"]
        expected_categories = ["repository", "workflow", "issues", "commits", "deployment", "monitoring", "coordination"]
        for category in expected_categories:
            self.assertIn(category, categories)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_repository_commands(self):
        """Test repository command handling"""
        with patch.object(self.command_system, 'github_agent') as mock_agent:
            mock_agent.get_repository_info.return_value = {"name": "ZORA-CORE", "status": "active"}
            mock_agent.get_repository_health.return_value = {"health_score": 95, "status": "healthy"}
            
            result = await self.command_system.execute_universal_command("repository.status")
            
            self.assertEqual(result["status"], "success")
            self.assertIn("repository", result)
            self.assertIn("command_id", result)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_workflow_commands(self):
        """Test workflow command handling"""
        with patch.object(self.command_system, 'github_agent') as mock_agent:
            mock_agent.trigger_workflow.return_value = True
            
            result = await self.command_system.execute_universal_command(
                "workflow.trigger", 
                workflow_id="infinity.yml"
            )
            
            self.assertEqual(result["status"], "success")
            self.assertIn("workflow", result)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_issue_commands(self):
        """Test issue command handling"""
        with patch.object(self.command_system, 'github_agent') as mock_agent:
            mock_agent.create_issue.return_value = {"number": 123, "title": "Test Issue"}
            
            result = await self.command_system.execute_universal_command(
                "issues.create",
                title="Test Issue",
                body="Test description"
            )
            
            self.assertEqual(result["status"], "success")
            self.assertIn("issue", result)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_coordination_commands(self):
        """Test coordination command handling"""
        result = await self.command_system.execute_universal_command("coordination.sync_all")
        
        self.assertEqual(result["status"], "success")
        self.assertIn("sync_results", result)
        self.assertEqual(result["repositories_synced"], 4)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_monitoring_commands(self):
        """Test monitoring command handling"""
        result = await self.command_system.execute_universal_command("monitoring.health")
        
        self.assertEqual(result["status"], "success")
        self.assertIn("global_health", result)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_invalid_command(self):
        """Test handling of invalid commands"""
        result = await self.command_system.execute_universal_command("invalid.command")
        
        self.assertEqual(result["status"], "error")
        self.assertIn("Unknown command category", result["message"])
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_command_without_category(self):
        """Test command without category (defaults to repository)"""
        with patch.object(self.command_system, 'github_agent') as mock_agent:
            mock_agent.get_repository_info.return_value = {"name": "ZORA-CORE"}
            mock_agent.get_repository_health.return_value = {"health_score": 95}
            
            result = await self.command_system.execute_universal_command("status")
            
            self.assertEqual(result["command"], "repository.status")
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    def test_global_functions(self):
        """Test global convenience functions"""
        commands = get_github_commands()
        self.assertIn("command_categories", commands)
        
        self.assertTrue(callable(execute_github_command))

class TestDevinusGitHubIntegration(unittest.TestCase):
    """Integration tests for DEVINUS GitHub Command System"""
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_full_workflow_simulation(self):
        """Test complete workflow simulation"""
        command_system = DevinusUniversalGitHubCommand()
        
        result = await command_system.execute_universal_command("repository.all_status")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["total_repositories"], 4)
        
        result = await command_system.execute_universal_command("coordination.global_health")
        self.assertEqual(result["status"], "success")
        self.assertIn("global_system_health", result)
    
    @unittest.skipUnless(DEVINUS_GITHUB_AVAILABLE, "DEVINUS GitHub Command not available")
    async def test_error_handling(self):
        """Test error handling in command execution"""
        command_system = DevinusUniversalGitHubCommand()
        
        result = await command_system.execute_universal_command("repository.invalid_action")
        self.assertEqual(result["status"], "error")
        self.assertIn("Unknown repository action", result["message"])

def run_async_test(test_func):
    """Helper to run async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_func())
    finally:
        loop.close()

if __name__ == "__main__":
    if DEVINUS_GITHUB_AVAILABLE:
        print("🧪 Running DEVINUS Universal GitHub Command System tests...")
        
        test_instance = TestDevinusUniversalGitHubCommand()
        test_instance.setUp()
        
        async_tests = [
            test_instance.test_repository_commands,
            test_instance.test_workflow_commands,
            test_instance.test_issue_commands,
            test_instance.test_coordination_commands,
            test_instance.test_monitoring_commands,
            test_instance.test_invalid_command,
            test_instance.test_command_without_category
        ]
        
        for test in async_tests:
            try:
                run_async_test(test)
                print(f"✅ {test.__name__} passed")
            except Exception as e:
                print(f"❌ {test.__name__} failed: {e}")
        
        integration_test = TestDevinusGitHubIntegration()
        integration_tests = [
            integration_test.test_full_workflow_simulation,
            integration_test.test_error_handling
        ]
        
        for test in integration_tests:
            try:
                run_async_test(test)
                print(f"✅ {test.__name__} passed")
            except Exception as e:
                print(f"❌ {test.__name__} failed: {e}")
        
        print("🎯 DEVINUS Universal GitHub Command System tests completed")
    else:
        print("❌ DEVINUS GitHub Command System not available for testing")
    
    unittest.main(verbosity=2, exit=False)
