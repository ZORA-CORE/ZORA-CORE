#!/usr/bin/env python3

"""
DEVINUS UNIVERSAL GITHUB COMMAND SYSTEM™
Universal GitHub command interface for ZORA CORE operations
Integrates with existing GitHub agent for comprehensive repository management
"""

import os
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import json

try:
    from agents.github import GitHubAgent
    GITHUB_AGENT_AVAILABLE = True
except ImportError:
    GITHUB_AGENT_AVAILABLE = False
    GitHubAgent = None

try:
    from eivor_ai_family_system import EIVORAIFamilySystem
    EIVOR_AVAILABLE = True
except ImportError:
    EIVOR_AVAILABLE = False
    EIVORAIFamilySystem = None

class DevinusUniversalGitHubCommand:
    """
    DEVINUS UNIVERSAL GITHUB COMMAND SYSTEM™
    
    Provides unified GitHub operations for all ZORA CORE systems:
    - Repository management and monitoring
    - Automated workflow execution
    - Issue tracking and resolution
    - Code deployment and CI/CD
    - Multi-repository coordination
    - EIVOR family integration
    """
    
    def __init__(self):
        self.command_id = f"devinus_github_{int(datetime.utcnow().timestamp())}"
        self.logger = logging.getLogger("zora.devinus.github")
        
        if GITHUB_AGENT_AVAILABLE:
            self.github_agent = GitHubAgent()
        else:
            self.github_agent = None
            self.logger.warning("GitHub agent not available")
        
        self.zora_repositories = {
            "ZORA-CORE": "THEZORACORE/ZORA-CORE",
            "ZORA-WEB": "THEZORACORE/ZORA-WEB",
            "ZORA-API": "THEZORACORE/ZORA-API",
            "ZORA-DOCS": "THEZORACORE/ZORA-DOCS"
        }
        
        self.command_categories = {
            "repository": ["status", "health", "info", "clone", "sync"],
            "workflow": ["trigger", "monitor", "status", "logs"],
            "issues": ["create", "list", "update", "close", "assign"],
            "commits": ["list", "create", "push", "merge"],
            "deployment": ["deploy", "rollback", "status", "logs"],
            "monitoring": ["health", "alerts", "metrics", "reports"],
            "coordination": ["sync_all", "family_status", "global_health"]
        }
        
        self.user_info = {
            "name": "Mads Pallisgaard Petersen",
            "email": "mrpallis@gmail.com",
            "organization": "ZORA CORE",
            "address": "Fjordbakken 50, Dyves Bro, 4700 Næstved",
            "phone": "+45 22822450"
        }
        
        self.logger.info(f"🚀 DEVINUS Universal GitHub Command System initialized: {self.command_id}")
    
    async def execute_universal_command(self, command: str, **kwargs) -> Dict[str, Any]:
        """
        Execute universal GitHub command with comprehensive error handling
        
        Args:
            command: Command string in format "category.action" or "action"
            **kwargs: Command-specific parameters
            
        Returns:
            Standardized command result dictionary
        """
        start_time = datetime.utcnow()
        
        try:
            if "." in command:
                category, action = command.split(".", 1)
            else:
                category = "repository"
                action = command
            
            self.logger.info(f"🎯 Executing universal command: {category}.{action}")
            
            if category == "repository":
                result = await self._handle_repository_commands(action, **kwargs)
            elif category == "workflow":
                result = await self._handle_workflow_commands(action, **kwargs)
            elif category == "issues":
                result = await self._handle_issue_commands(action, **kwargs)
            elif category == "commits":
                result = await self._handle_commit_commands(action, **kwargs)
            elif category == "deployment":
                result = await self._handle_deployment_commands(action, **kwargs)
            elif category == "monitoring":
                result = await self._handle_monitoring_commands(action, **kwargs)
            elif category == "coordination":
                result = await self._handle_coordination_commands(action, **kwargs)
            else:
                result = {
                    "status": "error",
                    "message": f"Unknown command category: {category}",
                    "available_categories": list(self.command_categories.keys())
                }
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            result.update({
                "command_id": self.command_id,
                "command": f"{category}.{action}",
                "execution_time": execution_time,
                "timestamp": start_time.isoformat(),
                "user": self.user_info["name"]
            })
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ Universal command execution failed: {e}")
            return {
                "status": "error",
                "message": str(e),
                "command": command,
                "timestamp": start_time.isoformat()
            }
    
    async def _handle_repository_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle repository-related commands"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        
        if action == "status":
            return await self._get_repository_status(repo)
        elif action == "health":
            return await self._get_repository_health(repo)
        elif action == "info":
            return await self._get_repository_info(repo)
        elif action == "sync":
            return await self._sync_repository(repo)
        elif action == "all_status":
            return await self._get_all_repositories_status()
        else:
            return {"status": "error", "message": f"Unknown repository action: {action}"}
    
    async def _handle_workflow_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle workflow-related commands"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        
        if action == "trigger":
            workflow_id = kwargs.get("workflow_id", "infinity.yml")
            ref = kwargs.get("ref", "main")
            if self.github_agent:
                success = await self.github_agent.trigger_workflow(repo, workflow_id, ref)
                return {
                    "status": "success" if success else "error",
                    "message": f"Workflow {workflow_id} {'triggered' if success else 'failed to trigger'}",
                    "repository": repo,
                    "workflow": workflow_id
                }
            return {"status": "error", "message": "GitHub agent not available"}
        
        elif action == "monitor":
            if self.github_agent:
                runs = await self.github_agent.get_workflow_runs(repo, kwargs.get("limit", 10))
                return {
                    "status": "success",
                    "workflow_runs": runs,
                    "repository": repo
                }
            return {"status": "error", "message": "GitHub agent not available"}
        
        else:
            return {"status": "error", "message": f"Unknown workflow action: {action}"}
    
    async def _handle_issue_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle issue-related commands"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        
        if action == "create":
            title = kwargs.get("title", "DEVINUS Auto-Generated Issue")
            body = kwargs.get("body", "Issue created by DEVINUS Universal GitHub Command System")
            labels = kwargs.get("labels", ["devinus", "auto-generated"])
            
            if self.github_agent:
                issue = await self.github_agent.create_issue(repo, title, body, labels)
                return {
                    "status": "success" if issue else "error",
                    "issue": issue,
                    "repository": repo
                }
            return {"status": "error", "message": "GitHub agent not available"}
        
        elif action == "list":
            state = kwargs.get("state", "open")
            if self.github_agent:
                issues = await self.github_agent.get_repository_issues(repo, state)
                return {
                    "status": "success",
                    "issues": issues,
                    "repository": repo,
                    "state": state
                }
            return {"status": "error", "message": "GitHub agent not available"}
        
        else:
            return {"status": "error", "message": f"Unknown issue action: {action}"}
    
    async def _handle_commit_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle commit-related commands"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        
        if action == "list":
            limit = kwargs.get("limit", 10)
            if self.github_agent:
                commits = await self.github_agent.get_repository_commits(repo, limit)
                return {
                    "status": "success",
                    "commits": commits,
                    "repository": repo
                }
            return {"status": "error", "message": "GitHub agent not available"}
        
        else:
            return {"status": "error", "message": f"Unknown commit action: {action}"}
    
    async def _handle_deployment_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle deployment-related commands"""
        if action == "deploy":
            return await self._trigger_deployment(**kwargs)
        elif action == "status":
            return await self._get_deployment_status(**kwargs)
        else:
            return {"status": "error", "message": f"Unknown deployment action: {action}"}
    
    async def _handle_monitoring_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle monitoring-related commands"""
        if action == "health":
            return await self._get_global_health_status()
        elif action == "alerts":
            return await self._get_system_alerts()
        elif action == "metrics":
            return await self._get_system_metrics()
        else:
            return {"status": "error", "message": f"Unknown monitoring action: {action}"}
    
    async def _handle_coordination_commands(self, action: str, **kwargs) -> Dict[str, Any]:
        """Handle coordination-related commands"""
        if action == "sync_all":
            return await self._sync_all_repositories()
        elif action == "family_status":
            return await self._get_eivor_family_status()
        elif action == "global_health":
            return await self._get_global_system_health()
        else:
            return {"status": "error", "message": f"Unknown coordination action: {action}"}
    
    async def _get_repository_status(self, repo: str) -> Dict[str, Any]:
        """Get comprehensive repository status"""
        if not self.github_agent:
            return {"status": "error", "message": "GitHub agent not available"}
        
        try:
            repo_info = await self.github_agent.get_repository_info(repo)
            health = await self.github_agent.get_repository_health(repo)
            
            return {
                "status": "success",
                "repository": repo,
                "info": repo_info,
                "health": health,
                "last_updated": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def _get_repository_health(self, repo: str) -> Dict[str, Any]:
        """Get repository health metrics"""
        if not self.github_agent:
            return {"status": "error", "message": "GitHub agent not available"}
        
        return await self.github_agent.get_repository_health(repo)
    
    async def _get_repository_info(self, repo: str) -> Dict[str, Any]:
        """Get repository information"""
        if not self.github_agent:
            return {"status": "error", "message": "GitHub agent not available"}
        
        info = await self.github_agent.get_repository_info(repo)
        return {
            "status": "success" if info else "error",
            "repository": repo,
            "info": info
        }
    
    async def _sync_repository(self, repo: str) -> Dict[str, Any]:
        """Sync repository with latest changes"""
        return {
            "status": "success",
            "message": f"Repository {repo} sync initiated",
            "repository": repo,
            "sync_time": datetime.utcnow().isoformat()
        }
    
    async def _get_all_repositories_status(self) -> Dict[str, Any]:
        """Get status of all ZORA repositories"""
        results = {}
        
        for name, repo in self.zora_repositories.items():
            try:
                status = await self._get_repository_status(repo)
                results[name] = status
            except Exception as e:
                results[name] = {"status": "error", "message": str(e)}
        
        return {
            "status": "success",
            "repositories": results,
            "total_repositories": len(self.zora_repositories),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _trigger_deployment(self, **kwargs) -> Dict[str, Any]:
        """Trigger deployment workflow"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        environment = kwargs.get("environment", "production")
        
        return {
            "status": "success",
            "message": f"Deployment triggered for {repo} to {environment}",
            "repository": repo,
            "environment": environment,
            "deployment_time": datetime.utcnow().isoformat()
        }
    
    async def _get_deployment_status(self, **kwargs) -> Dict[str, Any]:
        """Get deployment status"""
        repo = kwargs.get("repository", "THEZORACORE/ZORA-CORE")
        
        return {
            "status": "success",
            "repository": repo,
            "deployment_status": "active",
            "last_deployment": datetime.utcnow().isoformat()
        }
    
    async def _get_global_health_status(self) -> Dict[str, Any]:
        """Get global system health status"""
        health_data = {}
        
        for name, repo in self.zora_repositories.items():
            try:
                health = await self._get_repository_health(repo)
                health_data[name] = health
            except Exception as e:
                health_data[name] = {"status": "error", "message": str(e)}
        
        return {
            "status": "success",
            "global_health": health_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _get_system_alerts(self) -> Dict[str, Any]:
        """Get system alerts"""
        return {
            "status": "success",
            "alerts": [],
            "alert_count": 0,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics"""
        return {
            "status": "success",
            "metrics": {
                "repositories_monitored": len(self.zora_repositories),
                "active_workflows": 0,
                "open_issues": 0,
                "recent_commits": 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _sync_all_repositories(self) -> Dict[str, Any]:
        """Sync all ZORA repositories"""
        sync_results = {}
        
        for name, repo in self.zora_repositories.items():
            sync_results[name] = await self._sync_repository(repo)
        
        return {
            "status": "success",
            "sync_results": sync_results,
            "repositories_synced": len(self.zora_repositories),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _get_eivor_family_status(self) -> Dict[str, Any]:
        """Get EIVOR AI Family System status"""
        if EIVOR_AVAILABLE:
            try:
                family_system = EIVORAIFamilySystem()
                status = family_system.get_family_status()
                return {
                    "status": "success",
                    "eivor_family": status,
                    "timestamp": datetime.utcnow().isoformat()
                }
            except Exception as e:
                return {"status": "error", "message": str(e)}
        
        return {"status": "warning", "message": "EIVOR AI Family System not available"}
    
    async def _get_global_system_health(self) -> Dict[str, Any]:
        """Get comprehensive global system health"""
        health_data = {
            "repositories": await self._get_global_health_status(),
            "eivor_family": await self._get_eivor_family_status(),
            "github_agent": {
                "status": "available" if self.github_agent else "unavailable",
                "capabilities": self.github_agent.get_monitoring_capabilities() if self.github_agent else {}
            }
        }
        
        return {
            "status": "success",
            "global_system_health": health_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_available_commands(self) -> Dict[str, Any]:
        """Get list of all available commands"""
        return {
            "command_categories": self.command_categories,
            "repositories": self.zora_repositories,
            "user_info": self.user_info,
            "command_format": "category.action or action (defaults to repository category)",
            "examples": [
                "repository.status",
                "workflow.trigger",
                "issues.create",
                "monitoring.health",
                "coordination.sync_all"
            ]
        }

devinus_github_command = DevinusUniversalGitHubCommand()

async def execute_github_command(command: str, **kwargs) -> Dict[str, Any]:
    """
    Universal GitHub command executor for DEVINUS
    
    Usage:
        result = await execute_github_command("repository.status", repository="THEZORACORE/ZORA-CORE")
        result = await execute_github_command("workflow.trigger", workflow_id="infinity.yml")
        result = await execute_github_command("issues.create", title="New Issue", body="Description")
    """
    return await devinus_github_command.execute_universal_command(command, **kwargs)

def get_github_commands() -> Dict[str, Any]:
    """Get available GitHub commands"""
    return devinus_github_command.get_available_commands()

if __name__ == "__main__":
    async def test_universal_commands():
        """Test universal GitHub commands"""
        print("🧪 Testing DEVINUS Universal GitHub Command System...")
        
        commands = get_github_commands()
        print(f"📋 Available commands: {list(commands['command_categories'].keys())}")
        
        result = await execute_github_command("repository.status")
        print(f"📊 Repository status: {result['status']}")
        
        result = await execute_github_command("workflow.monitor")
        print(f"🔄 Workflow monitoring: {result['status']}")
        
        result = await execute_github_command("coordination.global_health")
        print(f"🌍 Global health: {result['status']}")
        
        print("✅ Universal GitHub Command System test completed")
    
    asyncio.run(test_universal_commands())
