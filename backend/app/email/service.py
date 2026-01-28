from __future__ import annotations
from typing import Optional, Tuple
from ..text_utils import normalize_text
from ..ml.inference import predict, classify_attack_type
from ..ml.model_store import load_bundle
from ..config import settings
from pathlib import Path


def scan_email(subject: str, sender: str, recipients: str, body: str) -> tuple[float, str, dict]:
    bundle = load_bundle(Path(settings.model_dir))
    if bundle is None:
        raise RuntimeError(
            f"Model not found at {settings.model_dir}. Train first: python -m app.training train --csv <path> --out {settings.model_dir}"
        )

    # Combine subject + body for better signal
    combined = f"Subject: {subject}\nFrom: {sender}\nTo: {recipients}\n\n{body}"
    risk, evidence = predict(bundle, combined)
    attack_type = classify_attack_type(combined, risk, evidence)
    return risk, attack_type, evidence
