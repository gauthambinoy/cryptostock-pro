"""
Subscription and billing API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import stripe
from ..database import get_db
from ..config import get_settings
from .. import models, auth
from ..services.payment_service import payment_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])
settings = get_settings()


# ============== Subscription Plans ==============

@router.get("/plans")
async def list_pricing_plans():
    """
    Get all available pricing plans

    Returns plans with features and pricing for both monthly and annual billing
    """
    plans = payment_service.list_available_plans()
    return {
        "plans": plans,
        "currency": "USD"
    }


# ============== Current Subscription ==============

@router.get("/current")
async def get_current_subscription(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's active subscription and usage stats
    """
    details = payment_service.get_subscription_details(db, current_user)
    return details


@router.get("/usage")
async def get_usage_metrics(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current month usage metrics for plan limits

    Returns:
    - Alerts sent/limit
    - Predictions made/limit
    - API calls/limit
    - Watchlists created/limit
    - Backtests run/limit
    - SMS messages sent/limit
    """
    usage = payment_service.get_current_month_usage(db, current_user)
    sub = payment_service.get_subscription(db, current_user)

    if not usage:
        now = __import__('datetime').datetime.utcnow()
        usage = models.Usage(
            user_id=current_user.id,
            year=now.year,
            month=now.month,
        )

    plan = sub.plan if sub else models.PlanTier.FREE
    pricing = payment_service.PRICING_TIERS[plan]

    return {
        "plan": plan.value,
        "usage": {
            "alerts": {
                "sent": usage.alerts_sent,
                "limit": usage.alerts_limit,
                "percent_used": min(100, int((usage.alerts_sent / max(1, usage.alerts_limit)) * 100))
            },
            "predictions": {
                "made": usage.predictions_made,
                "limit": usage.predictions_limit if usage.predictions_limit else None,
                "percent_used": min(100, int((usage.predictions_made / max(1, usage.predictions_limit)) * 100)) if usage.predictions_limit else 0
            },
            "api_calls": {
                "made": usage.api_calls,
                "limit": usage.api_calls_limit if usage.api_calls_limit else None,
                "percent_used": min(100, int((usage.api_calls / max(1, usage.api_calls_limit)) * 100)) if usage.api_calls_limit else 0
            },
            "watchlists": {
                "created": usage.watchlists_created,
                "limit": usage.watchlists_limit,
                "percent_used": min(100, int((usage.watchlists_created / max(1, usage.watchlists_limit)) * 100))
            },
            "backtests": {
                "run": usage.backtests_run,
                "limit": usage.backtests_limit if usage.backtests_limit else None,
                "percent_used": min(100, int((usage.backtests_run / max(1, usage.backtests_limit)) * 100)) if usage.backtests_limit else 0
            },
            "sms": {
                "sent": usage.sms_sent,
                "limit": usage.sms_limit if usage.sms_limit else None,
                "percent_used": min(100, int((usage.sms_sent / max(1, usage.sms_limit)) * 100)) if usage.sms_limit else 0
            }
        },
        "features": {
            "sms_alerts": pricing["sms_alerts"],
            "backtesting": pricing["backtesting"],
            "api_access": pricing["api_access"],
        }
    }


# ============== Create Subscription ==============

@router.post("/create")
async def create_subscription(
    plan: str,
    is_annual: bool = False,
    payment_method_id: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new subscription for the user

    - **plan**: One of 'free', 'pro', or 'enterprise'
    - **is_annual**: True for annual billing (20% discount), False for monthly
    - **payment_method_id**: Stripe payment method ID (required for paid plans)
    """
    try:
        # Validate plan
        try:
            plan_tier = models.PlanTier[plan.upper()]
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid plan. Choose from: free, pro, enterprise"
            )

        # Check if user already has subscription
        existing_sub = payment_service.get_subscription(db, current_user)
        if existing_sub and existing_sub.status == models.SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )

        # Create subscription
        result = payment_service.create_subscription(
            db, current_user, plan_tier, is_annual, payment_method_id
        )
        return result
    except HTTPException:
        raise
    except stripe.error.CardError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Payment failed: {e.user_message}"
        )
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )


# ============== Update Subscription ==============

@router.post("/upgrade")
async def upgrade_subscription(
    new_plan: str,
    is_annual: bool = False,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upgrade or change subscription plan

    - **new_plan**: Target plan ('pro' or 'enterprise')
    - **is_annual**: True for annual billing
    """
    try:
        try:
            plan_tier = models.PlanTier[new_plan.upper()]
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid plan. Choose from: free, pro, enterprise"
            )

        result = payment_service.update_subscription(db, current_user, plan_tier, is_annual)
        return result
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error upgrading subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )


# ============== Cancel Subscription ==============

@router.post("/cancel")
async def cancel_subscription(
    reason: str = "user_requested",
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel user's active subscription

    - **reason**: Optional reason for cancellation (user_requested, cost, etc.)
    """
    try:
        result = payment_service.cancel_subscription(db, current_user, reason)
        return result
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


# ============== Webhook ==============

@router.post("/webhook")
async def handle_stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Stripe webhook events

    Processes payment, subscription, and invoice events from Stripe
    """
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")

        if not sig_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )

        # Verify and parse webhook
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload"
            )
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
            )

        # Process event
        success = payment_service.handle_webhook_event(event, db)

        return {"status": "success" if success else "failed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


# ============== Payment History ==============

@router.get("/payments")
async def get_payment_history(
    limit: int = 20,
    offset: int = 0,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's payment history
    """
    payments = db.query(models.Payment).filter_by(
        user_id=current_user.id
    ).order_by(
        models.Payment.created_at.desc()
    ).limit(limit).offset(offset).all()

    total = db.query(models.Payment).filter_by(user_id=current_user.id).count()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "payments": [
            {
                "id": p.id,
                "amount": p.amount_cents / 100,
                "currency": p.currency,
                "status": p.status.value,
                "description": p.description,
                "receipt_url": p.receipt_url,
                "invoice_number": p.invoice_number,
                "created_at": p.created_at.isoformat(),
            }
            for p in payments
        ]
    }


# ============== Feature Access Check ==============

@router.get("/feature/{feature_name}")
async def check_feature_access(
    feature_name: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user has access to a specific feature

    - **feature_name**: Feature to check (sms_alerts, backtesting, api_access)
    """
    has_access, message = payment_service.check_feature_access(
        db, current_user, feature_name
    )

    return {
        "feature": feature_name,
        "has_access": has_access,
        "message": message
    }
