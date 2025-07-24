#!/usr/bin/env python3

import asyncio
import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from repo_monitor import ZoraRepoMonitor, IssueType, RepoIssue


class TestSecurityAutoPatch(unittest.TestCase):
    """Test suite for ZORA Security Auto-Patch functionality"""
    
    def setUp(self):
        """Set up test environment"""
        self.monitor = ZoraRepoMonitor()
        self.monitor.security_scanner_enabled = True
        self.monitor.security_auto_patch_enabled = True
        self.monitor.start_monitoring()
    
    def tearDown(self):
        """Clean up test environment"""
        self.monitor.shutdown()
    
    def test_security_scanner_initialization(self):
        """Test security scanner initialization"""
        self.assertTrue(self.monitor.security_scanner_enabled)
        self.assertTrue(self.monitor.security_auto_patch_enabled)
        self.assertEqual(self.monitor.security_scan_interval, 300)
        self.assertEqual(self.monitor.security_vulnerabilities_detected, 0)
        self.assertEqual(self.monitor.security_patches_applied, 0)
    
    def test_should_run_security_scan(self):
        """Test security scan timing logic"""
        self.assertTrue(self.monitor.should_run_security_scan())
        
        self.monitor.last_security_scan = datetime.utcnow()
        self.assertFalse(self.monitor.should_run_security_scan())
        
        self.monitor.security_scanner_enabled = False
        self.assertFalse(self.monitor.should_run_security_scan())
    
    async def test_dependency_vulnerability_scanning(self):
        """Test dependency vulnerability scanning"""
        repo_key = "github:test-repo"
        platform = "github"
        repo_name = "test-repo"
        
        initial_count = self.monitor.security_vulnerabilities_detected
        
        with patch('random.random', return_value=0.1):  # Force vulnerability detection
            await self.monitor.scan_dependency_vulnerabilities(repo_key, platform, repo_name)
        
        self.assertGreater(self.monitor.security_vulnerabilities_detected, initial_count)
        
        security_issues = [
            issue for issue in self.monitor.repo_issues 
            if issue.issue_type == IssueType.SECURITY_OUTDATED_DEPENDENCY
        ]
        self.assertGreater(len(security_issues), 0)
    
    async def test_exposed_secret_scanning(self):
        """Test exposed secret scanning"""
        repo_key = "github:test-repo"
        platform = "github"
        repo_name = "test-repo"
        
        initial_count = self.monitor.security_vulnerabilities_detected
        
        with patch('random.random', return_value=0.05):  # Force secret detection
            await self.monitor.scan_exposed_secrets(repo_key, platform, repo_name)
        
        self.assertGreater(self.monitor.security_vulnerabilities_detected, initial_count)
        
        secret_issues = [
            issue for issue in self.monitor.repo_issues 
            if issue.issue_type == IssueType.SECURITY_EXPOSED_SECRET
        ]
        self.assertGreater(len(secret_issues), 0)
        
        if secret_issues:
            self.assertEqual(secret_issues[0].severity, "critical")
    
    async def test_security_misconfiguration_scanning(self):
        """Test security misconfiguration scanning"""
        repo_key = "github:test-repo"
        platform = "github"
        repo_name = "test-repo"
        
        initial_count = self.monitor.security_vulnerabilities_detected
        
        with patch('random.random', return_value=0.1):  # Force misconfiguration detection
            await self.monitor.scan_security_misconfigurations(repo_key, platform, repo_name)
        
        self.assertGreater(self.monitor.security_vulnerabilities_detected, initial_count)
        
        config_issues = [
            issue for issue in self.monitor.repo_issues 
            if issue.issue_type == IssueType.SECURITY_MISCONFIGURATION
        ]
        self.assertGreater(len(config_issues), 0)
    
    async def test_code_security_scanning(self):
        """Test code security issue scanning"""
        repo_key = "github:test-repo"
        platform = "github"
        repo_name = "test-repo"
        
        initial_count = self.monitor.security_vulnerabilities_detected
        
        with patch('random.random', return_value=0.1):  # Force code issue detection
            await self.monitor.scan_code_security_issues(repo_key, platform, repo_name)
        
        self.assertGreater(self.monitor.security_vulnerabilities_detected, initial_count)
        
        code_issues = [
            issue for issue in self.monitor.repo_issues 
            if issue.issue_type == IssueType.SECURITY_VULNERABILITY
        ]
        self.assertGreater(len(code_issues), 0)
        
        if code_issues:
            self.assertFalse(code_issues[0].auto_fixable)
    
    async def test_dependency_patch_application(self):
        """Test dependency vulnerability patching"""
        issue = RepoIssue(
            repo_name="test-repo",
            title="Vulnerable lodash dependency",
            description="lodash version <4.17.21 detected",
            issue_type=IssueType.SECURITY_OUTDATED_DEPENDENCY,
            severity="high",
            auto_fixable=True,
            detected_at=datetime.utcnow()
        )
        
        result = await self.monitor.patch_dependency_vulnerability(issue)
        self.assertTrue(result)
    
    async def test_exposed_secret_patch_application(self):
        """Test exposed secret patching"""
        issue = RepoIssue(
            repo_name="test-repo",
            title="Exposed AWS access key",
            description="AWS access key found in code",
            issue_type=IssueType.SECURITY_EXPOSED_SECRET,
            severity="critical",
            auto_fixable=True,
            detected_at=datetime.utcnow()
        )
        
        with patch.object(self.monitor, 'escalate_security_issue', new_callable=AsyncMock):
            result = await self.monitor.patch_exposed_secret(issue)
            self.assertTrue(result)
    
    async def test_security_misconfiguration_patch_application(self):
        """Test security misconfiguration patching"""
        issue = RepoIssue(
            repo_name="test-repo",
            title="CORS misconfiguration",
            description="Insecure CORS configuration detected",
            issue_type=IssueType.SECURITY_MISCONFIGURATION,
            severity="medium",
            auto_fixable=True,
            detected_at=datetime.utcnow()
        )
        
        result = await self.monitor.patch_security_misconfiguration(issue)
        self.assertTrue(result)
    
    async def test_security_issue_escalation(self):
        """Test security issue escalation to founder alerts"""
        issue = RepoIssue(
            repo_name="test-repo",
            title="Critical SQL injection vulnerability",
            description="SQL injection vulnerability in user input handling",
            issue_type=IssueType.SECURITY_VULNERABILITY,
            severity="critical",
            auto_fixable=False,
            detected_at=datetime.utcnow()
        )
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({"security_escalations": []}, f)
            temp_file = f.name
        
        with patch('pathlib.Path') as mock_path:
            mock_path.return_value.exists.return_value = True
            mock_path.return_value.__str__ = lambda x: temp_file
            
            await self.monitor.escalate_security_issue(issue)
        
        with open(temp_file, 'r') as f:
            alerts = json.load(f)
            self.assertIn("security_escalations", alerts)
            self.assertGreater(len(alerts["security_escalations"]), 0)
        
        Path(temp_file).unlink()
    
    async def test_complete_security_patch_workflow(self):
        """Test complete security patch workflow"""
        issue = RepoIssue(
            repo_name="test-repo",
            title="Vulnerable dependency",
            description="Outdated dependency with known vulnerabilities",
            issue_type=IssueType.SECURITY_OUTDATED_DEPENDENCY,
            severity="high",
            auto_fixable=True,
            detected_at=datetime.utcnow()
        )
        
        self.monitor.repo_issues.append(issue)
        initial_patches = self.monitor.security_patches_applied
        
        with patch.object(self.monitor, 'report_security_patch_to_watchdog', new_callable=AsyncMock):
            result = await self.monitor.apply_security_patch(issue)
            self.assertTrue(result)
        
        self.assertEqual(self.monitor.security_patches_applied, initial_patches + 1)
    
    async def test_watchdog_integration(self):
        """Test watchdog engine integration"""
        self.monitor.initialize_watchdog_integration()
        
        with patch.object(self.monitor, 'watchdog_engine') as mock_watchdog:
            mock_watchdog.report_repo_monitor_status = AsyncMock()
            
            await self.monitor.report_to_watchdog()
            
            mock_watchdog.report_repo_monitor_status.assert_called_once()
    
    def test_security_metrics_in_status(self):
        """Test security metrics are included in monitoring status"""
        self.monitor.security_vulnerabilities_detected = 5
        self.monitor.security_patches_applied = 3
        
        status = self.monitor.get_monitoring_status()
        
        self.assertIn("security_metrics", status)
        self.assertEqual(status["security_metrics"]["vulnerabilities_detected"], 5)
        self.assertEqual(status["security_metrics"]["patches_applied"], 3)
        self.assertTrue(status["security_metrics"]["security_scan_enabled"])
        self.assertTrue(status["security_metrics"]["auto_patch_enabled"])
    
    async def test_security_scan_cycle_integration(self):
        """Test complete security scan cycle"""
        self.monitor.monitored_repos["github:test-repo"] = {
            "platform": "github",
            "repo_name": "test-repo",
            "monitoring_active": True
        }
        
        initial_vulnerabilities = self.monitor.security_vulnerabilities_detected
        
        with patch('random.random', return_value=0.1):  # Force issue detection
            await self.monitor.run_security_scan_cycle()
        
        self.assertIsNotNone(self.monitor.last_security_scan)
        
        self.assertGreaterEqual(self.monitor.security_vulnerabilities_detected, initial_vulnerabilities)


