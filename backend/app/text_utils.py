from __future__ import annotations
import re
from bs4 import BeautifulSoup
from email import message_from_string
from email.message import Message

URL_RE = re.compile(r"https?://[^\s<>\)\]]+", re.IGNORECASE)

SUSPICIOUS_PATTERNS = [
    (re.compile(r"verify\s+your\s+account", re.I), "Asks to verify account"),
    (re.compile(r"password|passcode|2fa|one[- ]time\s+code|otp", re.I), "Mentions credentials/OTP"),
    (re.compile(r"urgent|immediately|within\s+\d+\s+(minutes|hours)", re.I), "Creates urgency"),
    (re.compile(r"wire\s+transfer|bank\s+details|gift\s+cards", re.I), "Payment/BEC language"),
    (re.compile(r"invoice|payment\s+due|past\s+due", re.I), "Invoice/payment bait"),
    (re.compile(r"enable\s+macros|enable\s+content", re.I), "Macro enable lure"),
    (re.compile(r"click\s+here|open\s+the\s+link", re.I), "Call-to-action click"),
]


def normalize_text(text: str) -> str:
    if not text:
        return ""
    # strip HTML if present
    if "<html" in text.lower() or "<body" in text.lower():
        soup = BeautifulSoup(text, "lxml")
        text = soup.get_text(" ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_urls(text: str) -> list[str]:
    if not text:
        return []
    return list(dict.fromkeys(URL_RE.findall(text)))  # unique, preserve order


def indicator_hits(text: str) -> list[str]:
    hits = []
    for rx, label in SUSPICIOUS_PATTERNS:
        if rx.search(text or ""):
            hits.append(label)
    return hits


def parse_eml(raw: str) -> dict:
    """Parse .eml raw string into subject/sender/recipients/body."""
    msg: Message = message_from_string(raw)
    subject = msg.get("Subject", "") or ""
    sender = msg.get("From", "") or ""
    recipients = msg.get("To", "") or ""
    # prefer plain text, fall back to html
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = (part.get("Content-Disposition") or "").lower()
            if "attachment" in disp:
                continue
            if ctype == "text/plain":
                try:
                    body = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                    break
                except Exception:
                    continue
        if not body:
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    try:
                        body = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                        break
                    except Exception:
                        continue
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
        else:
            body = msg.get_payload() or ""
    return {"subject": subject, "sender": sender, "recipients": recipients, "body": normalize_text(body)}
