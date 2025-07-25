"""
ZORA CORE Invoice Integration System
INFINITY INJEKTION™ - Automatic HQ address injection for all invoices
"""

import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from zora_contact_config import (
    get_official_address_for_documents,
    get_operational_addresses,
    generate_invoice_header,
    INFINITY_EMAIL,
    INFINITY_CVR
)

class ZoraInvoiceIntegration:
    """Handles automatic injection of ZORA HQ address into all invoices"""
    
    def __init__(self):
        self.hq_address = get_official_address_for_documents()
        self.operational_addresses = get_operational_addresses()
        
    def create_invoice_header(self, invoice_number=None, date=None):
        """Create standardized invoice header with HQ address"""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        if not invoice_number:
            invoice_number = f"ZORA-{datetime.now().strftime('%Y%m%d')}-001"
            
        return f"""
FAKTURA / INVOICE
Fakturanummer / Invoice Number: {invoice_number}
Dato / Date: {date}

UDSTEDER / ISSUER:
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}
{self.hq_address['country']}
Email: {INFINITY_EMAIL}

DAGLIGE AKTIVITETER / DAILY OPERATIONS:
{self.operational_addresses['structure']}
{self.operational_addresses['formatted_structure']}
"""
    
    def create_invoice_footer(self, language="da"):
        """Create standardized invoice footer"""
        footers = {
            "da": f"""
---
BETALINGSINFORMATION / PAYMENT INFORMATION:
Alle betalinger skal sendes til den officielle adresse:
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

For spørgsmål kontakt: {INFINITY_EMAIL}

ZORA CORE - Infinity Mode™ Aktiveret
""",
            "en": f"""
---
PAYMENT INFORMATION:
All payments should be sent to the official address:
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

For questions contact: {INFINITY_EMAIL}

ZORA CORE - Infinity Mode™ Activated
""",
            "de": f"""
---
ZAHLUNGSINFORMATIONEN:
Alle Zahlungen sollten an die offizielle Adresse gesendet werden:
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Für Fragen kontaktieren Sie: {INFINITY_EMAIL}

ZORA CORE - Infinity Mode™ Aktiviert
""",
            "fr": f"""
---
INFORMATIONS DE PAIEMENT:
Tous les paiements doivent être envoyés à l'adresse officielle:
{self.hq_address['name']}
{self.hq_address['address']}
CVR: {self.hq_address['cvr']}

Pour toute question, contactez: {INFINITY_EMAIL}

ZORA CORE - Infinity Mode™ Activé
"""
        }
        
        return footers.get(language, footers["da"])
    
    def generate_complete_invoice(self, invoice_data, language="da"):
        """Generate complete invoice with automatic HQ address injection"""
        header = self.create_invoice_header(
            invoice_data.get("invoice_number"),
            invoice_data.get("date")
        )
        
        customer_info = f"""
KUNDE / CUSTOMER:
{invoice_data.get('customer_name', 'N/A')}
{invoice_data.get('customer_address', 'N/A')}
{invoice_data.get('customer_email', 'N/A')}
"""
        
        items_section = "\nVARER/TJENESTER / ITEMS/SERVICES:\n"
        items = invoice_data.get('items', [])
        total = 0
        
        for item in items:
            item_total = item.get('quantity', 1) * item.get('price', 0)
            total += item_total
            items_section += f"- {item.get('description', 'N/A')} | Antal/Qty: {item.get('quantity', 1)} | Pris/Price: {item.get('price', 0)} DKK | Total: {item_total} DKK\n"
        
        items_section += f"\nTOTAL: {total} DKK\n"
        
        footer = self.create_invoice_footer(language)
        
        complete_invoice = f"{header}\n{customer_info}\n{items_section}\n{footer}"
        
        return complete_invoice
    
    def validate_invoice_integration(self):
        """Validate that invoice integration includes all required HQ information"""
        test_invoice_data = {
            "invoice_number": "TEST-001",
            "date": "2025-07-25",
            "customer_name": "Test Customer",
            "customer_address": "Test Address",
            "customer_email": "test@example.com",
            "items": [
                {"description": "Test Service", "quantity": 1, "price": 1000}
            ]
        }
        
        invoice = self.generate_complete_invoice(test_invoice_data, "da")
        
        validation_checks = [
            (self.hq_address['name'] in invoice, "HQ name present"),
            (self.hq_address['address'] in invoice, "HQ address present"),
            (self.hq_address['cvr'] in invoice, "CVR present"),
            (INFINITY_EMAIL in invoice, "Email present"),
            (self.operational_addresses['structure'] in invoice, "Operational structure present"),
            ("FAKTURA" in invoice, "Invoice header present"),
            ("BETALINGSINFORMATION" in invoice, "Payment info present")
        ]
        
        all_passed = all(check[0] for check in validation_checks)
        
        return {
            "validation_passed": all_passed,
            "checks": validation_checks,
            "sample_invoice": invoice,
            "timestamp": datetime.now().isoformat()
        }

def auto_generate_invoice(invoice_data, language="da"):
    """Convenience function for automatic invoice generation with HQ address"""
    integration = ZoraInvoiceIntegration()
    return integration.generate_complete_invoice(invoice_data, language)

def get_invoice_header(invoice_number=None, date=None):
    """Convenience function for getting invoice header"""
    integration = ZoraInvoiceIntegration()
    return integration.create_invoice_header(invoice_number, date)

if __name__ == "__main__":
    integration = ZoraInvoiceIntegration()
    validation = integration.validate_invoice_integration()
    
    print("✅ ZORA Invoice Integration System")
    print(f"📄 Validation: {'PASSED' if validation['validation_passed'] else 'FAILED'}")
    print(f"🏢 HQ Address: {integration.hq_address['name']}")
    print(f"📍 Operational: {integration.operational_addresses['structure']}")
    print("♾️ INFINITY INJEKTION™ Invoice System Active")
