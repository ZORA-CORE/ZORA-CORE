"""
Tests for all 6 ZORA CORE agents.
"""

import pytest
from datetime import timedelta

from zora_core.agents import (
    ConnorAgent,
    LuminaAgent,
    EivorAgent,
    OracleAgent,
    AegisAgent,
    SamAgent,
    Plan,
    Step,
    StepResult,
    RiskLevel,
    StepStatus,
)


class TestConnorAgent:
    """Tests for CONNOR agent."""

    def test_initialization(self):
        """Test CONNOR agent initialization."""
        connor = ConnorAgent()
        
        assert connor.name == "CONNOR"
        assert connor.role == "Developer / System Problem Solver"
        assert connor.pronouns == "he/him"
        assert connor.status == "initialized"
        assert "code_analysis" in connor.capabilities
        assert "github" in connor.tools

    def test_voice_characteristics(self):
        """Test CONNOR's voice characteristics."""
        connor = ConnorAgent()
        
        assert connor.voice_characteristics["inspiration"] == "Paul Bettany"
        assert connor.voice_characteristics["tone"] == "strategic_commanding"

    @pytest.mark.asyncio
    async def test_plan_api_task(self):
        """Test CONNOR planning an API task."""
        connor = ConnorAgent()
        
        plan = await connor.plan(
            goal="Create a new API endpoint",
            context={}
        )
        
        assert plan.goal == "Create a new API endpoint"
        assert plan.created_by == "CONNOR"
        assert len(plan.steps) > 0
        assert any("API" in s.description or "api" in s.action_type for s in plan.steps)

    @pytest.mark.asyncio
    async def test_act_code_analysis(self):
        """Test CONNOR executing a code analysis step."""
        connor = ConnorAgent()
        
        step = Step.create(
            description="Analyze code",
            action_type="code_analysis",
            assignee="CONNOR",
        )
        
        result = await connor.act(step, {})
        
        assert result.status == StepStatus.SUCCESS
        assert "patterns_found" in result.output

    @pytest.mark.asyncio
    async def test_reflect(self):
        """Test CONNOR reflecting on history."""
        connor = ConnorAgent()
        
        history = [
            StepResult.success("step_1", {"data": "test"}),
            StepResult.success("step_2", {"data": "test"}),
        ]
        
        reflection = await connor.reflect(history)
        
        assert reflection.agent_name == "CONNOR"
        assert reflection.confidence_score > 0

    def test_get_status(self):
        """Test getting CONNOR's status."""
        connor = ConnorAgent()
        
        status = connor.get_status()
        
        assert status["name"] == "CONNOR"
        assert status["role"] == "Developer / System Problem Solver"
        assert status["status"] == "initialized"


class TestLuminaAgent:
    """Tests for LUMINA agent."""

    def test_initialization(self):
        """Test LUMINA agent initialization."""
        lumina = LuminaAgent()
        
        assert lumina.name == "LUMINA"
        assert lumina.role == "Planner / Orchestrator"
        assert lumina.pronouns == "she/her"
        assert "task_planning" in lumina.capabilities

    def test_voice_characteristics(self):
        """Test LUMINA's voice characteristics."""
        lumina = LuminaAgent()
        
        assert lumina.voice_characteristics["inspiration"] == "Emilia Clarke"
        assert lumina.voice_characteristics["tone"] == "creative_inspiring"

    @pytest.mark.asyncio
    async def test_plan_frontend_task(self):
        """Test LUMINA planning a frontend task."""
        lumina = LuminaAgent()
        
        plan = await lumina.plan(
            goal="Build a new dashboard page",
            context={}
        )
        
        assert plan.goal == "Build a new dashboard page"
        assert plan.created_by == "LUMINA"
        assert len(plan.steps) > 0
        # Should route frontend tasks to SAM
        assert any(s.assignee == "SAM" for s in plan.steps)

    def test_route_to_agent(self):
        """Test LUMINA's agent routing."""
        lumina = LuminaAgent()
        
        assert lumina._route_to_agent("backend API") == "CONNOR"
        assert lumina._route_to_agent("frontend UI") == "SAM"
        assert lumina._route_to_agent("memory storage") == "EIVOR"
        assert lumina._route_to_agent("research topic") == "ORACLE"
        assert lumina._route_to_agent("security audit") == "AEGIS"


