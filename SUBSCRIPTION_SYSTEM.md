# Premium Subscription System for AssetPulse

Complete premium subscription system with Stripe integration, feature gating, and usage tracking.

## Overview

The subscription system provides three pricing tiers with progressive feature access:
- **Free**: Core features with limits
- **Pro**: Enhanced capabilities ($9.99/month or $95.99/year)
- **Enterprise**: Full access with API ($99.99/month or $959.99/year)

## Architecture

### Backend Components

#### 1. Database Models (`backend/app/models.py`)

**Subscription Model**
- Tracks user's current plan, status, and billing period
- Integrates with Stripe (customer_id, subscription_id)
- Supports monthly and annual billing

**Payment Model**
- Records all payment transactions
- Links to Stripe payment intents and invoices
- Tracks payment status and receipt URLs

**Usage Model**
- Tracks monthly usage per plan tier
- Monitors alerts sent, predictions made, API calls, etc.
- Enforces tier-based limits

**Enums**
- `PlanTier`: FREE, PRO, ENTERPRISE
- `SubscriptionStatus`: ACTIVE, CANCELED, PAST_DUE, PAUSED
- `PaymentStatus`: PENDING, SUCCEEDED, FAILED, REFUNDED

#### 2. Payment Service (`backend/app/services/payment_service.py`)

Core service handling all subscription operations:

**Pricing Configuration**
```python
PRICING_TIERS = {
    PlanTier.FREE: {
        "watchlists": 5,
        "alerts_per_day": 10,
        "prediction_days": 7,
        "sms_alerts": False,
        "backtesting": False,
        "api_access": False,
    },
    PlanTier.PRO: {
        "watchlists": None,  # Unlimited
        "alerts_per_day": 100,
        "prediction_days": 30,
        "sms_alerts": True,
        "backtesting": True,
        "api_access": False,
    },
    PlanTier.ENTERPRISE: {
        "watchlists": None,  # Unlimited
        "alerts_per_day": None,  # Unlimited
        "prediction_days": 30,
        "sms_alerts": True,
        "backtesting": True,
        "api_access": True,
    },
}
```

**Key Methods**

- `create_subscription()`: Create new subscription with Stripe
- `update_subscription()`: Upgrade/downgrade plans
- `cancel_subscription()`: Cancel and revert to free tier
- `handle_webhook_event()`: Process Stripe webhooks
- `record_usage()`: Track monthly usage metrics
- `check_feature_access()`: Verify feature permissions
- `get_subscription_details()`: Get full subscription info with usage

#### 3. Subscriptions Router (`backend/app/routers/subscriptions.py`)

REST API endpoints for subscription management:

**Endpoints**

```
GET  /api/subscriptions/plans
     - List all pricing plans with features

GET  /api/subscriptions/current
     - Get user's active subscription

GET  /api/subscriptions/usage
     - Get current month usage metrics

POST /api/subscriptions/create
     - Create new subscription

POST /api/subscriptions/upgrade
     - Upgrade or change plan

POST /api/subscriptions/cancel
     - Cancel subscription

POST /api/subscriptions/webhook
     - Stripe webhook handler

GET  /api/subscriptions/payments
     - Get payment history

GET  /api/subscriptions/feature/{feature_name}
     - Check feature access
```

### Configuration

Add to `.env`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (get from Stripe dashboard)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_...
```

### Frontend Components

#### 1. Pricing Page (`frontend/src/pages/Pricing.jsx`)

Complete pricing page with:
- 3 pricing cards (Free, Pro, Enterprise)
- Monthly/Annual toggle with 20% discount display
- Feature comparison table
- FAQ section
- Call-to-action buttons

**Features**
- Shows current plan with badge
- Responsive grid layout
- Smooth animations and transitions
- Interactive feature lists with icons

#### 2. Billing Page (`frontend/src/pages/Billing.jsx`)

Comprehensive billing management dashboard:
- Current plan display with renewal date
- Usage metrics with progress bars
- Payment history with invoice links
- Upgrade/Cancel subscription modals
- Feature access indicators

**Sections**
1. Current Plan - Shows active plan with actions
2. Usage Metrics - Monthly usage tracking per tier
3. Payment History - Transaction list with status
4. Modals - Upgrade and cancellation flows

#### 3. Styles

**Pricing.module.css**
- Modern card layout with hover effects
- Smooth gradient backgrounds
- Responsive grid system
- Feature list styling with icons

**Billing.module.css**
- Dashboard layout with multiple sections
- Progress bars for usage tracking
- Payment table with status badges
- Modal dialogs for actions

## Feature Gating

### Implementation Pattern

```python
# Check feature access
has_access, message = payment_service.check_feature_access(
    db, user, "backtesting"
)

if not has_access:
    raise HTTPException(status_code=403, detail=message)
```

### Feature Map

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Watchlists | 5 | Unlimited | Unlimited |
| Daily Alerts | 10 | 100 | Unlimited |
| Prediction Horizon | 7 days | 30 days | 30 days |
| SMS Alerts | No | Yes | Yes |
| Backtesting | No | Yes | Yes |
| API Access | No | No | Yes |
| Email Support | No | Yes | Yes |
| Priority Support | No | No | Yes |

## Usage Tracking

### Monthly Reset

Usage metrics reset automatically at start of each month:

```python
# Get current month usage
usage = payment_service.get_current_month_usage(db, user)

