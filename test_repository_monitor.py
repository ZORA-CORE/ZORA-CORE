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
    exit(0)
    
except Exception as e:
    print(f'❌ REPOSITORY MONITOR ERROR: {str(e)}')
    import traceback
    traceback.print_exc()
    exit(1)
