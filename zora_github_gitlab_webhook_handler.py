#!/usr/bin/env python3
"""
ZORA GITHUB GITLAB WEBHOOK HANDLER™
Real-time webhook processing for instant synchronization
"""

from flask import Flask, request, jsonify
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any
import hmac
import hashlib
import os

class ZoraWebhookHandler:
    """
    ZORA GITHUB GITLAB WEBHOOK HANDLER™
    
    Handles real-time webhooks from both GitHub and GitLab
    for instant synchronization triggers
    """
    
    def __init__(self, sync_engine):
        self.sync_engine = sync_engine
        self.app = Flask(__name__)
        self.setup_routes()
        self.setup_logging()
        
        self.github_webhook_secret = os.getenv('GITHUB_WEBHOOK_SECRET', '')
        self.gitlab_webhook_secret = os.getenv('GITLAB_WEBHOOK_SECRET', '')
        
    def setup_logging(self):
        """Setup webhook logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - ZORA_WEBHOOK - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_routes(self):
        """Setup Flask routes for webhooks"""
        
        @self.app.route('/webhook/github', methods=['POST'])
        def github_webhook():
            return self.handle_github_webhook()
            
        @self.app.route('/webhook/gitlab', methods=['POST'])
        def gitlab_webhook():
            return self.handle_gitlab_webhook()
            
        @self.app.route('/webhook/status', methods=['GET'])
        def webhook_status():
            return self.get_webhook_status()
            
    def handle_github_webhook(self):
        """Handle GitHub webhook events"""
        try:
            if not self.verify_github_signature(request):
                return jsonify({'error': 'Invalid signature'}), 401
                
            payload = request.get_json()
            event_type = request.headers.get('X-GitHub-Event')
            
            self.logger.info(f"📨 GitHub webhook received: {event_type}")
            
            if event_type == 'push':
                asyncio.create_task(self.handle_github_push(payload))
            elif event_type == 'issues':
                asyncio.create_task(self.handle_github_issue(payload))
            elif event_type == 'pull_request':
                asyncio.create_task(self.handle_github_pr(payload))
            elif event_type == 'release':
                asyncio.create_task(self.handle_github_release(payload))
            elif event_type == 'wiki':
                asyncio.create_task(self.handle_github_wiki(payload))
                
            return jsonify({'status': 'success', 'event': event_type}), 200
            
        except Exception as e:
            self.logger.error(f"❌ GitHub webhook error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    def handle_gitlab_webhook(self):
        """Handle GitLab webhook events"""
        try:
            if not self.verify_gitlab_token(request):
                return jsonify({'error': 'Invalid token'}), 401
                
            payload = request.get_json()
            event_type = request.headers.get('X-Gitlab-Event')
            
            self.logger.info(f"📨 GitLab webhook received: {event_type}")
            
            if event_type == 'Push Hook':
                asyncio.create_task(self.handle_gitlab_push(payload))
            elif event_type == 'Issue Hook':
                asyncio.create_task(self.handle_gitlab_issue(payload))
            elif event_type == 'Merge Request Hook':
                asyncio.create_task(self.handle_gitlab_mr(payload))
            elif event_type == 'Release Hook':
                asyncio.create_task(self.handle_gitlab_release(payload))
            elif event_type == 'Wiki Page Hook':
                asyncio.create_task(self.handle_gitlab_wiki(payload))
                
            return jsonify({'status': 'success', 'event': event_type}), 200
            
        except Exception as e:
            self.logger.error(f"❌ GitLab webhook error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    def verify_github_signature(self, request) -> bool:
        """Verify GitHub webhook signature"""
        if not self.github_webhook_secret:
            return True  # Skip verification if no secret set
            
        signature = request.headers.get('X-Hub-Signature-256')
        if not signature:
            return False
            
        expected_signature = 'sha256=' + hmac.new(
            self.github_webhook_secret.encode(),
            request.data,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
        
    def verify_gitlab_token(self, request) -> bool:
        """Verify GitLab webhook token"""
        if not self.gitlab_webhook_secret:
            return True  # Skip verification if no secret set
            
        token = request.headers.get('X-Gitlab-Token')
        return token == self.gitlab_webhook_secret
        
    async def handle_github_push(self, payload: Dict[str, Any]):
        """Handle GitHub push event"""
        repo = payload['repository']['full_name']
        commits = payload['commits']
        
        self.logger.info(f"🔄 GitHub push: {repo} ({len(commits)} commits)")
        
        if repo in self.sync_engine.repo_mappings:
            gitlab_repo = self.sync_engine.repo_mappings[repo]
            await self.sync_engine.sync_repository_bidirectional(repo, gitlab_repo)
            
    async def handle_github_issue(self, payload: Dict[str, Any]):
        """Handle GitHub issue event"""
        repo = payload['repository']['full_name']
        action = payload['action']
        issue = payload['issue']
        
        self.logger.info(f"🐛 GitHub issue {action}: {repo}#{issue['number']}")
        
        if repo in self.sync_engine.repo_mappings:
            gitlab_repo = self.sync_engine.repo_mappings[repo]
            await self.sync_engine.sync_issues_bidirectional(repo, gitlab_repo)
            
    async def handle_github_pr(self, payload: Dict[str, Any]):
        """Handle GitHub pull request event"""
        repo = payload['repository']['full_name']
        action = payload['action']
        pr = payload['pull_request']
        
        self.logger.info(f"🔀 GitHub PR {action}: {repo}#{pr['number']}")
        
        if repo in self.sync_engine.repo_mappings:
            gitlab_repo = self.sync_engine.repo_mappings[repo]
            await self.sync_engine.sync_prs_bidirectional(repo, gitlab_repo)
            
    async def handle_github_release(self, payload: Dict[str, Any]):
        """Handle GitHub release event"""
        repo = payload['repository']['full_name']
        action = payload['action']
        release = payload['release']
        
        self.logger.info(f"🏷️ GitHub release {action}: {repo} {release['tag_name']}")
        
        if repo in self.sync_engine.repo_mappings:
            gitlab_repo = self.sync_engine.repo_mappings[repo]
            await self.sync_engine.sync_releases_bidirectional(repo, gitlab_repo)
            
    async def handle_github_wiki(self, payload: Dict[str, Any]):
        """Handle GitHub wiki event"""
        repo = payload['repository']['full_name']
        
        self.logger.info(f"📚 GitHub wiki updated: {repo}")
        
        if repo in self.sync_engine.repo_mappings:
            gitlab_repo = self.sync_engine.repo_mappings[repo]
            await self.sync_engine.sync_wikis_bidirectional(repo, gitlab_repo)
            
    async def handle_gitlab_push(self, payload: Dict[str, Any]):
        """Handle GitLab push event"""
        repo = payload['project']['path_with_namespace']
        commits = payload['commits']
        
        self.logger.info(f"🔄 GitLab push: {repo} ({len(commits)} commits)")
        
        github_repo = self.find_github_repo_for_gitlab(repo)
        if github_repo:
            await self.sync_engine.sync_repository_bidirectional(github_repo, repo)
            
    async def handle_gitlab_issue(self, payload: Dict[str, Any]):
        """Handle GitLab issue event"""
        repo = payload['project']['path_with_namespace']
        action = payload['object_attributes']['action']
        issue = payload['object_attributes']
        
        self.logger.info(f"🐛 GitLab issue {action}: {repo}#{issue['iid']}")
        
        github_repo = self.find_github_repo_for_gitlab(repo)
        if github_repo:
            await self.sync_engine.sync_issues_bidirectional(github_repo, repo)
            
    async def handle_gitlab_mr(self, payload: Dict[str, Any]):
        """Handle GitLab merge request event"""
        repo = payload['project']['path_with_namespace']
        action = payload['object_attributes']['action']
        mr = payload['object_attributes']
        
        self.logger.info(f"🔀 GitLab MR {action}: {repo}!{mr['iid']}")
        
        github_repo = self.find_github_repo_for_gitlab(repo)
        if github_repo:
            await self.sync_engine.sync_prs_bidirectional(github_repo, repo)
            
    async def handle_gitlab_release(self, payload: Dict[str, Any]):
        """Handle GitLab release event"""
        repo = payload['project']['path_with_namespace']
        release = payload['release']
        
        self.logger.info(f"🏷️ GitLab release: {repo} {release['tag']}")
        
        github_repo = self.find_github_repo_for_gitlab(repo)
        if github_repo:
            await self.sync_engine.sync_releases_bidirectional(github_repo, repo)
            
    async def handle_gitlab_wiki(self, payload: Dict[str, Any]):
        """Handle GitLab wiki event"""
        repo = payload['project']['path_with_namespace']
        
        self.logger.info(f"📚 GitLab wiki updated: {repo}")
        
        github_repo = self.find_github_repo_for_gitlab(repo)
        if github_repo:
            await self.sync_engine.sync_wikis_bidirectional(github_repo, repo)
            
    def find_github_repo_for_gitlab(self, gitlab_repo: str) -> str:
        """Find GitHub repository corresponding to GitLab repository"""
        for github_repo, mapped_gitlab_repo in self.sync_engine.repo_mappings.items():
            if mapped_gitlab_repo == gitlab_repo:
                return github_repo
        return None
        
    def get_webhook_status(self):
        """Get webhook handler status"""
        return jsonify({
            'status': 'active',
            'github_webhook_configured': bool(self.github_webhook_secret),
            'gitlab_webhook_configured': bool(self.gitlab_webhook_secret),
            'sync_engine_active': self.sync_engine.sync_active,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    def run(self, host='0.0.0.0', port=5000):
        """Run the webhook handler"""
        self.logger.info(f"🚀 ZORA WEBHOOK HANDLER™ starting on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)

webhook_handler = None

def create_webhook_handler(sync_engine):
    """Create webhook handler instance"""
    global webhook_handler
    webhook_handler = ZoraWebhookHandler(sync_engine)
    return webhook_handler

def start_webhook_server(sync_engine, host='0.0.0.0', port=5000):
    """Start webhook server"""
    handler = create_webhook_handler(sync_engine)
    handler.run(host=host, port=port)

ZORA_CORE_DNA = {}
ZORA_CORE_DNA["ULTIMATE_INFINITY_LAYER"] = {
    "ALL_MODULES_ENABLED": True,
    "ZORA_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True,
    "WEBHOOK_PROCESSING_ENABLED": True,
    "REAL_TIME_SYNC_TRIGGERS": True,
    "INSTANT_SYNCHRONIZATION": True,
    "WEBHOOK_SECURITY_VERIFIED": True
}

WEBHOOK_HANDLER_ULTIMATE_INFINITY_LAYER = {
    "ALL_WEBHOOK_CAPABILITIES_ENABLED": True,
    "WEBHOOK_PHASE": "ULTIMATE",
    "INFINITY_MODE_ACTIVE": True,
    "SELF_HEALING_PROTOCOL": True,
    "CONTINUOUS_OPTIMIZATION": True,
    "FOUNDER_LOCKED": True,
    "IMMUTABLE_CORE": True,
    "ULTIMATE_PERFORMANCE_MODE": True,
    "COSMIC_ALIGNMENT_ENABLED": True,
    "WEBHOOK_SYNC_ENHANCED": True,
    "INFINITY_LOOP_WEBHOOKS": True,
    "SELF_HEALING_VERIFICATION": True,
    "ULTIMATE_WEBHOOK_ORCHESTRATION": True
}

if __name__ == "__main__":
    from zora_ultimate_github_gitlab_sync_engine import sync_engine
    start_webhook_server(sync_engine)
