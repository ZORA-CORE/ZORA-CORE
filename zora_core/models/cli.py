"""
ZORA CORE Model Provider CLI

CLI tools for testing and managing AI model providers.

Usage:
    python -m zora_core.models.cli list-providers
    python -m zora_core.models.cli chat-demo --provider=openai --model=gpt-4-turbo
    python -m zora_core.models.cli embed-demo --provider=openai --text="example"
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Optional

from .embedding import (
    get_embedding_provider,
    get_provider_info,
    list_providers,
    get_configured_providers,
    get_supported_providers,
    get_embedding_info,
    PROVIDER_REGISTRY,
)
from .model_router import ModelRouter


def cmd_list_providers(args: argparse.Namespace) -> None:
    """List all available providers and their status."""
    print("\n" + "=" * 60)
    print("ZORA CORE - AI Provider Status")
    print("=" * 60 + "\n")
    
    # Get provider information
    all_providers = list_providers()
    configured = get_configured_providers()
    supported = get_supported_providers()
    
    print(f"Total providers: {len(all_providers)}")
    print(f"Configured (API key set): {len(configured)}")
    print(f"Fully supported: {len(supported)}")
    print()
    
    # LLM Providers
    print("-" * 60)
    print("LLM PROVIDERS")
    print("-" * 60)
    
    router = ModelRouter()
    llm_providers = router.config.get("providers", {})
    
    for provider_id, provider_config in llm_providers.items():
        name = provider_config.get("name", provider_id)
        enabled = provider_config.get("enabled", True)
        api_key_env = provider_config.get("api_key_env", "")
        is_configured = bool(os.environ.get(api_key_env)) if api_key_env else False
        models = list(provider_config.get("models", {}).keys())
        
        status_icon = "[OK]" if is_configured else "[--]"
        enabled_str = "enabled" if enabled else "disabled"
        
        print(f"\n{status_icon} {name} ({provider_id})")
        print(f"    Status: {enabled_str}, {'configured' if is_configured else 'not configured'}")
        print(f"    API Key Env: {api_key_env}")
        print(f"    Models: {', '.join(models[:3])}{'...' if len(models) > 3 else ''}")
    
    # Embedding Providers
    print("\n" + "-" * 60)
    print("EMBEDDING PROVIDERS")
    print("-" * 60)
    
    for provider_id in all_providers:
        info = get_provider_info(provider_id)
        if info is None:
            continue
        
        status_icon = "[OK]" if info.is_configured else "[--]"
        support_str = "supported" if info.is_supported else f"stub ({info.status})"
        config_str = "configured" if info.is_configured else "not configured"
        
        print(f"\n{status_icon} {info.name} ({provider_id})")
        print(f"    Status: {support_str}, {config_str}")
        print(f"    API Key Env: {info.api_key_env}")
        if info.default_model:
            print(f"    Default Model: {info.default_model} ({info.default_dimensions} dims)")
        if info.notes:
            print(f"    Note: {info.notes}")
    
    # Configuration instructions
    print("\n" + "-" * 60)
    print("CONFIGURATION")
    print("-" * 60)
    print("""
To configure a provider, set the appropriate environment variable:

    export OPENAI_API_KEY="sk-..."
    export ANTHROPIC_API_KEY="sk-ant-..."
    export GEMINI_API_KEY="..."
    export XAI_API_KEY="xai-..."
    export COPILOT_API_KEY="..."

For Cloudflare Workers, use .dev.vars or wrangler secret put.
For the frontend, use .env.local (but keep keys server-side).

