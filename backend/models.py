from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from backend.database import Base

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=True)
    scan_type = Column(String)  # "file" or "live"
    verdict = Column(String)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ConsentLog(Base):
    __tablename__ = "consent_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    consent_given = Column(Integer)  # 1 for true, 0 for false
    timestamp = Column(DateTime, default=datetime.utcnow)
