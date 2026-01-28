from __future__ import annotations
from pathlib import Path
import joblib
from dataclasses import dataclass
from typing import Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
import numpy as np


VECTORIZER_NAME = "vectorizer.joblib"
MODEL_NAME = "classifier.joblib"
META_NAME = "meta.json"


@dataclass
class ModelBundle:
    vectorizer: TfidfVectorizer
    clf: SGDClassifier
    classes_: np.ndarray


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_bundle(model_dir: Path, bundle: ModelBundle, meta: dict) -> None:
    ensure_dir(model_dir)
    joblib.dump(bundle.vectorizer, model_dir / VECTORIZER_NAME)
    joblib.dump(bundle.clf, model_dir / MODEL_NAME)
    (model_dir / META_NAME).write_text(__import__("json").dumps(meta, indent=2), encoding="utf-8")


def load_bundle(model_dir: Path) -> Optional[ModelBundle]:
    vpath = model_dir / VECTORIZER_NAME
    mpath = model_dir / MODEL_NAME
    if not vpath.exists() or not mpath.exists():
        return None
    vectorizer = joblib.load(vpath)
    clf = joblib.load(mpath)
    classes_ = getattr(clf, "classes_", np.array([0, 1]))
    return ModelBundle(vectorizer=vectorizer, clf=clf, classes_=classes_)
