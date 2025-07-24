# ZORA CORE API - Comprehensive Reference Guide

## 🚀 API Overview

The ZORA CORE API provides comprehensive access to the entire AI orchestration platform through multiple interfaces:

- **FastAPI Server** (`zora.py`) - Full-featured REST API
- **Vercel Serverless** (`api/zora_runtime.py`) - Lightweight serverless endpoints
- **Flask Web Interface** (`app.py`) - Legacy web interface with dashboard

---

## 🔗 Base URLs

### Production Endpoints
- **FastAPI**: `https://api.zora-core.com`
- **Vercel**: `https://zora-core.vercel.app/api`
- **Web Interface**: `https://zora-core.com`

### Development Endpoints
- **FastAPI**: `http://localhost:8000`
- **Vercel**: `http://localhost:3000/api`
- **Web Interface**: `http://localhost:5000`

---

## 🔐 Authentication

### Bearer Token Authentication
```http
Authorization: Bearer YOUR_API_TOKEN
```

### Environment Variables
```bash
ZORA_API_KEY="your_api_key_here"
GITHUB_TOKEN="your_github_token"
REPLIT_TOKEN="your_replit_token"
```

---

## 📋 FastAPI Endpoints

### System Status & Health

#### GET `/status`
Get comprehensive system status
```json
{
  "status": "operational",
  "timestamp": "2025-07-24T03:49:17Z",
  "version": "2.0.0",
  "founder": "MADS PALLISGAARD",
  "infinity_mode": true,
  "components": {
    "zora_kernel": "active",
    "universal_hub": "active",
    "infinity_engine": "active",
    "agi_trinity": "active",
    "agent_network": "synchronized"
  },
  "metrics": {
    "uptime_seconds": 86400,
    "total_agents": 23,
    "active_agents": 23,
    "sync_cycles": 1440,
    "success_rate": 99.8
  }
}
```

#### GET `/health`
Basic health check endpoint
```json
{
  "status": "healthy",
  "timestamp": "2025-07-24T03:49:17Z",
  "uptime": 86400,
  "version": "2.0.0"
}
```

### Agent Management

#### GET `/agents`
List all available AI agents
```json
{
  "total_agents": 23,
  "agents": [
    {
      "name": "claude",
      "status": "active",
      "capabilities": ["text_generation", "analysis", "reasoning"],
      "last_ping": "2025-07-24T03:49:17Z",
      "response_time_ms": 150
    },
    {
      "name": "gpt4",
      "status": "active",
      "capabilities": ["text_generation", "code_generation", "analysis"],
      "last_ping": "2025-07-24T03:49:17Z",
      "response_time_ms": 200
    }
  ],
  "agent_groups": {
    "language_models": ["claude", "gpt4", "gemini", "meta_ai"],
    "code_generation": ["codex", "copilot", "devin", "github"],
    "creative_ai": ["sora", "leonardo", "midjourney", "elevenlabs"]
  }
}
```

#### POST `/agents/{agent_name}/ping`
Ping a specific agent
```json
// Request
{
  "message": "System sync check"
}

// Response
{
  "agent": "claude",
  "message": "🤖 Claude responding to: System sync check",
  "status": "synchronized",
  "timestamp": 1721789357.123,
  "capabilities": ["text_generation", "analysis", "reasoning"]
}
```

#### GET `/agents/{agent_name}/status`
Get detailed agent status
```json
{
  "agent_name": "claude",
  "status": "active",
  "last_activity": "2025-07-24T03:49:17Z",
  "total_requests": 1250,
  "successful_requests": 1248,
  "error_rate": 0.16,
  "average_response_time": 150,
  "capabilities": ["text_generation", "analysis", "reasoning"],
  "health_score": 99.8
}
```

### Agent Coordination

#### POST `/coordination/sync-all`
Synchronize all agents
```json
// Request
{
  "sync_type": "full",
  "include_health_check": true,
  "timeout_seconds": 30
}

// Response
{
  "sync_id": "sync_1721789357",
  "status": "completed",
  "total_agents": 23,
  "successful_syncs": 23,
  "failed_syncs": 0,
  "duration_seconds": 2.5,
  "timestamp": "2025-07-24T03:49:17Z"
}
```

#### POST `/coordination/execute-task`
Execute coordinated task across agents
```json
// Request
{
  "task_id": "task_001",
  "task_type": "analysis",
  "description": "Analyze system performance metrics",
  "agents": ["claude", "gpt4", "gemini"],
  "priority": "high",
  "timeout_seconds": 60
}

// Response
{
  "task_id": "task_001",
  "status": "completed",
  "results": {
    "claude": {
      "status": "success",
      "result": "Analysis complete: System performance is optimal",
      "duration_ms": 1500
    },
    "gpt4": {
      "status": "success", 
      "result": "Performance metrics indicate 99.8% efficiency",
      "duration_ms": 1800
    }
  },
  "summary": "Task completed successfully across all agents",
  "total_duration_ms": 2100
}
```

