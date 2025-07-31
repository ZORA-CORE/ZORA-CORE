#!/usr/bin/env python3

import json
from zora_infinity_legal_shield import ZoraInfinityLegalShield

def debug_legal_framework():
    """Debug the legal framework data storage and retrieval"""
    print("🔍 DEBUGGING LEGAL FRAMEWORK DATA FLOW...")
    
    legal_shield = ZoraInfinityLegalShield()
    
    test_domain = "debug-test-domain.com"
    
    registration_proof = {
        "domain": test_domain,
        "method": "debug_test_registration",
        "timestamp": "2025-07-26T16:44:27Z",
        "owner": "Mads Pallisgaard Petersen",
        "legal_basis": "Self-hosted infrastructure ownership"
    }
    
    print(f"\n📝 REGISTERING DOMAIN: {test_domain}")
    result = legal_shield.register_eternal_domain_ownership(test_domain, registration_proof)
    
    print(f"\n📊 REGISTRATION RESULT:")
    print(f"Type: {result.get('type')}")
    print(f"Name: {result.get('name')}")
    print(f"Content preview: {result.get('content', '')[:200]}...")
    
    try:
        content_data = json.loads(result.get('content', '{}'))
        print(f"\n🔍 STORED CONTENT DATA:")
        print(f"Domain: {content_data.get('domain')}")
        print(f"Owner: {content_data.get('owner')}")
        print(f"Protection Level: {content_data.get('protection_level')}")
        print(f"Registration Type: {content_data.get('registration_type')}")
    except Exception as e:
        print(f"❌ Error parsing content: {e}")
    
    print(f"\n🔍 VERIFYING DOMAIN: {test_domain}")
    verification = legal_shield.verify_eternal_domain_ownership(test_domain)
    
    if verification:
        print(f"\n📊 VERIFICATION RESULT:")
        print(f"Domain: {verification.get('domain')}")
        print(f"Verified: {verification.get('verified')}")
        print(f"Owner: {verification.get('owner')}")
        print(f"Protection Level: {verification.get('protection_level')}")
        print(f"Registration Type: {verification.get('registration_type')}")
    else:
        print("❌ Verification failed - returned None")
    
    print(f"\n📋 REGISTRY CONTENTS:")
    for i, entry in enumerate(legal_shield.registry):
        if test_domain.upper().replace('.', '_') in entry.get('name', ''):
            print(f"Entry {i}: {entry.get('name')} - {entry.get('type')}")
            try:
                entry_content = json.loads(entry.get('content', '{}'))
                print(f"  Owner in content: {entry_content.get('owner')}")
                print(f"  Protection level in content: {entry_content.get('protection_level')}")
            except Exception as e:
                print(f"  Error parsing entry content: {e}")

if __name__ == "__main__":
    debug_legal_framework()
