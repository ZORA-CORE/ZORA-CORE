#!/usr/bin/env python3

import unittest
import json
from pathlib import Path
from zora_watchdog_engine import ZoraWatchdogEngine


class TestBasicWatchdog(unittest.TestCase):
    """Basic test suite for ZORA SYSTEM INFINITY WATCHDOG ENGINE™"""
    
    def setUp(self):
        """Set up test environment"""
        self.watchdog = ZoraWatchdogEngine()
    
    def tearDown(self):
        """Clean up test environment"""
        if hasattr(self.watchdog, 'shutdown'):
            self.watchdog.shutdown()
    
    def test_basic_initialization(self):
        """Test basic watchdog initialization"""
        self.assertIsNotNone(self.watchdog.watchdog_id)
        self.assertTrue(self.watchdog.watchdog_id.startswith("watchdog_"))
        self.assertEqual(self.watchdog.status, "initializing")
        self.assertTrue(self.watchdog.infinity_mode)
    
    def test_activation(self):
        """Test watchdog activation"""
        self.watchdog.activate()
        self.assertEqual(self.watchdog.status, "active")
        self.assertIsNotNone(self.watchdog.activation_time)
    
    def test_system_status(self):
        """Test system status retrieval"""
        self.watchdog.activate()
        status = self.watchdog.get_system_status()
        
        self.assertIn("watchdog_id", status)
        self.assertIn("status", status)
        self.assertIn("infinity_mode", status)
        self.assertEqual(status["status"], "active")
        self.assertTrue(status["infinity_mode"])
    
    def test_config_files_exist(self):
        """Test that required configuration files exist"""
        config_files = [
            "watchdog_config.json",
            "watchdog_memory_map.json", 
            "founder_alerts.json"
        ]
        
        for config_file in config_files:
            file_path = Path(config_file)
            self.assertTrue(file_path.exists(), f"Config file {config_file} should exist")
    
    def test_subsystems_exist(self):
        """Test that all subsystems are initialized"""
        self.assertIsNotNone(self.watchdog.health_loop)
        self.assertIsNotNone(self.watchdog.self_healing)
        self.assertIsNotNone(self.watchdog.memory_sentinel)
        self.assertIsNotNone(self.watchdog.telemetry)
        self.assertIsNotNone(self.watchdog.security)
    
    def test_shutdown(self):
        """Test watchdog shutdown"""
        self.watchdog.activate()
        self.assertEqual(self.watchdog.status, "active")
        
        self.watchdog.shutdown()
        self.assertEqual(self.watchdog.status, "shutdown")


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
    print("🔍 ZORA BASIC WATCHDOG TEST SUITE")
    print("=" * 50)
    
    unittest.main(verbosity=2)
    
    print("=" * 50)
    print("🛡️ Basic watchdog testing completed")
