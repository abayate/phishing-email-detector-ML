from __future__ import annotations
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import base64
import email
import httpx

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from ...config import settings


SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]


@dataclass
class GmailOAuth:
    def auth_url(self, state: str) -> str:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.gmail_client_id,
                    "client_secret": settings.gmail_client_secret,
                    "redirect_uris": [settings.gmail_redirect_uri],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.gmail_redirect_uri,
        )
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=state,
        )
        return auth_url

    def exchange_code(self, code: str) -> dict:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.gmail_client_id,
                    "client_secret": settings.gmail_client_secret,
                    "redirect_uris": [settings.gmail_redirect_uri],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=settings.gmail_redirect_uri,
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        return {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
        }


def _service(token_dict: dict):
    creds = Credentials(
        token=token_dict.get("token"),
        refresh_token=token_dict.get("refresh_token"),
        token_uri=token_dict.get("token_uri"),
        client_id=token_dict.get("client_id"),
        client_secret=token_dict.get("client_secret"),
        scopes=token_dict.get("scopes") or SCOPES,
    )
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def get_profile_email(token_dict: dict) -> str:
    svc = _service(token_dict)
    prof = svc.users().getProfile(userId="me").execute()
    return prof.get("emailAddress", "")


def list_messages(token_dict: dict, q: str = "", max_results: int = 10) -> list[dict]:
    svc = _service(token_dict)
    res = svc.users().messages().list(userId="me", q=q, maxResults=max_results).execute()
    return res.get("messages", []) or []


def get_message(token_dict: dict, msg_id: str) -> dict:
    svc = _service(token_dict)
    return svc.users().messages().get(userId="me", id=msg_id, format="full").execute()


def _extract_text_from_payload(payload: dict) -> str:
    def walk(part: dict) -> str:
        mime = part.get("mimeType", "")
        body = part.get("body", {}) or {}
        data = body.get("data")
        if mime == "text/plain" and data:
            return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="ignore")
        if mime == "text/html" and data:
            return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="ignore")
        for child in part.get("parts", []) or []:
            txt = walk(child)
            if txt:
                return txt
        return ""
    return walk(payload) or ""


def extract_email_fields(gmail_msg: dict) -> dict:
    payload = gmail_msg.get("payload", {}) or {}
    headers = {h.get("name", "").lower(): h.get("value", "") for h in (payload.get("headers", []) or [])}
    subject = headers.get("subject", "")
    sender = headers.get("from", "")
    recipients = headers.get("to", "")
    text = _extract_text_from_payload(payload)
    return {
        "subject": subject,
        "sender": sender,
        "recipients": recipients,
        "body": text,
        "headers": headers,
    }


def ensure_label(token_dict: dict, label_name: str) -> str:
    svc = _service(token_dict)
    labels = svc.users().labels().list(userId="me").execute().get("labels", []) or []
    for lbl in labels:
        if lbl.get("name") == label_name:
            return lbl.get("id")
    created = svc.users().labels().create(userId="me", body={"name": label_name, "labelListVisibility": "labelShow", "messageListVisibility": "show"}).execute()
    return created.get("id")


def quarantine_message(token_dict: dict, msg_id: str, label_name: str = "PhishGuard/Quarantine") -> None:
    svc = _service(token_dict)
    label_id = ensure_label(token_dict, label_name)
    # remove INBOX, add quarantine label
    svc.users().messages().modify(
        userId="me",
        id=msg_id,
        body={"addLabelIds": [label_id], "removeLabelIds": ["INBOX"]},
    ).execute()
