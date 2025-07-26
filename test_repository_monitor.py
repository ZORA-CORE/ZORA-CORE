#!/usr/bin/env python3
"""
ZORA CORE Integration Test - Repository Monitor
Tests GitHub/Replit monitoring functionality
"""

print('🔍 Testing ZORA CORE - Repository Monitor')
print('=' * 50)

try:
    from repo_monitor import repo_monitor, get_monitoring_status
    
    print('✅ Repository monitor imported successfully')
    
    repo_monitor.start_monitoring()
    print(f'✅ Monitor started: {repo_monitor.monitor_id}')
    
    status = get_monitoring_status()
    print(f'✅ Monitoring status: {status["total_repos_monitored"]} repos')
    
    from agents.github import github
    github_caps = github.get_monitoring_capabilities()
    print(f'✅ GitHub monitoring: {github_caps["repository_monitoring"]}')
    
    from agents.replit import replit
    replit_caps = replit.get_monitoring_capabilities()
    print(f'✅ Replit monitoring: {replit_caps["repl_monitoring"]}')
    
    print('=' * 50)
    print('🔍 REPOSITORY MONITOR OPERATIONAL!')
    assert True
    
except Exception as e:
    print(f'❌ REPOSITORY MONITOR ERROR: {str(e)}')
    import traceback
    traceback.print_exc()
    assert False, f"Repository monitor failed: {str(e)}"

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
