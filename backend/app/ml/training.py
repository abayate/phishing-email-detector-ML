from __future__ import annotations
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from .model_store import ModelBundle, save_bundle
from ..text_utils import normalize_text


def train_from_csv(csv_path: Path, model_dir: Path, text_col: str = "text", label_col: str = "label") -> dict:
    df = pd.read_csv(csv_path)
    if text_col not in df.columns or label_col not in df.columns:
        raise ValueError(f"CSV must include columns: {text_col}, {label_col}")

    df[text_col] = df[text_col].fillna("").map(normalize_text)
    y = df[label_col].astype(int).values
    X = df[text_col].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=40000,
        min_df=2,
        strip_accents="unicode",
        lowercase=True,
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    clf = SGDClassifier(
        loss="log_loss",
        alpha=1e-5,
        penalty="l2",
        max_iter=2000,
        tol=1e-3,
        random_state=42,
    )
    # Use partial_fit once with classes to establish classifier
    classes = np.array([0, 1], dtype=int)
    clf.partial_fit(X_train_vec, y_train, classes=classes)

    # Additional epochs for better convergence
    for _ in range(3):
        clf.partial_fit(X_train_vec, y_train)

    y_pred = (clf.predict_proba(X_test_vec)[:, 1] >= 0.5).astype(int)
    report = classification_report(y_test, y_pred, output_dict=True)

    meta = {
        "text_col": text_col,
        "label_col": label_col,
        "trained_on": str(csv_path),
        "n_rows": int(len(df)),
        "vectorizer": {"ngram_range": [1, 2], "max_features": 40000},
        "model": {"type": "SGDClassifier", "loss": "log_loss"},
    }
    save_bundle(model_dir, ModelBundle(vectorizer=vectorizer, clf=clf, classes_=classes), meta)
    return {"meta": meta, "report": report}
