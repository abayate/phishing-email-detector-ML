from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer, Float, Boolean, Text, JSON
from datetime import datetime

from .config import settings


DATABASE_URL = f"sqlite+aiosqlite:///{settings.database_path}"


class Base(DeclarativeBase):
    pass


class IntegrationAccount(Base):
    __tablename__ = "integration_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32))  # gmail | outlook
    email: Mapped[str] = mapped_column(String(320))
    token_encrypted: Mapped[str] = mapped_column(Text)  # encrypted JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_checkpoint: Mapped[str] = mapped_column(Text, default="")  # provider-specific cursor
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    subject: Mapped[str] = mapped_column(Text, default="")
    sender: Mapped[str] = mapped_column(Text, default="")
    recipients: Mapped[str] = mapped_column(Text, default="")
    body_preview: Mapped[str] = mapped_column(Text, default="")
    raw_source: Mapped[str] = mapped_column(Text, default="")  # optional raw
    provider: Mapped[str] = mapped_column(String(32), default="manual")
    provider_message_id: Mapped[str] = mapped_column(Text, default="")

    risk_score: Mapped[float] = mapped_column(Float)
    verdict: Mapped[str] = mapped_column(String(16))  # benign | malicious
    attack_type: Mapped[str] = mapped_column(String(64), default="unknown")

    evidence_json: Mapped[dict] = mapped_column(JSON, default={})
    quarantined: Mapped[bool] = mapped_column(Boolean, default=False)


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scan_id: Mapped[int] = mapped_column(Integer)
    correct_label: Mapped[int] = mapped_column(Integer)  # 0 benign, 1 malicious
    notes: Mapped[str] = mapped_column(Text, default="")
    # store minimal training text
    training_text: Mapped[str] = mapped_column(Text, default="")


engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
