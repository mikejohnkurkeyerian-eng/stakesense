from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Validator(Base):
    __tablename__ = "validators"

    vote_pubkey: Mapped[str] = mapped_column(String, primary_key=True)
    identity_pubkey: Mapped[str | None] = mapped_column(String)
    name: Mapped[str | None] = mapped_column(String)
    commission_pct: Mapped[int | None] = mapped_column(Integer)
    active_stake: Mapped[int | None] = mapped_column(BigInteger)
    data_center: Mapped[str | None] = mapped_column(String)
    asn: Mapped[str | None] = mapped_column(String)
    country: Mapped[str | None] = mapped_column(String)
    jito_client: Mapped[bool | None] = mapped_column(Boolean)
    first_seen_epoch: Mapped[int | None] = mapped_column(Integer)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
