from __future__ import annotations
from pathlib import Path
from typing import Dict, Any, Tuple, List
import numpy as np

from .model_store import load_bundle, ModelBundle
from ..text_utils import normalize_text, extract_urls, indicator_hits


def sigmoid(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-x)))


def predict(bundle: ModelBundle, text: str) -> Tuple[float, dict]:
    """Return (risk_score, evidence)"""
    text = normalize_text(text)
    X = bundle.vectorizer.transform([text])

    # risk score
    if hasattr(bundle.clf, "predict_proba"):
        proba = float(bundle.clf.predict_proba(X)[0, 1])
    else:
        # fallback from decision_function
        score = float(bundle.clf.decision_function(X)[0])
        proba = sigmoid(score)

    # evidence: top contributing tokens (linear model + tfidf values)
    evidence = {"top_tokens": [], "urls": extract_urls(text), "indicators": indicator_hits(text), "header_flags": []}

    try:
        coef = bundle.clf.coef_[0]
        # element-wise contribution for each feature present
        contrib = X.multiply(coef).toarray()[0]
        # get top positive contributions
        top_idx = np.argsort(contrib)[-10:][::-1]
        feats = bundle.vectorizer.get_feature_names_out()
        top = []
        for i in top_idx:
            if contrib[i] <= 0:
                continue
            top.append({"token": str(feats[i]), "contribution": float(contrib[i])})
        evidence["top_tokens"] = top
    except Exception:
        pass

    return proba, evidence


def classify_attack_type(text: str, risk_score: float, evidence: dict) -> str:
    """Simple, explainable heuristics to label attack type."""
    if risk_score < 0.5:
        return "benign"
    t = (text or "").lower()
    urls = evidence.get("urls") or []
    indicators = set((evidence.get("indicators") or []))

    # BEC / payment fraud
    if any(k in t for k in ["wire transfer", "gift card", "bank details", "payment today", "urgent payment", "invoice"]) or "Payment/BEC language" in indicators:
        return "BEC / Payment Fraud"

    # Credential phishing
    if (urls and any(k in t for k in ["login", "verify", "password", "account", "sso", "mfa", "otp"])) or "Mentions credentials/OTP" in indicators:
        return "Credential Phishing"

    # Malware / attachment lure (text-based proxy)
    if any(k in t for k in ["enable macros", "enable content", "attached is", "download the attachment", "security update", "pdf attached"]) or "Macro enable lure" in indicators:
        return "Malware Delivery / Attachment Lure"

    # Generic phishing / social engineering
    if urls or indicators:
        return "Phishing / Social Engineering"

    return "Suspicious"
