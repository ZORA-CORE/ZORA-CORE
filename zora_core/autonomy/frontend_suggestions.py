"""
ZORA CORE Frontend Config Suggestions Generator

This module generates frontend config change suggestions using LLM providers.
Agents (SAM, LUMINA) can propose config changes that humans review and approve.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger("zora.autonomy.frontend_suggestions")


@dataclass
class FrontendConfigSuggestion:
    """A suggested frontend config change."""
    page: str
    current_config: Dict[str, Any]
    suggested_config: Dict[str, Any]
    diff_summary: str
    agent_id: str


@dataclass
class AgentSuggestionResult:
    """Result of generating a frontend config suggestion."""
    success: bool
    suggestion: Optional[FrontendConfigSuggestion] = None
    error: Optional[str] = None


# Default configs for each page
DEFAULT_HOME_CONFIG = {
    "hero_title": "ZORA CORE",
    "hero_subtitle": "Climate-first AI Operating System.",
    "primary_cta_label": "Open Climate OS",
    "primary_cta_link": "/climate",
    "show_climate_dashboard": True,
    "show_missions_section": True,
}

DEFAULT_CLIMATE_CONFIG = {
    "hero_title": "Climate OS",
    "hero_subtitle": "Track your climate impact and complete missions to reduce your footprint.",
    "show_profile_section": True,
    "show_dashboard_section": True,
    "show_missions_section": True,
}


def get_default_config(page: str) -> Dict[str, Any]:
    """Get the default config for a page."""
    if page == "home":
        return DEFAULT_HOME_CONFIG.copy()
    elif page == "climate":
        return DEFAULT_CLIMATE_CONFIG.copy()
    return {}


def generate_diff_summary(current: Dict[str, Any], suggested: Dict[str, Any]) -> str:
    """Generate a human-readable summary of config changes."""
    changes = []
    
    for key, new_value in suggested.items():
        old_value = current.get(key)
        if old_value != new_value:
            if isinstance(new_value, bool):
                action = "Show" if new_value else "Hide"
                field_name = key.replace("show_", "").replace("_", " ")
                changes.append(f"{action} {field_name}")
            elif isinstance(new_value, str) and isinstance(old_value, str):
                if len(new_value) > 50:
                    changes.append(f"Update {key}")
                else:
                    changes.append(f"Change {key} to '{new_value}'")
            else:
                changes.append(f"Update {key}")
    
    if not changes:
        return "No changes suggested"
    
    return "; ".join(changes)


def validate_config(page: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize a suggested config."""
    defaults = get_default_config(page)
    validated = defaults.copy()
    
    # Only allow known keys
    for key in defaults:
        if key in config:
            value = config[key]
            default_value = defaults[key]
            
            # Type checking
            if isinstance(default_value, bool) and isinstance(value, bool):
                validated[key] = value
            elif isinstance(default_value, str) and isinstance(value, str):
                # Ensure non-empty strings for required fields
                if value.strip():
                    validated[key] = value.strip()
            else:
                # Keep default for invalid types
                pass
    
    return validated


