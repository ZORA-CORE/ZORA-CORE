"""
ZORA CORE Model Router

Routes requests to appropriate AI providers based on task type,
agent preferences, and availability.
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class ModelConfig:
    """Configuration for a specific model."""
    provider: str
    model_id: str
    name: str
    context_window: int
    max_output: int
    capabilities: List[str] = field(default_factory=list)
    recommended_for: List[str] = field(default_factory=list)
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0


class ModelRouter:
    """
    Routes AI requests to appropriate providers and models.
    
    Features:
    - Task-based routing
    - Agent-specific preferences
    - Fallback chains
    - Rate limiting
    - Cost tracking
    """

    def __init__(self, config_path: str = None):
        """
        Initialize the model router.
        
        Args:
            config_path: Path to ai_providers.yaml (optional)
        """
        self.logger = logging.getLogger("zora.model_router")
        
        # Load configuration
        if config_path:
            self.config_path = Path(config_path)
        else:
            # Default path
            self.config_path = Path(__file__).parent.parent.parent / "config" / "ai_providers.yaml"
        
        self.config = self._load_config()
        
        # Build model registry
        self._models: Dict[str, ModelConfig] = {}
        self._build_model_registry()
        
        # Usage tracking
        self._usage: Dict[str, Dict[str, int]] = {}
        
        self.logger.info(f"ModelRouter initialized with {len(self._models)} models")

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return yaml.safe_load(f)
        else:
            self.logger.warning(f"Config not found at {self.config_path}, using defaults")
            return self._default_config()

    def _default_config(self) -> Dict[str, Any]:
        """Return default configuration."""
        return {
            "version": "1.0",
            "defaults": {
                "timeout": 30,
                "max_retries": 3,
                "temperature": 0.7,
            },
            "providers": {},
            "routing": {
                "defaults": {
                    "code_generation": "openai/gpt-4-turbo",
                    "reasoning": "openai/gpt-4-turbo",
                }
            },
        }

    def _build_model_registry(self) -> None:
        """Build the model registry from configuration."""
        providers = self.config.get("providers", {})
        
        for provider_id, provider_config in providers.items():
            if not provider_config.get("enabled", True):
                continue
            
            models = provider_config.get("models", {})
            for model_id, model_config in models.items():
                full_id = f"{provider_id}/{model_id}"
                
                self._models[full_id] = ModelConfig(
                    provider=provider_id,
                    model_id=model_id,
                    name=model_config.get("name", model_id),
                    context_window=model_config.get("context_window", 4096),
                    max_output=model_config.get("max_output", 4096),
                    capabilities=model_config.get("capabilities", []),
                    recommended_for=model_config.get("recommended_for", []),
                    cost_per_1k_input=model_config.get("cost_per_1k_input", 0.0),
                    cost_per_1k_output=model_config.get("cost_per_1k_output", 0.0),
                )

    def get_model_for_task(
        self,
        task_type: str,
        agent: str = None,
    ) -> Optional[ModelConfig]:
        """
        Get the best model for a task type.
        
        Args:
            task_type: The type of task (code_generation, reasoning, etc.)
            agent: Optional agent name for agent-specific preferences
            
        Returns:
            ModelConfig for the selected model
        """
        routing = self.config.get("routing", {})
        
        # Check agent-specific preferences first
        if agent:
            agent_routing = routing.get("agents", {}).get(agent, {})
            if task_type in agent_routing:
                model_id = agent_routing[task_type]
                if model_id in self._models:
                    return self._models[model_id]
        
        # Fall back to defaults
        defaults = routing.get("defaults", {})
        if task_type in defaults:
            model_id = defaults[task_type]
            if model_id in self._models:
                return self._models[model_id]
        
        # Return first available model
        if self._models:
            return list(self._models.values())[0]
        
        return None

    def get_fallback_chain(self, task_type: str) -> List[ModelConfig]:
        """
        Get the fallback chain for a task type.
        
        Args:
            task_type: The type of task
            
        Returns:
            List of ModelConfigs in fallback order
        """
        fallbacks = self.config.get("fallbacks", {})
        if not fallbacks.get("enabled", True):
            return []
        
        chains = fallbacks.get("chains", {})
        chain_ids = chains.get(task_type, [])
        
        return [
            self._models[model_id]
            for model_id in chain_ids
            if model_id in self._models
        ]

    async def llm(
        self,
        task_type: str,
        prompt: str,
        agent: str = None,
        model_override: str = None,
        temperature: float = None,
        max_tokens: int = None,
        **kwargs
    ) -> str:
        """
        Call an LLM with the given prompt.
        
        This is the main entry point for agents to call AI models.
        
        Args:
            task_type: The type of task
            prompt: The prompt to send
            agent: Optional agent name
            model_override: Optional specific model to use
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            **kwargs: Additional parameters
            
        Returns:
            The model's response
        """
        # Get model configuration
        if model_override and model_override in self._models:
            model = self._models[model_override]
        else:
            model = self.get_model_for_task(task_type, agent)
        
        if not model:
            return f"[ModelRouter] No model available for task type: {task_type}"
        
        # Get defaults
        defaults = self.config.get("defaults", {})
        temp = temperature if temperature is not None else defaults.get("temperature", 0.7)
        max_tok = max_tokens if max_tokens is not None else model.max_output
        
        # Track usage
        self._track_usage(model.provider, model.model_id)
        
        # In MVP, we return a placeholder response
        # In production, this would call the actual API
        self.logger.info(f"LLM call: {model.provider}/{model.model_id} for {task_type}")
        
        # Placeholder response for MVP
        return f"[{model.name}] Response to: {prompt[:100]}..."

    async def embed(
        self,
        text: str,
        provider: str = None,
        model: str = None,
    ) -> tuple[List[float], Dict[str, Any]]:
        """
        Generate embeddings for text using the multi-provider embedding layer.
        
        Args:
            text: The text to embed
            provider: Optional provider to use (default: auto-detect from config)
            model: Optional specific model to use
            
        Returns:
            Tuple of (embedding vector, metadata dict with provider/model info)
        """
        from .embedding import embed_text as embedding_embed_text
        
        # Get embedding configuration
        embeddings_config = self.config.get("embeddings", {})
        
        # Use config defaults if not specified
        if provider is None:
            provider = embeddings_config.get("default_provider", "openai")
        if model is None:
            model = embeddings_config.get("default_model", "text-embedding-3-small")
        
        self.logger.info(f"Embedding call: {provider}/{model}")
        
        # Use the multi-provider embedding layer
        embedding, metadata = await embedding_embed_text(text, provider=provider, model=model)
        
        return embedding, metadata
    
    def get_default_provider(self) -> str:
        """Get the default LLM provider from configuration."""
        routing = self.config.get("routing", {})
        defaults = routing.get("defaults", {})
        
        # Get the first default model and extract provider
        for task_type, model_id in defaults.items():
            if "/" in model_id:
                return model_id.split("/")[0]
        
        return "openai"
    
    def get_default_embedding_provider(self) -> str:
        """Get the default embedding provider from configuration."""
        embeddings_config = self.config.get("embeddings", {})
        return embeddings_config.get("default_provider", "openai")
    
    def get_configured_providers(self) -> List[str]:
        """Get list of providers that have API keys configured."""
        from .embedding import get_configured_providers as get_embedding_providers
        
        configured = []
        providers = self.config.get("providers", {})
        
        for provider_id, provider_config in providers.items():
            if not provider_config.get("enabled", True):
                continue
            
            api_key_env = provider_config.get("api_key_env")
            if api_key_env and os.environ.get(api_key_env):
                configured.append(provider_id)
        
        return configured
    
    def get_provider_info(self, provider_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific provider."""
        providers = self.config.get("providers", {})
        provider_config = providers.get(provider_id)
        
        if not provider_config:
            return None
        
        api_key_env = provider_config.get("api_key_env", "")
        is_configured = bool(os.environ.get(api_key_env)) if api_key_env else False
        
        return {
            "id": provider_id,
            "name": provider_config.get("name", provider_id),
            "enabled": provider_config.get("enabled", True),
            "api_key_env": api_key_env,
            "is_configured": is_configured,
            "models": list(provider_config.get("models", {}).keys()),
        }

    def _track_usage(self, provider: str, model_id: str) -> None:
        """Track model usage."""
        if provider not in self._usage:
            self._usage[provider] = {}
        
        if model_id not in self._usage[provider]:
            self._usage[provider][model_id] = 0
        
        self._usage[provider][model_id] += 1

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            "by_provider": self._usage,
            "total_calls": sum(
                sum(models.values())
                for models in self._usage.values()
            ),
        }

    def list_models(self) -> List[Dict[str, Any]]:
        """List all available models."""
        return [
            {
                "id": f"{m.provider}/{m.model_id}",
                "name": m.name,
                "provider": m.provider,
                "capabilities": m.capabilities,
                "recommended_for": m.recommended_for,
            }
            for m in self._models.values()
        ]

    def get_model(self, model_id: str) -> Optional[ModelConfig]:
        """Get a specific model by ID."""
        return self._models.get(model_id)


