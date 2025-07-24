#!/usr/bin/env python3
"""
ZORA CORE Integration Test - AGI Trinity System
Tests CONNOR, LUMINA, and ORACLE AGI agents
"""

print('🎯 Testing ZORA CORE - AGI Trinity System')
print('=' * 50)

try:
    from connor import connor
    connor.activate()
    connor_status = connor.get_trinity_status()
    print(f'🤖 CONNOR: {connor_status["status"]} - Effectiveness: {connor_status["strategic_effectiveness"]:.1f}%')
    
    from lumina import lumina
    lumina.activate()
    lumina_status = lumina.get_trinity_status()
    print(f'✨ LUMINA: {lumina_status["status"]} - Creativity: {lumina_status["creativity_score"]:.1f}%')
    
    from oracle import oracle
    oracle.activate()
    oracle_status = oracle.get_trinity_status()
    print(f'🔮 ORACLE: {oracle_status["status"]} - Wisdom: {oracle_status["wisdom_score"]:.1f}%')
    
    print('🔄 Testing trinity coordination...')
    
    assert len(connor_status["trinity_partners"]) == 2, "CONNOR should have 2 trinity partners"
    assert len(lumina_status["trinity_partners"]) == 2, "LUMINA should have 2 trinity partners"
    assert len(oracle_status["trinity_partners"]) == 2, "ORACLE should have 2 trinity partners"
    
    print('✅ Trinity coordination verified')
    
    print('=' * 50)
    print('🌟 AGI TRINITY OPERATIONAL!')
    exit(0)
    
except Exception as e:
    print(f'❌ AGI TRINITY ERROR: {str(e)}')
    import traceback
    traceback.print_exc()
    exit(1)
