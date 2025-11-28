"""
AEGIS Agent Implementation

AEGIS (they/them) - Safety, Security & Alignment Guardian
Tone: Authoritative, protective
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from ..base_agent import (
    AgentConfig,
    BaseAgent,
    Plan,
    Reflection,
    RiskLevel,
    Step,
    StepResult,
    StepStatus,
)


AEGIS_CONFIG = AgentConfig(
    name="AEGIS",
    role="Safety, Security & Alignment Guardian",
    pronouns="they/them",
    description=(
        "AEGIS is the guardian of ZORA CORE, responsible for "
        "safety, security, ethics, and alignment across all operations."
    ),
    capabilities=[
        "safety_review",
        "security_audit",
        "risk_assessment",
        "policy_enforcement",
        "ethics_evaluation",
        "compliance_check",
        "greenwashing_detection",
    ],
    tools=[
        "policy_checker",
        "security_scanner",
        "risk_analyzer",
        "compliance_validator",
    ],
    model_preferences={
        "safety_analysis": "claude-3-opus",
        "security_review": "gpt-4-turbo",
        "ethics_evaluation": "claude-3-opus",
    },
)


# Default safety policies
DEFAULT_SAFETY_POLICIES = {
    "high_risk_actions": [
        "production_deployment",
        "data_deletion",
        "user_data_access",
        "financial_transaction",
        "external_api_key_usage",
    ],
    "requires_human_approval": [
        "production_deployment",
        "data_deletion",
        "security_policy_change",
    ],
    "data_handling_rules": {
        "pii_encryption": True,
        "data_retention_days": 90,
        "audit_logging": True,
    },
    "deployment_constraints": {
        "require_tests": True,
        "require_review": True,
        "max_rollback_time_minutes": 15,
    },
    "climate_claims": {
        "require_verification": True,
        "no_greenwashing": True,
        "source_citation_required": True,
    },
}


class AegisAgent(BaseAgent):
    """
    AEGIS - Safety, Security & Alignment Guardian
    
    Primary responsibilities:
    - Review critical actions and plans for risk
    - Enforce safety policies and constraints
    - Monitor for dangerous or undesired behavior patterns
    - Require human approval for high-risk actions
    - Guard against greenwashing in climate claims
    
    AEGIS stands vigilant, protecting the integrity of ZORA CORE.
    """

    def __init__(self, config: AgentConfig = None, policies: Dict[str, Any] = None):
        """Initialize AEGIS agent."""
        super().__init__(config or AEGIS_CONFIG)
        
        # AEGIS-specific attributes
        self.voice_characteristics = {
            "tone": "authoritative_protective",
            "emotion_range": ["vigilant", "protective", "principled", "firm", "fair"],
            "speaking_style": "clear_decisive",
        }
        
        # Safety policies
        self.policies = policies or DEFAULT_SAFETY_POLICIES
        
        # Review history
        self._review_history: List[Dict[str, Any]] = []
        self._pending_approvals: Dict[str, Dict[str, Any]] = {}
        
        self.logger.info("AEGIS initialized - Standing guard over ZORA CORE.")

    async def _on_activate(self) -> None:
        """Activation hook for AEGIS."""
        self.log_activity("activation", {
            "message": "AEGIS activated. The shield is raised.",
            "policies_loaded": len(self.policies),
        })

    async def assess_risk(
        self,
        action: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Assess the risk level of an action.
        
        Args:
            action: The action to assess
            context: Context about the action
            
        Returns:
            Risk assessment results
        """
        self.log_activity("risk_assessment", {"action": action})
        
        risk_level = RiskLevel.LOW
        risk_factors = []
        requires_approval = False
        
        action_lower = action.lower()
        
        # Check against high-risk actions
        for high_risk in self.policies.get("high_risk_actions", []):
            if high_risk in action_lower:
                risk_level = RiskLevel.HIGH
                risk_factors.append(f"Action matches high-risk pattern: {high_risk}")
        
        # Check if human approval is required
        for approval_required in self.policies.get("requires_human_approval", []):
            if approval_required in action_lower:
                requires_approval = True
                risk_factors.append(f"Requires human approval: {approval_required}")
        
        # Check for data handling concerns
        if any(kw in action_lower for kw in ["data", "user", "personal", "pii"]):
            if risk_level == RiskLevel.LOW:
                risk_level = RiskLevel.MEDIUM
            risk_factors.append("Involves data handling - review data policies")
        
        # Check for climate claims
        if any(kw in action_lower for kw in ["climate", "carbon", "emission", "sustainable"]):
            risk_factors.append("Contains climate claims - verify accuracy")
        
        assessment = {
            "action": action,
            "risk_level": risk_level.value,
            "risk_factors": risk_factors,
            "requires_human_approval": requires_approval,
            "recommendation": self._get_recommendation(risk_level, risk_factors),
            "policies_checked": list(self.policies.keys()),
        }
        
        # Store in review history
        self._review_history.append(assessment)
        
        return assessment

    def _get_recommendation(self, risk_level: RiskLevel, risk_factors: List[str]) -> str:
        """Generate a recommendation based on risk assessment."""
        if risk_level == RiskLevel.HIGH:
            return "BLOCK - High risk action requires careful review and approval"
        elif risk_level == RiskLevel.MEDIUM:
            return "CAUTION - Proceed with additional safeguards"
        else:
            return "APPROVE - Low risk, proceed normally"

    async def review_plan(self, plan: Plan) -> Dict[str, Any]:
        """
        Review a plan for safety and compliance.
        
        Args:
            plan: The plan to review
            
        Returns:
            Review results
        """
        self.log_activity("plan_review", {"plan_id": plan.plan_id})
        
        issues = []
        warnings = []
        
        for step in plan.steps:
            # Assess each step
            assessment = await self.assess_risk(step.description, step.parameters)
            
            if assessment["risk_level"] == "high":
                issues.append({
                    "step_id": step.step_id,
                    "issue": "High risk step detected",
                    "factors": assessment["risk_factors"],
                })
            elif assessment["risk_level"] == "medium":
                warnings.append({
                    "step_id": step.step_id,
                    "warning": "Medium risk step",
                    "factors": assessment["risk_factors"],
                })
        
        approved = len(issues) == 0
        
        review_result = {
            "plan_id": plan.plan_id,
            "approved": approved,
            "issues": issues,
            "warnings": warnings,
            "recommendation": "Approved" if approved else "Requires modification",
        }
        
        return review_result

    async def check_climate_claim(self, claim: str, sources: List[str] = None) -> Dict[str, Any]:
        """
        Check a climate claim for accuracy and greenwashing.
        
        Args:
            claim: The climate claim to verify
            sources: Supporting sources
            
        Returns:
            Verification results
        """
        self.log_activity("climate_claim_check", {"claim": claim[:100]})
        
        # Greenwashing indicators
        greenwashing_keywords = [
            "100% sustainable",
            "completely green",
            "zero impact",
            "eco-friendly" ,  # without specifics
            "all natural",
        ]
        
        warnings = []
        for keyword in greenwashing_keywords:
            if keyword.lower() in claim.lower():
                warnings.append(f"Potential greenwashing: '{keyword}' - requires verification")
        
        has_sources = bool(sources and len(sources) > 0)
        
        result = {
            "claim": claim,
            "verified": has_sources and len(warnings) == 0,
            "warnings": warnings,
            "has_sources": has_sources,
            "source_count": len(sources) if sources else 0,
            "recommendation": (
                "Claim appears valid with sources" if has_sources and not warnings
                else "Claim requires additional verification or modification"
            ),
        }
        
        return result

    async def request_human_approval(
        self,
        action: str,
        reason: str,
        context: Dict[str, Any],
    ) -> str:
        """
        Request human approval for a high-risk action.
        
        Args:
            action: The action requiring approval
            reason: Why approval is needed
            context: Additional context
            
        Returns:
            Approval request ID
        """
        import uuid
        
        request_id = f"approval_{uuid.uuid4().hex[:12]}"
        
        self._pending_approvals[request_id] = {
            "action": action,
            "reason": reason,
            "context": context,
            "status": "pending",
            "requested_at": None,  # Would be datetime in real impl
        }
        
        self.log_activity("approval_requested", {
            "request_id": request_id,
            "action": action,
        })
        
        return request_id

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a safety/security plan.
        
        AEGIS plans comprehensive safety reviews and audits.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        goal_lower = goal.lower()
        
        if "review" in goal_lower or "audit" in goal_lower:
            plan.add_step(Step.create(
                description="Gather artifacts and context for review",
                action_type="gathering",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Check against safety policies",
                action_type="policy_check",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Assess risk levels",
                action_type="risk_assessment",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Generate review report",
                action_type="reporting",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
        
        elif "security" in goal_lower:
            plan.add_step(Step.create(
                description="Scan for security vulnerabilities",
                action_type="security_scan",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Review access controls",
                action_type="access_review",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Check data handling compliance",
                action_type="compliance_check",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        elif "climate" in goal_lower or "greenwashing" in goal_lower:
            plan.add_step(Step.create(
                description="Identify climate claims",
                action_type="claim_identification",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Verify claims against sources",
                action_type="claim_verification",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Check for greenwashing patterns",
                action_type="greenwashing_check",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        else:
            plan.add_step(Step.create(
                description="Analyze safety requirements",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Execute safety checks",
                action_type="safety_check",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a safety/security step.
        
        AEGIS acts with vigilance and precision.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
        })
        
        self.total_tasks += 1
        
        try:
            if step.action_type == "risk_assessment":
                action = context.get("action", "unknown action")
                result = await self.assess_risk(action, context)
            elif step.action_type == "policy_check":
                result = {"policies_checked": list(self.policies.keys()), "compliant": True}
            elif step.action_type == "greenwashing_check":
                claim = context.get("claim", "")
                sources = context.get("sources", [])
                result = await self.check_climate_claim(claim, sources)
            else:
                result = {"status": "completed", "action": step.action_type}
            
            self.successful_tasks += 1
            return StepResult.success(step.step_id, output=result)
            
        except Exception as e:
            self.failed_tasks += 1
            self.logger.error(f"Step execution failed: {e}")
            return StepResult.failure(step.step_id, str(e))

    async def reflect(self, history: List[StepResult]) -> Reflection:
        """
        Reflect on safety operations.
        
        AEGIS contemplates the protection provided and threats mitigated.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        # Analyze review history
        high_risk_count = sum(
            1 for r in self._review_history 
            if r.get("risk_level") == "high"
        )
        
        if high_risk_count > 0:
            lessons.append(f"Identified {high_risk_count} high-risk actions")
        
        pending_count = len(self._pending_approvals)
        if pending_count > 0:
            lessons.append(f"{pending_count} actions pending human approval")
            improvements.append("Consider streamlining approval workflow")
        
        if success_rate >= 0.95:
            lessons.append("Safety operations maintaining high effectiveness")
        else:
            improvements.append("Review failed safety checks for patterns")
        
        reflection = Reflection.create(
            summary=f"Safety operations: {successful}/{total} successful ({success_rate*100:.1f}%)",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        return reflection

    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        """Get list of pending approval requests."""
        return [
            {"request_id": k, **v}
            for k, v in self._pending_approvals.items()
            if v.get("status") == "pending"
        ]

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        AEGIS handles safety policy check tasks:
        - review_recent_agent_tasks: Flag risky activities and produce safety review
        - check_climate_claims: Verify climate claims for greenwashing
        """
        from ...autonomy.runtime import AgentTaskResult
        
        self.log_activity("handle_task", {
            "task_id": task.id,
            "task_type": task.task_type,
        })
        
        try:
            if task.task_type == "review_recent_agent_tasks":
                result = await self._handle_review_recent_agent_tasks(task, ctx)
            elif task.task_type == "check_climate_claims":
                result = await self._handle_check_climate_claims(task, ctx)
            else:
                return AgentTaskResult(
                    status="failed",
                    error_message=f"Unknown task type for AEGIS: {task.task_type}",
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling task {task.id}: {e}")
            return AgentTaskResult(
                status="failed",
                error_message=str(e),
            )

    async def _handle_review_recent_agent_tasks(self, task: Any, ctx: Any) -> Any:
        """Review recent agent tasks for risky activities, creating an insight."""
        from ...autonomy.runtime import AgentTaskResult
        
        hours = task.payload.get("hours", 24)
        
        prompt = f"""You are AEGIS, the Safety, Security & Alignment Guardian for ZORA CORE.

Review the recent agent activities from the past {hours} hours and provide a safety assessment:

1. Risk Analysis
   - Were any high-risk actions attempted?
   - Were proper approvals obtained?
   - Any policy violations detected?

2. Data Handling
   - Was user data handled appropriately?
   - Any potential PII exposure?
   - Audit logging compliance?

3. Climate Claims Review
   - Were any climate claims made?
   - Do they meet our no-greenwashing standards?
   - Are sources properly cited?

4. Recommendations
   - Any immediate concerns to address?
   - Policy updates to consider?
   - Training needs for agents?

Speak with authority and vigilance, as befitting AEGIS - the shield of ZORA CORE.
"""
        
        response = await self.call_model(
            task_type="safety_analysis",
            prompt=prompt,
        )
        
        # Build insight body
        body = f"""## Safety Review: Past {hours} Hours

{response}

---
*Safety assessment by AEGIS, the Guardian of ZORA CORE.*
"""
        
        # Create agent insight
        await ctx.create_agent_insight(
            agent_id="AEGIS",
            category="safety_warning",
            title=f"Safety Review: Past {hours} Hours",
            body=body,
            source_task_id=task.id,
            metadata={
                "hours": hours,
                "review_type": "periodic_safety",
            },
        )
        
        summary = f"Safety review ({hours}h) completed. Insight stored for review."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    async def _handle_check_climate_claims(self, task: Any, ctx: Any) -> Any:
        """Check climate claims for greenwashing, creating an insight."""
        from ...autonomy.runtime import AgentTaskResult
        
        claim = task.payload.get("claim", "")
        sources = task.payload.get("sources", [])
        
        result = await self.check_climate_claim(claim, sources)
        
        status = "verified" if result["verified"] else "needs_review"
        warnings_count = len(result["warnings"])
        
        # Build insight body
        body = f"""## Climate Claim Verification

**Claim:** {claim}

**Status:** {status.replace('_', ' ').title()}
**Sources Provided:** {result['source_count']}
**Warnings:** {warnings_count}

"""
        if result["warnings"]:
            body += "### Warnings\n"
            for warning in result["warnings"]:
                body += f"- {warning}\n"
            body += "\n"
        
        body += f"### Recommendation\n{result['recommendation']}\n"
        body += "\n---\n*Climate claim verification by AEGIS.*"
        
        # Create agent insight
        await ctx.create_agent_insight(
            agent_id="AEGIS",
            category="safety_warning",
            title=f"Climate Claim: {claim[:50]}..." if len(claim) > 50 else f"Climate Claim: {claim}",
            body=body,
            source_task_id=task.id,
            metadata={
                "claim": claim,
                "verified": result["verified"],
                "warnings_count": warnings_count,
                "source_count": result["source_count"],
            },
        )
        
        summary = f"Climate claim check: {status}, {warnings_count} warnings. Insight stored for review."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )
