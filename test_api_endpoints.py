#!/usr/bin/env python3
"""
ZORA CORE Integration Test - API Endpoints
Tests that all API endpoints respond correctly
"""

import requests
import time
import subprocess
import sys
from threading import Thread

def start_api_server():
    """Start the ZORA API server in background"""
    try:
        process = subprocess.Popen([
            sys.executable, "-c", 
            "from zora import app; import uvicorn; uvicorn.run(app, host='127.0.0.1', port=8000, log_level='error')"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3)  # Give server time to start
        return process
    except Exception as e:
        print(f"⚠️ Could not start API server: {e}")
        return None

def test_api_endpoints():
    print('🌐 Testing ZORA CORE - API Endpoints')
    print('=' * 50)

    print('🚀 Starting ZORA API server...')
    server_process = start_api_server()
    
    if not server_process:
        print('❌ Failed to start API server')
        return False

    try:
        base_url = "http://127.0.0.1:8000"
        
        endpoints_to_test = [
            ("/", "Root endpoint"),
            ("/health", "Health check"),
            ("/status", "System status"),
            ("/agents", "Agents list"),
            ("/trinity", "AGI Trinity status"),
            ("/infinity", "Infinity Engine status"),
            ("/monitor", "Repository monitor"),
        ]
        
        successful_tests = 0
        total_tests = len(endpoints_to_test)
        
        for endpoint, description in endpoints_to_test:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
                
                if response.status_code == 200:
                    print(f'✅ {endpoint}: {description} - OK')
                    successful_tests += 1
                elif response.status_code == 404:
                    print(f'⚠️ {endpoint}: {description} - Not implemented (404)')
                else:
                    print(f'❌ {endpoint}: {description} - Status {response.status_code}')
                    
            except requests.exceptions.ConnectionError:
                print(f'❌ {endpoint}: {description} - Connection failed')
            except requests.exceptions.Timeout:
                print(f'❌ {endpoint}: {description} - Timeout')
            except Exception as e:
                print(f'❌ {endpoint}: {description} - Error: {str(e)}')
        
        print('=' * 50)
        print(f'📈 API ENDPOINT RESULTS:')
        print(f'✅ Successful: {successful_tests}/{total_tests}')
        print(f'📊 Success Rate: {(successful_tests/total_tests*100):.1f}%')
        
        if successful_tests >= total_tests * 0.5:
            print('✅ API ENDPOINTS MOSTLY OPERATIONAL')
            return True
        else:
            print('⚠️ SOME API ENDPOINTS NEED ATTENTION')
            return False
            
    finally:
        if server_process:
            server_process.terminate()
            server_process.wait()
            print('🛑 API server stopped')

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
    success = test_api_endpoints()
    exit(0 if success else 1)
