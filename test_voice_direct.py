#!/usr/bin/env python3

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_voice_system_direct():
    """Test voice system functionality directly without unittest framework"""
    print("🎤 ZORA VOICE SYSTEM DIRECT TEST")
    print("=" * 50)
    
    try:
        print("Testing imports...")
        from zora_ultimate_voice_generator import zora_voice_generator
        print("✅ zora_ultimate_voice_generator imported successfully")
        
        from agents.voice_integration import integrate_agent_voice
        print("✅ voice_integration imported successfully")
        
        from ZORA_AGI_Unified_v1_STAGE_INFINITY import ZoraVoice
        print("✅ ZoraVoice imported successfully")
        
        print("\nTesting voice initialization...")
        voice_system = ZoraVoice("DEVINUS")
        print(f"✅ Voice system initialized for {voice_system.voice_personality}")
        
        status = voice_system.get_voice_status()
        print(f"✅ Voice status: {status}")
        
        print("\nTesting voice generation...")
        result = voice_system.speak("Testing ZORA Ultimate Voice Generator functionality")
        print(f"✅ Voice generation test completed: {result}")
        
        print("\n🎉 VOICE SYSTEM DIRECT TEST COMPLETED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        print(f"❌ Voice system test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_voice_system_direct()
    sys.exit(0 if success else 1)
