"""Every request resolves an identity (ADR-0011, ADR-0030)."""

import logging

from fastapi import HTTPException, Request
from wd_platform_sdk import Identity

from wd_api.auth import AuthError, verify_token
from wd_api.config import get_settings

__all__ = ["Identity", "get_identity"]

log = logging.getLogger("wd_api.identity")


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


async def get_identity(request: Request) -> Identity:
    settings = get_settings()
    if settings.auth_mode == "stub":
        return Identity(tenant_id=settings.default_tenant_id, user_id=settings.dev_user_id)
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorized("sign in required")
    try:
        claims = verify_token(token.strip(), settings.api_auth_secret)
    except AuthError as exc:
        log.warning("rejected token: %s", exc)
        raise _unauthorized("invalid or expired token") from exc
    user = await request.app.state.users.resolve(
        settings.default_tenant_id, claims, settings.admin_email_set
    )
    return Identity(tenant_id=settings.default_tenant_id, user_id=user.id, role=user.role)
