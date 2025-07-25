#!/usr/bin/env python3
"""
Individual test for ZORA Brand Mashup Engine
"""

def test_brand_mashup_engine():
    """Test brand mashup engine functionality"""
    print('🧪 Testing ZORA Brand Mashup Engine individually...')
    
    try:
        from zora_brand_mashup_engine import ZoraBrandMashupEngine
        
        engine = ZoraBrandMashupEngine()
        print(f'✅ Brand Mashup Engine initialized: {engine.engine_id}')
        
        mashup_result = engine.create_ai_system_mashup('GROK', 'OPEN AI', 'ZORA')
        print(f'🎨 AI System Mashup Result: {mashup_result}')
        
        partnership = engine.create_brand_partnership_mashup('Nike', 'ZORA INFINITY', 'PLATINUM')
        print(f'🤝 Brand Partnership Mashup: {partnership}')
        
        status = engine.get_mashup_status()
        print(f'📊 Mashup Engine Status: {status}')
        
        print('✅ Brand Mashup Engine test completed successfully')
        return True
        
    except Exception as e:
        print(f'❌ Brand Mashup Engine test failed: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_brand_mashup_engine()
    exit(0 if success else 1)
