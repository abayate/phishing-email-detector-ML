from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ..db import get_session, ScanResult
from ..schemas import IncidentItem
from ..security import require_api_key

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentItem], dependencies=[Depends(require_api_key)])
async def list_incidents(limit: int = 50, session: AsyncSession = Depends(get_session)):
    q = select(ScanResult).order_by(desc(ScanResult.created_at)).limit(limit)
    res = await session.execute(q)
    rows = res.scalars().all()
    return [
        IncidentItem(
            id=r.id,
            created_at=r.created_at.isoformat(),
            subject=r.subject,
            sender=r.sender,
            provider=r.provider,
            risk_score=r.risk_score,
            verdict=r.verdict,
            attack_type=r.attack_type,
            quarantined=r.quarantined,
        )
        for r in rows
    ]


@router.get("/{scan_id}", dependencies=[Depends(require_api_key)])
async def get_incident(scan_id: int, session: AsyncSession = Depends(get_session)):
    q = select(ScanResult).where(ScanResult.id == scan_id)
    res = await session.execute(q)
    r = res.scalar_one_or_none()
    if not r:
        return {"error": "not_found"}
    return {
        "id": r.id,
        "created_at": r.created_at.isoformat(),
        "subject": r.subject,
        "sender": r.sender,
        "recipients": r.recipients,
        "provider": r.provider,
        "provider_message_id": r.provider_message_id,
        "risk_score": r.risk_score,
        "verdict": r.verdict,
        "attack_type": r.attack_type,
        "evidence": r.evidence_json,
        "quarantined": r.quarantined,
        "body_preview": r.body_preview,
    }
