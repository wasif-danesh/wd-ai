"""Every request resolves an identity (ADR-0011). Stub user until Auth.js lands (Phase 5)."""

from dataclasses import dataclass

from fastapi import Depends

from wd_api.config import Settings, get_settings


@dataclass(frozen=True)
class Identity:
    tenant_id: str
    user_id: str


def get_identity(settings: Settings = Depends(get_settings)) -> Identity:
    return Identity(tenant_id=settings.default_tenant_id, user_id=settings.dev_user_id)
