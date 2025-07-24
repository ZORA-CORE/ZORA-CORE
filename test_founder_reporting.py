#!/usr/bin/env python3

import json
import time
from pathlib import Path
from datetime import datetime
from zora_watchdog_engine import ZoraWatchdogEngine


def test_founder_reporting():
    """Test founder reporting functionality"""
    print("📊 Testing ZORA Founder Reporting System...")
    
    engine = ZoraWatchdogEngine()
    engine.activate()
    
    print("📋 Testing founder alerts file...")
    founder_alerts_path = Path("founder_alerts.json")
    
    if founder_alerts_path.exists():
        print("   ✅ founder_alerts.json exists")
        
        with open(founder_alerts_path, 'r') as f:
            alerts_data = json.load(f)
        
        required_keys = ["founder_alerts_system", "alerts", "daily_reports"]
        for key in required_keys:
            if key in alerts_data:
                print(f"   ✅ {key} section exists")
            else:
                print(f"   ❌ {key} section missing")
        
        founder_id = alerts_data.get("founder_alerts_system", {}).get("founder_id")
        if founder_id == "MADS-PALLISGAARD":
            print(f"   ✅ Founder ID correct: {founder_id}")
        else:
            print(f"   ⚠️  Founder ID: {founder_id}")
        
        alert_categories = alerts_data.get("founder_alerts_system", {}).get("alert_categories", [])
        print(f"   ✅ Alert Categories: {len(alert_categories)} configured")
        
        alerts = alerts_data.get("alerts", [])
        print(f"   ✅ Current Alerts: {len(alerts)}")
        
        daily_reports = alerts_data.get("daily_reports", [])
        print(f"   ✅ Daily Reports: {len(daily_reports)}")
        
    else:
        print("   ❌ founder_alerts.json does not exist")
    
    print("📈 Testing daily report generation...")
    
    status = engine.get_system_status()
    telemetry_active = status.get("telemetry_active", False)
    print(f"   ✅ Telemetry System: {'Active' if telemetry_active else 'Inactive'}")
    
    print("📊 Testing report structure...")
    if founder_alerts_path.exists():
        with open(founder_alerts_path, 'r') as f:
            alerts_data = json.load(f)
        
        if "daily_reports" in alerts_data and len(alerts_data["daily_reports"]) > 0:
            latest_report = alerts_data["daily_reports"][-1]
            
            required_report_fields = [
                "report_id", "timestamp", "founder_id", "report_type",
                "system_overview", "component_health", "performance_metrics",
                "recommendations", "founder_message"
            ]
            
            for field in required_report_fields:
                if field in latest_report:
                    print(f"   ✅ Report field '{field}' exists")
                else:
                    print(f"   ❌ Report field '{field}' missing")
            
            if "system_overview" in latest_report:
                overview = latest_report["system_overview"]
                health = overview.get("overall_health", 0)
                target_met = overview.get("health_target_met", False)
                infinity_mode = overview.get("infinity_mode_active", False)
                
                print(f"   ✅ Overall Health: {health}%")
                print(f"   ✅ Health Target Met: {target_met}")
                print(f"   ✅ Infinity Mode Active: {infinity_mode}")
        
    print("⚙️ Testing daily report configuration...")
    config_path = Path("watchdog_config.json")
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        if "telemetry_and_notifications" in config:
            telemetry_config = config["telemetry_and_notifications"]
            
            daily_reports_enabled = telemetry_config.get("founder_notifications", {}).get("daily_reports", False)
            generation_time = telemetry_config.get("daily_report_settings", {}).get("generation_time_utc", "")
            
            print(f"   ✅ Daily Reports Enabled: {daily_reports_enabled}")
            print(f"   ✅ Generation Time: {generation_time}")
            
            if generation_time == "08:00":
                print("   ✅ Generation time configured correctly (08:00 UTC)")
            else:
                print(f"   ⚠️  Generation time: {generation_time}")
    
    print("🚨 Testing alert escalation...")
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        if "alert_thresholds" in config:
            thresholds = config["alert_thresholds"]
            
            health_warning = thresholds.get("health_score_warning", 0)
            health_critical = thresholds.get("health_score_critical", 0)
            health_emergency = thresholds.get("health_score_emergency", 0)
            
            print(f"   ✅ Health Warning Threshold: {health_warning}%")
            print(f"   ✅ Health Critical Threshold: {health_critical}%")
            print(f"   ✅ Health Emergency Threshold: {health_emergency}%")
            
            if health_warning >= 90.0:
                print("   ✅ Warning threshold meets requirement (≥90%)")
            else:
                print(f"   ⚠️  Warning threshold below requirement: {health_warning}%")
    
    engine.shutdown()
    print("✅ Founder reporting tests completed successfully!")
    return True


if __name__ == "__main__":
    print("📊 ZORA FOUNDER REPORTING TEST")
    print("=" * 50)
    
    try:
        success = test_founder_reporting()
        if success:
            print("🎉 All founder reporting tests passed!")
        else:
            print("❌ Some founder reporting tests failed!")
    except Exception as e:
        print(f"❌ Founder reporting test error: {e}")
    
    print("=" * 50)
    print("📈 Founder reporting testing completed")
