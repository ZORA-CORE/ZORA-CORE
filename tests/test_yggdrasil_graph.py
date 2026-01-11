import pytest


def test_build_yggdrasil_app_compiles():
    pytest.importorskip("langgraph")
    pytest.importorskip("langchain_openai")
    pytest.importorskip("langchain_core")
    pytest.importorskip("langchain_community")
    pytest.importorskip("pydantic")

    from yggdrasil_graph import build_yggdrasil_app

    app = build_yggdrasil_app()
    assert app is not None
    assert hasattr(app, "invoke")


def test_regulation_search_placeholder(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    from yggdrasil_graph import regulation_search

    result = regulation_search("EU CSRD")
    assert "placeholder" in result.lower()


def test_eivor_query_returns_empty_when_no_store():
    from yggdrasil_graph import query_knowledge

    result = query_knowledge("missing")
    assert result == []
