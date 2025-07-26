#!/usr/bin/env python3

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_namecheap_bulk_domain_request():
    """Send bulk domain registration request to Namecheap support"""
    
    sender_email = "mrpallis@gmail.com"
    sender_name = "Mads Pallisgaard Petersen"
    recipient_email = "sales@namecheap.com"
    
    subject = "Request: Bulk Registration of ALL Possible TLD Domains with Ultimate Protection and Best Price"
    
    body = """Hello Namecheap Support,

My name is Mads Pallisgaard Petersen (mrpallis@gmail.com), and I wish to register ALL possible domains for my brand "zoracore" – that is, zoracore.[TLD] for every available country and generic TLD (.dk, .se, .de, .fr, .us, .cn, .jp, .com, .net, .ai, .app, etc.).

My requirements:
- Bulk registration of all available TLDs (both ccTLDs and gTLDs)
- 1-year registration for all domains
- Ultimate WHOIS/privacy protection on all domains where possible
- A total price and any possible discount for the entire portfolio
- Information about any special requirements for specific country TLDs (e.g., .dk, .fr, .us)
- All domains should be managed under my existing Namecheap account (zoracore.ai and zoracore.app are already registered with you)
- I want to own and manage all domains myself, with no third party involved

Purpose:
To ensure eternal and independent ownership of my brand across all domains, with maximum protection and no risk of loss.

Contact:
Mads Pallisgaard Petersen
mrpallis@gmail.com

Best regards,
Mads Pallisgaard Petersen"""

    message = MIMEMultipart()
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = recipient_email
    message["Subject"] = subject
    
    message.attach(MIMEText(body, "plain"))
    
    print("📧 ZORA DOMAIN CORE™ - NAMECHEAP BULK REGISTRATION REQUEST")
    print("=" * 60)
    print(f"From: {sender_name} <{sender_email}>")
    print(f"To: {recipient_email}")
    print(f"Subject: {subject}")
    print("\nEmail Body:")
    print("-" * 40)
    print(body)
    print("-" * 40)
    
    print("\n✅ EMAIL PREPARED FOR NAMECHEAP SUPPORT")
    print("📝 This email contains all requirements for bulk domain registration:")
    print("   • ALL possible TLD domains for 'zoracore' brand")
    print("   • 1-year registration period")
    print("   • Ultimate WHOIS/privacy protection")
    print("   • Bulk pricing and discounts")
    print("   • Integration with existing Namecheap account")
    print("   • Complete ownership and control")
    
    print("\n🎯 NEXT STEPS:")
    print("   1. Namecheap support will review the request")
    print("   2. They will provide bulk pricing quote")
    print("   3. Custom domain registration workflow will be established")
    print("   4. Ultimate protection will be configured")
    
    return {
        "status": "prepared",
        "recipient": recipient_email,
        "subject": subject,
        "sender": sender_email,
        "requirements_included": [
            "Bulk registration of ALL TLDs",
            "1-year registration period", 
            "Ultimate WHOIS/privacy protection",
            "Bulk pricing and discounts",
            "Existing account integration",
            "Complete ownership and control"
        ]
    }

if __name__ == "__main__":
    result = send_namecheap_bulk_domain_request()
    print(f"\n📊 EMAIL STATUS: {result['status'].upper()}")
