from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db import get_session, ScanResult, Feedback
from ..schemas import FeedbackRequest
from ..security import require_api_key
from ..ml.online import online_update

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", dependencies=[Depends(require_api_key)])
async def submit_feedback(payload: FeedbackRequest, session: AsyncSession = Depends(get_session)):
    q = select(ScanResult).where(ScanResult.id == payload.scan_id)
    res = await session.execute(q)
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")

    training_text = f"Subject: {scan.subject}\nFrom: {scan.sender}\nTo: {scan.recipients}\n\n{scan.body_preview}"
    fb = Feedback(
        scan_id=scan.id,
        correct_label=int(payload.correct_label),
        notes=payload.notes,
        training_text=training_text,
    )
    session.add(fb)
    await session.commit()

    # online update for quick improvements
    updated = online_update(training_text=training_text, label=int(payload.correct_label))

    return {"status": "ok", "online_updated": bool(updated)}
