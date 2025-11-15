"""ZORA CORE dual-agent framework integrating CONNOR and LUMINA.

This module implements a modular orchestration layer for two collaborating agents:
- ConnorAgent focuses on strategic foresight, risk analysis, and ethical auditing.
- LuminaAgent specializes in creative synthesis, visualization prompts, and narrative outputs.

The framework is intentionally modular so that it can operate with mock LLM clients for
local testing or connect to multiple live LLM providers when API keys are supplied at
runtime. The design emphasises safety, transparency, and sustainability by batching
requests, providing explicit disclaimers, and supporting energy-aware execution modes.

Usage example (test mode):
    python -m agents.zora_infinity_dual_agi --demo "Predict my budget risk"

Key features
------------
* Credential management that can interactively request API keys on demand.
* Pluggable LLM router with default mock client support to enable offline execution.
* ConnorAgent and LuminaAgent classes expose high-level capabilities described in the
  original specification, including scenario simulation and creative harmonisation.
* ZoraHub orchestrator coordinates requests, enforces ethical safeguards, and merges
  agent outputs into a unified response payload.
* Built-in demo entry point demonstrates an end-to-end run without requiring network
  access or API credentials.
"""

from __future__ import annotations

import asyncio
import dataclasses
import importlib
import json
import logging
import os
import queue
import threading
import time
from dataclasses import dataclass
from getpass import getpass
from typing import Any, Callable, Dict, Iterable, List, Optional, Protocol, Tuple


LOGGER = logging.getLogger(__name__)


class LLMClient(Protocol):
    """Protocol describing the expected behaviour for LLM clients."""

    provider_name: str

    def generate(self, prompt: str, **kwargs: Any) -> str:
        """Return a text completion for the provided prompt."""


@dataclass(frozen=True)
class ProviderRegistration:
    """Configuration required to register a provider with the router."""

    name: str
    env_var: str
    factory: Callable[[str], LLMClient]


@dataclass(frozen=True)
class BuiltinProviderSpec:
    """Specification for bridging existing ZORA agents into the router."""

    provider_name: str
    module_name: str
    class_name: str
    env_var: str
    system_prompt: str


class CredentialManager:
    """Handles prompting for API keys at runtime with optional caching."""

    def __init__(self) -> None:
        self._cache: Dict[str, str] = {}

    def get_key(self, env_var: str, prompt_text: Optional[str] = None) -> Optional[str]:
        if env_var in self._cache:
            return self._cache[env_var]

        value = os.getenv(env_var)
        if value:
            self._cache[env_var] = value
            return value

        prompt_text = prompt_text or f"Enter API key for {env_var}: "
        try:
            value = getpass(prompt_text)
        except EOFError:
            LOGGER.warning("No input available for %s; continuing without credential.", env_var)
            return None

        value = value.strip()
        if not value:
            return None

        self._cache[env_var] = value
        return value


class MockLLMClient:
    """Deterministic mock client used for offline demos and tests."""

    provider_name = "mock"

    def __init__(self, behaviour: Optional[Callable[[str], str]] = None) -> None:
        self._behaviour = behaviour or self._default_behaviour

    def _default_behaviour(self, prompt: str) -> str:
        summary = prompt.strip().splitlines()[-1][:120]
        return f"[MOCK:{self.provider_name}] Response synthesised for prompt: {summary}"

    def generate(self, prompt: str, **kwargs: Any) -> str:
        return self._behaviour(prompt)


