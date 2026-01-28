from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ManualScanRequest(BaseModel):
    subject: str = ""
    sender: str = ""
    recipients: str = ""
    body: str = ""
    headers: Optional[str] = None
    raw_eml: Optional[str] = None


class ScanEvidence(BaseModel):
    top_tokens: List[Dict[str, Any]] = Field(default_factory=list)
    urls: List[str] = Field(default_factory=list)
    indicators: List[str] = Field(default_factory=list)
    header_flags: List[str] = Field(default_factory=list)


class ScanResponse(BaseModel):
    scan_id: int
    risk_score: float
    verdict: str
    attack_type: str
    evidence: ScanEvidence


class IncidentItem(BaseModel):
    id: int
    created_at: str
    subject: str
    sender: str
    provider: str
    risk_score: float
    verdict: str
    attack_type: str
    quarantined: bool


class FeedbackRequest(BaseModel):
    scan_id: int
    correct_label: int = Field(ge=0, le=1)
    notes: str = ""


class IntegrationConnectResponse(BaseModel):
    auth_url: str


class IntegrationAccountOut(BaseModel):
    id: int
    provider: str
    email: str
    enabled: bool
    created_at: str


class AdminImportResponse(BaseModel):
    imported_rows: int


class AdminRetrainResponse(BaseModel):
    status: str