def build_suggestion_prompt(
    page: str,
    current_config: Dict[str, Any],
    climate_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Build the prompt for generating config suggestions."""
    prompt = f"""You are SAM, the Frontend & Experience Architect for ZORA CORE, a climate-first AI Operating System.

Your task is to suggest improvements to the frontend configuration for the "{page}" page.

Current configuration:
```json
{json.dumps(current_config, indent=2)}
```

"""
    
    if climate_context:
        prompt += f"""Climate context for this tenant:
- Profile: {climate_context.get('profile_name', 'Unknown')}
- Total missions: {climate_context.get('total_missions', 0)}
- Completed missions: {climate_context.get('completed_missions', 0)}
- Total impact: {climate_context.get('total_impact_kgco2', 0)} kg CO2
- Categories: {', '.join(climate_context.get('categories', []))}

"""
    
    if page == "home":
        prompt += """The home page (dashboard) has these configurable fields:
- hero_title: Main heading (string)
- hero_subtitle: Subheading text (string)
- primary_cta_label: Button text (string)
- primary_cta_link: Button link (string)
- show_climate_dashboard: Show climate summary section (boolean)
- show_missions_section: Show recent missions section (boolean)

"""
    elif page == "climate":
        prompt += """The climate page has these configurable fields:
- hero_title: Main heading (string)
- hero_subtitle: Subheading text (string)
- show_profile_section: Show climate profile section (boolean)
- show_dashboard_section: Show dashboard stats section (boolean)
- show_missions_section: Show missions section (boolean)

"""
    
    prompt += """Guidelines:
1. Keep the climate-first mission in mind
2. Make text engaging but honest (no greenwashing)
3. Consider what sections would be most useful for this tenant
4. Keep hero text concise and impactful
5. Only suggest changes that would improve the user experience

Respond with a JSON object containing:
1. "suggested_config": The complete suggested configuration (all fields)
2. "reasoning": Brief explanation of why you made these changes

Example response:
```json
{
  "suggested_config": {
    "hero_title": "Your Climate Journey",
    "hero_subtitle": "Track your impact and take action.",
    ...
  },
  "reasoning": "Updated hero text to be more personal and action-oriented."
}
```

Respond ONLY with the JSON object, no other text."""
    
    return prompt


async def generate_frontend_config_suggestion(
    tenant_id: str,
    page: str,
    agent_id: str = "SAM",
    current_config: Optional[Dict[str, Any]] = None,
    climate_context: Optional[Dict[str, Any]] = None,
) -> AgentSuggestionResult:
    """
    Generate a frontend config suggestion using LLM.
    
    Args:
        tenant_id: The tenant ID
        page: The page to generate suggestions for ("home" or "climate")
        agent_id: The agent generating the suggestion (default: "SAM")
        current_config: Current config (or None to use defaults)
        climate_context: Optional climate context for the tenant
        
    Returns:
        AgentSuggestionResult with the suggestion or error
    """
    try:
        # Get current config or defaults
        if current_config is None:
            current_config = get_default_config(page)
        
        # Build prompt
        prompt = build_suggestion_prompt(page, current_config, climate_context)
        
        # Try to use OpenAI if available
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not configured, using stub suggestion")
            return _generate_stub_suggestion(page, current_config, agent_id)
        
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=api_key)
            
            response = await client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are SAM, a frontend architect for a climate-first AI system."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )
            
            response_text = response.choices[0].message.content
            
            # Parse JSON from response
            # Handle markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            result = json.loads(response_text.strip())
            suggested_config = result.get("suggested_config", {})
            
            # Validate and sanitize
            validated_config = validate_config(page, suggested_config)
            
            # Generate diff summary
            diff_summary = generate_diff_summary(current_config, validated_config)
            
            suggestion = FrontendConfigSuggestion(
                page=page,
                current_config=current_config,
                suggested_config=validated_config,
                diff_summary=diff_summary,
                agent_id=agent_id,
            )
            
            return AgentSuggestionResult(success=True, suggestion=suggestion)
            
        except ImportError:
            logger.warning("OpenAI package not installed, using stub suggestion")
            return _generate_stub_suggestion(page, current_config, agent_id)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return AgentSuggestionResult(success=False, error=f"Failed to parse LLM response: {e}")
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return AgentSuggestionResult(success=False, error=f"LLM call failed: {e}")
            
    except Exception as e:
        logger.error(f"Failed to generate suggestion: {e}")
        return AgentSuggestionResult(success=False, error=str(e))


def _generate_stub_suggestion(
    page: str,
    current_config: Dict[str, Any],
    agent_id: str,
) -> AgentSuggestionResult:
    """Generate a stub suggestion when LLM is not available."""
    suggested_config = current_config.copy()
    
    # Make some simple changes for demo purposes
    if page == "home":
        suggested_config["hero_subtitle"] = "Your climate-first AI companion. Track impact, complete missions, make a difference."
    elif page == "climate":
        suggested_config["hero_subtitle"] = "Every action counts. Track your progress and see your impact grow."
    
    diff_summary = generate_diff_summary(current_config, suggested_config)
    
    suggestion = FrontendConfigSuggestion(
        page=page,
        current_config=current_config,
        suggested_config=suggested_config,
        diff_summary=diff_summary,
        agent_id=agent_id,
    )
    
    return AgentSuggestionResult(success=True, suggestion=suggestion)