# Record usage event
payment_service.record_usage(db, user, "alert", amount=1)
payment_service.record_usage(db, user, "prediction", amount=1)
```

### Supported Metrics

- `alert` - Daily alerts sent
- `prediction` - Predictions generated
- `api_call` - API calls made
- `watchlist` - Watchlists created
- `backtest` - Backtests executed
- `sms` - SMS messages sent

## Webhook Integration

### Stripe Events Handled

- `customer.subscription.updated` - Period changes
- `customer.subscription.deleted` - Subscription canceled
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `invoice.payment_succeeded` - Invoice paid
- `invoice.payment_failed` - Invoice failed

### Webhook Setup

1. Configure webhook in Stripe Dashboard
2. Set URL: `https://api.assetpulse.ai/api/subscriptions/webhook`
3. Select events listed above
4. Add secret to `.env` as `STRIPE_WEBHOOK_SECRET`

## Email Notifications

Future email notifications to implement:

- Welcome email on first subscription
- Invoice email on payment
- Renewal reminder before billing date
- Cancellation confirmation
- Downgrade warning

Integration with SendGrid service:

```python
from ..services.email_service import send_email

send_email(
    to=user.email,
    subject="Welcome to AssetPulse Pro",
    template="subscription_welcome",
    data={
        "user_name": user.full_name,
        "plan": "Pro",
        "features": [...],
    }
)
```

## API Usage Examples

### Get Current Subscription

```javascript
const response = await fetch('/api/subscriptions/current', {
  credentials: 'include'
});
const data = await response.json();
console.log(data.subscription.plan); // "pro"
```

### Create Subscription

```javascript
const response = await fetch('/api/subscriptions/create', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plan: 'pro',
    is_annual: false,
    payment_method_id: 'pm_...'
  })
});
```

### Check Feature Access

```javascript
const response = await fetch('/api/subscriptions/feature/backtesting', {
  credentials: 'include'
});
const { has_access, message } = await response.json();

if (!has_access) {
  alert(message); // "Backtesting requires Pro plan"
}
```

### Get Usage Metrics

```javascript
const response = await fetch('/api/subscriptions/usage', {
  credentials: 'include'
});
const { usage } = await response.json();
console.log(usage.alerts.sent); // 45
console.log(usage.alerts.limit); // 300 (10/day * 30 days)
```

## Integration Points

### Feature Usage Tracking

Integrate usage tracking in feature endpoints:

**Alerts**
```python
# In alerts.py
payment_service.record_usage(db, current_user, "alert", amount=1)
```

**Predictions**
```python
# In prediction.py
payment_service.record_usage(db, current_user, "prediction", amount=1)
```

**Backtesting**
```python
# In backtest.py
payment_service.record_usage(db, current_user, "backtest", amount=1)
```

**SMS Alerts**
```python
# In alerts.py - check before sending SMS
has_access, _ = payment_service.check_feature_access(db, user, "sms_alerts")
if has_access and alert.notify_sms:
    send_sms(user.phone_number, message)
```

**API Access**
```python
# In API routers - check before processing
has_access, _ = payment_service.check_feature_access(db, user, "api_access")
if not has_access:
    raise HTTPException(status_code=403, detail="API access requires Enterprise plan")
```

## Database Setup

Run migrations to create subscription tables:

```bash
alembic revision --autogenerate -m "Add subscription models"
alembic upgrade head
```

## Testing

### Unit Tests

```python
def test_create_free_subscription():
    user = create_test_user()
    result = payment_service.create_subscription(db, user, PlanTier.FREE)
    assert result["plan"] == "free"
    assert result["status"] == "active"

def test_upgrade_to_pro():
    user = create_test_user()
    payment_service.create_subscription(db, user, PlanTier.FREE)
    result = payment_service.update_subscription(db, user, PlanTier.PRO)
    assert result["plan"] == "pro"

def test_usage_tracking():
    user = create_test_user()
    payment_service.record_usage(db, user, "alert", 5)
    usage = payment_service.get_current_month_usage(db, user)
    assert usage.alerts_sent == 5
```

### Manual Testing

1. Create test Stripe account and get API keys
2. Set keys in `.env`
3. Test subscription creation in browser
4. Verify webhook delivery via Stripe Dashboard
5. Check database records in DB

## Production Checklist

- [ ] Create Stripe products and prices in production dashboard
- [ ] Update `.env` with production Stripe keys
- [ ] Configure webhook endpoint in Stripe dashboard
- [ ] Set up email notifications for transactional emails
- [ ] Test payment flow with test card numbers
- [ ] Monitor webhook logs for failures
- [ ] Set up billing alerts and notifications
- [ ] Train support team on subscription management
- [ ] Create user documentation for billing page
- [ ] Set up analytics for conversion tracking

## Troubleshooting

**Issue: Webhook signature verification fails**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint is accessible
- Review Stripe logs for request details

**Issue: Subscription not creating**
- Verify Stripe API key is valid
- Check price IDs are configured correctly
- Review payment_service logs

**Issue: Usage not tracking**
- Ensure `record_usage()` is called in feature endpoints
- Check database for `Usage` records
- Verify current month filtering logic

## Future Enhancements

1. **Invoicing**: Generate and email invoices
2. **Tax Support**: Calculate and collect taxes
3. **Coupons**: Apply discount codes
4. **Volume Pricing**: Bulk user discounts
5. **Usage-Based Billing**: Overage charges
6. **Trial Period**: Free trial for new users
7. **Paused Subscriptions**: Temporarily pause billing
8. **White-Label**: Custom branding for Enterprise
9. **Team Accounts**: Multiple users per subscription
10. **Analytics**: Revenue and churn tracking

## Support

For Stripe integration issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Webhook Events](https://stripe.com/docs/webhooks)

For AssetPulse support:
- Create issue on GitHub
- Email support@assetpulse.ai
