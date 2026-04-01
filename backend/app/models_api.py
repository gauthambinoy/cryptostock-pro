"""
API Key and Usage models for Developer API
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class PricingTier(str, enum.Enum):
    """API pricing tiers"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class APIKey(Base):
    """API Key for Developer API access"""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # User-friendly name
    api_key = Column(String(255), unique=True, nullable=False, index=True)  # Public key
    api_secret = Column(String(255), nullable=False)  # Secret key (hashed)
    pricing_tier = Column(Enum(PricingTier), default=PricingTier.FREE)
    rate_limit_per_minute = Column(Integer, default=100)  # Rate limit: calls per minute
    is_active = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    last_used = Column(DateTime(timezone=True), nullable=True)
    webhook_url = Column(String(500), nullable=True)  # Webhook endpoint for alerts
    webhook_secret = Column(String(255), nullable=True)  # Secret for webhook signing

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    rotated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="api_keys")
    usage_records = relationship("APIUsage", back_populates="api_key", cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_user_api_key', 'user_id', 'is_active'),
        Index('ix_api_key', 'api_key'),
    )


class APIUsage(Base):
    """Track API usage for billing and rate limiting"""
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    calls_made = Column(Integer, default=0)
    overage_calls = Column(Integer, default=0)
    cost = Column(Float, default=0.0)  # Cost for overages only

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    api_key = relationship("APIKey", back_populates="usage_records")

    __table_args__ = (
        Index('ix_api_key_month', 'api_key_id', 'year', 'month'),
    )


class APILog(Base):
    """Log individual API requests for debugging and analytics"""
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)  # GET, POST, etc
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    error_message = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_api_key_date', 'api_key_id', 'created_at'),
    )