See docs/MODEL_PROVIDERS.md for detailed instructions.
""")


async def cmd_chat_demo(args: argparse.Namespace) -> None:
    """Demo chat/LLM call with a specific provider."""
    provider = args.provider
    model = args.model
    prompt = args.prompt or "Hello! Please introduce yourself briefly."
    
    print("\n" + "=" * 60)
    print(f"ZORA CORE - Chat Demo ({provider})")
    print("=" * 60 + "\n")
    
    router = ModelRouter()
    
    # Check if provider is configured
    provider_info = router.get_provider_info(provider)
    if provider_info is None:
        print(f"Error: Unknown provider '{provider}'")
        print(f"Available providers: {', '.join(router.config.get('providers', {}).keys())}")
        return
    
    if not provider_info["is_configured"]:
        print(f"Warning: Provider '{provider}' is not configured.")
        print(f"Set environment variable: {provider_info['api_key_env']}")
        print("\nProceeding with placeholder response...\n")
    
    # Get model to use
    if model:
        model_id = f"{provider}/{model}"
    else:
        # Use first available model for provider
        models = provider_info.get("models", [])
        if models:
            model_id = f"{provider}/{models[0]}"
        else:
            model_id = None
    
    print(f"Provider: {provider}")
    print(f"Model: {model_id or 'default'}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print()
    
    # Make the call
    try:
        response = await router.llm(
            task_type="general",
            prompt=prompt,
            model_override=model_id,
        )
        print("Response:")
        print("-" * 40)
        print(response)
        print("-" * 40)
    except Exception as e:
        print(f"Error: {e}")


async def cmd_embed_demo(args: argparse.Namespace) -> None:
    """Demo embedding generation with a specific provider."""
    provider = args.provider
    text = args.text or "This is a test sentence for embedding generation."
    
    print("\n" + "=" * 60)
    print(f"ZORA CORE - Embedding Demo ({provider})")
    print("=" * 60 + "\n")
    
    # Get provider info
    info = get_provider_info(provider)
    if info is None:
        print(f"Error: Unknown embedding provider '{provider}'")
        print(f"Available providers: {', '.join(list_providers())}")
        return
    
    print(f"Provider: {info.name} ({provider})")
    print(f"Status: {'supported' if info.is_supported else 'stub'}")
    print(f"Configured: {'yes' if info.is_configured else 'no'}")
    print(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")
    print()
    
    # Check if embeddings are supported
    if not info.is_supported:
        print(f"Note: {info.name} does not support embeddings yet.")
        if info.notes:
            print(f"      {info.notes}")
        print("\nGenerating stub embedding for demonstration...")
        print()
    
    # Check if configured
    if not info.is_configured and info.is_supported:
        print(f"Warning: {info.name} is not configured.")
        print(f"Set environment variable: {info.api_key_env}")
        print("\nGenerating stub embedding...\n")
    
    # Generate embedding
    try:
        embedding_provider = get_embedding_provider(provider=provider)
        embedding = await embedding_provider.embed_text(text)
        metadata = embedding_provider.get_metadata()
        
        print("Result:")
        print("-" * 40)
        print(f"Provider: {metadata.get('embedding_provider', 'unknown')}")
        print(f"Model: {metadata.get('embedding_model', 'unknown')}")
        print(f"Dimensions: {len(embedding)}")
        print(f"First 5 values: {embedding[:5]}")
        print(f"Last 5 values: {embedding[-5:]}")
        
        # Check if it's a stub (all zeros or random)
        non_zero = sum(1 for v in embedding if v != 0.0)
        if non_zero == 0:
            print("\nNote: This is a stub embedding (all zeros).")
        elif non_zero < len(embedding) * 0.1:
            print("\nNote: This appears to be a stub embedding.")
        
        print("-" * 40)
    except Exception as e:
        print(f"Error: {e}")


def cmd_info(args: argparse.Namespace) -> None:
    """Show detailed information about the embedding system."""
    print("\n" + "=" * 60)
    print("ZORA CORE - Embedding System Info")
    print("=" * 60 + "\n")
    
    info = get_embedding_info()
    
    print(f"Default Provider: {info['default_provider']}")
    print(f"Default Model: {info['default_model']}")
    print(f"Default Dimensions: {info['default_dimensions']}")
    print(f"Embeddings Configured: {'yes' if info['is_configured'] else 'no'}")
    print()
    
    print("Provider Registry:")
    print("-" * 40)
    for provider_id, provider_info in info['providers'].items():
        status = "OK" if provider_info['is_configured'] else "--"
        support = "supported" if provider_info['is_supported'] else "stub"
        print(f"  [{status}] {provider_id}: {support}")
    
    print()


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="ZORA CORE Model Provider CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python -m zora_core.models.cli list-providers
    python -m zora_core.models.cli chat-demo --provider=openai
    python -m zora_core.models.cli chat-demo --provider=anthropic --model=claude-3-opus
    python -m zora_core.models.cli embed-demo --provider=openai --text="Hello world"
    python -m zora_core.models.cli info
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # list-providers command
    list_parser = subparsers.add_parser(
        "list-providers",
        help="List all available providers and their status"
    )
    list_parser.set_defaults(func=cmd_list_providers)
    
    # chat-demo command
    chat_parser = subparsers.add_parser(
        "chat-demo",
        help="Demo chat/LLM call with a specific provider"
    )
    chat_parser.add_argument(
        "--provider", "-p",
        default="openai",
        help="Provider to use (default: openai)"
    )
    chat_parser.add_argument(
        "--model", "-m",
        help="Specific model to use (default: provider's default)"
    )
    chat_parser.add_argument(
        "--prompt",
        help="Prompt to send (default: greeting)"
    )
    chat_parser.set_defaults(func=lambda args: asyncio.run(cmd_chat_demo(args)))
    
    # embed-demo command
    embed_parser = subparsers.add_parser(
        "embed-demo",
        help="Demo embedding generation with a specific provider"
    )
    embed_parser.add_argument(
        "--provider", "-p",
        default="openai",
        help="Provider to use (default: openai)"
    )
    embed_parser.add_argument(
        "--text", "-t",
        help="Text to embed (default: test sentence)"
    )
    embed_parser.set_defaults(func=lambda args: asyncio.run(cmd_embed_demo(args)))
    
    # info command
    info_parser = subparsers.add_parser(
        "info",
        help="Show detailed information about the embedding system"
    )
    info_parser.set_defaults(func=cmd_info)
    
    # Parse arguments
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        return
    
    # Execute command
    args.func(args)


if __name__ == "__main__":
    main()