async def demo():
    """Demo the model router."""
    print("=== ZORA CORE Model Router Demo ===\n")
    
    router = ModelRouter()
    
    print("1. Available models:")
    for model in router.list_models()[:5]:
        print(f"   - {model['id']}: {model['name']}")
    print(f"   ... and {len(router.list_models()) - 5} more\n")
    
    print("2. Model selection for tasks:")
    tasks = ["code_generation", "reasoning", "research", "safety_analysis"]
    for task in tasks:
        model = router.get_model_for_task(task)
        if model:
            print(f"   {task}: {model.provider}/{model.model_id}")
    
    print("\n3. Agent-specific routing:")
    agents = ["CONNOR", "LUMINA", "ORACLE", "AEGIS"]
    for agent in agents:
        model = router.get_model_for_task("code_generation", agent)
        if model:
            print(f"   {agent} code_generation: {model.provider}/{model.model_id}")
    
    print("\n4. LLM call (placeholder):")
    response = await router.llm(
        task_type="code_generation",
        prompt="Write a Python function to calculate fibonacci numbers",
        agent="CONNOR",
    )
    print(f"   Response: {response[:80]}...")
    
    print("\n5. Usage stats:")
    stats = router.get_usage_stats()
    print(f"   Total calls: {stats['total_calls']}")
    
    print("\n=== Demo Complete ===")


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo())
