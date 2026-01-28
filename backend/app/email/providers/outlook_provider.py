from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
import httpx
import msal

from ...config import settings


GRAPH = "https://graph.microsoft.com/v1.0"
SCOPES = ["Mail.Read", "Mail.ReadWrite", "offline_access", "User.Read"]


@dataclass
class OutlookOAuth:
    def auth_url(self, state: str) -> str:
        app = msal.ConfidentialClientApplication(
            client_id=settings.ms_client_id,
            client_credential=settings.ms_client_secret,
            authority=f"https://login.microsoftonline.com/{settings.ms_tenant_id}",
        )
        return app.get_authorization_request_url(
            scopes=SCOPES,
            state=state,
            redirect_uri=settings.ms_redirect_uri,
            prompt="select_account",
        )

    def exchange_code(self, code: str) -> dict:
        app = msal.ConfidentialClientApplication(
            client_id=settings.ms_client_id,
            client_credential=settings.ms_client_secret,
            authority=f"https://login.microsoftonline.com/{settings.ms_tenant_id}",
        )
        res = app.acquire_token_by_authorization_code(
            code=code,
            scopes=SCOPES,
            redirect_uri=settings.ms_redirect_uri,
        )
        if "access_token" not in res:
            raise RuntimeError(f"Outlook token error: {res.get('error_description') or res}")
        return res

    def refresh(self, refresh_token: str) -> dict:
        app = msal.ConfidentialClientApplication(
            client_id=settings.ms_client_id,
            client_credential=settings.ms_client_secret,
            authority=f"https://login.microsoftonline.com/{settings.ms_tenant_id}",
        )
        res = app.acquire_token_by_refresh_token(refresh_token, scopes=SCOPES)
        if "access_token" not in res:
            raise RuntimeError(f"Outlook refresh error: {res.get('error_description') or res}")
        return res


async def _get(url: str, access_token: str):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        return r.json()


async def _post(url: str, access_token: str, json_body: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, headers={"Authorization": f"Bearer {access_token}"}, json=json_body)
        r.raise_for_status()
        return r.json()


async def _patch(url: str, access_token: str, json_body: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.patch(url, headers={"Authorization": f"Bearer {access_token}"}, json=json_body)
        r.raise_for_status()
        if r.text:
            return r.json()
        return {}


async def me(access_token: str) -> dict:
    return await _get(f"{GRAPH}/me", access_token)


async def list_inbox_messages(access_token: str, top: int = 10) -> list[dict]:
    data = await _get(f"{GRAPH}/me/mailFolders/inbox/messages?$top={top}&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview", access_token)
    return data.get("value", []) or []


async def get_message(access_token: str, msg_id: str) -> dict:
    return await _get(f"{GRAPH}/me/messages/{msg_id}?$select=id,subject,from,toRecipients,receivedDateTime,body,bodyPreview", access_token)


async def ensure_quarantine_folder(access_token: str, name: str = "PhishGuard-Quarantine") -> str:
    folders = await _get(f"{GRAPH}/me/mailFolders?$select=id,displayName", access_token)
    for f in folders.get("value", []) or []:
        if f.get("displayName") == name:
            return f.get("id")
    created = await _post(f"{GRAPH}/me/mailFolders", access_token, {"displayName": name})
    return created.get("id")


async def move_to_quarantine(access_token: str, msg_id: str, folder_name: str = "PhishGuard-Quarantine") -> None:
    folder_id = await ensure_quarantine_folder(access_token, folder_name)
    await _post(f"{GRAPH}/me/messages/{msg_id}/move", access_token, {"destinationId": folder_id})
