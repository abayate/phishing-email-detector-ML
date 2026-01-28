from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from ..schemas import ManualScanRequest, ScanResponse, ScanEvidence
from ..db import get_session, ScanResult
from ..security import require_api_key
from ..email.service import scan_email
from ..text_utils import parse_eml, normalize_text

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/manual", response_model=ScanResponse, dependencies=[Depends(require_api_key)])
async def manual_scan(payload: ManualScanRequest, session: AsyncSession = Depends(get_session)):
    if payload.raw_eml:
        parsed = parse_eml(payload.raw_eml)
        subject = parsed["subject"]
        sender = parsed["sender"]
        recipients = parsed["recipients"]
        body = parsed["body"]
    else:
        subject = payload.subject
        sender = payload.sender
        recipients = payload.recipients
        body = normalize_text(payload.body)

    risk, attack_type, evidence = scan_email(subject, sender, recipients, body)
    verdict = "malicious" if risk >= 0.5 else "benign"

    row = ScanResult(
        subject=subject,
        sender=sender,
        recipients=recipients,
        body_preview=(body[:600] if body else ""),
        raw_source=payload.raw_eml or "",
        provider="manual",
        provider_message_id="",
        risk_score=float(risk),
        verdict=verdict,
        attack_type=attack_type,
        evidence_json=evidence,
        quarantined=False,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)

    return ScanResponse(
        scan_id=row.id,
        risk_score=row.risk_score,
        verdict=row.verdict,
        attack_type=row.attack_type,
        evidence=ScanEvidence(**evidence),
    )


@router.post("/eml", response_model=ScanResponse, dependencies=[Depends(require_api_key)])
async def scan_eml(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    if not file.filename.lower().endswith(".eml"):
        raise HTTPException(status_code=400, detail="Upload a .eml file.")
    raw = (await file.read()).decode("utf-8", errors="ignore")
    parsed = parse_eml(raw)
    payload = ManualScanRequest(raw_eml=raw)
    return await manual_scan(payload, session)
