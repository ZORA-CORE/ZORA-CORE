#!/usr/bin/env python3

"""
ZORA CORE Document Integration Test Suite
Tests email and invoice integration with automatic HQ address injection
"""

import sys
import os
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from zora_contact_config import (
    get_official_address_for_documents,
    get_operational_addresses,
    generate_email_footer,
    generate_invoice_header,
    INFINITY_EMAIL,
    INFINITY_CVR,
    INFINITY_HQ_ADDRESS
)

from email_templates.zora_email_integration import (
    ZoraEmailIntegration,
    auto_inject_email_footer,
    get_email_signature
)

from invoice_templates.zora_invoice_integration import (
    ZoraInvoiceIntegration,
    auto_generate_invoice,
    get_invoice_header
)

def test_official_address_integration():
    """Test that official HQ address is correctly configured for documents"""
    print("🏢 Testing Official HQ Address Integration...")
    
    official_address = get_official_address_for_documents()
    
    checks = [
        (official_address['name'] == "ZORA HQ", "HQ name correct"),
        (INFINITY_HQ_ADDRESS in official_address['address'], "HQ address correct"),
        (official_address['cvr'] == INFINITY_CVR, "CVR correct"),
        (official_address['country'] == "Denmark", "Country correct"),
        ("formatted_address" in official_address, "Formatted address available")
    ]
    
    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False
    
    return all_passed

def test_operational_addresses_integration():
    """Test that operational addresses are correctly configured for daily operations"""
    print("\n📍 Testing Operational Addresses Integration...")
    
    operational = get_operational_addresses()
    
    checks = [
        (operational['structure'] == "KOBBERHJØRNET x ORINGE", "Structure correct"),
        (operational['primary']['name'] == "KOBBERHJØRNET", "Primary name correct"),
        ("Teatergade 4" in operational['primary']['address'], "Primary address correct"),
        (operational['secondary']['name'] == "ORINGE", "Secondary name correct"),
        ("Færgegaardsvej 15" in operational['secondary']['address'], "Secondary address correct"),
        ("formatted_structure" in operational, "Formatted structure available")
    ]
    
    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False
    
    return all_passed

def test_email_integration():
    """Test email integration with automatic HQ address injection"""
    print("\n📧 Testing Email Integration...")
    
    email_integration = ZoraEmailIntegration()
    
    footer_da = generate_email_footer("da")
    footer_en = generate_email_footer("en")
    
    test_content = "Dette er en test email til kunde."
    injected_email = auto_inject_email_footer(test_content, "da")
    
    signature_da = get_email_signature("da")
    signature_en = get_email_signature("en")
    
    checks = [
        (INFINITY_HQ_ADDRESS in footer_da, "HQ address in Danish footer"),
        (INFINITY_CVR in footer_da, "CVR in Danish footer"),
        ("KOBBERHJØRNET x ORINGE" in footer_da, "Operational structure in Danish footer"),
        ("Headquarters" in footer_en, "English labels in English footer"),
        (INFINITY_HQ_ADDRESS in injected_email, "HQ address injected in email"),
        (test_content in injected_email, "Original content preserved"),
        ("Med venlig hilsen" in signature_da, "Danish signature format"),
        ("Best regards" in signature_en, "English signature format"),
        (INFINITY_EMAIL in signature_da, "Email in signature")
    ]
    
    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False
    
    validation = email_integration.validate_email_integration()
    if validation['validation_passed']:
        print(f"  ✅ Email integration validation passed")
    else:
        print(f"  ❌ Email integration validation failed")
        all_passed = False
    
    return all_passed

