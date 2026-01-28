from __future__ import annotations
import smtplib
from email.message import EmailMessage
from .config import settings


def send_security_alert(subject: str, body: str) -> None:
    if not (settings.smtp_host and settings.smtp_user and settings.smtp_pass and settings.alert_to_email):
        return  # notifications not configured

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = settings.alert_to_email
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
        s.starttls()
        s.login(settings.smtp_user, settings.smtp_pass)
        s.send_message(msg)
