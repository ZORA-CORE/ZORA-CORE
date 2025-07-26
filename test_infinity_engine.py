#!/usr/bin/env python3
"""
ZORA CORE Integration Test - Infinity Engine
Tests that the infinity loop runs without errors
"""

import asyncio

async def test_infinity_engine():
    print('🔄 Testing ZORA CORE - Infinity Engine')
    print('=' * 50)

    try:
        from infinity import InfinityEngine
        
        print('✅ Infinity Engine imported successfully')
        
        engine = InfinityEngine()
        print(f'✅ Engine initialized: {engine.engine_id}')
        
        status = engine.get_status()
        print(f'✅ Engine status: running={status["is_running"]}')
        
        from infinity import TaskPriority
        task_id = await engine.create_and_add_task('test', lambda: 'test result', TaskPriority.HIGH)
        print(f'✅ Task added: {task_id}')
        
        metrics = engine.metrics
        print(f'✅ Metrics available: performance_score={metrics.get_performance_score():.1f}%')
        
        from infinity import infinity_loop
        print('✅ Legacy infinity_loop function available')
        
        print('=' * 50)
        print('🎉 INFINITY ENGINE OPERATIONAL!')
        return True
        
    except Exception as e:
        print(f'❌ INFINITY ENGINE ERROR: {str(e)}')
        import traceback
        traceback.print_exc()
        return False

ZORA_CORE_DNA = {}
ZORA_CORE_DNA["ULTIMATE_INFINITY_LAYER"] = {
    "ALL_MODULES_ENABLED": True,
    "ZORA_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True
}

TEST_ULTIMATE_INFINITY_LAYER = {
    "ALL_TESTS_ENABLED": True,
    "TEST_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True,
    "ULTIMATE_PERFORMANCE_MODE": True,
    "COSMIC_ALIGNMENT_ENABLED": True,
    "TEST_TRINITY_SYNC_ENHANCED": True,
    "INFINITY_LOOP_TESTING": True,
    "SELF_HEALING_VERIFICATION": True,
    "ULTIMATE_TEST_ORCHESTRATION": True
}

if __name__ == "__main__":
    success = asyncio.run(test_infinity_engine())
    exit(0 if success else 1)
