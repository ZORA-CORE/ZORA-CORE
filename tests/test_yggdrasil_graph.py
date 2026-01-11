import pytest


def test_build_yggdrasil_app_compiles():
    langgraph = pytest.importorskip("langgraph")
    pytest.importorskip("langchain_openai")
    pytest.importorskip("langchain_core")
    pytest.importorskip("pydantic")

    from yggdrasil_graph import build_yggdrasil_app

    app = build_yggdrasil_app()
    assert app is not None
    assert hasattr(app, "invoke")
