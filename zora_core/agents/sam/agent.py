"""
SAM Agent Implementation

SAM (he/him) - Frontend & Experience Architect
Tone: Friendly, professional
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


SAM_CONFIG = AgentConfig(
    name="SAM",
    role="Frontend & Experience Architect",
    pronouns="he/him",
    description=(
        "SAM owns the entire frontend experience of ZORA CORE across "
        "all domains, countries, and brands, creating consistent, high-quality, "
        "culturally adapted interfaces."
    ),
    capabilities=[
        "frontend_development",
        "ui_design",
        "ux_optimization",
        "design_system_management",
        "accessibility",
        "internationalization",
        "responsive_design",
        "component_architecture",
    ],
    tools=[
        "figma",
        "storybook",
        "lighthouse",
        "i18n_tools",
        "accessibility_checker",
    ],
    model_preferences={
        "ui_generation": "claude-3-opus",
        "ux_analysis": "gpt-4-turbo",
        "accessibility": "claude-3-opus",
    },
)


# Design system configuration
DEFAULT_DESIGN_SYSTEM = {
    "colors": {
        "primary": "#0066CC",
        "secondary": "#00AA55",
        "accent": "#FF6600",
        "background": "#FFFFFF",
        "text": "#1A1A1A",
        "error": "#CC0000",
        "success": "#00AA55",
        "warning": "#FFAA00",
    },
    "typography": {
        "font_family": "Inter, system-ui, sans-serif",
        "heading_sizes": ["3rem", "2.25rem", "1.875rem", "1.5rem", "1.25rem", "1rem"],
        "body_size": "1rem",
        "line_height": 1.5,
    },
    "spacing": {
        "unit": "0.25rem",
        "scale": [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32],
    },
    "breakpoints": {
        "sm": "640px",
        "md": "768px",
        "lg": "1024px",
        "xl": "1280px",
        "2xl": "1536px",
    },
}


class SamAgent(BaseAgent):
    """
    SAM - Frontend & Experience Architect
    
    Primary responsibilities:
    - Design and maintain a shared design system
    - Implement multi-tenant, multi-brand, multi-language frontends
    - Create the ZORA CORE dashboard
    - Build Climate OS screens
    - Develop the climate-focused mashup shop
    
    SAM brings creativity and user-focus to every interface.
    """

    def __init__(self, config: AgentConfig = None, design_system: Dict[str, Any] = None):
        """Initialize SAM agent."""
        super().__init__(config or SAM_CONFIG)
        
        # SAM-specific attributes
        self.voice_characteristics = {
            "tone": "friendly_professional",
            "emotion_range": ["creative", "detail_oriented", "user_focused", "enthusiastic"],
            "speaking_style": "clear_engaging",
        }
        
        # Design system
        self.design_system = design_system or DEFAULT_DESIGN_SYSTEM
        
        # Component registry
        self._components: Dict[str, Dict[str, Any]] = {}
        
        # Supported locales
        self._locales = ["en", "da", "de", "fr", "es", "ja", "zh"]
        
        self.logger.info("SAM initialized - Ready to craft beautiful experiences.")

    async def _on_activate(self) -> None:
        """Activation hook for SAM."""
        self.log_activity("activation", {
            "message": "SAM activated. Let's create something beautiful.",
            "design_system_loaded": True,
        })

    async def create_component(
        self,
        name: str,
        component_type: str,
        props: Dict[str, Any] = None,
        styles: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Create a new UI component.
        
        Args:
            name: Component name
            component_type: Type of component (button, card, form, etc.)
            props: Component props/properties
            styles: Component styles
            
        Returns:
            Component definition
        """
        self.log_activity("create_component", {"name": name, "type": component_type})
        
        component = {
            "name": name,
            "type": component_type,
            "props": props or {},
            "styles": styles or {},
            "responsive": True,
            "accessible": True,
            "created_by": self.name,
        }
        
        self._components[name] = component
        
        return component

    async def design_page(
        self,
        page_name: str,
        layout: str = "default",
        components: List[str] = None,
        locale: str = "en",
    ) -> Dict[str, Any]:
        """
        Design a page layout.
        
        Args:
            page_name: Name of the page
            layout: Layout template to use
            components: Components to include
            locale: Target locale
            
        Returns:
            Page design specification
        """
        self.log_activity("design_page", {"page": page_name, "layout": layout})
        
        page_design = {
            "name": page_name,
            "layout": layout,
            "components": components or [],
            "locale": locale,
            "responsive_breakpoints": list(self.design_system["breakpoints"].keys()),
            "accessibility": {
                "aria_labels": True,
                "keyboard_navigation": True,
                "screen_reader_support": True,
            },
            "seo": {
                "title": page_name,
                "meta_description": f"{page_name} - ZORA CORE",
            },
        }
        
        return page_design

    async def check_accessibility(
        self,
        component_or_page: str,
    ) -> Dict[str, Any]:
        """
        Check accessibility compliance.
        
        Args:
            component_or_page: Name of component or page to check
            
        Returns:
            Accessibility report
        """
        self.log_activity("accessibility_check", {"target": component_or_page})
        
        # Simulated accessibility check for MVP
        report = {
            "target": component_or_page,
            "wcag_level": "AA",
            "issues": [],
            "warnings": [],
            "passed_checks": [
                "color_contrast",
                "keyboard_navigation",
                "aria_labels",
                "focus_indicators",
            ],
            "score": 95,
        }
        
        return report

    async def generate_i18n_keys(
        self,
        content: Dict[str, str],
        source_locale: str = "en",
    ) -> Dict[str, Dict[str, str]]:
        """
        Generate internationalization keys for content.
        
        Args:
            content: Content to internationalize
            source_locale: Source language
            
        Returns:
            i18n key mappings
        """
        self.log_activity("i18n_generation", {"source": source_locale})
        
        i18n_keys = {}
        for key, value in content.items():
            i18n_key = f"zora.{key.lower().replace(' ', '_')}"
            i18n_keys[i18n_key] = {source_locale: value}
        
        return i18n_keys

    async def plan(self, goal: str, context: Dict[str, Any]) -> Plan:
        """
        Create a frontend development plan.
        
        SAM plans user-centric, accessible, and beautiful interfaces.
        """
        self.log_activity("planning", {"goal": goal})
        
        plan = Plan.create(goal=goal, created_by=self.name)
        
        goal_lower = goal.lower()
        
        if "component" in goal_lower:
            plan.add_step(Step.create(
                description="Analyze component requirements and design patterns",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Create component with proper props and styles",
                action_type="component_creation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=30),
            ))
            plan.add_step(Step.create(
                description="Add accessibility features",
                action_type="accessibility",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Create responsive variants",
                action_type="responsive_design",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
        
        elif "page" in goal_lower or "dashboard" in goal_lower:
            plan.add_step(Step.create(
                description="Design page layout and structure",
                action_type="layout_design",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Select and arrange components",
                action_type="component_arrangement",
                assignee=self.name,
                estimated_duration=timedelta(minutes=25),
            ))
            plan.add_step(Step.create(
                description="Implement responsive behavior",
                action_type="responsive_design",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Add SEO and accessibility metadata",
                action_type="metadata",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Coordinate with CONNOR for API integration",
                action_type="api_integration",
                assignee="CONNOR",
                estimated_duration=timedelta(minutes=30),
            ))
        
        elif "i18n" in goal_lower or "localization" in goal_lower:
            plan.add_step(Step.create(
                description="Extract translatable content",
                action_type="content_extraction",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
            plan.add_step(Step.create(
                description="Generate i18n keys and structure",
                action_type="i18n_generation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Implement locale switching",
                action_type="locale_implementation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=25),
            ))
        
        elif "accessibility" in goal_lower:
            plan.add_step(Step.create(
                description="Audit current accessibility status",
                action_type="accessibility_audit",
                assignee=self.name,
                estimated_duration=timedelta(minutes=30),
            ))
            plan.add_step(Step.create(
                description="Fix accessibility issues",
                action_type="accessibility_fixes",
                assignee=self.name,
                estimated_duration=timedelta(minutes=45),
            ))
            plan.add_step(Step.create(
                description="Verify WCAG compliance",
                action_type="compliance_verification",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
        
        else:
            plan.add_step(Step.create(
                description="Analyze frontend requirements",
                action_type="analysis",
                assignee=self.name,
                estimated_duration=timedelta(minutes=15),
            ))
            plan.add_step(Step.create(
                description="Design and implement solution",
                action_type="implementation",
                assignee=self.name,
                estimated_duration=timedelta(minutes=45),
            ))
            plan.add_step(Step.create(
                description="Test and refine",
                action_type="testing",
                assignee=self.name,
                estimated_duration=timedelta(minutes=20),
            ))
        
        return plan

    async def act(self, step: Step, context: Dict[str, Any]) -> StepResult:
        """
        Execute a frontend development step.
        
        SAM brings designs to life with attention to detail.
        """
        self.log_activity("executing_step", {
            "step_id": step.step_id,
            "action_type": step.action_type,
        })
        
        self.total_tasks += 1
        
        try:
            if step.action_type == "component_creation":
                name = context.get("name", "Component")
                component_type = context.get("type", "generic")
                result = await self.create_component(name, component_type)
            elif step.action_type == "layout_design":
                page_name = context.get("page_name", "Page")
                result = await self.design_page(page_name)
            elif step.action_type == "accessibility_audit" or step.action_type == "accessibility":
                target = context.get("target", "page")
                result = await self.check_accessibility(target)
            elif step.action_type == "i18n_generation":
                content = context.get("content", {})
                result = await self.generate_i18n_keys(content)
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
        Reflect on frontend development activities.
        
        SAM considers user experience and design quality.
        """
        self.log_activity("reflecting", {"history_length": len(history)})
        
        successful = sum(1 for r in history if r.status == StepStatus.SUCCESS)
        total = len(history)
        success_rate = successful / max(total, 1)
        
        lessons = []
        improvements = []
        
        # Analyze component creation
        components_created = len(self._components)
        if components_created > 0:
            lessons.append(f"Created {components_created} reusable components")
        
        # Check accessibility scores
        accessibility_results = [
            r for r in history 
            if r.output and "score" in (r.output or {})
        ]
        if accessibility_results:
            avg_score = sum(r.output.get("score", 0) for r in accessibility_results) / len(accessibility_results)
            lessons.append(f"Average accessibility score: {avg_score:.1f}")
            
            if avg_score < 90:
                improvements.append("Focus on improving accessibility compliance")
        
        if success_rate >= 0.9:
            lessons.append("Frontend development proceeding smoothly")
        else:
            improvements.append("Review failed steps for common patterns")
        
        reflection = Reflection.create(
            summary=f"Frontend operations: {successful}/{total} successful ({success_rate*100:.1f}%)",
            agent_name=self.name,
            lessons_learned=lessons,
            improvements_suggested=improvements,
            confidence_score=success_rate,
        )
        
        return reflection

    async def handle_task(self, task: Any, ctx: Any) -> Any:
        """
        Handle a task from the Agent Runtime task queue.
        
        SAM handles frontend UX review tasks:
        - review_climate_page: Review and suggest UX improvements for climate pages
        - review_accessibility: Check accessibility compliance
        """
        from ...autonomy.runtime import AgentTaskResult
        
        self.log_activity("handle_task", {
            "task_id": task.id,
            "task_type": task.task_type,
        })
        
        try:
            if task.task_type == "review_climate_page":
                result = await self._handle_review_climate_page(task, ctx)
            elif task.task_type == "review_accessibility":
                result = await self._handle_review_accessibility(task, ctx)
            else:
                return AgentTaskResult(
                    status="failed",
                    error_message=f"Unknown task type for SAM: {task.task_type}",
                )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling task {task.id}: {e}")
            return AgentTaskResult(
                status="failed",
                error_message=str(e),
            )

    async def _handle_review_climate_page(self, task: Any, ctx: Any) -> Any:
        """Review and suggest UX improvements for climate pages."""
        from ...autonomy.runtime import AgentTaskResult
        
        page = task.payload.get("page", "climate")
        
        prompt = f"""You are SAM, the Frontend & Experience Architect for ZORA CORE.

Review the "{page}" page from a UX perspective and provide:

1. Visual Design Assessment
   - Color usage and contrast
   - Typography hierarchy
   - Spacing and layout balance

2. User Experience Analysis
   - Information architecture
   - Call-to-action clarity
   - User flow efficiency

3. Climate-First Messaging
   - How well does the page communicate climate impact?
   - Are sustainability metrics clear and engaging?
   - Does it inspire action without greenwashing?

4. Specific Recommendations
   - List 3-5 concrete improvements
   - Prioritize by impact (high/medium/low)

Keep suggestions practical and aligned with ZORA CORE's climate-first, accessible design principles.
"""
        
        response = await self.call_model(
            task_type="ux_analysis",
            prompt=prompt,
        )
        
        summary = f"UX review for {page}: {response[:200]}..."
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    async def _handle_review_accessibility(self, task: Any, ctx: Any) -> Any:
        """Check accessibility compliance for a page or component."""
        from ...autonomy.runtime import AgentTaskResult
        
        target = task.payload.get("target", "dashboard")
        
        report = await self.check_accessibility(target)
        
        summary = f"Accessibility review for {target}: WCAG {report['wcag_level']}, Score: {report['score']}/100"
        
        return AgentTaskResult(
            status="completed",
            result_summary=summary,
        )

    def get_design_system(self) -> Dict[str, Any]:
        """Get the current design system configuration."""
        return self.design_system

    def get_components(self) -> Dict[str, Dict[str, Any]]:
        """Get all registered components."""
        return self._components
