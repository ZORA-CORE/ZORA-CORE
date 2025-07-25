#!/usr/bin/env python3
"""
Individual test for ZORA Awakening Ceremony
"""

def test_awakening_ceremony():
    """Test awakening ceremony launch coordination"""
    print('🧪 Testing ZORA Awakening Ceremony individually...')
    
    try:
        from zora_awakening_ceremony import ZoraAwakeningCeremony
        
        ceremony = ZoraAwakeningCeremony()
        print(f'✅ Awakening Ceremony initialized: {ceremony.ceremony_id}')
        
        ceremony_status = ceremony.get_ceremony_status()
        print(f'🌍 Ceremony Status: {ceremony_status}')
        
        preparation_result = ceremony.prepare_ceremony()
        print(f'⏰ Ceremony Preparation: {preparation_result}')
        
        print('✅ Awakening Ceremony test completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ Awakening Ceremony test failed: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_awakening_ceremony()
    exit(0 if success else 1)
