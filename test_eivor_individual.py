#!/usr/bin/env python3
"""
Individual test for EIVOR AI Family System
"""

async def test_eivor_family_system():
    """Test EIVOR family system initialization and basic functionality"""
    print('🧪 Testing EIVOR AI Family System individually...')
    
    try:
        from eivor_ai_family_system import EIVORAIFamilySystem
        
        family = EIVORAIFamilySystem()
        print(f'✅ EIVOR Family System initialized: {family.eivor_id}')
        
        status = family.get_family_status()
        print(f'📊 Family Status: {status}')
        
        coordination_status = await family.coordinate_family_synergy()
        print(f'🤝 Family Coordination: {coordination_status}')
        
        print('✅ EIVOR AI Family System test completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ EIVOR Family System test failed: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import asyncio
    success = asyncio.run(test_eivor_family_system())
    exit(0 if success else 1)
