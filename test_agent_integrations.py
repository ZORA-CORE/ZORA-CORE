#!/usr/bin/env python3
"""
ZORA CORE Integration Test - All 23 AI Agents
Tests that all agents can be imported and pinged successfully
"""

print('🧪 Testing ZORA CORE - All 23 AI Agent Imports and Pings')
print('=' * 60)

try:
    from agents import *
    print('✅ All agents imported successfully')
    
    agent_names = [
        'claude', 'meta_ai', 'gpt4', 'codex', 'sora', 'supergrok', 'gemini', 'copilot',
        'pi', 'reka', 'phind', 'devin', 'you', 'elevenlabs', 'openai', 'perplexity',
        'huggingface', 'leonardo', 'midjourney', 'deepseek', 'langsmith', 'github', 'gitlab', 'replit'
    ]
    
    print(f'📊 Testing {len(agent_names)} agents...')
    
    successful_pings = 0
    failed_pings = 0
    
    for agent_name in agent_names:
        try:
            agent = globals()[agent_name]
            
            response = agent.ping('ZORA Integration Test')
            
            if response and response.get('status') == 'synchronized':
                print(f'✅ {agent_name}: {response.get("message", "OK")}')
                successful_pings += 1
            else:
                print(f'⚠️ {agent_name}: Ping returned unexpected response')
                failed_pings += 1
                
        except Exception as e:
            print(f'❌ {agent_name}: Error - {str(e)}')
            failed_pings += 1
    
    print('=' * 60)
    print(f'📈 AGENT PING RESULTS:')
    print(f'✅ Successful: {successful_pings}/{len(agent_names)}')
    print(f'❌ Failed: {failed_pings}/{len(agent_names)}')
    print(f'📊 Success Rate: {(successful_pings/len(agent_names)*100):.1f}%')
    
    if successful_pings == len(agent_names):
        print('🎉 ALL AGENTS OPERATIONAL!')
        exit(0)
    elif successful_pings >= len(agent_names) * 0.8:
        print('✅ AGENTS MOSTLY OPERATIONAL (80%+ success)')
        exit(0)
    else:
        print('⚠️ SOME AGENTS NEED ATTENTION')
        exit(1)
        
except Exception as e:
    print(f'❌ CRITICAL ERROR: Failed to import agents - {str(e)}')
    import traceback
    traceback.print_exc()
    exit(1)
