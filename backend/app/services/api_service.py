"""
Developer API Service - API key management, rate limiting, and usage tracking
"""
import secrets
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from ..config import get_settings
import httpx
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


class APIKeyManager:
    """Manage API keys and secrets"""

    @staticmethod
    def generate_api_key() -> str:
        """Generate a unique API key"""
        return f"ak_{secrets.token_urlsafe(32)}"

    @staticmethod
    def generate_api_secret() -> str:
        """Generate API secret"""
        return secrets.token_urlsafe(64)

    @staticmethod
    def hash_secret(secret: str) -> str:
        """Hash API secret for storage"""
        return hashlib.sha256(secret.encode()).hexdigest()

    @staticmethod
    def verify_secret(plain_secret: str, hashed_secret: str) -> bool:
        """Verify API secret against hash"""
        return hashlib.sha256(plain_secret.encode()).hexdigest() == hashed_secret

    @staticmethod
    def create_api_key(
        db: Session,
        user_id: int,
        name: str,
        pricing_tier: models.PricingTier = models.PricingTier.FREE
    ) -> Tuple[str, str, models.APIKey]:
        """
        Create a new API key for a user.
        Returns (api_key, api_secret, db_model)
        """
        api_key = APIKeyManager.generate_api_key()
        api_secret = APIKeyManager.generate_api_secret()
        hashed_secret = APIKeyManager.hash_secret(api_secret)

        # Set rate limits based on tier
        rate_limits = {
            models.PricingTier.FREE: 0,  # No API access for free tier
            models.PricingTier.PRO: 100,
            models.PricingTier.ENTERPRISE: 1000,
        }

        db_key = models.APIKey(
            user_id=user_id,
            name=name,
            api_key=api_key,
            api_secret=hashed_secret,
            pricing_tier=pricing_tier,
            rate_limit_per_minute=rate_limits[pricing_tier],
        )

        db.add(db_key)
        db.commit()
        db.refresh(db_key)

        return api_key, api_secret, db_key

    @staticmethod
    def verify_api_key(db: Session, api_key: str, api_secret: str) -> Optional[models.APIKey]:
        """Verify API key and secret combination"""
        db_key = db.query(models.APIKey).filter(
            models.APIKey.api_key == api_key,
            models.APIKey.is_active == True,
            models.APIKey.is_revoked == False
        ).first()

        if not db_key:
            return None

        # Verify secret
        if not APIKeyManager.verify_secret(api_secret, db_key.api_secret):
            return None

        # Check if FREE tier (no API access)
        if db_key.pricing_tier == models.PricingTier.FREE:
            return None

        return db_key

    @staticmethod
    def revoke_api_key(db: Session, api_key_id: int, user_id: int) -> bool:
        """Revoke an API key"""
        db_key = db.query(models.APIKey).filter(
            models.APIKey.id == api_key_id,
            models.APIKey.user_id == user_id
        ).first()

        if not db_key:
            return False

        db_key.is_revoked = True
        db_key.is_active = False
        db.commit()
        return True

    @staticmethod
    def rotate_api_key(db: Session, api_key_id: int, user_id: int) -> Tuple[str, str]:
        """Rotate an API key, returning new (key, secret)"""
        db_key = db.query(models.APIKey).filter(
            models.APIKey.id == api_key_id,
            models.APIKey.user_id == user_id
        ).first()

        if not db_key:
            return None, None

        # Generate new credentials
        new_key = APIKeyManager.generate_api_key()
        new_secret = APIKeyManager.generate_api_secret()
        new_hashed = APIKeyManager.hash_secret(new_secret)

        db_key.api_key = new_key
        db_key.api_secret = new_hashed
        db_key.rotated_at = datetime.utcnow()
        db.commit()

        return new_key, new_secret

    @staticmethod
    def list_api_keys(db: Session, user_id: int) -> List[models.APIKey]:
        """List all API keys for a user"""
        return db.query(models.APIKey).filter(
            models.APIKey.user_id == user_id
        ).all()


class RateLimiter:
    """Rate limiting for API requests"""

    @staticmethod
    def get_current_minute_calls(db: Session, api_key_id: int) -> int:
        """Get number of API calls in current minute"""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)

        count = db.query(func.count(models.APILog.id)).filter(
            models.APILog.api_key_id == api_key_id,
            models.APILog.created_at >= minute_ago
        ).scalar()

        return count or 0

    @staticmethod
    def check_rate_limit(db: Session, api_key: models.APIKey) -> Tuple[bool, int]:
        """
        Check if API key has exceeded rate limit.
        Returns (is_allowed, remaining_calls)
        """
        current_calls = RateLimiter.get_current_minute_calls(db, api_key.id)
        remaining = max(0, api_key.rate_limit_per_minute - current_calls)

        is_allowed = current_calls < api_key.rate_limit_per_minute
        return is_allowed, remaining


