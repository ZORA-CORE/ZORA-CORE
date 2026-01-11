"""Project Yggdrasil: World Tree architecture scaffolding."""

from __future__ import annotations

from typing import Literal, TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field


class YggdrasilState(TypedDict):
    """Shared state for the 7-agent Yggdrasil hierarchy."""

    messages: list[BaseMessage]
    next_agent: str
    carbon_footprint: float
    saga_memory: list[dict[str, str]]
    current_phase: str


class SupervisorDecision(BaseModel):
    """Structured routing decision for the supervisor."""

    next_agent: Literal[
        "ODIN",
        "HEIMDALL",
        "THOR",
        "TYR",
        "NJORD",
        "FREYA",
        "EIVOR",
        "FINISH",
    ] = Field(..., description="The next agent to act or FINISH.")


# --- Pantheon: agent stubs (logic to be implemented later) ---


def odin_agent(_: YggdrasilState) -> dict:
    """Odin (CPO): Strategy & Vision."""

    # TODO: Insert Odin's strategic reasoning logic here.
    return {}


def heimdall_agent(_: YggdrasilState) -> dict:
    """Heimdall (CTO): Architecture & Observability."""

    # TODO: Insert Heimdall's architecture logic here.
    return {}


def thor_agent(_: YggdrasilState) -> dict:
    """Thor (Engineer): Implementation (Code)."""

    # TODO: Insert Thor's implementation logic here.
    return {}


def tyr_agent(_: YggdrasilState) -> dict:
    """Tyr (QA/Security): Compliance & Audit."""

    # TODO: Insert Tyr's compliance and audit logic here.
    return {}


def njord_agent(_: YggdrasilState) -> dict:
    """Njord (DevOps): Green Deployment."""

    # TODO: Insert Njord's deployment and sustainability logic here.
    return {}


def freya_agent(_: YggdrasilState) -> dict:
    """Freya (UX): Sustainable Design."""

    # TODO: Insert Freya's UX design logic here.
    return {}


def eivor_agent(_: YggdrasilState) -> dict:
    """Eivor (Memory): Knowledge Retrieval."""

    # TODO: Insert Eivor's long-term memory retrieval logic here.
    return {}


# --- Bifrost: supervisor router ---


def supervisor_node(state: YggdrasilState) -> dict:
    """Route work to the next agent using a GPT-4o function-calling router."""

    router_prompt = (
        "You are the supervisor for Project Yggdrasil. "
        "Choose the next agent based on the current_phase and conversation. "
        "Return only the structured tool output."
    )
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    router = llm.with_structured_output(SupervisorDecision)
    messages = [SystemMessage(content=router_prompt), *state["messages"]]
    decision = router.invoke(messages)
    return {"next_agent": decision.next_agent}


def build_yggdrasil_graph() -> StateGraph:
    """Construct the Yggdrasil StateGraph with the supervisor and agents."""

    graph = StateGraph(YggdrasilState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("ODIN", odin_agent)
    graph.add_node("HEIMDALL", heimdall_agent)
    graph.add_node("THOR", thor_agent)
    graph.add_node("TYR", tyr_agent)
    graph.add_node("NJORD", njord_agent)
    graph.add_node("FREYA", freya_agent)
    graph.add_node("EIVOR", eivor_agent)

    for agent in [
        "ODIN",
        "HEIMDALL",
        "THOR",
        "TYR",
        "NJORD",
        "FREYA",
        "EIVOR",
    ]:
        graph.add_edge(agent, "supervisor")

    graph.add_conditional_edges(
        "supervisor",
        lambda state: state["next_agent"],
        {
            "ODIN": "ODIN",
            "HEIMDALL": "HEIMDALL",
            "THOR": "THOR",
            "TYR": "TYR",
            "NJORD": "NJORD",
            "FREYA": "FREYA",
            "EIVOR": "EIVOR",
            "FINISH": END,
        },
    )

    graph.set_entry_point("supervisor")
    return graph


def build_yggdrasil_app():
    """Compile the Yggdrasil graph into a runnable app."""

    return build_yggdrasil_graph().compile()
