from __future__ import annotations
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .config import settings
from .db import AsyncSessionLocal, IntegrationAccount, ScanResult
from .crypto import decrypt_json, encrypt_json
from .email.service import scan_email
from .notify import send_security_alert
from .email.providers.gmail_provider import list_messages, get_message, extract_email_fields, quarantine_message
from .email.providers.outlook_provider import list_inbox_messages, get_message as outlook_get_message, OutlookOAuth, move_to_quarantine


scheduler = AsyncIOScheduler()


async def poll_once():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(IntegrationAccount).where(IntegrationAccount.enabled == True))
        accounts = res.scalars().all()

        for acc in accounts:
            try:
                token = decrypt_json(acc.token_encrypted)
                if acc.provider == "gmail":
                    # Use checkpoint as Gmail query 'newer_than:Xd' simplification for MVP
                    msgs = list_messages(token, q="newer_than:2d", max_results=10)
                    for m in msgs:
                        msg_id = m.get("id")
                        if not msg_id:
                            continue
                        # avoid duplicates
                        existing = await session.execute(
                            select(ScanResult).where(ScanResult.provider == "gmail", ScanResult.provider_message_id == msg_id)
                        )
                        if existing.scalar_one_or_none():
                            continue
                        full = get_message(token, msg_id)
                        fields = extract_email_fields(full)
                        risk, attack_type, evidence = scan_email(fields["subject"], fields["sender"], fields["recipients"], fields["body"])
                        verdict = "malicious" if risk >= 0.5 else "benign"
                        quarantined = False

                        if settings.auto_quarantine and risk >= settings.risk_threshold:
                            quarantine_message(token, msg_id)
                            quarantined = True

                        row = ScanResult(
                            subject=fields["subject"],
                            sender=fields["sender"],
                            recipients=fields["recipients"],
                            body_preview=(fields["body"][:600] if fields["body"] else ""),
                            raw_source="",
                            provider="gmail",
                            provider_message_id=msg_id,
                            risk_score=float(risk),
                            verdict=verdict,
                            attack_type=attack_type,
                            evidence_json=evidence,
                            quarantined=quarantined,
                        )
                        session.add(row)

                        if verdict == "malicious" and risk >= settings.risk_threshold:
                            send_security_alert(
                                subject=f"[PhishGuard] {attack_type} detected (Gmail) — risk {risk:.2f}",
                                body=f"From: {fields['sender']}\nSubject: {fields['subject']}\nRisk: {risk:.2f}\nAttack: {attack_type}\n\nIndicators: {evidence.get('indicators')}\nURLs: {evidence.get('urls')}",
                            )

                    await session.commit()

                elif acc.provider == "outlook":
                    # Refresh token if we can
                    if token.get("refresh_token"):
                        oauth = OutlookOAuth()
                        refreshed = oauth.refresh(token["refresh_token"])
                        token["access_token"] = refreshed["access_token"]

                    access = token.get("access_token")
                    if not access:
                        continue

                    msgs = await list_inbox_messages(access, top=10)
                    for m in msgs:
                        msg_id = m.get("id")
                        if not msg_id:
                            continue
                        existing = await session.execute(
                            select(ScanResult).where(ScanResult.provider == "outlook", ScanResult.provider_message_id == msg_id)
                        )
                        if existing.scalar_one_or_none():
                            continue

                        full = await outlook_get_message(access, msg_id)
                        subject = full.get("subject", "") or ""
                        sender = ((full.get("from") or {}).get("emailAddress") or {}).get("address") or ""
                        to_list = full.get("toRecipients", []) or []
                        recipients = ", ".join([(r.get("emailAddress") or {}).get("address", "") for r in to_list])
                        body = (full.get("body") or {}).get("content") or (full.get("bodyPreview") or "")

                        risk, attack_type, evidence = scan_email(subject, sender, recipients, body)
                        verdict = "malicious" if risk >= 0.5 else "benign"
                        quarantined = False

                        if settings.auto_quarantine and risk >= settings.risk_threshold:
                            await move_to_quarantine(access, msg_id)
                            quarantined = True

                        row = ScanResult(
                            subject=subject,
                            sender=sender,
                            recipients=recipients,
                            body_preview=(body[:600] if body else ""),
                            raw_source="",
                            provider="outlook",
                            provider_message_id=msg_id,
                            risk_score=float(risk),
                            verdict=verdict,
                            attack_type=attack_type,
                            evidence_json=evidence,
                            quarantined=quarantined,
                        )
                        session.add(row)

                        if verdict == "malicious" and risk >= settings.risk_threshold:
                            send_security_alert(
                                subject=f"[PhishGuard] {attack_type} detected (Outlook) — risk {risk:.2f}",
                                body=f"From: {sender}\nSubject: {subject}\nRisk: {risk:.2f}\nAttack: {attack_type}\n\nIndicators: {evidence.get('indicators')}\nURLs: {evidence.get('urls')}",
                            )

                    await session.commit()

            except Exception as e:
                # swallow errors so one account doesn't break scheduler
                print(f"[poll] provider={acc.provider} email={acc.email} error={e}")


def start_scheduler():
    scheduler.add_job(lambda: asyncio.create_task(poll_once()), "interval", seconds=settings.poll_interval_seconds, id="poll")
    scheduler.start()
