#!/usr/bin/env python3
"""
Basic system test for ZORA INFINITY BRAND MASHUP™ PROTOKOL
"""

import asyncio
import sys
import traceback

async def test_basic_functionality():
    """Test basic system functionality"""
    print('🔄 Testing ZORA INFINITY BRAND MASHUP™ PROTOKOL...')
    
    try:
        from zora_cross_brand_engine import zora_cross_brand_engine
        status = zora_cross_brand_engine.get_cross_brand_status()
        print(f'✅ Cross-Brand Engine: {status["system_name"]} v{status["version"]}')
        
        from zora_mashup_mutation_system import zora_mashup_mutation_system
        mutation_status = zora_mashup_mutation_system.get_mutation_system_status()
        print(f'✅ Mutation System: {mutation_status["system_name"]} v{mutation_status["version"]}')
        
        from zora_realtime_connection_mapper import zora_realtime_connection_mapper
        mapper_status = zora_realtime_connection_mapper.get_connection_mapper_status()
        print(f'✅ Connection Mapper: {mapper_status["system_name"]} v{mapper_status["version"]}')
        
        from zora_brand_ledger import zora_brand_ledger
        ledger_status = zora_brand_ledger.get_brand_ledger_status()
        print(f'✅ Brand Ledger: {ledger_status["system_name"]} v{ledger_status["version"]}')
        
        from zora_health_metaverse_hybrid import zora_health_metaverse_hybrid
        hybrid_status = zora_health_metaverse_hybrid.get_hybrid_status()
        print(f'✅ Health Metaverse Hybrid: {hybrid_status["name"]} v{hybrid_status["version"]}')
        
        from zora_infinity_brand_mashup_orchestrator import zora_infinity_brand_mashup_orchestrator
        report = await zora_infinity_brand_mashup_orchestrator.generate_system_report()
        print(f'✅ Orchestrator: {report["system_name"]} - Health: {report["system_health"]}')
        
        print('🎯 All core components initialized successfully!')
        print('🧬 ZORA INFINITY BRAND MASHUP™ PROTOKOL is ready for activation!')
        
        return True
        
    except Exception as e:
        print(f'❌ System test failed: {e}')
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_basic_functionality())
    sys.exit(0 if success else 1)