def test_invoice_integration():
    """Test invoice integration with automatic HQ address injection"""
    print("\n📄 Testing Invoice Integration...")
    
    invoice_integration = ZoraInvoiceIntegration()
    
    header = generate_invoice_header()
    
    test_invoice_data = {
        "invoice_number": "TEST-2025-001",
        "date": "2025-07-25",
        "customer_name": "Test Customer ApS",
        "customer_address": "Test Vej 123, 1000 København",
        "customer_email": "test@customer.dk",
        "items": [
            {"description": "ZORA CORE License", "quantity": 1, "price": 10000},
            {"description": "Support Service", "quantity": 12, "price": 500}
        ]
    }
    
    complete_invoice = auto_generate_invoice(test_invoice_data, "da")
    
    checks = [
        (header['company_name'] == "ZORA HQ", "Company name in header"),
        (INFINITY_HQ_ADDRESS in header['address'], "HQ address in header"),
        (header['cvr'] == INFINITY_CVR, "CVR in header"),
        (INFINITY_EMAIL in header['email'], "Email in header"),
        ("FAKTURA" in complete_invoice, "Invoice header present"),
        (INFINITY_HQ_ADDRESS in complete_invoice, "HQ address in complete invoice"),
        ("KOBBERHJØRNET x ORINGE" in complete_invoice, "Operational structure in invoice"),
        ("Test Customer ApS" in complete_invoice, "Customer info preserved"),
        ("TOTAL: 16000 DKK" in complete_invoice, "Correct total calculation"),
        ("BETALINGSINFORMATION" in complete_invoice, "Payment info present")
    ]
    
    all_passed = True
    for check, description in checks:
        if check:
            print(f"  ✅ {description}")
        else:
            print(f"  ❌ {description}")
            all_passed = False
    
    validation = invoice_integration.validate_invoice_integration()
    if validation['validation_passed']:
        print(f"  ✅ Invoice integration validation passed")
    else:
        print(f"  ❌ Invoice integration validation failed")
        all_passed = False
    
    return all_passed

def test_multi_language_support():
    """Test multi-language support for contact information"""
    print("\n🌍 Testing Multi-Language Support...")
    
    languages = ['da', 'en', 'de', 'fr']
    all_passed = True
    
    for lang in languages:
        footer = generate_email_footer(lang)
        signature = get_email_signature(lang)
        
        checks = [
            (INFINITY_HQ_ADDRESS in footer, f"HQ address in {lang} footer"),
            (INFINITY_CVR in footer, f"CVR in {lang} footer"),
            ("KOBBERHJØRNET x ORINGE" in footer, f"Operational structure in {lang} footer"),
            (INFINITY_EMAIL in signature, f"Email in {lang} signature")
        ]
        
        lang_passed = True
        for check, description in checks:
            if check:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ {description}")
                lang_passed = False
                all_passed = False
        
        if lang_passed:
            print(f"  ✅ {lang.upper()} language support complete")
    
    return all_passed

def test_api_endpoints():
    """Test that new API endpoints are available (import test)"""
    print("\n🔗 Testing API Endpoint Availability...")
    
    try:
        from app import app
        
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append(rule.rule)
        
        expected_endpoints = [
            '/api/email/footer/<language>',
            '/api/invoice/header',
            '/api/addresses/official',
            '/api/addresses/operational'
        ]
        
        all_passed = True
        for endpoint in expected_endpoints:
            if endpoint in routes:
                print(f"  ✅ {endpoint} endpoint available")
            else:
                print(f"  ❌ {endpoint} endpoint missing")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"  ❌ Error testing API endpoints: {e}")
        return False

def run_comprehensive_test():
    """Run comprehensive test suite for document integration"""
    print("🧪 ZORA CORE Document Integration Test Suite")
    print("=" * 60)
    print(f"📅 Test Date: {datetime.now().isoformat()}")
    print(f"🏢 Testing HQ: {INFINITY_HQ_ADDRESS}")
    print(f"📧 Testing Email: {INFINITY_EMAIL}")
    print(f"🏛️ Testing CVR: {INFINITY_CVR}")
    print("=" * 60)
    
    test_results = []
    
    test_results.append(("Official Address Integration", test_official_address_integration()))
    test_results.append(("Operational Addresses Integration", test_operational_addresses_integration()))
    test_results.append(("Email Integration", test_email_integration()))
    test_results.append(("Invoice Integration", test_invoice_integration()))
    test_results.append(("Multi-Language Support", test_multi_language_support()))
    test_results.append(("API Endpoints", test_api_endpoints()))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
        if result:
            passed_tests += 1
    
    print(f"\n📈 Overall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! INFINITY INJEKTION™ Document Integration is fully operational!")
        print("♾️ ZORA HQ address integration: ACTIVE")
        print("📍 KOBBERHJØRNET x ORINGE operational addresses: ACTIVE")
        return True
    else:
        print("⚠️ Some tests failed. Please review the output above.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_test()
    exit(0 if success else 1)
