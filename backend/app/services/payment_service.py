"""
Payment and subscription management service using Stripe
"""
import stripe
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..config import get_settings
from .. import models, schemas
import logging

logger = logging.getLogger(__name__)

settings = get_settings()


class PaymentService:
    """Service for managing payments and subscriptions through Stripe"""

    # Pricing configuration
    PRICING_TIERS = {
        models.PlanTier.FREE: {
            "monthly_price_cents": 0,
            "annual_price_cents": 0,
            "watchlists": 5,
            "alerts_per_day": 10,
            "prediction_days": 7,
            "sms_alerts": False,
            "backtesting": False,
            "api_access": False,
            "stripe_price_id_monthly": None,
            "stripe_price_id_annual": None,
        },
        models.PlanTier.PRO: {
            "monthly_price_cents": 999,  # $9.99/month
            "annual_price_cents": 9599,  # $95.99/year (20% discount)
            "watchlists": None,  # Unlimited
            "alerts_per_day": 100,
            "prediction_days": 30,
            "sms_alerts": True,
            "backtesting": True,
            "api_access": False,
            "stripe_price_id_monthly": settings.stripe_pro_monthly_price_id,
            "stripe_price_id_annual": settings.stripe_pro_annual_price_id,
        },
        models.PlanTier.ENTERPRISE: {
            "monthly_price_cents": 9999,  # $99.99/month
            "annual_price_cents": 95999,  # $959.99/year (20% discount)
            "watchlists": None,  # Unlimited
            "alerts_per_day": None,  # Unlimited
            "prediction_days": 30,
            "sms_alerts": True,
            "backtesting": True,
            "api_access": True,
            "stripe_price_id_monthly": settings.stripe_enterprise_monthly_price_id,
            "stripe_price_id_annual": settings.stripe_enterprise_annual_price_id,
        },
    }

    def __init__(self):
        """Initialize Stripe with API key"""
        stripe.api_key = settings.stripe_secret_key
        self.webhook_secret = settings.stripe_webhook_secret

    def create_customer(self, db: Session, user: models.User) -> str:
        """Create a Stripe customer for a user"""
        try:
            if user.subscription and user.subscription.stripe_customer_id:
                return user.subscription.stripe_customer_id

            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name or user.username,
                metadata={
                    "user_id": user.id,
                    "username": user.username,
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(f"Error creating Stripe customer: {e}")
            raise

    def create_subscription(
        self,
        db: Session,
        user: models.User,
        plan: models.PlanTier,
        is_annual: bool = False,
        payment_method_id: str = None,
    ) -> Dict[str, Any]:
        """Create a new subscription for a user"""
        try:
            # Validate plan
            if plan not in self.PRICING_TIERS:
                raise ValueError(f"Invalid plan tier: {plan}")

            # Free plan doesn't require Stripe
            if plan == models.PlanTier.FREE:
                sub = models.Subscription(
                    user_id=user.id,
                    plan=models.PlanTier.FREE,
                    status=models.SubscriptionStatus.ACTIVE,
                    current_period_start=datetime.utcnow(),
                    current_period_end=datetime.utcnow() + timedelta(days=30),
                )
                db.add(sub)
                db.commit()
                db.refresh(sub)
                return {
                    "subscription_id": sub.id,
                    "plan": plan.value,
                    "status": models.SubscriptionStatus.ACTIVE.value,
                    "message": "Free plan activated successfully"
                }

            # Create Stripe customer if needed
            customer_id = self.create_customer(db, user)

            # Get pricing
            pricing = self.PRICING_TIERS[plan]
            price_id = pricing["stripe_price_id_annual"] if is_annual else pricing["stripe_price_id_monthly"]

            if not price_id:
                raise ValueError(f"Price ID not configured for {plan} plan")

            # Create subscription in Stripe
            stripe_sub = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                payment_behavior="default_incomplete",
                payment_settings={
                    "payment_method_types": ["card"],
                    "save_default_payment_method": "on_subscription"
                },
                metadata={
                    "user_id": user.id,
                    "plan": plan.value,
                }
            )

            # Create subscription record in database
            sub = models.Subscription(
                user_id=user.id,
                plan=plan,
                status=models.SubscriptionStatus.ACTIVE,
                stripe_customer_id=customer_id,
                stripe_subscription_id=stripe_sub.id,
                stripe_price_id=price_id,
                current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start),
                current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end),
                is_annual=is_annual,
                amount_cents=pricing["annual_price_cents"] if is_annual else pricing["monthly_price_cents"],
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

            # Update user premium flag
            user.is_premium = True
            db.commit()

            # Initialize usage tracking
            self._initialize_usage_tracking(db, user)

            return {
                "subscription_id": sub.id,
                "stripe_subscription_id": stripe_sub.id,
                "plan": plan.value,
                "status": models.SubscriptionStatus.ACTIVE.value,
                "client_secret": stripe_sub.client_secret,
                "current_period_end": sub.current_period_end.isoformat(),
                "message": f"Subscription to {plan.value} plan initiated"
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error creating subscription: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in create_subscription: {e}")
            raise

    def update_subscription(
        self,
        db: Session,
        user: models.User,
        new_plan: models.PlanTier,
        is_annual: bool = False,
    ) -> Dict[str, Any]:
        """Update subscription to a different plan"""
        try:
            sub = db.query(models.Subscription).filter_by(user_id=user.id).first()
            if not sub:
                raise ValueError("No active subscription found")

            if sub.plan == models.PlanTier.FREE and new_plan == models.PlanTier.FREE:
                raise ValueError("Already on free plan")

            # If upgrading from free, create new subscription
            if sub.plan == models.PlanTier.FREE:
                self.cancel_subscription(db, user, "upgraded")
                return self.create_subscription(db, user, new_plan, is_annual)

            # If downgrading to free, cancel
            if new_plan == models.PlanTier.FREE:
                return self.cancel_subscription(db, user, "downgraded to free")

            # Update existing Stripe subscription
            pricing = self.PRICING_TIERS[new_plan]
            price_id = pricing["stripe_price_id_annual"] if is_annual else pricing["stripe_price_id_monthly"]

            if not price_id:
                raise ValueError(f"Price ID not configured for {new_plan} plan")

            # Get the subscription item
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
            subscription_item_id = stripe_sub.items.data[0].id

            # Update subscription
            updated_sub = stripe.Subscription.modify(
                sub.stripe_subscription_id,
                items=[{
                    "id": subscription_item_id,
                    "price": price_id,
                }],
                proration_behavior="create_prorations",
            )

            # Update database
            sub.plan = new_plan
            sub.stripe_price_id = price_id
            sub.is_annual = is_annual
            sub.amount_cents = pricing["annual_price_cents"] if is_annual else pricing["monthly_price_cents"]
            sub.current_period_start = datetime.fromtimestamp(updated_sub.current_period_start)
            sub.current_period_end = datetime.fromtimestamp(updated_sub.current_period_end)
            db.commit()
            db.refresh(sub)

            # Update usage limits
            self._update_usage_limits(db, user, new_plan)

            return {
                "subscription_id": sub.id,
                "plan": new_plan.value,
                "status": sub.status.value,
                "current_period_end": sub.current_period_end.isoformat(),
                "message": f"Plan upgraded to {new_plan.value}"
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error updating subscription: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in update_subscription: {e}")
            raise

    def cancel_subscription(
        self,
        db: Session,
        user: models.User,
        reason: str = "user_requested"
    ) -> Dict[str, Any]:
        """Cancel a subscription"""
        try:
            sub = db.query(models.Subscription).filter_by(user_id=user.id).first()
            if not sub:
                raise ValueError("No active subscription found")

            if sub.plan == models.PlanTier.FREE:
                raise ValueError("Cannot cancel free plan")

            # Cancel in Stripe
            stripe.Subscription.delete(sub.stripe_subscription_id)

            # Update database
            sub.status = models.SubscriptionStatus.CANCELED
            sub.plan = models.PlanTier.FREE
            sub.cancellation_reason = reason
            sub.canceled_at = datetime.utcnow()
            db.commit()
            db.refresh(sub)

            # Reset user premium flag
            user.is_premium = False
            db.commit()

            # Reset usage limits to free tier
            self._update_usage_limits(db, user, models.PlanTier.FREE)

            return {
                "subscription_id": sub.id,
                "status": models.SubscriptionStatus.CANCELED.value,
                "canceled_at": sub.canceled_at.isoformat(),
                "message": "Subscription canceled successfully"
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error canceling subscription: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in cancel_subscription: {e}")
            raise

    def handle_webhook_event(self, event: Dict[str, Any], db: Session) -> bool:
        """Handle Stripe webhook events"""
        try:
            event_type = event.get("type")
            data = event.get("data", {}).get("object", {})

            if event_type == "customer.subscription.updated":
                self._handle_subscription_updated(data, db)
            elif event_type == "customer.subscription.deleted":
                self._handle_subscription_deleted(data, db)
            elif event_type == "payment_intent.succeeded":
                self._handle_payment_succeeded(data, db)
            elif event_type == "payment_intent.payment_failed":
                self._handle_payment_failed(data, db)
            elif event_type == "invoice.payment_succeeded":
                self._handle_invoice_payment_succeeded(data, db)
            elif event_type == "invoice.payment_failed":
                self._handle_invoice_payment_failed(data, db)

            return True
        except Exception as e:
            logger.error(f"Error handling webhook event: {e}")
            return False

    def _handle_subscription_updated(self, data: Dict[str, Any], db: Session):
        """Handle subscription updated event"""
        sub = db.query(models.Subscription).filter_by(
            stripe_subscription_id=data.get("id")
        ).first()
        if sub:
            sub.current_period_start = datetime.fromtimestamp(data.get("current_period_start"))
            sub.current_period_end = datetime.fromtimestamp(data.get("current_period_end"))
            db.commit()
            logger.info(f"Updated subscription {data.get('id')}")

    def _handle_subscription_deleted(self, data: Dict[str, Any], db: Session):
        """Handle subscription deleted event"""
        sub = db.query(models.Subscription).filter_by(
            stripe_subscription_id=data.get("id")
        ).first()
        if sub:
            sub.status = models.SubscriptionStatus.CANCELED
            sub.plan = models.PlanTier.FREE
            sub.canceled_at = datetime.utcnow()
            user = sub.user
            user.is_premium = False
            self._update_usage_limits(db, user, models.PlanTier.FREE)
            db.commit()
            logger.info(f"Deleted subscription {data.get('id')}")

    def _handle_payment_succeeded(self, data: Dict[str, Any], db: Session):
        """Handle payment succeeded event"""
        customer_id = data.get("customer")
        if not customer_id:
            return

        user = db.query(models.User).filter(
            models.Subscription.stripe_customer_id == customer_id
        ).first()
        if user:
            # Record payment
            payment = models.Payment(
                user_id=user.id,
                stripe_payment_intent_id=data.get("id"),
                amount_cents=data.get("amount"),
                status=models.PaymentStatus.SUCCEEDED,
                payment_method=data.get("payment_method", "card"),
            )
            db.add(payment)
            db.commit()
            logger.info(f"Payment succeeded for user {user.id}")

    def _handle_payment_failed(self, data: Dict[str, Any], db: Session):
        """Handle payment failed event"""
        customer_id = data.get("customer")
        if not customer_id:
            return

        user = db.query(models.User).filter(
            models.Subscription.stripe_customer_id == customer_id
        ).first()
        if user:
            payment = models.Payment(
                user_id=user.id,
                stripe_payment_intent_id=data.get("id"),
                amount_cents=data.get("amount"),
                status=models.PaymentStatus.FAILED,
            )
            db.add(payment)
            db.commit()
            logger.error(f"Payment failed for user {user.id}")

    def _handle_invoice_payment_succeeded(self, data: Dict[str, Any], db: Session):
        """Handle invoice payment succeeded"""
        customer_id = data.get("customer")
        if not customer_id:
            return

        user = db.query(models.User).filter(
            models.Subscription.stripe_customer_id == customer_id
        ).first()
        if user:
            payment = models.Payment(
                user_id=user.id,
                stripe_invoice_id=data.get("id"),
                amount_cents=data.get("amount_paid"),
                status=models.PaymentStatus.SUCCEEDED,
                receipt_url=data.get("hosted_invoice_url"),
                invoice_number=data.get("number"),
            )
            db.add(payment)
            db.commit()

    def _handle_invoice_payment_failed(self, data: Dict[str, Any], db: Session):
        """Handle invoice payment failed"""
        customer_id = data.get("customer")
        if not customer_id:
            return

        user = db.query(models.User).filter(
            models.Subscription.stripe_customer_id == customer_id
        ).first()
        if user:
            sub = user.subscription
            if sub:
                sub.status = models.SubscriptionStatus.PAST_DUE
                db.commit()
            logger.error(f"Invoice payment failed for user {user.id}")

    def get_subscription(self, db: Session, user: models.User) -> Optional[models.Subscription]:
        """Get user's current subscription"""
        return db.query(models.Subscription).filter_by(user_id=user.id).first()

    def get_subscription_details(self, db: Session, user: models.User) -> Dict[str, Any]:
        """Get full subscription details with usage"""
        sub = self.get_subscription(db, user)
        if not sub:
            sub = models.Subscription(
                user_id=user.id,
                plan=models.PlanTier.FREE,
                status=models.SubscriptionStatus.ACTIVE,
            )

        usage = self.get_current_month_usage(db, user)
        pricing = self.PRICING_TIERS[sub.plan]

        return {
            "subscription": {
                "plan": sub.plan.value,
                "status": sub.status.value,
                "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "is_annual": sub.is_annual,
            },
            "limits": {
                "watchlists": pricing["watchlists"],
                "alerts_per_day": pricing["alerts_per_day"],
                "prediction_days": pricing["prediction_days"],
                "sms_alerts": pricing["sms_alerts"],
                "backtesting": pricing["backtesting"],
                "api_access": pricing["api_access"],
            },
            "usage": {
                "alerts_sent": usage.alerts_sent if usage else 0,
                "alerts_limit": usage.alerts_limit if usage else 0,
                "predictions_made": usage.predictions_made if usage else 0,
                "predictions_limit": usage.predictions_limit if usage else 0,
                "api_calls": usage.api_calls if usage else 0,
                "api_calls_limit": usage.api_calls_limit if usage else 0,
                "watchlists_created": usage.watchlists_created if usage else 0,
                "watchlists_limit": usage.watchlists_limit if usage else 0,
                "backtests_run": usage.backtests_run if usage else 0,
                "backtests_limit": usage.backtests_limit if usage else 0,
                "sms_sent": usage.sms_sent if usage else 0,
                "sms_limit": usage.sms_limit if usage else 0,
            }
        }

    def get_current_month_usage(self, db: Session, user: models.User) -> Optional[models.Usage]:
        """Get current month usage record"""
        now = datetime.utcnow()
        return db.query(models.Usage).filter_by(
            user_id=user.id,
            year=now.year,
            month=now.month,
        ).first()

    def record_usage(
        self,
        db: Session,
        user: models.User,
        metric: str,
        amount: int = 1
    ) -> bool:
        """Record usage for a metric"""
        try:
            usage = self.get_current_month_usage(db, user)
            if not usage:
                now = datetime.utcnow()
                usage = models.Usage(
                    user_id=user.id,
                    year=now.year,
                    month=now.month,
                )
                db.add(usage)
                db.commit()

            # Update the metric
            if metric == "alert":
                usage.alerts_sent += amount
            elif metric == "prediction":
                usage.predictions_made += amount
            elif metric == "api_call":
                usage.api_calls += amount
            elif metric == "watchlist":
                usage.watchlists_created += amount
            elif metric == "backtest":
                usage.backtests_run += amount
            elif metric == "sms":
                usage.sms_sent += amount

            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error recording usage: {e}")
            return False

    def _initialize_usage_tracking(self, db: Session, user: models.User):
        """Initialize usage tracking for a new month"""
        now = datetime.utcnow()
        plan = user.subscription.plan if user.subscription else models.PlanTier.FREE
        self._update_usage_limits(db, user, plan)

    def _update_usage_limits(self, db: Session, user: models.User, plan: models.PlanTier):
        """Update usage limits based on plan"""
        now = datetime.utcnow()
        usage = db.query(models.Usage).filter_by(
            user_id=user.id,
            year=now.year,
            month=now.month,
        ).first()

        if not usage:
            usage = models.Usage(
                user_id=user.id,
                year=now.year,
                month=now.month,
            )
            db.add(usage)

        pricing = self.PRICING_TIERS[plan]
        usage.alerts_limit = pricing["alerts_per_day"] * 30 if pricing["alerts_per_day"] else 999999
        usage.predictions_limit = 999999 if pricing["prediction_days"] else 0
        usage.api_calls_limit = 999999 if pricing["api_access"] else 0
        usage.watchlists_limit = pricing["watchlists"] if pricing["watchlists"] else 999999
        usage.backtests_limit = 999999 if pricing["backtesting"] else 0
        usage.sms_limit = 999999 if pricing["sms_alerts"] else 0

        db.commit()

    def check_feature_access(
        self,
        db: Session,
        user: models.User,
        feature: str
    ) -> tuple[bool, str]:
        """Check if user has access to a feature"""
        sub = self.get_subscription(db, user)
        if not sub:
            sub = models.Subscription(user_id=user.id, plan=models.PlanTier.FREE)

        pricing = self.PRICING_TIERS[sub.plan]

        feature_map = {
            "sms_alerts": pricing["sms_alerts"],
            "backtesting": pricing["backtesting"],
            "api_access": pricing["api_access"],
        }

        if feature not in feature_map:
            return False, f"Unknown feature: {feature}"

        has_access = feature_map[feature]
        if not has_access:
            plan_required = "Pro" if feature != "api_access" else "Enterprise"
            return False, f"{feature.replace('_', ' ').title()} requires {plan_required} plan"

        return True, "Access granted"

    def list_available_plans(self) -> list[Dict[str, Any]]:
        """List all available pricing plans"""
        plans = []
        for plan_tier, pricing in self.PRICING_TIERS.items():
            plans.append({
                "plan": plan_tier.value,
                "monthly_price_cents": pricing["monthly_price_cents"],
                "annual_price_cents": pricing["annual_price_cents"],
                "annual_savings_percent": 20,
                "features": {
                    "watchlists": pricing["watchlists"],
                    "alerts_per_day": pricing["alerts_per_day"],
                    "prediction_days": pricing["prediction_days"],
                    "sms_alerts": pricing["sms_alerts"],
                    "backtesting": pricing["backtesting"],
                    "api_access": pricing["api_access"],
                }
            })
        return plans


# Instantiate service
payment_service = PaymentService()
