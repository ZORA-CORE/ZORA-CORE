#!/usr/bin/env python3

import sys
import os
import time
import requests
from threading import Thread

sys.path.append(os.path.join(os.path.dirname(__file__), 'components'))

from app import app

def run_flask_app():
    """Run Flask app on port 5001"""
    app.run(host="0.0.0.0", port=5001, debug=False, use_reloader=False)

def test_flask_endpoints():
    """Test Flask endpoints and verify INFINITY INJEKTION™ integration"""
    base_url = "http://localhost:5001"
    
    print("🧪 Testing ZORA CORE Flask Application with INFINITY INJEKTION™")
    print("=" * 60)
    
    time.sleep(2)
    
    try:
        print("📄 Testing main page...")
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            content = response.text
            
            checks = [
                ("Fjordbakken 50", "HQ Address"),
                ("37750514", "CVR Number"),
                ("kontakt@zoracore.dk", "Contact Email"),
                ("KOBBERHJØRNET x ORINGE", "P-enheder Structure"),
                ("Teatergade 4", "KOBBERHJØRNET Address"),
                ("Færgegaardsvej 15", "ORINGE Address"),
                ("INFINITY MODE", "Infinity Mode"),
                ("zora-infinity-contact", "Contact CSS Class")
            ]
            
            for check_text, description in checks:
                if check_text in content:
                    print(f"  ✅ {description}: Found")
                else:
                    print(f"  ❌ {description}: Missing")
            
            print(f"  📊 Page size: {len(content)} characters")
        else:
            print(f"  ❌ Main page failed: {response.status_code}")
    
    except Exception as e:
        print(f"  ❌ Main page error: {e}")
    
    try:
        print("\n📊 Testing status endpoint...")
        response = requests.get(f"{base_url}/status")
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Status: {data.get('status')}")
            print(f"  ✅ Infinity Mode: {data.get('infinity_mode')}")
            
            contact_info = data.get('contact_info', {})
            if contact_info:
                print(f"  ✅ Contact info included in status")
                print(f"  📧 Email: {contact_info.get('contact', {}).get('email')}")
                print(f"  🏛️ CVR: {contact_info.get('headquarters', {}).get('cvr')}")
            else:
                print(f"  ❌ Contact info missing from status")
        else:
            print(f"  ❌ Status endpoint failed: {response.status_code}")
    
    except Exception as e:
        print(f"  ❌ Status endpoint error: {e}")
    
    try:
        print("\n📧 Testing contact API endpoint...")
        response = requests.get(f"{base_url}/api/contact")
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Contact system: {data.get('contact_system')}")
            print(f"  ✅ Headquarters: {data.get('headquarters', {}).get('name')}")
            print(f"  ✅ P-enheder structure: {data.get('p_enheder', {}).get('structure')}")
            print(f"  ✅ Email: {data.get('contact', {}).get('email')}")
            print(f"  ✅ Phone: {data.get('contact', {}).get('phone')}")
        else:
            print(f"  ❌ Contact API failed: {response.status_code}")
    
    except Exception as e:
        print(f"  ❌ Contact API error: {e}")
    
    try:
        print("\n🌍 Testing localized contact endpoint...")
        for lang in ['en', 'da', 'de', 'fr']:
            response = requests.get(f"{base_url}/api/contact/{lang}")
            if response.status_code == 200:
                data = response.json()
                email_label = data.get('email_label')
                print(f"  ✅ {lang.upper()}: {email_label}")
            else:
                print(f"  ❌ {lang.upper()}: Failed")
    
    except Exception as e:
        print(f"  ❌ Localized contact error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 INFINITY INJEKTION™ Flask Application Test Complete!")

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
    print("🚀 Starting Flask app on port 5001...")
    
    flask_thread = Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    
    test_flask_endpoints()