class UsageTracker:
    """Track API usage for billing"""

    @staticmethod
    def get_or_create_usage(db: Session, api_key_id: int, year: int, month: int) -> models.APIUsage:
        """Get or create usage record for month"""
        usage = db.query(models.APIUsage).filter(
            models.APIUsage.api_key_id == api_key_id,
            models.APIUsage.year == year,
            models.APIUsage.month == month
        ).first()

        if not usage:
            usage = models.APIUsage(
                api_key_id=api_key_id,
                year=year,
                month=month
            )
            db.add(usage)
            db.commit()
            db.refresh(usage)

        return usage

    @staticmethod
    def record_usage(
        db: Session,
        api_key_id: int,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        error_message: Optional[str] = None
    ) -> models.APILog:
        """Record API request for logging and tracking"""
        now = datetime.utcnow()

        # Create log entry
        log = models.APILog(
            api_key_id=api_key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            error_message=error_message
        )
        db.add(log)

        # Update usage counters
        usage = UsageTracker.get_or_create_usage(db, api_key_id, now.year, now.month)
        usage.calls_made += 1

        # Calculate overage and cost
        api_key = db.query(models.APIKey).filter(models.APIKey.id == api_key_id).first()
        if api_key:
            # Update last_used timestamp
            api_key.last_used = now

            # Check if over limit for the month
            if usage.calls_made > get_monthly_limit(api_key):
                overage = usage.calls_made - get_monthly_limit(api_key)
                usage.overage_calls = overage

                # Calculate cost
                cost_per_call = get_overage_cost(api_key)
                usage.cost = overage * cost_per_call

        db.commit()
        db.refresh(log)

        return log

    @staticmethod
    def get_usage_stats(db: Session, user_id: int, months: int = 3) -> Dict:
        """Get usage statistics for user"""
        api_keys = db.query(models.APIKey).filter(
            models.APIKey.user_id == user_id
        ).all()

        if not api_keys:
            return {
                "total_calls": 0,
                "total_cost": 0,
                "api_keys": []
            }

        now = datetime.utcnow()
        stats = {
            "total_calls": 0,
            "total_cost": 0.0,
            "monthly_breakdown": [],
            "api_keys": []
        }

        for api_key in api_keys:
            key_stats = {
                "id": api_key.id,
                "name": api_key.name,
                "tier": api_key.pricing_tier,
                "rate_limit": api_key.rate_limit_per_minute,
                "last_used": api_key.last_used,
                "monthly": []
            }

            # Get usage for last N months
            for i in range(months):
                check_date = now - timedelta(days=30*i)
                usage = UsageTracker.get_or_create_usage(
                    db,
                    api_key.id,
                    check_date.year,
                    check_date.month
                )
                key_stats["monthly"].append({
                    "year": usage.year,
                    "month": usage.month,
                    "calls": usage.calls_made,
                    "overage": usage.overage_calls,
                    "cost": usage.cost
                })
                stats["total_calls"] += usage.calls_made
                stats["total_cost"] += usage.cost

            stats["api_keys"].append(key_stats)

        return stats


class WebhookManager:
    """Manage webhook delivery for alerts"""

    @staticmethod
    async def send_webhook(
        api_key: models.APIKey,
        event_type: str,
        payload: Dict
    ) -> bool:
        """Send webhook to configured endpoint"""
        if not api_key.webhook_url:
            return False

        try:
            # Create signed payload
            payload_json = json.dumps(payload)
            signature = hmac.new(
                api_key.webhook_secret.encode() if api_key.webhook_secret else b"",
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()

            headers = {
                "Content-Type": "application/json",
                "X-AssetPulse-Signature": signature,
                "X-AssetPulse-Event": event_type
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    api_key.webhook_url,
                    content=payload_json,
                    headers=headers
                )

                return response.status_code in [200, 201, 204]
        except Exception as e:
            logger.error(f"Webhook delivery failed: {e}")
            return False

    @staticmethod
    def update_webhook(
        db: Session,
        api_key_id: int,
        user_id: int,
        webhook_url: str,
        webhook_secret: Optional[str] = None
    ) -> bool:
        """Update webhook configuration"""
        api_key = db.query(models.APIKey).filter(
            models.APIKey.id == api_key_id,
            models.APIKey.user_id == user_id
        ).first()

        if not api_key:
            return False

        api_key.webhook_url = webhook_url
        if webhook_secret:
            api_key.webhook_secret = APIKeyManager.hash_secret(webhook_secret)
        db.commit()
        return True


def get_monthly_limit(api_key: models.APIKey) -> int:
    """Get monthly call limit based on pricing tier"""
    limits = {
        models.PricingTier.FREE: 0,
        models.PricingTier.PRO: 100 * 60 * 24 * 30,  # ~4.3M calls/month
        models.PricingTier.ENTERPRISE: 1000 * 60 * 24 * 30,  # ~43M calls/month
    }
    return limits.get(api_key.pricing_tier, 0)


def get_overage_cost(api_key: models.APIKey) -> float:
    """Get cost per overage call based on tier"""
    costs = {
        models.PricingTier.FREE: 0.0,
        models.PricingTier.PRO: 0.01,  # $0.01 per call
        models.PricingTier.ENTERPRISE: 0.001,  # $0.001 per call
    }
    return costs.get(api_key.pricing_tier, 0.0)
