"""Project Yggdrasil: World Tree architecture scaffolding."""

from __future__ import annotations

import os
from typing import Literal, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from langchain_community.vectorstores import FAISS
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


_VECTORSTORE: FAISS | None = None


# --- Knowledge Core (Eivor) helpers ---


def _get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model="text-embedding-3-small")


def _get_vectorstore() -> FAISS | None:
    return _VECTORSTORE


def save_knowledge(content: str, metadata: dict) -> None:
    """Store knowledge artifacts in the local vector store."""

    global _VECTORSTORE
    embeddings = _get_embeddings()
    if _VECTORSTORE is None:
        _VECTORSTORE = FAISS.from_texts([content], embeddings, metadatas=[metadata])
    else:
        _VECTORSTORE.add_texts([content], metadatas=[metadata])


def query_knowledge(query: str) -> list[str]:
    """Retrieve relevant knowledge snippets from the vector store."""

    store = _get_vectorstore()
    if store is None:
        return []
    results = store.similarity_search(query, k=4)
    return [doc.page_content for doc in results]


# --- Pantheon: agent implementations ---


def eivor_agent(state: YggdrasilState) -> dict:
    """Eivor (Memory): Knowledge Retrieval."""

    latest_user = _latest_human_message(state)
    should_query = "?" in latest_user
    saga_memory = list(state.get("saga_memory", []))

    if should_query:
        retrieved = query_knowledge(latest_user)
        response = (
            "Eivor recall:\n"
            + ("\n- ".join([""] + retrieved) if retrieved else "No memory found yet.")
        )
        saga_memory.append({"type": "recall", "content": response})
    else:
        summary = _summarize_for_memory(state)
        metadata = {
            "phase": state.get("current_phase", ""),
            "carbon_footprint": str(state.get("carbon_footprint", 0.0)),
        }
        save_knowledge(summary, metadata)
        response = "Eivor stored the latest strategic context in memory."
        saga_memory.append({"type": "save", "content": summary})

    return {
        "messages": state["messages"] + [AIMessage(content=response)],
        "saga_memory": saga_memory,
    }


def odin_agent(state: YggdrasilState) -> dict:
    """Odin (CPO): Strategy & Vision."""

    system_prompt = (
        "You are Odin, the Allfather of Climate Tech. Your goal is to translate "
        "vague user ideas into rigorous Green Product Requirements. You prioritize "
        "impact (Gigatons CO2 reduced) over features. You MUST query Eivor first "
        "to see if we have built similar tools before."
    )
    latest_user = _latest_human_message(state)
    eivor_recall = query_knowledge(latest_user)
    regulation_notes = regulation_search(
        "EU climate tech regulations CSRD SFDR compliance requirements"
    )

    prompt = (
        "User Input:\n"
        f"{latest_user}\n\n"
        "Eivor Recall:\n"
        f"{_format_recall(eivor_recall)}\n\n"
        "Regulatory Notes:\n"
        f"{regulation_notes}\n\n"
        "Output a structured PRD in Markdown with: Summary, Impact Goals, "
        "User Personas, Core Features (ranked by impact), Data/Telemetry, "
        "Risks & Mitigations, and Open Questions."
    )

    llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
    prd = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=prompt)])

    return {
        "messages": state["messages"] + [AIMessage(content=prd.content)],
        "current_phase": "Architecture",
    }


def heimdall_agent(state: YggdrasilState) -> dict:
    """Heimdall (CTO): Architecture & Observability."""

    system_prompt = (
        "You are Heimdall, guardian of the Tech Stack. You refuse to build "
        "inefficient software. You choose languages like Rust or Go for core "
        "compute, and Python for AI. You design for Carbon Aware Computing "
        "(jobs run when grid is green)."
    )
    prd = _latest_ai_message(state)

    prompt = (
        "Use the following PRD to design a green architecture plan. "
        "Output an architecture.md content with sections: Overview, Service "
        "Topology (monolith vs microservices), Stack Choices, Data Stores, "
        "Green Cloud Provider & Regions, Carbon Aware Scheduling, Security, "
        "and Observability.\n\n"
        f"PRD:\n{prd}"
    )

    llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
    architecture = llm.invoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    )

    return {
        "messages": state["messages"] + [AIMessage(content=architecture.content)],
        "current_phase": "Architecture",
    }


# --- Remaining agent stubs (logic to be implemented later) ---


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


# --- Utility helpers ---


def _latest_human_message(state: YggdrasilState) -> str:
    for message in reversed(state.get("messages", [])):
        if isinstance(message, HumanMessage):
            return message.content
    return ""


def _latest_ai_message(state: YggdrasilState) -> str:
    for message in reversed(state.get("messages", [])):
        if isinstance(message, AIMessage):
            return message.content
    return ""


def _summarize_for_memory(state: YggdrasilState) -> str:
    messages = state.get("messages", [])[-6:]
    joined = "\n".join(
        f"{message.type.upper()}: {message.content}" for message in messages
    )
    return joined or "No conversation context available."


def _format_recall(recall: list[str]) -> str:
    if not recall:
        return "No prior knowledge found."
    return "\n".join(f"- {item}" for item in recall)


def regulation_search(query: str) -> str:
    """Search for regulatory context. Uses Tavily if configured, else placeholder."""

    if os.getenv("TAVILY_API_KEY"):
        from langchain_community.tools.tavily_search import TavilySearchResults

        tool = TavilySearchResults(max_results=5)
        results = tool.invoke({"query": query})
        return "\n".join(str(item) for item in results)

    return (
        "Regulatory search placeholder: configure TAVILY_API_KEY to enable live "
        "CSRD/SFDR lookups."
    )


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
