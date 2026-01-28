from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets

from ..security import require_api_key
from ..schemas import IntegrationConnectResponse, IntegrationAccountOut
from ..db import get_session, IntegrationAccount
from ..crypto import encrypt_json, decrypt_json
from ..config import settings

from ..email.providers.gmail_provider import GmailOAuth, get_profile_email
from ..email.providers.outlook_provider import OutlookOAuth, me

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("", response_model=list[IntegrationAccountOut], dependencies=[Depends(require_api_key)])
async def list_accounts(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(IntegrationAccount))
    rows = res.scalars().all()
    return [
        IntegrationAccountOut(
            id=r.id,
            provider=r.provider,
            email=r.email,
            enabled=r.enabled,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/{provider}/connect", response_model=IntegrationConnectResponse, dependencies=[Depends(require_api_key)])
async def connect(provider: str):
    state = secrets.token_urlsafe(16)
    if provider == "gmail":
        if not (settings.gmail_client_id and settings.gmail_client_secret):
            raise HTTPException(status_code=400, detail="Gmail OAuth not configured in .env")
        return IntegrationConnectResponse(auth_url=GmailOAuth().auth_url(state))
    if provider == "outlook":
        if not (settings.ms_client_id and settings.ms_client_secret):
            raise HTTPException(status_code=400, detail="Outlook OAuth not configured in .env")
        return IntegrationConnectResponse(auth_url=OutlookOAuth().auth_url(state))
    raise HTTPException(status_code=404, detail="Unknown provider")


@router.get("/gmail/callback")
async def gmail_callback(code: str, session: AsyncSession = Depends(get_session)):
    oauth = GmailOAuth()
    token = oauth.exchange_code(code)
    email_addr = get_profile_email(token)

    row = IntegrationAccount(provider="gmail", email=email_addr, token_encrypted=encrypt_json(token))
    session.add(row)
    await session.commit()
    return {"status": "connected", "email": email_addr}


@router.get("/outlook/callback")
async def outlook_callback(code: str, session: AsyncSession = Depends(get_session)):
    oauth = OutlookOAuth()
    token = oauth.exchange_code(code)

    # fetch profile to get email
    profile = await me(token["access_token"])
    email_addr = profile.get("mail") or (profile.get("userPrincipalName") or "")

    # store refresh token if present
    token_dict = {
        "access_token": token.get("access_token"),
        "refresh_token": token.get("refresh_token"),
        "expires_in": token.get("expires_in"),
        "scope": token.get("scope"),
        "token_type": token.get("token_type"),
    }

    row = IntegrationAccount(provider="outlook", email=email_addr, token_encrypted=encrypt_json(token_dict))
    session.add(row)
    await session.commit()
    return {"status": "connected", "email": email_addr}


@router.post("/{account_id}/toggle", dependencies=[Depends(require_api_key)])
async def toggle_account(account_id: int, enabled: bool = Query(True), session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(IntegrationAccount).where(IntegrationAccount.id == account_id))
    acc = res.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    acc.enabled = bool(enabled)
    await session.commit()
    return {"status": "ok", "enabled": acc.enabled}
