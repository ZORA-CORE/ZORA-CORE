"""
JWT Token Generation and Verification for ZORA CORE

Uses HMAC-SHA256 (HS256) for JWT signing/verification.
Compatible with the Workers API auth middleware.
"""

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Literal, Optional


@dataclass
class JWTPayload:
    """JWT payload structure for ZORA CORE authentication."""
    tenant_id: str
    user_id: str
    role: Literal['founder', 'brand_admin', 'viewer']
    iat: int  # Issued at (Unix timestamp)
    exp: int  # Expiration (Unix timestamp)


class JWTError(Exception):
    """Base exception for JWT errors."""
    pass


class InvalidTokenError(JWTError):
    """Raised when token format is invalid."""
    pass


class ExpiredTokenError(JWTError):
    """Raised when token has expired."""
    pass


class InvalidSignatureError(JWTError):
    """Raised when token signature is invalid."""
    pass


def _base64url_encode(data: bytes) -> str:
    """Base64URL encode bytes."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _base64url_decode(data: str) -> bytes:
    """Base64URL decode string."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)


def _sign(data: str, secret: str) -> str:
    """Create HMAC-SHA256 signature."""
    signature = hmac.new(
        secret.encode('utf-8'),
        data.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return _base64url_encode(signature)


def _verify_signature(data: str, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature."""
    expected = _sign(data, secret)
    return hmac.compare_digest(expected, signature)


def create_token(
    tenant_id: str,
    user_id: str,
    role: Literal['founder', 'brand_admin', 'viewer'],
    secret: Optional[str] = None,
    expires_in_seconds: int = 86400  # 24 hours default
) -> str:
    """
    Create a JWT token for ZORA CORE authentication.
    
    Args:
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        role: User role (founder, brand_admin, viewer)
        secret: JWT secret (defaults to ZORA_JWT_SECRET env var)
        expires_in_seconds: Token expiration time in seconds
        
    Returns:
        JWT token string
        
    Raises:
        ValueError: If secret is not provided and ZORA_JWT_SECRET is not set
    """
    if secret is None:
        secret = os.environ.get('ZORA_JWT_SECRET')
        if not secret:
            raise ValueError(
                "JWT secret not provided. Set ZORA_JWT_SECRET environment variable "
                "or pass secret parameter."
            )
    
    now = int(time.time())
    
    header = {'alg': 'HS256', 'typ': 'JWT'}
    payload = {
        'tenant_id': tenant_id,
        'user_id': user_id,
        'role': role,
        'iat': now,
        'exp': now + expires_in_seconds,
    }
    
    header_encoded = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_encoded = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    
    data_to_sign = f"{header_encoded}.{payload_encoded}"
    signature = _sign(data_to_sign, secret)
    
    return f"{data_to_sign}.{signature}"


def verify_token(
    token: str,
    secret: Optional[str] = None
) -> JWTPayload:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        secret: JWT secret (defaults to ZORA_JWT_SECRET env var)
        
    Returns:
        JWTPayload with decoded token data
        
    Raises:
        InvalidTokenError: If token format is invalid
        InvalidSignatureError: If signature verification fails
        ExpiredTokenError: If token has expired
        ValueError: If secret is not provided
    """
    if secret is None:
        secret = os.environ.get('ZORA_JWT_SECRET')
        if not secret:
            raise ValueError(
                "JWT secret not provided. Set ZORA_JWT_SECRET environment variable "
                "or pass secret parameter."
            )
    
    parts = token.split('.')
    if len(parts) != 3:
        raise InvalidTokenError("Invalid token format")
    
    header_encoded, payload_encoded, signature = parts
    data_to_verify = f"{header_encoded}.{payload_encoded}"
    
    # Verify signature
    if not _verify_signature(data_to_verify, signature, secret):
        raise InvalidSignatureError("Token signature verification failed")
    
    # Decode payload
    try:
        payload_json = _base64url_decode(payload_encoded).decode('utf-8')
        payload = json.loads(payload_json)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise InvalidTokenError(f"Failed to decode token payload: {e}")
    
    # Validate required fields
    required_fields = ['tenant_id', 'user_id', 'role', 'iat', 'exp']
    for field in required_fields:
        if field not in payload:
            raise InvalidTokenError(f"Token missing required field: {field}")
    
    # Check expiration
    now = int(time.time())
    if payload['exp'] < now:
        raise ExpiredTokenError("Token has expired")
    
    return JWTPayload(
        tenant_id=payload['tenant_id'],
        user_id=payload['user_id'],
        role=payload['role'],
        iat=payload['iat'],
        exp=payload['exp'],
    )


def get_default_tenant_id() -> str:
    """Get the default tenant ID created during migration."""
    return '00000000-0000-0000-0000-000000000001'


def get_default_user_id() -> str:
    """Get the default user ID created during migration."""
    return '00000000-0000-0000-0000-000000000001'
