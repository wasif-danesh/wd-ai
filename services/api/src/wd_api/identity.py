"""Every request resolves an identity (ADR-0011). Stub user until Auth.js lands (Phase 5)."""

from fastapi import Depends
from wd_platform_sdk import Identity

from wd_api.config import Settings, get_settings

__all__ = ["Identity", "get_identity"]


def get_identity(settings: Settings = Depends(get_settings)) -> Identity:
    return Identity(tenant_id=settings.default_tenant_id, user_id=settings.dev_user_id)