class TestEivorAgent:
    """Tests for EIVOR agent."""

    def test_initialization(self):
        """Test EIVOR agent initialization."""
        eivor = EivorAgent()
        
        assert eivor.name == "EIVOR"
        assert eivor.role == "Memory / Knowledge Weaver"
        assert eivor.pronouns == "she/her"
        assert "memory_storage" in eivor.capabilities

    @pytest.mark.asyncio
    async def test_save_memory(self):
        """Test EIVOR saving a memory."""
        eivor = EivorAgent()
        
        memory_id = await eivor.save_memory(
            agent="CONNOR",
            memory_type="decision",
            content="Decided to use PostgreSQL",
            tags=["database", "architecture"],
        )
        
        assert memory_id.startswith("mem_")

    @pytest.mark.asyncio
    async def test_search_memory(self):
        """Test EIVOR searching memories."""
        eivor = EivorAgent()
        
        # Save a memory first
        await eivor.save_memory(
            agent="CONNOR",
            memory_type="decision",
            content="Decided to use PostgreSQL for the database",
            tags=["database"],
        )
        
        # Search for it
        results = await eivor.search_memory(query="PostgreSQL")
        
        assert len(results) > 0
        assert "PostgreSQL" in results[0]["content"]

    @pytest.mark.asyncio
    async def test_session_history(self):
        """Test EIVOR session history."""
        eivor = EivorAgent()
        
        session_id = "test_session_123"
        
        await eivor.add_to_session(session_id, {"action": "test", "agent": "CONNOR"})
        await eivor.add_to_session(session_id, {"action": "test2", "agent": "LUMINA"})
        
        history = await eivor.get_session_history(session_id)
        
        assert len(history) == 2
        assert history[0]["action"] == "test"

    def test_get_memory_stats(self):
        """Test getting EIVOR's memory stats."""
        eivor = EivorAgent()
        
        stats = eivor.get_memory_stats()
        
        assert "total_memories" in stats
        assert "total_sessions" in stats


class TestOracleAgent:
    """Tests for ORACLE agent."""

    def test_initialization(self):
        """Test ORACLE agent initialization."""
        oracle = OracleAgent()
        
        assert oracle.name == "ORACLE"
        assert oracle.role == "Research & Foresight Engine"
        assert oracle.pronouns == "they/them"
        assert "research" in oracle.capabilities

    def test_voice_characteristics(self):
        """Test ORACLE's voice characteristics."""
        oracle = OracleAgent()
        
        assert oracle.voice_characteristics["inspiration"] == "Chris Hemsworth (Thor)"
        assert oracle.voice_characteristics["tone"] == "wise_commanding"

    @pytest.mark.asyncio
    async def test_research(self):
        """Test ORACLE conducting research."""
        oracle = OracleAgent()
        
        findings = await oracle.research(
            topic="climate data APIs",
            depth="standard",
        )
        
        assert findings["topic"] == "climate data APIs"
        assert "key_insights" in findings
        assert "recommendations" in findings

    @pytest.mark.asyncio
    async def test_predict(self):
        """Test ORACLE making predictions."""
        oracle = OracleAgent()
        
        prediction = await oracle.predict(
            scenario="adoption of climate tech",
            timeframe="medium_term",
        )
        
        assert prediction["scenario"] == "adoption of climate tech"
        assert "confidence" in prediction

    @pytest.mark.asyncio
    async def test_compare_technologies(self):
        """Test ORACLE comparing technologies."""
        oracle = OracleAgent()
        
        comparison = await oracle.compare_technologies(
            technologies=["Next.js", "Remix", "Astro"],
        )
        
        assert len(comparison["technologies"]) == 3
        assert "recommendation" in comparison


