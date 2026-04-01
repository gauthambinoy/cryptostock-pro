"""
SMS service for sending critical alerts via Twilio
SMS is limited to premium users and critical alerts only
"""
import logging
from typing import Optional
from twilio.rest import Client
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SMSService:
    """Service for sending SMS alerts via Twilio"""

    def __init__(self):
        """Initialize Twilio client"""
        self.account_sid = getattr(settings, 'twilio_account_sid', '')
        self.auth_token = getattr(settings, 'twilio_auth_token', '')
        self.from_phone = getattr(settings, 'twilio_phone_number', '')

        if self.account_sid and self.auth_token and self.from_phone:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
            logger.warning("Twilio credentials not configured. SMS service will not work.")

    def _is_enabled(self) -> bool:
        """Check if SMS service is properly configured"""
        return self.client is not None

    async def send_critical_sms(
        self,
        phone_number: str,
        symbol: str,
        message_type: str,
        details: str,
        is_premium_user: bool = False
    ) -> bool:
        """
        Send critical SMS alert (premium users only)

        Args:
            phone_number: Recipient phone number (E.164 format: +1234567890)
            symbol: Asset symbol
            message_type: Type of critical alert (price_crash, sentiment_spike, etc)
            details: Alert details
            is_premium_user: Only send if user is premium

        Returns:
            True if SMS sent successfully, False otherwise
        """
        if not is_premium_user:
            logger.warning(f"SMS not sent to {phone_number}: user is not premium")
            return False

        if not self._is_enabled():
            logger.warning(f"SMS service not configured, skipping critical alert to {phone_number}")
            return False

        try:
            # Build concise SMS message (Twilio charges per SMS, keep it short)
            if message_type == "price_crash":
                body = f"ASSETPULSE ALERT: {symbol} ⚠️ {details}. Reply STOP to opt-out."
            elif message_type == "price_surge":
                body = f"ASSETPULSE ALERT: {symbol} 📈 {details}. Reply STOP to opt-out."
            elif message_type == "sentiment_spike":
                body = f"ASSETPULSE ALERT: {symbol} 💭 {details}. Reply STOP to opt-out."
            elif message_type == "volume_surge":
                body = f"ASSETPULSE ALERT: {symbol} 📊 {details}. Reply STOP to opt-out."
            else:
                body = f"ASSETPULSE: {symbol} - {details}. Reply STOP to opt-out."

            # Ensure message doesn't exceed SMS limits (160 chars for single SMS, 1600 for concatenated)
            if len(body) > 1600:
                body = body[:1597] + "..."

            message = self.client.messages.create(
                body=body,
                from_=self.from_phone,
                to=phone_number
            )

            if message.sid:
                logger.info(f"Critical SMS sent to {phone_number} for {symbol} (SID: {message.sid})")
                return True
            else:
                logger.error(f"Failed to send SMS: no message SID returned")
                return False

        except Exception as e:
            logger.error(f"Error sending SMS to {phone_number}: {str(e)}")
            return False

    async def send_alert_sms(
        self,
        phone_number: str,
        symbol: str,
        current_price: float,
        target_price: float,
        trigger_type: str,
        is_premium_user: bool = False
    ) -> bool:
        """
        Send price alert SMS (premium users only)

        Args:
            phone_number: Recipient phone number (E.164 format)
            symbol: Asset symbol
            current_price: Current price
            target_price: Target price
            trigger_type: Alert trigger (above/below)
            is_premium_user: Only send if user is premium

        Returns:
            True if SMS sent successfully, False otherwise
        """
        if not is_premium_user:
            logger.debug(f"SMS not sent to {phone_number}: user is not premium")
            return False

        if not self._is_enabled():
            logger.warning(f"SMS service not configured, skipping price alert to {phone_number}")
            return False

        try:
            # Determine emoji based on trigger
            emoji = "📈" if trigger_type == "above" else "📉"

            body = f"ASSETPULSE: {symbol} {emoji} Price {trigger_type} ${target_price:.2f}. Current: ${current_price:.2f}"

            # Keep it under 160 characters for single SMS
            if len(body) > 160:
                body = f"{symbol} {emoji} {trigger_type} ${target_price:.0f} (${current_price:.0f})"

            message = self.client.messages.create(
                body=body,
                from_=self.from_phone,
                to=phone_number
            )

            if message.sid:
                logger.info(f"Price alert SMS sent to {phone_number} for {symbol}")
                return True
            else:
                logger.error(f"Failed to send price alert SMS: no message SID")
                return False

        except Exception as e:
            logger.error(f"Error sending price alert SMS: {str(e)}")
            return False

    async def send_portfolio_alert_sms(
        self,
        phone_number: str,
        message: str,
        is_premium_user: bool = False
    ) -> bool:
        """
        Send generic portfolio alert SMS

        Args:
            phone_number: Recipient phone number (E.164 format)
            message: Alert message
            is_premium_user: Only send if user is premium

        Returns:
            True if SMS sent successfully, False otherwise
        """
        if not is_premium_user:
            return False

        if not self._is_enabled():
            logger.warning(f"SMS service not configured, skipping portfolio alert to {phone_number}")
            return False

        try:
            # Truncate message to fit in SMS
            if len(message) > 160:
                message = message[:157] + "..."

            full_message = f"ASSETPULSE: {message} Reply STOP to opt-out."

            message_obj = self.client.messages.create(
                body=full_message,
                from_=self.from_phone,
                to=phone_number
            )

            if message_obj.sid:
                logger.info(f"Portfolio alert SMS sent to {phone_number}")
                return True
            else:
                return False

        except Exception as e:
            logger.error(f"Error sending portfolio alert SMS: {str(e)}")
            return False


# Singleton instance
_sms_service = None


def get_sms_service() -> SMSService:
    """Get or create SMS service instance"""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service
