from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, String, Text, SmallInteger, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class TechnicianSkill(Base):
    __tablename__ = "technician_skills"

    skill_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    technician_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    skill_level = Column(String(20), nullable=True, default="primary")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="skills")


class TechnicianBuildingAssignment(Base):
    __tablename__ = "technician_building_assignments"

    assignment_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    technician_user_id = Column(BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    building = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="building_assignments")


class TechnicianPerformanceLog(Base):
    __tablename__ = "technician_performance_logs"

    log_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(BigInteger, ForeignKey("tickets.ticket_id"), nullable=False)
    technician_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    resolution_time_minutes = Column(Numeric(10, 2), nullable=True)
    priority = Column(String(20), nullable=True)
    resolution_quality_score = Column(Numeric(5, 2), nullable=True)
    reopened = Column(Boolean, nullable=False, default=False)
    customer_rating = Column(SmallInteger, nullable=True)
    ai_performance_score = Column(Numeric(5, 2), nullable=True)
    ai_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket")
    technician = relationship("User", foreign_keys=[technician_user_id])