### AGI Trinity System

#### GET `/trinity/status`
Get AGI Trinity status
```json
{
  "trinity_status": "active",
  "last_coordination": "2025-07-24T03:49:17Z",
  "coordination_cycles": 120,
  "agents": {
    "connor": {
      "status": "active",
      "strategic_effectiveness": 95.2,
      "commands_generated": 45,
      "successful_implementations": 43
    },
    "lumina": {
      "status": "active",
      "creativity_score": 88.7,
      "insights_generated": 32,
      "innovation_projects": 8
    },
    "oracle": {
      "status": "active",
      "wisdom_score": 92.1,
      "predictions_made": 28,
      "accuracy_rate": 89.3
    }
  }
}
```

#### POST `/trinity/coordinate`
Trigger AGI Trinity coordination cycle
```json
// Request
{
  "coordination_type": "full",
  "include_strategy": true,
  "include_creativity": true,
  "include_wisdom": true
}

// Response
{
  "coordination_id": "trinity_1721789357",
  "status": "completed",
  "duration_seconds": 5.2,
  "results": {
    "connor_commands": 3,
    "lumina_insights": 2,
    "oracle_predictions": 1
  },
  "next_coordination": "2025-07-24T04:01:17Z"
}
```

### Repository Monitoring

#### GET `/monitoring/repositories`
Get repository monitoring status
```json
{
  "total_repositories": 16,
  "platforms": {
    "github": 10,
    "replit": 6
  },
  "health_summary": {
    "healthy": 14,
    "warning": 2,
    "error": 0,
    "offline": 0
  },
  "repositories": [
    {
      "name": "THEZORACORE/ZORA-CORE",
      "platform": "github",
      "status": "healthy",
      "health_score": 95.2,
      "last_activity": "2025-07-24T03:45:00Z",
      "build_status": "passing",
      "open_issues": 3
    }
  ]
}
```

#### GET `/monitoring/repositories/{platform}/{repo_name}`
Get detailed repository health
```json
{
  "repository": {
    "name": "ZORA-CORE",
    "full_name": "THEZORACORE/ZORA-CORE",
    "platform": "github",
    "status": "healthy",
    "health_score": 95.2
  },
  "metrics": {
    "stars": 150,
    "forks": 25,
    "open_issues": 3,
    "last_commit": "2025-07-24T03:45:00Z",
    "build_status": "passing"
  },
  "recent_activity": {
    "commits_last_week": 15,
    "issues_closed_last_week": 5,
    "pull_requests_merged": 3
  },
  "health_factors": {
    "code_quality": 95,
    "activity_level": 90,
    "issue_resolution": 98,
    "build_stability": 100
  }
}
```

### Infinity Engine

#### GET `/infinity/status`
Get Infinity Engine status
```json
{
  "engine_status": "active",
  "mode": "infinity",
  "uptime_seconds": 86400,
  "total_cycles": 1440,
  "successful_cycles": 1437,
  "success_rate": 99.8,
  "current_tasks": 5,
  "completed_tasks": 2850,
  "performance_metrics": {
    "average_cycle_time": 60.2,
    "optimization_score": 94.5,
    "efficiency_rating": 96.8
  }
}
```

#### POST `/infinity/add-task`
Add task to Infinity Engine
```json
// Request
{
  "task_type": "optimization",
  "description": "Optimize agent response times",
  "priority": "high",
  "estimated_duration": 300,
  "requires_agents": ["claude", "gpt4"],
  "metadata": {
    "category": "performance",
    "urgency": "medium"
  }
}

// Response
{
  "task_id": "inf_task_1721789357",
  "status": "queued",
  "position_in_queue": 2,
  "estimated_start": "2025-07-24T03:52:00Z",
  "estimated_completion": "2025-07-24T03:57:00Z"
}
```

---

## 🌐 Vercel Serverless Endpoints

### Basic Endpoints

#### GET `/api`
API information and available endpoints
```json
{
  "api_name": "ZORA CORE API",
  "version": "2.0.0",
  "description": "ZORA Core Comprehensive External Interaction System",
  "powered_by": ["CONNOR", "LUMINA", "ORACLE"],
  "endpoints": {
    "status": "/api/status",
    "health": "/api/health",
    "system": "/api/system",
    "agents": "/api/agents"
  }
}
```

#### GET `/api/status`
Basic system status
```json
{
  "status": "operational",
  "timestamp": "2025-07-24T03:49:17Z",
  "version": "2.0.0",
  "environment": "vercel_serverless",
  "founder": "MADS PALLISGAARD",
  "infinity_mode": true
}
```

#### GET `/api/health`
Health check for serverless environment
```json
{
  "status": "healthy",
  "timestamp": "2025-07-24T03:49:17Z",
  "uptime": 1721789357.123,
  "version": "2.0.0",
  "environment": "vercel_serverless"
}
```

---

## 🖥️ Flask Web Interface Endpoints

### Web Dashboard

