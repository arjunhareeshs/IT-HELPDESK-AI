from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, ForeignKey
from app.db.base import Base


class TicketSolution(Base):
    __tablename__ = "ticket_solutions"

    solution_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, nullable=True)
    problem_summary = Column(Text, nullable=False)
    resolution = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class TicketTrainingData(Base):
    __tablename__ = "ticket_training_data"

    source_row_id = Column(Integer, primary_key=True)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    language = Column(String(10), nullable=False, default="en")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

