"""
Email service for sending alerts and digests
Uses SendGrid API for reliable email delivery
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """Service for sending emails via SendGrid"""

    def __init__(self):
        """Initialize SendGrid client"""
        self.sendgrid_api_key = getattr(settings, 'sendgrid_api_key', '')
        self.from_email = getattr(settings, 'sendgrid_from_email', 'noreply@assetpulse.ai')

        if self.sendgrid_api_key:
            self.sg = SendGridAPIClient(self.sendgrid_api_key)
        else:
            self.sg = None
            logger.warning("SendGrid API key not configured. Email service will not work.")

    def _is_enabled(self) -> bool:
        """Check if email service is properly configured"""
        return self.sg is not None

    async def send_alert_email(
        self,
        to_email: str,
        alert_type: str,
        symbol: str,
        asset_type: str,
        current_price: float,
        target_price: float,
        trigger_type: str
    ) -> bool:
        """
        Send a price alert email

        Args:
            to_email: Recipient email address
            alert_type: Type of alert (price_above, price_below, etc)
            symbol: Asset symbol
            asset_type: Asset type (stock, crypto)
            current_price: Current asset price
            target_price: Target price for alert
            trigger_type: The trigger description (above/below)

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self._is_enabled():
            logger.warning(f"Email service not configured, skipping alert email to {to_email}")
            return False

        try:
            asset_type_display = "Cryptocurrency" if asset_type == "crypto" else "Stock"

            subject = f"Price Alert: {symbol} ({asset_type_display})"

            html_content = self._build_alert_email_html(
                symbol=symbol,
                asset_type_display=asset_type_display,
                current_price=current_price,
                target_price=target_price,
                trigger_type=trigger_type
            )

            message = Mail(
                from_email=self.from_email,
                to_emails=To(to_email),
                subject=subject,
                html_content=HtmlContent(html_content)
            )

            response = self.sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Alert email sent to {to_email} for {symbol}")
                return True
            else:
                logger.error(f"Failed to send alert email: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending alert email: {str(e)}")
            return False

    async def send_daily_digest(
        self,
        to_email: str,
        user_name: str,
        opportunities: List[Dict],
        market_summary: Optional[Dict] = None
    ) -> bool:
        """
        Send daily digest with top 5 opportunities

        Args:
            to_email: Recipient email address
            user_name: User's name
            opportunities: List of top opportunities (max 5)
            market_summary: Optional market summary data

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self._is_enabled():
            logger.warning(f"Email service not configured, skipping digest to {to_email}")
            return False

        try:
            subject = f"Daily Market Digest - {datetime.now().strftime('%B %d, %Y')}"

            html_content = self._build_digest_email_html(
                user_name=user_name,
                opportunities=opportunities[:5],  # Limit to top 5
                market_summary=market_summary
            )

            message = Mail(
                from_email=self.from_email,
                to_emails=To(to_email),
                subject=subject,
                html_content=HtmlContent(html_content)
            )

            response = self.sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Daily digest sent to {to_email}")
                return True
            else:
                logger.error(f"Failed to send digest email: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending digest email: {str(e)}")
            return False

    async def send_price_alert(
        self,
        to_email: str,
        symbol: str,
        asset_type: str,
        price_change_percent: float,
        current_price: float,
        previous_price: float
    ) -> bool:
        """
        Send price movement alert for >5% moves

        Args:
            to_email: Recipient email address
            symbol: Asset symbol
            asset_type: Asset type (stock, crypto)
            price_change_percent: Percentage change
            current_price: Current price
            previous_price: Previous price

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self._is_enabled():
            logger.warning(f"Email service not configured, skipping price alert to {to_email}")
            return False

        try:
            asset_type_display = "Cryptocurrency" if asset_type == "crypto" else "Stock"
            direction = "UP" if price_change_percent > 0 else "DOWN"

            subject = f"Price Alert: {symbol} {direction} {abs(price_change_percent):.2f}%"

            html_content = self._build_price_move_email_html(
                symbol=symbol,
                asset_type_display=asset_type_display,
                price_change_percent=price_change_percent,
                current_price=current_price,
                previous_price=previous_price,
                direction=direction
            )

            message = Mail(
                from_email=self.from_email,
                to_emails=To(to_email),
                subject=subject,
                html_content=HtmlContent(html_content)
            )

            response = self.sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Price alert sent to {to_email} for {symbol}")
                return True
            else:
                logger.error(f"Failed to send price alert: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending price alert: {str(e)}")
            return False

    async def send_sentiment_spike_alert(
        self,
        to_email: str,
        symbol: str,
        asset_type: str,
        sentiment_score: float,
        sentiment_change: float,
        news_count: int
    ) -> bool:
        """
        Send sentiment spike alert

        Args:
            to_email: Recipient email address
            symbol: Asset symbol
            asset_type: Asset type (stock, crypto)
            sentiment_score: Current sentiment score (-1 to 1)
            sentiment_change: Change in sentiment score
            news_count: Number of recent news articles

        Returns:
            True if email sent successfully, False otherwise
        """
        if not self._is_enabled():
            logger.warning(f"Email service not configured, skipping sentiment alert to {to_email}")
            return False

        try:
            asset_type_display = "Cryptocurrency" if asset_type == "crypto" else "Stock"
            sentiment_label = "Positive" if sentiment_score > 0 else "Negative"

            subject = f"Sentiment Alert: {symbol} - {sentiment_label} Sentiment Spike!"

            html_content = self._build_sentiment_email_html(
                symbol=symbol,
                asset_type_display=asset_type_display,
                sentiment_score=sentiment_score,
                sentiment_change=sentiment_change,
                news_count=news_count,
                sentiment_label=sentiment_label
            )

            message = Mail(
                from_email=self.from_email,
                to_emails=To(to_email),
                subject=subject,
                html_content=HtmlContent(html_content)
            )

            response = self.sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Sentiment alert sent to {to_email} for {symbol}")
                return True
            else:
                logger.error(f"Failed to send sentiment alert: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending sentiment alert: {str(e)}")
            return False

    def _build_alert_email_html(
        self,
        symbol: str,
        asset_type_display: str,
        current_price: float,
        target_price: float,
        trigger_type: str
    ) -> str:
        """Build HTML for price alert email"""
        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f1419; color: #e0e0e0;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Price Alert Triggered</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your {asset_type_display} Alert</p>
                    </div>

                    <!-- Content -->
                    <div style="background: #1a1f26; padding: 20px; border-radius: 8px; border: 1px solid #2a3040;">
                        <h2 style="color: #667eea; margin-top: 0;">Alert Details</h2>

                        <div style="margin: 20px 0;">
                            <p style="margin: 8px 0;"><strong>Asset:</strong> {symbol}</p>
                            <p style="margin: 8px 0;"><strong>Type:</strong> {asset_type_display}</p>
                            <p style="margin: 8px 0;"><strong>Current Price:</strong> <span style="color: #4ade80; font-weight: bold;">${current_price:,.2f}</span></p>
                            <p style="margin: 8px 0;"><strong>Target Price:</strong> ${target_price:,.2f}</p>
                            <p style="margin: 8px 0;"><strong>Condition:</strong> Price {trigger_type}</p>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://assetpulse.ai/alerts" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Alerts</a>
                        </div>

                        <p style="color: #a0a0a0; font-size: 12px; margin-top: 20px;">
                            This alert was triggered at {datetime.now().strftime('%H:%M UTC')} on {datetime.now().strftime('%B %d, %Y')}
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>AssetPulse - AI-Powered Investment Intelligence</p>
                        <p style="margin: 8px 0 0 0;">© 2024 AssetPulse. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """

    def _build_digest_email_html(
        self,
        user_name: str,
        opportunities: List[Dict],
        market_summary: Optional[Dict]
    ) -> str:
        """Build HTML for daily digest email"""

        # Build opportunities table
        opportunities_html = ""
        for i, opp in enumerate(opportunities, 1):
            color = "#4ade80" if opp.get('change_percent', 0) > 0 else "#ef4444"
            change_symbol = "📈" if opp.get('change_percent', 0) > 0 else "📉"

            opportunities_html += f"""
            <tr style="border-bottom: 1px solid #2a3040;">
                <td style="padding: 12px; text-align: center;"><strong>{i}</strong></td>
                <td style="padding: 12px;"><strong>{opp.get('symbol', 'N/A')}</strong></td>
                <td style="padding: 12px;">${opp.get('price', 0):,.2f}</td>
                <td style="padding: 12px; color: {color};"><strong>{change_symbol} {opp.get('change_percent', 0):+.2f}%</strong></td>
                <td style="padding: 12px;">{opp.get('reason', 'Strong momentum')}</td>
            </tr>
            """

        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f1419; color: #e0e0e0;">
                <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">📊 Daily Market Digest</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">{datetime.now().strftime('%B %d, %Y')}</p>
                    </div>

                    <!-- Greeting -->
                    <div style="background: #1a1f26; padding: 20px; border-radius: 8px; border: 1px solid #2a3040; margin-bottom: 20px;">
                        <h2 style="color: #667eea; margin-top: 0;">Hello {user_name}! 👋</h2>
                        <p>Here are today's top 5 investment opportunities based on market analysis and sentiment.</p>
                    </div>

                    <!-- Opportunities Table -->
                    <div style="background: #1a1f26; padding: 0; border-radius: 8px; border: 1px solid #2a3040; margin-bottom: 20px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #2a3040;">
                                    <th style="padding: 12px; text-align: center; color: #667eea;">#</th>
                                    <th style="padding: 12px; color: #667eea;">Symbol</th>
                                    <th style="padding: 12px; color: #667eea;">Price</th>
                                    <th style="padding: 12px; color: #667eea;">Change</th>
                                    <th style="padding: 12px; color: #667eea;">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {opportunities_html}
                            </tbody>
                        </table>
                    </div>

                    <!-- Market Summary (if provided) -->
                    {f'''
                    <div style="background: #1a1f26; padding: 20px; border-radius: 8px; border: 1px solid #2a3040; margin-bottom: 20px;">
                        <h3 style="color: #667eea; margin-top: 0;">Market Summary</h3>
                        <p style="margin: 8px 0;"><strong>S&P 500:</strong> {market_summary.get('sp500', 'N/A')}</p>
                        <p style="margin: 8px 0;"><strong>Bitcoin:</strong> {market_summary.get('btc', 'N/A')}</p>
                        <p style="margin: 8px 0;"><strong>Ethereum:</strong> {market_summary.get('eth', 'N/A')}</p>
                    </div>
                    ''' if market_summary else ''}

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://assetpulse.ai/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Full Analysis</a>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>AssetPulse - AI-Powered Investment Intelligence</p>
                        <p style="margin: 8px 0 0 0;">© 2024 AssetPulse. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """

    def _build_price_move_email_html(
        self,
        symbol: str,
        asset_type_display: str,
        price_change_percent: float,
        current_price: float,
        previous_price: float,
        direction: str
    ) -> str:
        """Build HTML for price movement alert email"""
        color = "#4ade80" if direction == "UP" else "#ef4444"

        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f1419; color: #e0e0e0;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, {color} 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">📊 Significant Price Move</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">{symbol} - {direction} {abs(price_change_percent):.2f}%</p>
                    </div>

                    <!-- Content -->
                    <div style="background: #1a1f26; padding: 20px; border-radius: 8px; border: 1px solid #2a3040;">
                        <h2 style="color: {color}; margin-top: 0;">Price Movement Alert</h2>

                        <div style="margin: 20px 0;">
                            <p style="margin: 8px 0;"><strong>Asset:</strong> {symbol}</p>
                            <p style="margin: 8px 0;"><strong>Type:</strong> {asset_type_display}</p>
                            <p style="margin: 8px 0;"><strong>Previous Price:</strong> ${previous_price:,.2f}</p>
                            <p style="margin: 8px 0;"><strong>Current Price:</strong> <span style="color: {color}; font-weight: bold;">${current_price:,.2f}</span></p>
                            <p style="margin: 8px 0;"><strong>Change:</strong> <span style="color: {color}; font-weight: bold;">{direction} {abs(price_change_percent):.2f}%</span></p>
                        </div>

                        <p style="color: #a0a0a0; font-size: 14px; margin: 20px 0;">
                            {symbol} has experienced a significant price movement of <strong>{abs(price_change_percent):.2f}%</strong> in the last 24 hours.
                            This represents a notable market event. Check the analysis dashboard for more insights.
                        </p>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://assetpulse.ai/dashboard?symbol={symbol}" style="background: linear-gradient(135deg, {color} 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Analyze Now</a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>AssetPulse - AI-Powered Investment Intelligence</p>
                        <p style="margin: 8px 0 0 0;">© 2024 AssetPulse. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """

    def _build_sentiment_email_html(
        self,
        symbol: str,
        asset_type_display: str,
        sentiment_score: float,
        sentiment_change: float,
        news_count: int,
        sentiment_label: str
    ) -> str:
        """Build HTML for sentiment spike alert email"""
        color = "#4ade80" if sentiment_score > 0 else "#ef4444"

        return f"""
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f1419; color: #e0e0e0;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, {color} 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">💭 Sentiment Spike Detected</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">{symbol} - {sentiment_label}</p>
                    </div>

                    <!-- Content -->
                    <div style="background: #1a1f26; padding: 20px; border-radius: 8px; border: 1px solid #2a3040;">
                        <h2 style="color: {color}; margin-top: 0;">Sentiment Analysis Alert</h2>

                        <div style="margin: 20px 0;">
                            <p style="margin: 8px 0;"><strong>Asset:</strong> {symbol}</p>
                            <p style="margin: 8px 0;"><strong>Type:</strong> {asset_type_display}</p>
                            <p style="margin: 8px 0;"><strong>Sentiment Score:</strong> <span style="color: {color}; font-weight: bold;">{sentiment_score:+.2f}</span></p>
                            <p style="margin: 8px 0;"><strong>Recent Change:</strong> <span style="color: {color}; font-weight: bold;">{sentiment_change:+.2f}</span></p>
                            <p style="margin: 8px 0;"><strong>News Articles Analyzed:</strong> {news_count}</p>
                        </div>

                        <p style="color: #a0a0a0; font-size: 14px; margin: 20px 0;">
                            A significant sentiment spike has been detected for {symbol}. The market sentiment has shifted {sentiment_label.lower()}.
                            This may indicate a potential trading opportunity or risk. Review the sentiment analysis for more details.
                        </p>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://assetpulse.ai/sentiment?symbol={symbol}" style="background: linear-gradient(135deg, {color} 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Sentiment</a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>AssetPulse - AI-Powered Investment Intelligence</p>
                        <p style="margin: 8px 0 0 0;">© 2024 AssetPulse. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """


# Singleton instance
_email_service = None


def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
