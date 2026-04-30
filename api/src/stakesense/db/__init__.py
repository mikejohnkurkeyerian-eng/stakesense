from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from stakesense.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal: sessionmaker[Session] = sessionmaker(bind=engine, expire_on_commit=False)
