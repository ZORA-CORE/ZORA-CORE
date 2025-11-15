"""Unit tests for the ZORA dual-agent framework."""

from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from agents.zora_infinity_dual_agi import (
    ConnorAgent,
    CreativeSynthesis,
    CredentialManager,
    EthicsModule,
    HarmonisedResponse,
    LLMRouter,
    LuminaAgent,
    MockLLMClient,
    ProviderRegistration,
    ScenarioAnalysis,
    ZoraHub,
)


def build_mock_router() -> LLMRouter:
    manager = CredentialManager()
    router = LLMRouter(manager)
    router.register_provider(
        ProviderRegistration(
            name="mock-strict",
            env_var="",
            factory=lambda _key: MockLLMClient(lambda prompt: f"STRICT:{prompt[:32]}")
        )
    )
    return router


def test_mock_router_returns_deterministic_response():
    router = LLMRouter(CredentialManager())
    response = router.route("mock", "Hello world")
    assert "MOCK" in response


def test_connor_analysis_includes_opportunities():
    router = LLMRouter(CredentialManager())
    ethics = EthicsModule()
    connor = ConnorAgent(router, ethics)

    analysis = connor.analyse("Assess carbon impact", data={"emissions": 42})
    assert isinstance(analysis, ScenarioAnalysis)
    assert analysis.opportunities is not None


def test_lumina_harmonise_uses_connor_summary():
    router = LLMRouter(CredentialManager())
    ethics = EthicsModule()
    lumina = LuminaAgent(router, ethics)

    analysis = ScenarioAnalysis(
        summary="Opportunity: Invest in solar",
        risk_score=0.2,
        opportunities=["Opportunity: Solar"],
        ethical_flags=[],
    )
    synthesis = lumina.harmonise(analysis)
    assert isinstance(synthesis, CreativeSynthesis)
    assert "solar" in synthesis.visual_prompt.lower()


def test_zora_hub_process_returns_harmonised_response():
    router = LLMRouter(CredentialManager())
    ethics = EthicsModule()
    connor = ConnorAgent(router, ethics)
    lumina = LuminaAgent(router, ethics)
    hub = ZoraHub(connor, lumina, ethics)

    response = hub.process("Predict my budget risk")
    assert isinstance(response, HarmonisedResponse)
    assert response.simulations
    assert EthicsModule.DISCLAIMER in response.disclaimer


def test_sustainability_queue_batches_prompts():
    router = LLMRouter(CredentialManager())
    ethics = EthicsModule()
    hub = ZoraHub(ConnorAgent(router, ethics), LuminaAgent(router, ethics), ethics)

    # Process multiple queries to ensure batching does not raise errors.
    responses = hub.adaptive_loop(["Query A", "Query B"])
    assert len(responses) == 2
    assert all(isinstance(item, HarmonisedResponse) for item in responses)


def test_router_lists_builtin_providers():
    router = LLMRouter(CredentialManager())
    providers = router.available_providers()
    for name in ["mock", "openai", "claude", "groq", "gemini", "mistral"]:
        assert name in providers


def test_router_uses_mock_without_credentials(monkeypatch):
    router = LLMRouter(CredentialManager())
    monkeypatch.setattr(router.credential_manager, "get_key", lambda env_var, prompt_text=None: None)

    response = router.route("openai", "Ensure safe fallback")
    assert response.startswith("[MOCK")
