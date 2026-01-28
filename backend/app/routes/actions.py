from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..security import require_api_key
from ..db import get_session, ScanResult, IntegrationAccount
from ..crypto import decrypt_json
from ..config import settings

from ..email.providers.gmail_provider import quarantine_message
from ..email.providers.outlook_provider import move_to_quarantine, OutlookOAuth

router = APIRouter(prefix="/actions", tags=["actions"])


@router.post("/quarantine/{scan_id}", dependencies=[Depends(require_api_key)])
async def quarantine(scan_id: int, session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(ScanResult).where(ScanResult.id == scan_id))
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.provider not in ("gmail", "outlook"):
        raise HTTPException(status_code=400, detail="This scan is not linked to a mailbox integration.")
    if not scan.provider_message_id:
        raise HTTPException(status_code=400, detail="Missing provider message id.")

    # find matching integration account by provider (MVP: assumes 1 account/provider)
    res2 = await session.execute(select(IntegrationAccount).where(IntegrationAccount.provider == scan.provider))
    acc = res2.scalars().first()
    if not acc:
        raise HTTPException(status_code=400, detail="No integration account configured for this provider.")

    token = decrypt_json(acc.token_encrypted)

    if scan.provider == "gmail":
        quarantine_message(token, scan.provider_message_id)
    else:
        # Outlook: refresh if needed (MVP: assumes refresh_token present)
        if token.get("refresh_token"):
            oauth = OutlookOAuth()
            refreshed = oauth.refresh(token["refresh_token"])
            token["access_token"] = refreshed["access_token"]
            # NOTE: for brevity, we don't persist refreshed token here
        await move_to_quarantine(token["access_token"], scan.provider_message_id)

    scan.quarantined = True
    await session.commit()
    return {"status": "ok", "quarantined": True}