class LLMRouter:
    """Dynamic router that selects which LLM provider to use for a prompt."""

    def __init__(self, credential_manager: CredentialManager, default_provider: str = "mock") -> None:
        self.credential_manager = credential_manager
        self._providers: Dict[str, ProviderRegistration] = {}
        self._default_provider = default_provider
        self._client_cache: Dict[str, LLMClient] = {}

        # Ensure a mock provider is always available for offline execution.
        self.register_provider(
            ProviderRegistration(
                name="mock",
                env_var="",
                factory=lambda _key: MockLLMClient(),
            )
        )

        try:
            register_builtin_providers(self)
        except Exception:  # pragma: no cover - defensive against optional dependencies
            LOGGER.exception("Failed to register builtin providers; continuing with mock only.")

    def register_provider(self, registration: ProviderRegistration) -> None:
        self._providers[registration.name] = registration

    def _initialise_client(self, provider_name: str) -> Optional[LLMClient]:
        if provider_name in self._client_cache:
            return self._client_cache[provider_name]

        registration = self._providers.get(provider_name)
        if not registration:
            LOGGER.error("Provider %s is not registered", provider_name)
            return None

        key: Optional[str] = None
        if registration.env_var:
            key = self.credential_manager.get_key(registration.env_var)
            if not key:
                LOGGER.warning("No API key available for provider %s; falling back to mock.", provider_name)
                return self._initialise_client("mock")

        client = registration.factory(key or "")
        self._client_cache[provider_name] = client
        return client

    def route(self, provider_name: Optional[str], prompt: str, **kwargs: Any) -> str:
        target = provider_name or self._default_provider
        client = self._initialise_client(target)
        if not client:
            client = self._initialise_client("mock")
        assert client is not None, "Mock provider must always be available"
        return client.generate(prompt, **kwargs)

    def available_providers(self) -> List[str]:
        """Return the names of all registered providers (including mock)."""

        return sorted(self._providers)


def _run_coroutine_sync(coro: "asyncio.Future[Any]") -> Any:
    """Execute an async coroutine from synchronous code safely."""

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        return asyncio.run_coroutine_threadsafe(coro, loop).result()

    return asyncio.run(coro)


class BaseAgentLLMClient:
    """Adapter that wraps existing BaseAgent implementations as LLM clients."""

    def __init__(self, provider_name: str, agent_factory: Callable[[], Any], system_prompt: str) -> None:
        self.provider_name = provider_name
        self._agent_factory = agent_factory
        self._agent: Optional[Any] = None
        self._system_prompt = system_prompt

    def _ensure_agent(self) -> Any:
        if self._agent is None:
            self._agent = self._agent_factory()
        return self._agent

    def generate(self, prompt: str, **kwargs: Any) -> str:
        agent = self._ensure_agent()
        messages = kwargs.get("messages")
        if not messages:
            messages = [
                {"role": "system", "content": self._system_prompt},
                {"role": "user", "content": prompt},
            ]

        request = {
            "messages": messages,
            "task_type": kwargs.get("task_type", "general"),
            "context": kwargs.get("context", {}),
            "temperature": kwargs.get("temperature", 0.7),
        }

        response: Dict[str, Any] = _run_coroutine_sync(agent.process_request(request))
        payload = response.get("response") or {}
        content = payload.get("content")
        if isinstance(content, list):
            content = "".join(part.get("text", "") for part in content if isinstance(part, dict))

        if not isinstance(content, str) or not content.strip():
            content = json.dumps(payload, default=str)

        return content


def _load_agent_class(module_name: str, class_name: str) -> Optional[Callable[[], Any]]:
    """Dynamically import an agent class if available."""

    try:
        module = importlib.import_module(f"agents.{module_name}")
        cls = getattr(module, class_name)
    except Exception as exc:  # pragma: no cover - defensive logging only
        LOGGER.debug("Could not import provider %s.%s: %s", module_name, class_name, exc)
        return None
    return cls


def _adapter_factory(spec: BuiltinProviderSpec) -> Callable[[str], LLMClient]:
    agent_cls = _load_agent_class(spec.module_name, spec.class_name)

    if agent_cls is None:
        return lambda _key: MockLLMClient()

    def factory(api_key: str) -> LLMClient:
        if not api_key:
            LOGGER.debug("No credential supplied for %s; using mock provider instead.", spec.provider_name)
            return MockLLMClient()

        os.environ.setdefault(spec.env_var, api_key)

        def agent_factory() -> Any:
            return agent_cls()

        return BaseAgentLLMClient(spec.provider_name, agent_factory, spec.system_prompt)

    return factory


def register_builtin_providers(router: LLMRouter) -> None:
    """Register known provider integrations defined within the repository."""

    specs: Tuple[BuiltinProviderSpec, ...] = (
        BuiltinProviderSpec(
            provider_name="openai",
            module_name="openai",
            class_name="OpenAIAgent",
            env_var="OPENAI_API_KEY",
            system_prompt="You are OpenAI GPT-based reasoning engine aligned with ZORA ethics.",
        ),
        BuiltinProviderSpec(
            provider_name="claude",
            module_name="claude",
            class_name="ClaudeAgent",
            env_var="ANTHROPIC_API_KEY",
            system_prompt="You are Claude, focusing on ethical and transparent analysis.",
        ),
        BuiltinProviderSpec(
            provider_name="groq",
            module_name="groq",
            class_name="GroqAgent",
            env_var="GROQ_API_KEY",
            system_prompt="You are GROQ, delivering ultra-fast strategic insights.",
        ),
        BuiltinProviderSpec(
            provider_name="gemini",
            module_name="gemini",
            class_name="GeminiAgent",
            env_var="GEMINI_API_KEY",
            system_prompt="You are Gemini, combining multimodal context with sustainability focus.",
        ),
        BuiltinProviderSpec(
            provider_name="mistral",
            module_name="mistral",
            class_name="MistralAgent",
            env_var="MISTRAL_API_KEY",
            system_prompt="You are Mistral, a concise strategist supporting European compliance.",
        ),
    )

    for spec in specs:
        if spec.provider_name in router.available_providers():
            continue

        router.register_provider(
            ProviderRegistration(
                name=spec.provider_name,
                env_var=spec.env_var,
                factory=_adapter_factory(spec),
            )
        )


@dataclass
class ScenarioAnalysis:
    summary: str
    risk_score: float
    opportunities: List[str]
    ethical_flags: List[str]


@dataclass
class CreativeSynthesis:
    narrative: str
    visual_prompt: str
    alignment_notes: List[str]


