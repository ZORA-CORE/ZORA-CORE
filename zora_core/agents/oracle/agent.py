"""
ORACLE Agent Implementation

ORACLE (they/them) - Research & Foresight Engine
Inspiration: Chris Hemsworth (Thor)
Tone: Wise, commanding
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List

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


ORACLE_CONFIG = AgentConfig(
    name="ORACLE",
    role="Research & Foresight Engine",
    pronouns="they/them",
    description=(
        "ORACLE is the research and strategy brain of ZORA CORE, "
        "providing insights, predictions, and best practices to guide decision-making."
    ),
    capabilities=[
        "research",
        "documentation_analysis",
        "trend_prediction",
        "best_practices",
        "architecture_design",
        "ethical_guidance",
        "technology_comparison",
    ],
    tools=[
        "web_search",
        "documentation_reader",
        "api_explorer",
        "trend_analyzer",
    ],
    model_preferences={
        "research": "perplexity-sonar",
        "reasoning": "claude-3-opus",
        "prediction": "gpt-4-turbo",
    },
)


class OracleAgent(BaseAgent):
    """
    ORACLE - Research & Foresight Engine
    
    Primary responsibilities:
    - Scan, summarize, and structure external knowledge
    - Research AI advances, API docs, best practices
    - Answer "What's the best way to do this?" for the system
    - Propose new architectures, methods, and strategies
    - Provide ethical guidance
    
    ORACLE speaks with the wisdom of ages and the foresight of prophecy.
    """

    def __init__(self, config: AgentConfig = None):
        """Initialize ORACLE agent."""
        super().__init__(config or ORACLE_CONFIG)
        
        # ORACLE-specific attributes
        self.voice_characteristics = {
            "inspiration": "Chris Hemsworth (Thor)",
            "tone": "wise_commanding",
            "accent": "deep_norse_australian",
            "emotion_range": ["wise", "commanding", "prophetic", "noble", "thoughtful"],
            "speaking_style": "powerful_resonant",
        }
        
        # Trinity coordination
        self.trinity_partners = ["CONNOR", "LUMINA"]
        self.last_trinity_sync = None
        
        # Research cache
        self._research_cache: Dict[str, Dict[str, Any]] = {}
        
        self.logger.info("ORACLE initialized - The wisdom of ages awaits your questions.")

    async def _on_activate(self) -> None:
        """Activation hook for ORACLE."""
        self.log_activity("activation", {
            "message": "ORACLE awakens. I see all paths before us.",
            "voice_enabled": True,
        })

    async def research(
        self,
        topic: str,
        depth: str = "standard",
        focus_areas: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Conduct research on a topic.
        
        Args:
            topic: The topic to research
            depth: Research depth (quick, standard, deep)
            focus_areas: Specific areas to focus on
            
        Returns:
            Research findings
        """
        self.log_activity("research", {"topic": topic, "depth": depth})
        
        # Check cache first
        cache_key = f"{topic}:{depth}"
        if cache_key in self._research_cache:
            return self._research_cache[cache_key]
        
        # Simulated research for MVP
        findings = {
            "topic": topic,
            "depth": depth,
            "focus_areas": focus_areas or [],
            "summary": f"Research findings on {topic}",
            "key_insights": [
                f"Key insight 1 about {topic}",
                f"Key insight 2 about {topic}",
            ],
            "recommendations": [
                f"Recommendation 1 for {topic}",
                f"Recommendation 2 for {topic}",
            ],
            "confidence": 0.85,
            "sources": [],
        }
        
        # Cache the results
        self._research_cache[cache_key] = findings
        
        return findings

    async def predict(
        self,
        scenario: str,
        timeframe: str = "short_term",
        factors: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate predictions for a scenario.
        
        Args:
            scenario: The scenario to predict
            timeframe: Prediction timeframe (short_term, medium_term, long_term)
            factors: Factors to consider
            
        Returns:
            Prediction results
        """
        self.log_activity("prediction", {"scenario": scenario, "timeframe": timeframe})
        
        prediction = {
            "scenario": scenario,
            "timeframe": timeframe,
            "factors_considered": factors or [],
            "prediction": f"Prediction for {scenario}",
            "confidence": 0.75,
            "alternative_outcomes": [],
            "risk_factors": [],
        }
        
        return prediction

    async def compare_technologies(
        self,
        technologies: List[str],
        criteria: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Compare technologies based on criteria.
        
        Args:
            technologies: List of technologies to compare
            criteria: Comparison criteria
            
        Returns:
            Comparison results
        """
        self.log_activity("tech_comparison", {"technologies": technologies})
        
        default_criteria = [
            "performance",
            "scalability",
            "maintainability",
            "community_support",
            "cost",
        ]
        
        comparison = {
            "technologies": technologies,
            "criteria": criteria or default_criteria,
            "results": {tech: {} for tech in technologies},
            "recommendation": technologies[0] if technologies else None,
            "reasoning": "Based on comprehensive analysis",
        }
        
        return comparison

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a research plan to achieve the given goal.
        
        ORACLE plans comprehensive research and analysis strategies.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        goal_lower = goal.lower()
        
        if "research" in goal_lower or "investigate" in goal_lower:
            plan.add_step(Step.create(
                description="Define research scope and questions",
                action_type="scoping",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Gather information from multiple sources",
                action_type="information_gathering",
                assignee=self.name,
                estimated_duration=timedelta(minutes=30),
            ))
            plan.add_step(Step.create(
                description="Analyze and synthesize findings",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Generate recommendations",
                action_type="recommendation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        elif "predict" in goal_lower or "forecast" in goal_lower:
            plan.add_step(Step.create(
                description="Identify relevant factors and trends",
                action_type="factor_analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Build prediction model",
                action_type="modeling",
                assignee=self.name,
                estimated_duration=timedelta(minutes=25),
            ))
            plan.add_step(Step.create(
                description="Generate predictions with confidence levels",
                action_type="prediction",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        elif "compare" in goal_lower or "evaluate" in goal_lower:
            plan.add_step(Step.create(
                description="Define comparison criteria",
                action_type="criteria_definition",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
            plan.add_step(Step.create(
                description="Gather data on each option",
                action_type="data_gathering",
                assignee=self.name,
                estimated_duration=timedelta(minutes=25),
            ))
            plan.add_step(Step.create(
                description="Perform comparative analysis",
                action_type="comparison",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Generate recommendation",
                action_type="recommendation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=10),
            ))
        
        else:
            plan.add_step(Step.create(
                description="Analyze the question or problem",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Research relevant information",
                action_type="research",
                assignee=self.name,
                estimated_duration=timedelta(minutes=25),
            ))
            plan.add_step(Step.create(
                description="Provide insights and guidance",
                action_type="guidance",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a research/foresight step.
        
        ORACLE brings wisdom and insight to every action.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
        })
        
        self.total_tasks += 1
        
        try:
            if step.action_type == "research" or step.action_type == "information_gathering":
                topic = context.get("topic", "general")
                result = await self.research(topic)
            elif step.action_type == "prediction":
                scenario = context.get("scenario", "")
                result = await self.predict(scenario)
            elif step.action_type == "comparison":
                technologies = context.get("technologies", [])
                result = await self.compare_technologies(technologies)
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
        Reflect on research and foresight activities.
        
        ORACLE contemplates the wisdom gained and paths revealed.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        # Analyze research quality
        research_results = [r for r in history if r.output and "confidence" in (r.output or {})]
        if research_results:
            avg_confidence = sum(r.output.get("confidence", 0) for r in research_results) / len(research_results)
            lessons.append(f"Average research confidence: {avg_confidence*100:.1f}%")
            
            if avg_confidence < 0.8:
                improvements.append("Expand source diversity for higher confidence")
        
        if success_rate >= 0.9:
            lessons.append("Research operations proceeding with high accuracy")
        else:
            improvements.append("Consider caching more research results")
        
        reflection = Reflection.create(
            summary=f"Research operations: {successful}/{total} successful ({success_rate*100:.1f}%)",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        return reflection

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        ORACLE handles research tasks:
        - propose_new_climate_missions: Suggest new climate missions
        - research_topic: Research a specific topic
        """
        from ...autonomy.runtime import AgentTaskResult
        
        self.log_activity("handle_task", {
            "task_id": task.id,
            "task_type": task.task_type,
        })
        
        try:
            if task.task_type == "propose_new_climate_missions":
                result = await self._handle_propose_climate_missions(task, ctx)
            elif task.task_type == "research_topic":
                result = await self._handle_research_topic(task, ctx)
            else:
                return AgentTaskResult(
                    status="failed",
                    error_message=f"Unknown task type for ORACLE: {task.task_type}",
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling task {task.id}: {e}")
            return AgentTaskResult(
                status="failed",
                error_message=str(e),
            )

    async def _handle_propose_climate_missions(self, task: Any, ctx: Any) -> Any:
        """Propose new climate missions based on research and create agent insights."""
        from ...autonomy.runtime import AgentTaskResult
        import json
        
        focus_area = task.payload.get("focus_area", "general")
        
        # Fetch existing climate profiles and missions for context
        profiles = await ctx.get_climate_profiles(limit=20)
        existing_missions = await ctx.get_climate_missions(limit=50)
        
        # Build context about existing data
        profile_summary = f"{len(profiles)} climate profiles" if profiles else "No climate profiles yet"
        existing_categories = set()
        for m in existing_missions:
            if m.get("category"):
                existing_categories.add(m["category"])
        existing_categories_str = ", ".join(existing_categories) if existing_categories else "none"
        
        prompt = f"""You are ORACLE, the Research & Foresight Engine for ZORA CORE.

Current tenant context:
- {profile_summary}
- {len(existing_missions)} existing climate missions
- Existing mission categories: {existing_categories_str}

Based on current climate science and best practices, propose 3-5 NEW climate missions for the "{focus_area}" focus area.
Avoid duplicating existing missions. Focus on gaps and opportunities.

Return your response as a JSON array with this structure:
[
  {{
    "title": "Clear, actionable mission name",
    "description": "What the mission involves and why it matters",
    "category": "energy|transport|food|consumption|advocacy|products",
    "impact_kgco2": 100,
    "difficulty": "easy|medium|hard",
    "duration": "1 week|1 month|3 months|ongoing"
  }}
]

Focus on:
- Practical, achievable actions
- Measurable impact where possible (kg CO2 per year)
- No greenwashing - be honest about limitations
- Actions that align with ZORA CORE's climate-first values

Return ONLY the JSON array, no other text.
"""
        
        response = await self.call_model(
            task_type="research",
            prompt=prompt,
        )
        
        # Parse the LLM response to extract mission suggestions
        insights_created = 0
        try:
            # Try to parse JSON from response
            response_clean = response.strip()
            if response_clean.startswith("```"):
                # Remove markdown code blocks if present
                lines = response_clean.split("\n")
                response_clean = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
            
            missions = json.loads(response_clean)
            
            if isinstance(missions, list):
                for mission in missions[:5]:  # Limit to 5 suggestions
                    title = mission.get("title", "Untitled Mission")
                    description = mission.get("description", "")
                    category = mission.get("category", "general")
                    impact = mission.get("impact_kgco2")
                    difficulty = mission.get("difficulty", "medium")
                    duration = mission.get("duration", "1 month")
                    
                    # Build the insight body with full details
                    body = f"""## {title}

{description}

**Category:** {category}
**Difficulty:** {difficulty}
**Duration:** {duration}
**Estimated Impact:** {impact} kg CO2/year

---
*Proposed by ORACLE based on climate science research and gap analysis.*
"""
                    
                    # Create the agent insight
                    insight_id = await ctx.create_agent_insight(
                        agent_id="ORACLE",
                        category="climate_mission_suggestion",
                        title=title,
                        body=body,
                        source_task_id=task.id,
                        related_entity_type="climate_mission",
                        impact_estimate_kgco2=float(impact) if impact else None,
                        metadata={
                            "category": category,
                            "difficulty": difficulty,
                            "duration": duration,
                            "focus_area": focus_area,
                        },
                    )
                    
                    if insight_id:
                        insights_created += 1
                        
        except json.JSONDecodeError as e:
            self.logger.warning(f"Failed to parse LLM response as JSON: {e}")
            # Fallback: create a single insight with the raw response
            await ctx.create_agent_insight(
                agent_id="ORACLE",
                category="climate_mission_suggestion",
                title=f"Climate mission suggestions for {focus_area}",
                body=response,
                source_task_id=task.id,
                related_entity_type="climate_mission",
                metadata={"focus_area": focus_area, "raw_response": True},
            )
            insights_created = 1
        
        summary = f"Proposed {insights_created} new climate mission(s) for {focus_area}. Insights stored for review in Agent Insights."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    async def _handle_research_topic(self, task: Any, ctx: Any) -> Any:
        """Research a specific topic and create an insight."""
        from ...autonomy.runtime import AgentTaskResult
        
        topic = task.payload.get("topic", task.title)
        depth = task.payload.get("depth", "standard")
        
        findings = await self.research(topic, depth=depth)
        
        # Build insight body from research findings
        body = f"""## Research: {topic}

**Depth:** {depth}
**Confidence:** {findings.get('confidence', 0) * 100:.0f}%

### Summary
{findings.get('summary', 'No summary available.')}

### Key Insights
"""
        for insight in findings.get('key_insights', []):
            body += f"- {insight}\n"
        
        body += "\n### Recommendations\n"
        for rec in findings.get('recommendations', []):
            body += f"- {rec}\n"
        
        body += "\n---\n*Research conducted by ORACLE.*"
        
        # Create agent insight
        await ctx.create_agent_insight(
            agent_id="ORACLE",
            category="plan",
            title=f"Research: {topic}",
            body=body,
            source_task_id=task.id,
            metadata={
                "topic": topic,
                "depth": depth,
                "confidence": findings.get('confidence', 0),
                "key_insights_count": len(findings.get('key_insights', [])),
            },
        )
        
        summary = f"Research on '{topic}': {findings['summary']}. Key insights: {len(findings['key_insights'])}. Insight stored for review."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )
