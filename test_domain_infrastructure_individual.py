#!/usr/bin/env python3
"""
Individual test for ZORA Global Domain Infrastructure
"""

def test_domain_infrastructure():
    """Test domain infrastructure functionality"""
    print('🧪 Testing ZORA Global Domain Infrastructure individually...')
    
    try:
        from zora_global_domain_infrastructure import ZoraGlobalDomainInfrastructure
        
        infra = ZoraGlobalDomainInfrastructure()
        print(f'✅ Domain Infrastructure initialized: {infra.infrastructure_id}')
        
        domain_status = infra.get_domain_infrastructure_status()
        print(f'🌐 Domain Infrastructure Status: {domain_status}')
        
        domain_details = infra.get_domain_details('zoracore.ai')
        print(f'🏰 Domain Details: {domain_details}')
        
        print('✅ Domain Infrastructure test completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ Domain Infrastructure test failed: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_domain_infrastructure()
    exit(0 if success else 1)