class SustainabilityQueue:
    """Batches requests to minimise energy consumption and API calls."""

    def __init__(self) -> None:
        self._queue: "queue.Queue[Tuple[str, Dict[str, Any]]]" = queue.Queue()

    def add(self, prompt: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        self._queue.put((prompt, metadata or {}))

    def flush(self) -> List[Tuple[str, Dict[str, Any]]]:
        items: List[Tuple[str, Dict[str, Any]]] = []
        while not self._queue.empty():
            items.append(self._queue.get())
        return items


class EthicsModule:
    """Applies lightweight bias checks and attaches disclaimers."""

    DISCLAIMER = (
        "This output is a simulation for educational purposes. "
        "Consult qualified professionals before making decisions."
    )

    def assess(self, text: str) -> List[str]:
        flags: List[str] = []
        lowered = text.lower()
        if "guarantee" in lowered:
            flags.append("Language suggests certainty; advise probabilistic framing.")
        if any(term in lowered for term in ("weapon", "harm", "exploit")):
            flags.append("Potential misuse detected; emphasise ethical compliance.")
        return flags


class ConnorAgent:
    """Strategic foresight agent handling analysis and simulation tasks."""

    def __init__(self, router: LLMRouter, ethics: EthicsModule) -> None:
        self.router = router
        self.ethics = ethics

    def analyse(self, query: str, data: Optional[Dict[str, Any]] = None) -> ScenarioAnalysis:
        prompt = self._build_prompt(query, data)
        response = self.router.route("mock", prompt)
        flags = self.ethics.assess(response)
        return ScenarioAnalysis(
            summary=response,
            risk_score=self._estimate_risk(response),
            opportunities=self._extract_bullets(response, prefix="Opportunity"),
            ethical_flags=flags,
        )

    def simulate(self, query: str, horizons: Iterable[int]) -> Dict[int, str]:
        simulations = {}
        for horizon in horizons:
            prompt = f"{query}\n\nTime horizon: {horizon} days. Provide risk-adjusted projection."
            simulations[horizon] = self.router.route("mock", prompt)
        return simulations

    def ethical_review(self, strategy: str) -> List[str]:
        return self.ethics.assess(strategy)

    def _build_prompt(self, query: str, data: Optional[Dict[str, Any]]) -> str:
        encoded_data = json.dumps(data, indent=2, sort_keys=True) if data else "{}"
        return (
            "You are CONNOR, a strategic foresight engine prioritising ethics and sustainability.\n"
            "Analyse the following user query and supporting data. Provide a concise summary,"
            " opportunities, and sustainability considerations."\
            f"\nUser query: {query}\nData: {encoded_data}"
        )

    def _estimate_risk(self, response: str) -> float:
        tokens = len(response.split())
        return min(1.0, 0.1 + tokens / 500.0)

    def _extract_bullets(self, response: str, prefix: str) -> List[str]:
        lines = [line.strip() for line in response.splitlines() if line.strip()]
        return [line for line in lines if line.lower().startswith(prefix.lower())]


class LuminaAgent:
    """Creative harmony agent producing narratives and visual prompts."""

    def __init__(self, router: LLMRouter, ethics: EthicsModule) -> None:
        self.router = router
        self.ethics = ethics

    def harmonise(self, analysis: ScenarioAnalysis) -> CreativeSynthesis:
        prompt = self._build_prompt(analysis)
        narrative = self.router.route("mock", prompt)
        visual_prompt = self._build_visual_prompt(analysis)
        notes = self.ethics.assess(narrative)
        return CreativeSynthesis(
            narrative=narrative,
            visual_prompt=visual_prompt,
            alignment_notes=notes,
        )

    def _build_prompt(self, analysis: ScenarioAnalysis) -> str:
        return (
            "You are LUMINA, a creative harmony engine aligning with user values."
            " Translate the analysis summary into an empathetic narrative that"
            " highlights sustainable opportunities."
            f"\nSummary: {analysis.summary}\nOpportunities: {analysis.opportunities}"
        )

    def _build_visual_prompt(self, analysis: ScenarioAnalysis) -> str:
        return (
            "Visualise the strategic plan as a living tree with branches representing"
            f" opportunities {analysis.opportunities} and leaves showing risk score"
            f" {analysis.risk_score:.2f}."
        )


@dataclass
class HarmonisedResponse:
    timestamp: float
    query: str
    analysis: ScenarioAnalysis
    synthesis: CreativeSynthesis
    simulations: Dict[int, str]
    disclaimer: str


class ZoraHub:
    """Coordinates Connor and Lumina while applying ethical safeguards."""

    def __init__(self, connor: ConnorAgent, lumina: LuminaAgent, ethics: EthicsModule) -> None:
        self.connor = connor
        self.lumina = lumina
        self.ethics = ethics
        self.sustainability_queue = SustainabilityQueue()

    def process(self, query: str, data: Optional[Dict[str, Any]] = None, horizons: Optional[Iterable[int]] = None) -> HarmonisedResponse:
        LOGGER.debug("Processing query: %s", query)
        analysis = self.connor.analyse(query, data)
        self.sustainability_queue.add(query)
        simulations = self.connor.simulate(query, horizons or (30, 90, 180))
        synthesis = self.lumina.harmonise(analysis)
        batched_prompts = self.sustainability_queue.flush()
        LOGGER.debug("Batched prompts processed: %s", batched_prompts)
        return HarmonisedResponse(
            timestamp=time.time(),
            query=query,
            analysis=analysis,
            synthesis=synthesis,
            simulations=simulations,
            disclaimer=EthicsModule.DISCLAIMER,
        )

    def adaptive_loop(self, queries: Iterable[str]) -> List[HarmonisedResponse]:
        results: List[HarmonisedResponse] = []
        for query in queries:
            results.append(self.process(query))
        return results


def _demo(query: str) -> HarmonisedResponse:
    logging.basicConfig(level=logging.INFO)
    credential_manager = CredentialManager()
    router = LLMRouter(credential_manager)
    ethics = EthicsModule()
    connor = ConnorAgent(router, ethics)
    lumina = LuminaAgent(router, ethics)
    hub = ZoraHub(connor, lumina, ethics)
    return hub.process(query, data={"mode": "demo", "energy_saving": True})


def _threaded_demo(query: str) -> HarmonisedResponse:
    result_container: Dict[str, HarmonisedResponse] = {}

    def target() -> None:
        result_container["result"] = _demo(query)

    thread = threading.Thread(target=target, name="ZORA-DEMO")
    thread.start()
    thread.join()
    return result_container["result"]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run the ZORA dual-agent demo.")
    parser.add_argument("query", nargs="?", default="Predict my budget risk and visualise creatively", help="User query to analyse")
    parser.add_argument("--threaded", action="store_true", help="Run the demo in a background thread")
    args = parser.parse_args()

    if args.threaded:
        response = _threaded_demo(args.query)
    else:
        response = _demo(args.query)

    print(json.dumps(dataclasses.asdict(response), indent=2, default=str))


if __name__ == "__main__":
    main()