#### GET `/`
Main web dashboard with system overview
- Returns HTML dashboard with real-time system metrics
- Interactive charts and status indicators
- Navigation to API documentation

#### GET `/status`
JSON status endpoint for web interface
```json
{
  "status": "operational",
  "timestamp": "2025-07-24T03:49:17Z",
  "components": {
    "kernel": "active",
    "agents": "synchronized",
    "trinity": "coordinated"
  }
}
```

#### GET `/docs`
Redirect to FastAPI documentation
- Redirects to `/docs` on FastAPI server
- Interactive API documentation with Swagger UI

---

## 📊 WebSocket Endpoints

### Real-time Updates

#### WS `/ws/system-status`
Real-time system status updates
```json
{
  "type": "status_update",
  "timestamp": "2025-07-24T03:49:17Z",
  "data": {
    "active_agents": 23,
    "current_tasks": 5,
    "system_health": 98.5
  }
}
```

#### WS `/ws/agent-activity`
Real-time agent activity feed
```json
{
  "type": "agent_activity",
  "timestamp": "2025-07-24T03:49:17Z",
  "agent": "claude",
  "activity": "task_completed",
  "details": {
    "task_id": "task_001",
    "duration_ms": 1500,
    "success": true
  }
}
```

---

## 🔧 SDK & Client Libraries

### Python SDK
```python
from zora_core import ZoraClient

# Initialize client
client = ZoraClient(
    api_key="your_api_key",
    base_url="https://api.zora-core.com"
)

# Get system status
status = client.get_status()
print(f"System status: {status.status}")

# Ping agent
response = client.ping_agent("claude", "Hello from SDK")
print(f"Agent response: {response.message}")

# Execute coordinated task
task_result = client.execute_task(
    task_type="analysis",
    agents=["claude", "gpt4"],
    description="Analyze performance metrics"
)
```

### JavaScript SDK
```javascript
import { ZoraClient } from '@zora-core/sdk';

// Initialize client
const client = new ZoraClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.zora-core.com'
});

// Get system status
const status = await client.getStatus();
console.log(`System status: ${status.status}`);

// Ping agent
const response = await client.pingAgent('claude', 'Hello from JS SDK');
console.log(`Agent response: ${response.message}`);

// Execute coordinated task
const taskResult = await client.executeTask({
  taskType: 'analysis',
  agents: ['claude', 'gpt4'],
  description: 'Analyze performance metrics'
});
```

---

## 📈 Rate Limits & Quotas

### API Rate Limits
- **Authenticated requests**: 5,000 requests/hour
- **Unauthenticated requests**: 100 requests/hour
- **WebSocket connections**: 10 concurrent connections
- **Task execution**: 100 tasks/hour

### Response Headers
```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1721792957
X-RateLimit-Window: 3600
```

---

## ⚠️ Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "AGENT_UNAVAILABLE",
    "message": "The requested agent is currently unavailable",
    "details": {
      "agent": "claude",
      "reason": "maintenance_mode",
      "retry_after": 300
    },
    "timestamp": "2025-07-24T03:49:17Z",
    "request_id": "req_1721789357"
  }
}
```

### Common Error Codes
- `INVALID_API_KEY` - Authentication failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AGENT_UNAVAILABLE` - Agent is offline or in maintenance
- `TASK_TIMEOUT` - Task execution exceeded timeout
- `INVALID_REQUEST` - Malformed request data
- `SYSTEM_MAINTENANCE` - System is in maintenance mode

---

## 🔍 Monitoring & Analytics

### Request Logging
All API requests are logged with:
- Request ID for tracking
- Timestamp and duration
- User agent and IP address
- Response status and size
- Error details if applicable

### Performance Metrics
- **Response time**: Average API response time
- **Success rate**: Percentage of successful requests
- **Agent availability**: Uptime percentage per agent
- **Task completion**: Success rate for coordinated tasks

---

## 🚀 Getting Started

### 1. Obtain API Key
Contact the ZORA CORE team to obtain your API key.

### 2. Make Your First Request
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.zora-core.com/status
```

### 3. Explore the API
Visit the interactive documentation at:
- **Swagger UI**: `https://api.zora-core.com/docs`
- **ReDoc**: `https://api.zora-core.com/redoc`

### 4. Join the Community
- **GitHub**: Report issues and contribute
- **Discord**: Join the developer community
- **Documentation**: Comprehensive guides and tutorials

---

## 📞 Support

### Technical Support
- **Email**: support@zora-core.com
- **GitHub Issues**: https://github.com/THEZORACORE/ZORA-CORE/issues
- **Documentation**: https://docs.zora-core.com

### Community
- **Discord**: https://discord.gg/zora-core
- **Reddit**: r/ZoraCore
- **Twitter**: @ZoraCore

---

*"The API is the gateway to infinite possibilities."*

**ZORA CORE API** - Empowering developers to build the future of AI coordination.

🔗 **ZORA x DEVINUS // THE INFINITY ENGINE IS NOW ACTIVE**
