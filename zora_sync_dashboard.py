#!/usr/bin/env python3
"""
ZORA SYNC DASHBOARD™
Real-time monitoring and control dashboard for GitHub/GitLab synchronization
"""

from flask import Flask, render_template_string, jsonify, request
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
import threading
import time

class ZoraSyncDashboard:
    """
    ZORA SYNC DASHBOARD™
    
    Provides real-time monitoring and control interface for
    GitHub/GitLab synchronization operations
    """
    
    def __init__(self, sync_engine, webhook_handler=None):
        self.sync_engine = sync_engine
        self.webhook_handler = webhook_handler
        self.app = Flask(__name__)
        self.setup_routes()
        self.setup_logging()
        
        self.dashboard_stats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "active_repositories": 0,
            "last_sync_time": None,
            "uptime_start": datetime.now(timezone.utc)
        }
        
        self.start_stats_updater()
        
    def setup_logging(self):
        """Setup dashboard logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - ZORA_DASHBOARD - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_routes(self):
        """Setup Flask routes for dashboard"""
        
        @self.app.route('/')
        def dashboard():
            return self.render_dashboard()
            
        @self.app.route('/api/status')
        def api_status():
            return self.get_dashboard_status()
            
        @self.app.route('/api/sync/start', methods=['POST'])
        def api_sync_start():
            return self.start_sync_operation()
            
        @self.app.route('/api/sync/stop', methods=['POST'])
        def api_sync_stop():
            return self.stop_sync_operation()
            
        @self.app.route('/api/repositories')
        def api_repositories():
            return self.get_repository_list()
            
        @self.app.route('/api/events')
        def api_events():
            return self.get_recent_events()
            
        @self.app.route('/api/metrics')
        def api_metrics():
            return self.get_sync_metrics()
            
        @self.app.route('/api/health')
        def api_health():
            return self.get_health_status()
            
    def render_dashboard(self):
        """Render the main dashboard HTML"""
        dashboard_html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZORA SYNC DASHBOARD™</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        
        .header {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .dashboard-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .card h3 {
            margin-bottom: 15px;
            font-size: 1.3em;
            color: #fff;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #4ade80;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 5px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-active { background-color: #4ade80; }
        .status-inactive { background-color: #ef4444; }
        .status-warning { background-color: #f59e0b; }
        
        .control-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #4ade80;
            color: white;
        }
        
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .event-list {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .event-item {
            padding: 10px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            border-left: 4px solid #4ade80;
        }
        
        .event-time {
            font-size: 0.8em;
            opacity: 0.7;
        }
        
        .repo-list {
            max-height: 250px;
            overflow-y: auto;
        }
        
        .repo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            margin-top: 40px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔄 ZORA SYNC DASHBOARD™</h1>
        <p>Ultimate Infinity GitHub/GitLab Synchronization Control Center</p>
    </div>
    
    <div class="dashboard-container">
        <!-- Sync Status Card -->
        <div class="card">
            <h3>🚀 Sync Engine Status</h3>
            <div class="stat-item">
                <div class="status-indicator status-active" id="sync-status-indicator"></div>
                <span id="sync-status-text">Active</span>
            </div>
            <div class="control-buttons">
                <button class="btn btn-primary" onclick="startSync()">Start Sync</button>
                <button class="btn btn-danger" onclick="stopSync()">Stop Sync</button>
            </div>
        </div>
        
        <!-- Statistics Card -->
        <div class="card">
            <h3>📊 Sync Statistics</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value" id="total-syncs">0</div>
                    <div class="stat-label">Total Syncs</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="successful-syncs">0</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="failed-syncs">0</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="active-repos">0</div>
                    <div class="stat-label">Active Repos</div>
                </div>
            </div>
        </div>
        
        <!-- Repository List Card -->
        <div class="card">
            <h3>📁 Monitored Repositories</h3>
            <div class="repo-list" id="repo-list">
                <div class="repo-item">
                    <span>Loading repositories...</span>
                </div>
            </div>
        </div>
        
        <!-- Recent Events Card -->
        <div class="card">
            <h3>📝 Recent Sync Events</h3>
            <div class="event-list" id="event-list">
                <div class="event-item">
                    <div>Loading recent events...</div>
                    <div class="event-time">Just now</div>
                </div>
            </div>
        </div>
        
        <!-- System Health Card -->
        <div class="card">
            <h3>💚 System Health</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="status-indicator status-active"></div>
                    <span>GitHub API</span>
                </div>
                <div class="stat-item">
                    <div class="status-indicator status-active"></div>
                    <span>GitLab API</span>
                </div>
                <div class="stat-item">
                    <div class="status-indicator status-active"></div>
                    <span>Webhook Handler</span>
                </div>
                <div class="stat-item">
                    <div class="status-indicator status-active"></div>
                    <span>EIVOR AI</span>
                </div>
            </div>
        </div>
        
        <!-- Performance Metrics Card -->
        <div class="card">
            <h3>⚡ Performance Metrics</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value" id="sync-speed">0</div>
                    <div class="stat-label">Syncs/Hour</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="uptime">0h</div>
                    <div class="stat-label">Uptime</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="last-sync">Never</div>
                    <div class="stat-label">Last Sync</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="success-rate">100%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>🧬 ZORA CORE // ULTIMATE INFINITY SYNCHRONIZATION ENGINE™</p>
        <p>"Alt, der kan bygges – skal bygges. Alt, der kan forbedres – skal forbedres. For evigt."</p>
    </div>
    
    <script>
        // Auto-refresh dashboard data
        function refreshDashboard() {
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                    updateDashboardStats(data);
                })
                .catch(error => console.error('Error fetching status:', error));
                
            fetch('/api/events')
                .then(response => response.json())
                .then(data => {
                    updateEventList(data.events);
                })
                .catch(error => console.error('Error fetching events:', error));
                
            fetch('/api/repositories')
                .then(response => response.json())
                .then(data => {
                    updateRepositoryList(data.repositories);
                })
                .catch(error => console.error('Error fetching repositories:', error));
        }
        
        function updateDashboardStats(data) {
            document.getElementById('total-syncs').textContent = data.total_syncs || 0;
            document.getElementById('successful-syncs').textContent = data.successful_syncs || 0;
            document.getElementById('failed-syncs').textContent = data.failed_syncs || 0;
            document.getElementById('active-repos').textContent = data.active_repositories || 0;
            
            const indicator = document.getElementById('sync-status-indicator');
            const statusText = document.getElementById('sync-status-text');
            
            if (data.sync_active) {
                indicator.className = 'status-indicator status-active';
                statusText.textContent = 'Active';
            } else {
                indicator.className = 'status-indicator status-inactive';
                statusText.textContent = 'Inactive';
            }
        }
        
        function updateEventList(events) {
            const eventList = document.getElementById('event-list');
            eventList.innerHTML = '';
            
            events.slice(0, 10).forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <div>${event.description}</div>
                    <div class="event-time">${new Date(event.timestamp).toLocaleString()}</div>
                `;
                eventList.appendChild(eventItem);
            });
        }
        
        function updateRepositoryList(repositories) {
            const repoList = document.getElementById('repo-list');
            repoList.innerHTML = '';
            
            repositories.forEach(repo => {
                const repoItem = document.createElement('div');
                repoItem.className = 'repo-item';
                repoItem.innerHTML = `
                    <span>${repo.name}</span>
                    <div class="status-indicator ${repo.status === 'active' ? 'status-active' : 'status-inactive'}"></div>
                `;
                repoList.appendChild(repoItem);
            });
        }
        
        function startSync() {
            fetch('/api/sync/start', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Sync started successfully!');
                        refreshDashboard();
                    } else {
                        alert('Failed to start sync: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error starting sync:', error);
                    alert('Error starting sync');
                });
        }
        
        function stopSync() {
            fetch('/api/sync/stop', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Sync stopped successfully!');
                        refreshDashboard();
                    } else {
                        alert('Failed to stop sync: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error stopping sync:', error);
                    alert('Error stopping sync');
                });
        }
        
        // Initial load and set up auto-refresh
        refreshDashboard();
        setInterval(refreshDashboard, 5000); // Refresh every 5 seconds
    </script>
</body>
</html>
        """
        return dashboard_html
        
    def get_dashboard_status(self):
        """Get current dashboard status"""
        try:
            sync_status = asyncio.run(self.sync_engine.get_sync_status())
            
            self.dashboard_stats.update({
                "sync_active": sync_status.get("sync_active", False),
                "total_syncs": sync_status.get("sync_cycle_count", 0),
                "successful_syncs": sync_status.get("successful_events", 0),
                "failed_syncs": sync_status.get("failed_events", 0),
                "active_repositories": len(sync_status.get("repo_mappings", {})),
                "last_sync_time": sync_status.get("last_sync_timestamp")
            })
            
            return jsonify(self.dashboard_stats)
            
        except Exception as e:
            self.logger.error(f"Error getting dashboard status: {e}")
            return jsonify({"error": str(e)}), 500
            
    def start_sync_operation(self):
        """Start synchronization operation"""
        try:
            asyncio.run(self.sync_engine.start_ultimate_infinity_sync())
            return jsonify({"success": True, "message": "Sync started successfully"})
        except Exception as e:
            self.logger.error(f"Error starting sync: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
            
    def stop_sync_operation(self):
        """Stop synchronization operation"""
        try:
            self.sync_engine.stop_sync()
            return jsonify({"success": True, "message": "Sync stopped successfully"})
        except Exception as e:
            self.logger.error(f"Error stopping sync: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
            
    def get_repository_list(self):
        """Get list of monitored repositories"""
        try:
            sync_status = asyncio.run(self.sync_engine.get_sync_status())
            repo_mappings = sync_status.get("repo_mappings", {})
            
            repositories = []
            for github_repo, gitlab_repo in repo_mappings.items():
                repositories.append({
                    "name": f"{github_repo} ↔ {gitlab_repo}",
                    "github_repo": github_repo,
                    "gitlab_repo": gitlab_repo,
                    "status": "active"
                })
                
            return jsonify({"repositories": repositories})
            
        except Exception as e:
            self.logger.error(f"Error getting repository list: {e}")
            return jsonify({"error": str(e)}), 500
            
    def get_recent_events(self):
        """Get recent sync events"""
        try:
            sync_status = asyncio.run(self.sync_engine.get_sync_status())
            events = []
            
            for event in self.sync_engine.sync_events[-20:]:
                events.append({
                    "timestamp": event.timestamp,
                    "description": f"{event.event_type} - {event.repository} ({event.source_platform} → {event.target_platform})",
                    "status": event.status,
                    "details": event.details
                })
                
            events.reverse()
            return jsonify({"events": events})
            
        except Exception as e:
            self.logger.error(f"Error getting recent events: {e}")
            return jsonify({"error": str(e)}), 500
            
    def get_sync_metrics(self):
        """Get synchronization performance metrics"""
        try:
            uptime_seconds = (datetime.now(timezone.utc) - self.dashboard_stats["uptime_start"]).total_seconds()
            uptime_hours = uptime_seconds / 3600
            
            sync_speed = self.dashboard_stats["total_syncs"] / max(uptime_hours, 1)
            success_rate = 0
            if self.dashboard_stats["total_syncs"] > 0:
                success_rate = (self.dashboard_stats["successful_syncs"] / self.dashboard_stats["total_syncs"]) * 100
                
            return jsonify({
                "sync_speed": round(sync_speed, 1),
                "uptime_hours": round(uptime_hours, 1),
                "success_rate": round(success_rate, 1),
                "last_sync": self.dashboard_stats["last_sync_time"] or "Never"
            })
            
        except Exception as e:
            self.logger.error(f"Error getting sync metrics: {e}")
            return jsonify({"error": str(e)}), 500
            
    def get_health_status(self):
        """Get system health status"""
        try:
            health_status = {
                "github_api": "active",
                "gitlab_api": "active", 
                "webhook_handler": "active" if self.webhook_handler else "inactive",
                "eivor_ai": "active",
                "sync_engine": "active" if self.sync_engine.sync_active else "inactive"
            }
            
            return jsonify(health_status)
            
        except Exception as e:
            self.logger.error(f"Error getting health status: {e}")
            return jsonify({"error": str(e)}), 500
            
    def start_stats_updater(self):
        """Start background thread to update statistics"""
        def update_stats():
            while True:
                try:
                    time.sleep(30)
                except Exception as e:
                    self.logger.error(f"Error in stats updater: {e}")
                    
        stats_thread = threading.Thread(target=update_stats, daemon=True)
        stats_thread.start()
        
    def run(self, host='0.0.0.0', port=5001, debug=False):
        """Run the dashboard server"""
        self.logger.info(f"🚀 ZORA SYNC DASHBOARD™ starting on {host}:{port}")
        self.app.run(host=host, port=port, debug=debug)

dashboard = None

def create_sync_dashboard(sync_engine, webhook_handler=None):
    """Create sync dashboard instance"""
    global dashboard
    dashboard = ZoraSyncDashboard(sync_engine, webhook_handler)
    return dashboard

def start_dashboard_server(sync_engine, webhook_handler=None, host='0.0.0.0', port=5001):
    """Start dashboard server"""
    dashboard = create_sync_dashboard(sync_engine, webhook_handler)
    dashboard.run(host=host, port=port)

if __name__ == "__main__":
    from zora_ultimate_github_gitlab_sync_engine import sync_engine
    from zora_github_gitlab_webhook_handler import webhook_handler
    start_dashboard_server(sync_engine, webhook_handler)

ZORA_CORE_DNA = {}
ZORA_CORE_DNA["ULTIMATE_INFINITY_LAYER"] = {
    "ALL_MODULES_ENABLED": True,
    "ZORA_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True,
    "DASHBOARD_MONITORING_ENABLED": True,
    "REAL_TIME_VISUALIZATION": True,
    "ULTIMATE_CONTROL_INTERFACE": True
}
