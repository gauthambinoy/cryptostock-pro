# Subscription System Quick Start

Get the premium subscription system up and running in 15 minutes.

## 1. Install Dependencies

```bash
cd backend
pip install stripe
```

The `stripe` package is already in requirements.txt.

## 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Stripe API Keys (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE

# Create these prices in Stripe Dashboard and add their IDs:
STRIPE_PRO_MONTHLY_PRICE_ID=price_1ABC123XYZ
STRIPE_PRO_ANNUAL_PRICE_ID=price_2ABC123XYZ
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_3ABC123XYZ
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_4ABC123XYZ
```

### How to Get Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on "Developers" > "API keys"
3. Copy your test or live keys
4. For price IDs:
   - Go to "Products" in Stripe Dashboard
   - Create products for "Pro" and "Enterprise"
   - Create prices for each (monthly and annual)
   - Copy the price IDs

## 3. Database Setup

Create the subscription tables:

```bash
cd backend
alembic revision --autogenerate -m "Add subscription models"
alembic upgrade head
```

Or if using fresh database:

```bash
python -c "from app.database import init_db; init_db()"
```

## 4. Test the API

### Start Backend Server

```bash
cd backend
uvicorn app.main:app --reload
```

### Test Endpoints

**Get All Plans**
```bash
curl http://localhost:8000/api/subscriptions/plans
```

**Get Current User Subscription**
```bash
curl -b "access_token=YOUR_JWT" http://localhost:8000/api/subscriptions/current
```

**Create Free Subscription**
```bash
curl -X POST http://localhost:8000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -b "access_token=YOUR_JWT" \
  -d '{
    "plan": "free",
    "is_annual": false
  }'
```

**Get Usage Metrics**
```bash
curl -b "access_token=YOUR_JWT" http://localhost:8000/api/subscriptions/usage
```

## 5. Frontend Setup

### Add Routes to App.jsx

```jsx
import Pricing from './pages/Pricing';
import Billing from './pages/Billing';

<Route path="/pricing" element={<Pricing />} />
<Route path="/billing" element={<Billing />} />
```

### Add Navigation Links

```jsx
<Link to="/pricing">Pricing</Link>
<Link to="/billing">Billing</Link>
```

### Test Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit:
- http://localhost:5173/pricing - See pricing page
- http://localhost:5173/billing - See billing dashboard

## 6. Webhook Configuration

### Local Testing with Stripe CLI

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward events to local webhook
stripe listen --forward-to localhost:8000/api/subscriptions/webhook

# This will output your webhook signing secret
# Add to .env as STRIPE_WEBHOOK_SECRET
```

### Production Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter: `https://api.assetpulse.ai/api/subscriptions/webhook`
4. Select events:
   - customer.subscription.updated
   - customer.subscription.deleted
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy signing secret to `.env`

## 7. Pricing Tiers

### Free Plan
- 5 Watchlists
- 10 Alerts/Day
- 7-Day Predictions
- No SMS Alerts
- No Backtesting
- No API Access

### Pro Plan ($9.99/month or $95.99/year)
- Unlimited Watchlists
- 100 Alerts/Day
- 30-Day Predictions
- SMS Alerts
- Unlimited Backtesting
- No API Access

### Enterprise Plan ($99.99/month or $959.99/year)
- Everything in Pro
- REST API Access
- Priority Support
- White-Label Options

## 8. Feature Gating

Add to any feature endpoint to enforce subscription limits:

```python
from ..services.payment_service import payment_service

@router.post("/send-sms")
async def send_sms(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user has SMS feature access
    has_access, message = payment_service.check_feature_access(
        db, current_user, "sms_alerts"
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail=message)
    
    # Track usage
    payment_service.record_usage(db, current_user, "sms")
    
    # Send SMS...
    return {"success": True}
```

## 9. Usage Tracking

Add to feature endpoints:

```python
# For alerts
payment_service.record_usage(db, current_user, "alert")

# For predictions
payment_service.record_usage(db, current_user, "prediction")

# For backtesting
payment_service.record_usage(db, current_user, "backtest")

# For API calls
payment_service.record_usage(db, current_user, "api_call")

# For watchlists
payment_service.record_usage(db, current_user, "watchlist")
```

## 10. Testing Payments with Stripe

### Test Card Numbers

```
Visa:              4242 4242 4242 4242
Visa (debit):      4000 0566 5566 5556
Mastercard:        5555 5555 5555 4444
American Express:  3782 822463 10005
```

Use any future expiry date and any 3-digit CVC.

### Test Customers

Create test customers and subscriptions in Stripe Dashboard to test webhook handling.

## 11. Common Issues

**Issue: "Stripe API key not configured"**
- Check `.env` has `STRIPE_SECRET_KEY`
- Restart backend server
- Verify key format (should start with `sk_test_` or `sk_live_`)

**Issue: "Price ID not configured"**
- Create products and prices in Stripe Dashboard
- Copy price IDs correctly
- Update `.env` with all 4 price IDs

**Issue: Webhook verification fails**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check webhook URL is correct
- Ensure endpoint is publicly accessible

**Issue: "Payment requires card"**
- Use valid Stripe test card numbers
- Ensure card expiry is in future

## 12. Next Steps

1. Integrate email notifications for subscriptions
2. Add team/organization accounts
3. Implement usage-based billing overages
4. Set up analytics for conversion tracking
5. Create admin dashboard for subscription management
6. Add trial period logic
7. Implement plan downgrade warnings
8. Add churn prevention incentives

## Documentation

Full documentation: See `SUBSCRIPTION_SYSTEM.md`

## Support

For issues:
1. Check Stripe Dashboard logs
2. Review backend console output
3. Check browser dev tools for API errors
4. Review webhook logs in Stripe Dashboard

Need help? Open an issue on GitHub.
