"""
ZORA CORE Email Integration System
INFINITY INJEKTION™ - Automatic HQ address injection for all outgoing emails
"""

import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from zora_contact_config import (
    get_official_address_for_documents,
    get_operational_addresses,
    generate_email_footer,
    INFINITY_EMAIL,
    INFINITY_CVR
)

class ZoraEmailIntegration:
    """Handles automatic injection of ZORA HQ address into all emails"""
    
    def __init__(self):
        self.hq_address = get_official_address_for_documents()
        self.operational_addresses = get_operational_addresses()
        
    def inject_hq_address(self, email_content, language="da", email_type="standard"):
        """Inject HQ address into email content"""
        footer = generate_email_footer(language)
        
        if email_type == "invoice":
            invoice_header = self.get_invoice_email_header()
            return f"{invoice_header}\n\n{email_content}\n{footer}"
        elif email_type == "legal":
            legal_header = self.get_legal_email_header()
            return f"{legal_header}\n\n{email_content}\n{footer}"
        else:
            return f"{email_content}\n{footer}"
    
    def get_invoice_email_header(self):
        """Get invoice-specific email header with HQ address"""
        return f"""
FAKTURA / INVOICE
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}
Email: {INFINITY_EMAIL}
"""
    
    def get_legal_email_header(self):
        """Get legal document email header with HQ address"""
        return f"""
JURIDISK DOKUMENT / LEGAL DOCUMENT
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}
Email: {INFINITY_EMAIL}
"""
    
    def create_email_signature(self, language="da"):
        """Create standardized email signature with HQ and operational addresses"""
        signatures = {
            "da": f"""
Med venlig hilsen / Best regards,
ZORA CORE

Hovedkontor: {self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Daglige aktiviteter: {self.operational_addresses['structure']}
{self.operational_addresses['formatted_structure']}

Email: {INFINITY_EMAIL}
""",
            "en": f"""
Best regards,
ZORA CORE

Headquarters: {self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Daily Operations: {self.operational_addresses['structure']}
{self.operational_addresses['formatted_structure']}

Email: {INFINITY_EMAIL}
""",
            "de": f"""
Mit freundlichen Grüßen,
ZORA CORE

Hauptsitz: {self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Tägliche Operationen: {self.operational_addresses['structure']}
{self.operational_addresses['formatted_structure']}

Email: {INFINITY_EMAIL}
""",
            "fr": f"""
Cordialement,
ZORA CORE

Siège social: {self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Opérations quotidiennes: {self.operational_addresses['structure']}
{self.operational_addresses['formatted_structure']}

Email: {INFINITY_EMAIL}
"""
        }
        
        return signatures.get(language, signatures["da"])
    
    def validate_email_integration(self):
        """Validate that email integration is working correctly"""
        test_content = "Dette er en test email."
        injected = self.inject_hq_address(test_content, "da")
        
        validation_checks = [
            (self.hq_address['name'] in injected, "HQ name present"),
            (self.hq_address['address'] in injected, "HQ address present"),
            (self.hq_address['cvr'] in injected, "CVR present"),
            (INFINITY_EMAIL in injected, "Email present"),
            (self.operational_addresses['structure'] in injected, "Operational structure present")
        ]
        
        all_passed = all(check[0] for check in validation_checks)
        
        return {
            "validation_passed": all_passed,
            "checks": validation_checks,
            "timestamp": datetime.now().isoformat()
        }

def auto_inject_email_footer(email_content, language="da", email_type="standard"):
    """Convenience function for automatic email footer injection"""
    integration = ZoraEmailIntegration()
    return integration.inject_hq_address(email_content, language, email_type)

def get_email_signature(language="da"):
    """Convenience function for getting email signature"""
    integration = ZoraEmailIntegration()
    return integration.create_email_signature(language)

if __name__ == "__main__":
    integration = ZoraEmailIntegration()
    validation = integration.validate_email_integration()
    
    print("✅ ZORA Email Integration System")
    print(f"📧 Validation: {'PASSED' if validation['validation_passed'] else 'FAILED'}")
    print(f"🏢 HQ Address: {integration.hq_address['name']}")
    print(f"📍 Operational: {integration.operational_addresses['structure']}")
    print("♾️ INFINITY INJEKTION™ Email System Active")
