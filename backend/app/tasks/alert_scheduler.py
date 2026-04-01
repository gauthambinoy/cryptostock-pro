"""
APScheduler-based alert scheduler for:
- Daily digest distribution (8 AM user timezone)
- Real-time price alert monitoring
- Sentiment spike detection
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from ..database import SessionLocal
from .. import models
from ..services.email_service import get_email_service
from ..services.sms_service import get_sms_service
from ..services.market_data import get_market_service
import pytz
import asyncio

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[BackgroundScheduler] = None


class AlertScheduler:
    """Manages alert scheduling and execution"""

    def __init__(self):
        """Initialize the scheduler"""
        self.scheduler = BackgroundScheduler()
        self.email_service = get_email_service()
        self.sms_service = get_sms_service()
        self.market_service = get_market_service()

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            # Daily digest at 8 AM UTC (can be customized per user timezone)
            self.scheduler.add_job(
                self._daily_digest_job,
                CronTrigger(hour=8, minute=0),
                id="daily_digest",
                name="Send daily market digest",
                replace_existing=True
            )

            # Check alerts every 5 minutes
            self.scheduler.add_job(
                self._check_price_alerts_job,
                'interval',
                minutes=5,
                id="check_alerts",
                name="Check price alerts",
                replace_existing=True
            )

            # Sentiment monitoring every 10 minutes
            self.scheduler.add_job(
                self._sentiment_spike_job,
                'interval',
                minutes=10,
                id="sentiment_spikes",
                name="Detect sentiment spikes",
                replace_existing=True
            )

            self.scheduler.start()
            logger.info("Alert scheduler started successfully")

    def stop(self):
        """Stop the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Alert scheduler stopped")

    async def _daily_digest_job(self):
        """Send daily digest to all users who enabled it"""
        try:
            db = SessionLocal()
            users = db.query(models.User).filter(models.User.is_active == True).all()

            for user in users:
                # Check if user has any daily digest alerts
                digest_alerts = db.query(models.Alert).filter(
                    models.Alert.user_id == user.id,
                    models.Alert.frequency == "daily",
                    models.Alert.is_active == True
                ).all()

                if digest_alerts:
                    logger.info(f"Sending daily digest to {user.email}")

                    # Prepare opportunities data
                    opportunities = self._get_top_opportunities(db)

                    await self.email_service.send_daily_digest(
                        to_email=user.email,
                        user_name=user.full_name or user.username,
                        opportunities=opportunities
                    )

            db.close()
        except Exception as e:
            logger.error(f"Error in daily digest job: {str(e)}")

    async def _check_price_alerts_job(self):
        """Check all active price alerts and trigger notifications"""
        try:
            db = SessionLocal()

            # Get all active alerts that haven't been triggered
            alerts = db.query(models.Alert).filter(
                models.Alert.is_active == True,
                models.Alert.is_triggered == False
            ).all()

            for alert in alerts:
                try:
                    # Skip alerts with frequency=never
                    if alert.frequency == "never":
                        continue

                    # Get current price
                    if alert.asset_type == models.AssetType.CRYPTO:
                        quote = asyncio.run(self.market_service.get_crypto_quote(alert.symbol))
                    else:
                        quote = self.market_service.get_stock_quote(alert.symbol)

                    if not quote:
                        continue

                    current_price = quote.price
                    should_trigger = False
                    trigger_type = None

                    # Check trigger condition
                    if alert.alert_type == models.AlertType.PRICE_ABOVE:
                        should_trigger = current_price >= alert.target_value
                        trigger_type = "above"
                    elif alert.alert_type == models.AlertType.PRICE_BELOW:
                        should_trigger = current_price <= alert.target_value
                        trigger_type = "below"

                    if should_trigger:
                        # Mark as triggered
                        alert.is_triggered = True
                        alert.triggered_at = datetime.utcnow()
                        db.commit()

                        # Send notifications based on frequency
                        if alert.frequency != "never":
                            await self._send_alert_notifications(alert, current_price, trigger_type)

                except Exception as e:
                    logger.error(f"Error checking alert {alert.id}: {str(e)}")

            db.close()
        except Exception as e:
            logger.error(f"Error in check alerts job: {str(e)}")

    async def _sentiment_spike_job(self):
        """Detect and notify on sentiment spikes"""
        try:
            db = SessionLocal()

            # In production, this would check sentiment from news/social media
            # For now, we'll log that the job ran
            logger.debug("Sentiment spike detection job executed")

            db.close()
        except Exception as e:
            logger.error(f"Error in sentiment spike job: {str(e)}")

    async def _send_alert_notifications(self, alert: models.Alert, current_price: float, trigger_type: str):
        """Send alert notifications via configured channels"""
        user = alert.owner

        if not user:
            logger.warning(f"Alert {alert.id} has no associated user")
            return

        try:
            # Send email if enabled
            if alert.notify_email:
                await self.email_service.send_alert_email(
                    to_email=user.email,
                    alert_type=alert.alert_type.value,
                    symbol=alert.symbol,
                    asset_type=alert.asset_type.value,
                    current_price=current_price,
                    target_price=alert.target_value,
                    trigger_type=trigger_type
                )

            # Send SMS if enabled and user is premium
            if alert.notify_sms and user.is_premium and user.phone_number:
                await self.sms_service.send_critical_sms(
                    phone_number=user.phone_number,
                    symbol=alert.symbol,
                    message_type="price_alert",
                    details=f"{trigger_type.upper()} ${alert.target_value:.2f}",
                    is_premium_user=True
                )

        except Exception as e:
            logger.error(f"Error sending notifications for alert {alert.id}: {str(e)}")

    @staticmethod
    def _get_top_opportunities(db: Session) -> list:
        """Get top 5 market opportunities for digest"""
        # In production, this would use the analysis engine
        # For now, return sample data
        return [
            {
                "symbol": "BTC",
                "price": 45000,
                "change_percent": 5.2,
                "reason": "Strong bullish sentiment"
            },
            {
                "symbol": "AAPL",
                "price": 185.50,
                "change_percent": 2.1,
                "reason": "Positive earnings outlook"
            },
            {
                "symbol": "ETH",
                "price": 2500,
                "change_percent": 3.8,
                "reason": "Network activity surge"
            },
            {
                "symbol": "MSFT",
                "price": 415.20,
                "change_percent": 1.5,
                "reason": "AI integration momentum"
            },
            {
                "symbol": "SOL",
                "price": 120.00,
                "change_percent": 4.2,
                "reason": "Developer activity up"
            }
        ]


def init_scheduler():
    """Initialize and start the scheduler"""
    global _scheduler
    if _scheduler is None:
        _scheduler = AlertScheduler()
        _scheduler.start()
    return _scheduler


def get_scheduler() -> AlertScheduler:
    """Get the global scheduler instance"""
    global _scheduler
    if _scheduler is None:
        init_scheduler()
    return _scheduler


def stop_scheduler():
    """Stop the global scheduler"""
    global _scheduler
    if _scheduler is not None:
        _scheduler.stop()
        _scheduler = None
