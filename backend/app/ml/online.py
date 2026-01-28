from __future__ import annotations
from pathlib import Path
import numpy as np
from .model_store import load_bundle, save_bundle, ModelBundle
from ..config import settings
from ..text_utils import normalize_text


def online_update(training_text: str, label: int) -> bool:
    """Update classifier weights quickly with a single labeled sample (vectorizer frozen)."""
    model_dir = Path(settings.model_dir)
    bundle = load_bundle(model_dir)
    if bundle is None:
        return False

    X = bundle.vectorizer.transform([normalize_text(training_text)])
    y = np.array([int(label)], dtype=int)
    # ensure classes are set
    classes = np.array([0, 1], dtype=int)
    try:
        bundle.clf.partial_fit(X, y, classes=classes)
        # keep same vectorizer; overwrite model
        save_bundle(model_dir, bundle, meta={"note": "updated_online"})
        return True
    except Exception:
        return False
