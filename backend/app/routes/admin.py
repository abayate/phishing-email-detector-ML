from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import pandas as pd

from ..security import require_api_key
from ..schemas import AdminImportResponse, AdminRetrainResponse
from ..db import get_session, Feedback
from ..ml.training import train_from_csv
from ..config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/import", response_model=AdminImportResponse, dependencies=[Depends(require_api_key)])
async def import_csv(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV with columns: text,label")

    data = await file.read()
    tmp = Path("./_tmp_import.csv")
    tmp.write_bytes(data)

    df = pd.read_csv(tmp)
    if "text" not in df.columns or "label" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must include text,label columns")

    # store as feedback samples so retrain sees them
    imported = 0
    for _, row in df.iterrows():
        fb = Feedback(scan_id=0, correct_label=int(row["label"]), notes="import", training_text=str(row["text"]))
        session.add(fb)
        imported += 1
    await session.commit()
    tmp.unlink(missing_ok=True)

    return AdminImportResponse(imported_rows=imported)


@router.post("/retrain", response_model=AdminRetrainResponse, dependencies=[Depends(require_api_key)])
async def retrain_model(session: AsyncSession = Depends(get_session)):
    # For MVP: build a training dataframe from feedback samples (import + user feedback)
    res = await session.execute(select(Feedback))
    rows = res.scalars().all()
    if not rows:
        raise HTTPException(status_code=400, detail="No feedback/import data found to retrain on.")

    df = pd.DataFrame({"text": [r.training_text for r in rows], "label": [r.correct_label for r in rows]})
    tmp = Path("./_tmp_retrain.csv")
    df.to_csv(tmp, index=False)

    out = Path(settings.model_dir)
    train_from_csv(tmp, out, text_col="text", label_col="label")

    tmp.unlink(missing_ok=True)
    return AdminRetrainResponse(status="retrained")