async def run_async_tests():
    """Run async test methods"""
    test_instance = TestSecurityAutoPatch()
    test_instance.setUp()
    
    try:
        print("🔒 Testing Security Auto-Patch Functionality...")
        
        await test_instance.test_dependency_vulnerability_scanning()
        print("✅ Dependency vulnerability scanning test passed")
        
        await test_instance.test_exposed_secret_scanning()
        print("✅ Exposed secret scanning test passed")
        
        await test_instance.test_security_misconfiguration_scanning()
        print("✅ Security misconfiguration scanning test passed")
        
        await test_instance.test_code_security_scanning()
        print("✅ Code security scanning test passed")
        
        await test_instance.test_dependency_patch_application()
        print("✅ Dependency patch application test passed")
        
        await test_instance.test_exposed_secret_patch_application()
        print("✅ Exposed secret patch application test passed")
        
        await test_instance.test_security_misconfiguration_patch_application()
        print("✅ Security misconfiguration patch application test passed")
        
        await test_instance.test_security_issue_escalation()
        print("✅ Security issue escalation test passed")
        
        await test_instance.test_complete_security_patch_workflow()
        print("✅ Complete security patch workflow test passed")
        
        await test_instance.test_watchdog_integration()
        print("✅ Watchdog integration test passed")
        
        await test_instance.test_security_scan_cycle_integration()
        print("✅ Security scan cycle integration test passed")
        
        print("🎉 All Security Auto-Patch tests passed!")
        
    finally:
        test_instance.tearDown()


if __name__ == "__main__":
    print("🔒 ZORA Security Auto-Patch Test Suite")
    print("=" * 50)
    
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    asyncio.run(run_async_tests())
    
    print("=" * 50)
    print("🛡️ Security Auto-Patch testing completed")
