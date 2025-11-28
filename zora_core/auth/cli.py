"""
ZORA CORE Authentication CLI

Command-line tool for generating and verifying JWT tokens.

Usage:
    # Generate a token for the default tenant/user
    python -m zora_core.auth.cli issue-token
    
    # Generate a token with custom tenant/user
    python -m zora_core.auth.cli issue-token --tenant-id=<uuid> --user-id=<uuid> --role=founder
    
    # Verify a token
    python -m zora_core.auth.cli verify-token <token>
    
    # Show default tenant/user IDs
    python -m zora_core.auth.cli defaults
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from .jwt import (
    create_token,
    verify_token,
    get_default_tenant_id,
    get_default_user_id,
    JWTError,
)


def cmd_issue_token(args: argparse.Namespace) -> int:
    """Issue a new JWT token."""
    tenant_id = args.tenant_id or get_default_tenant_id()
    user_id = args.user_id or get_default_user_id()
    role = args.role
    expires_in = args.expires_in
    secret = args.secret or os.environ.get('ZORA_JWT_SECRET')
    
    if not secret:
        print("Error: JWT secret not provided.", file=sys.stderr)
        print("Set ZORA_JWT_SECRET environment variable or use --secret flag.", file=sys.stderr)
        return 1
    
    try:
        token = create_token(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            secret=secret,
            expires_in_seconds=expires_in,
        )
        
        if args.verbose:
            print(f"Tenant ID:  {tenant_id}")
            print(f"User ID:    {user_id}")
            print(f"Role:       {role}")
            print(f"Expires in: {expires_in} seconds ({expires_in // 3600} hours)")
            print()
            print("Token:")
            print(token)
            print()
            print("Use this token in the Authorization header:")
            print(f"Authorization: Bearer {token}")
        else:
            print(token)
        
        return 0
    except Exception as e:
        print(f"Error creating token: {e}", file=sys.stderr)
        return 1


def cmd_verify_token(args: argparse.Namespace) -> int:
    """Verify and decode a JWT token."""
    token = args.token
    secret = args.secret or os.environ.get('ZORA_JWT_SECRET')
    
    if not secret:
        print("Error: JWT secret not provided.", file=sys.stderr)
        print("Set ZORA_JWT_SECRET environment variable or use --secret flag.", file=sys.stderr)
        return 1
    
    try:
        payload = verify_token(token, secret)
        
        exp_dt = datetime.fromtimestamp(payload.exp, tz=timezone.utc)
        iat_dt = datetime.fromtimestamp(payload.iat, tz=timezone.utc)
        
        if args.json:
            print(json.dumps({
                'tenant_id': payload.tenant_id,
                'user_id': payload.user_id,
                'role': payload.role,
                'iat': payload.iat,
                'exp': payload.exp,
                'iat_iso': iat_dt.isoformat(),
                'exp_iso': exp_dt.isoformat(),
            }, indent=2))
        else:
            print("Token is valid!")
            print()
            print(f"Tenant ID:  {payload.tenant_id}")
            print(f"User ID:    {payload.user_id}")
            print(f"Role:       {payload.role}")
            print(f"Issued at:  {iat_dt.isoformat()}")
            print(f"Expires at: {exp_dt.isoformat()}")
        
        return 0
    except JWTError as e:
        print(f"Token verification failed: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error verifying token: {e}", file=sys.stderr)
        return 1


def cmd_defaults(args: argparse.Namespace) -> int:
    """Show default tenant and user IDs."""
    tenant_id = get_default_tenant_id()
    user_id = get_default_user_id()
    
    if args.json:
        print(json.dumps({
            'default_tenant_id': tenant_id,
            'default_user_id': user_id,
        }, indent=2))
    else:
        print("Default Tenant/User IDs (created during migration):")
        print()
        print(f"Tenant ID: {tenant_id}")
        print(f"User ID:   {user_id}")
        print()
        print("Use these with the issue-token command:")
        print(f"  python -m zora_core.auth.cli issue-token --tenant-id={tenant_id} --user-id={user_id}")
    
    return 0


def main() -> int:
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        prog='zora_core.auth.cli',
        description='ZORA CORE Authentication CLI - Generate and verify JWT tokens',
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # issue-token command
    issue_parser = subparsers.add_parser(
        'issue-token',
        help='Generate a new JWT token',
        description='Generate a JWT token for ZORA CORE authentication',
    )
    issue_parser.add_argument(
        '--tenant-id',
        help='Tenant UUID (defaults to migration default)',
    )
    issue_parser.add_argument(
        '--user-id',
        help='User UUID (defaults to migration default)',
    )
    issue_parser.add_argument(
        '--role',
        choices=['founder', 'brand_admin', 'viewer'],
        default='founder',
        help='User role (default: founder)',
    )
    issue_parser.add_argument(
        '--expires-in',
        type=int,
        default=86400,
        help='Token expiration in seconds (default: 86400 = 24 hours)',
    )
    issue_parser.add_argument(
        '--secret',
        help='JWT secret (defaults to ZORA_JWT_SECRET env var)',
    )
    issue_parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Show verbose output with usage instructions',
    )
    issue_parser.set_defaults(func=cmd_issue_token)
    
    # verify-token command
    verify_parser = subparsers.add_parser(
        'verify-token',
        help='Verify and decode a JWT token',
        description='Verify a JWT token and display its contents',
    )
    verify_parser.add_argument(
        'token',
        help='JWT token to verify',
    )
    verify_parser.add_argument(
        '--secret',
        help='JWT secret (defaults to ZORA_JWT_SECRET env var)',
    )
    verify_parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON',
    )
    verify_parser.set_defaults(func=cmd_verify_token)
    
    # defaults command
    defaults_parser = subparsers.add_parser(
        'defaults',
        help='Show default tenant and user IDs',
        description='Display the default tenant and user IDs created during migration',
    )
    defaults_parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON',
    )
    defaults_parser.set_defaults(func=cmd_defaults)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())