class TestAegisAgent:
    """Tests for AEGIS agent."""

    def test_initialization(self):
        """Test AEGIS agent initialization."""
        aegis = AegisAgent()
        
        assert aegis.name == "AEGIS"
        assert aegis.role == "Safety, Security & Alignment Guardian"
        assert aegis.pronouns == "they/them"
        assert "safety_review" in aegis.capabilities

    @pytest.mark.asyncio
    async def test_assess_risk_low(self):
        """Test AEGIS assessing low risk action."""
        aegis = AegisAgent()
        
        assessment = await aegis.assess_risk(
            action="read documentation",
            context={},
        )
        
        assert assessment["risk_level"] == "low"
        assert assessment["requires_human_approval"] is False

    @pytest.mark.asyncio
    async def test_assess_risk_high(self):
        """Test AEGIS assessing high risk action."""
        aegis = AegisAgent()
        
        assessment = await aegis.assess_risk(
            action="production_deployment of new code",
            context={},
        )
        
        assert assessment["risk_level"] == "high"
        assert assessment["requires_human_approval"] is True

    @pytest.mark.asyncio
    async def test_check_climate_claim_valid(self):
        """Test AEGIS checking a valid climate claim."""
        aegis = AegisAgent()
        
        result = await aegis.check_climate_claim(
            claim="This product reduces carbon emissions by 20%",
            sources=["https://example.com/study"],
        )
        
        assert result["has_sources"] is True

    @pytest.mark.asyncio
    async def test_check_climate_claim_greenwashing(self):
        """Test AEGIS detecting potential greenwashing."""
        aegis = AegisAgent()
        
        result = await aegis.check_climate_claim(
            claim="This product is 100% sustainable and has zero impact on the environment",
            sources=[],
        )
        
        assert len(result["warnings"]) > 0
        assert result["verified"] is False

    @pytest.mark.asyncio
    async def test_review_plan(self):
        """Test AEGIS reviewing a plan."""
        aegis = AegisAgent()
        
        plan = Plan.create(goal="Test plan")
        plan.add_step(Step.create(
            description="Safe step",
            action_type="read",
        ))
        
        review = await aegis.review_plan(plan)
        
        assert "approved" in review
        assert "issues" in review


class TestSamAgent:
    """Tests for SAM agent."""

    def test_initialization(self):
        """Test SAM agent initialization."""
        sam = SamAgent()
        
        assert sam.name == "SAM"
        assert sam.role == "Frontend & Experience Architect"
        assert sam.pronouns == "he/him"
        assert "frontend_development" in sam.capabilities

    @pytest.mark.asyncio
    async def test_create_component(self):
        """Test SAM creating a component."""
        sam = SamAgent()
        
        component = await sam.create_component(
            name="ClimateCard",
            component_type="card",
            props={"title": "string", "impact": "number"},
        )
        
        assert component["name"] == "ClimateCard"
        assert component["type"] == "card"
        assert component["accessible"] is True

    @pytest.mark.asyncio
    async def test_design_page(self):
        """Test SAM designing a page."""
        sam = SamAgent()
        
        page = await sam.design_page(
            page_name="Dashboard",
            layout="default",
            components=["Header", "ClimateCard", "MissionList"],
        )
        
        assert page["name"] == "Dashboard"
        assert len(page["components"]) == 3
        assert page["accessibility"]["aria_labels"] is True

    @pytest.mark.asyncio
    async def test_check_accessibility(self):
        """Test SAM checking accessibility."""
        sam = SamAgent()
        
        report = await sam.check_accessibility("Dashboard")
        
        assert report["wcag_level"] == "AA"
        assert report["score"] > 0

    @pytest.mark.asyncio
    async def test_generate_i18n_keys(self):
        """Test SAM generating i18n keys."""
        sam = SamAgent()
        
        keys = await sam.generate_i18n_keys(
            content={"Welcome": "Welcome to ZORA", "Dashboard": "Dashboard"},
            source_locale="en",
        )
        
        assert "zora.welcome" in keys
        assert "zora.dashboard" in keys

    def test_get_design_system(self):
        """Test getting SAM's design system."""
        sam = SamAgent()
        
        design_system = sam.get_design_system()
        
        assert "colors" in design_system
        assert "typography" in design_system
        assert "spacing" in design_system
        assert "breakpoints" in design_system
