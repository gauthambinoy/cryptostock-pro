# Trading Integration Quick Start

Get up and running with live trading in 10 minutes.

## 1. Install Dependencies (1 min)

```bash
cd backend
pip install alpaca-trade-api==3.2.0
# Or if using requirements.txt
pip install -r requirements.txt
```

## 2. Get Alpaca API Credentials (2 min)

1. Visit [alpaca.markets](https://alpaca.markets)
2. Create free account
3. Go to Dashboard → API Keys
4. Copy **API Key** and **Secret Key**
5. Keep them safe! 🔐

## 3. Start Backend (1 min)

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## 4. Start Frontend (1 min)

```bash
cd frontend
npm run dev
```

## 5. Connect Trading Account (2 min)

**Option A: Via Web UI**
1. Go to http://localhost:5173/trading
2. Click "Connect Alpaca Account"
3. Select "Paper Trading" (start here!)
4. Paste API Key and Secret Key
5. Click "Connect"

**Option B: Via API**
```bash
curl -X POST http://localhost:8000/api/trading/connect \
  -H "Content-Type: application/json" \
  -b "access_token=YOUR_JWT" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "secret_key": "YOUR_SECRET_KEY",
    "trading_mode": "paper"
  }'
```

## 6. Place Your First Trade (2 min)

1. Go to Trading Panel
2. Click "Buy Stock"
3. Enter symbol: **AAPL**
4. Enter quantity: **1**
5. Select order type: **Market**
6. Click "Place Buy Order"

Done! Check "Open Positions" to see your trade.

## 7. Try Prediction-Based Trading (1 min)

1. Go to Prediction page
2. Enter symbol: **AAPL**
3. Click "Predict"
4. Click "Trade Buy" or "Trade Sell" button
5. Order will use prediction data

## Common Tasks

### Check Account Balance
```
GET /api/trading/account
Returns: balance, buying_power, day_pnl
```

### View Open Positions
```
GET /api/trading/positions
Returns: list of open positions with P&L
```

### View Trade History
```
GET /api/trading/orders?limit=20
Returns: recent trades with prediction data
```

### View Statistics
```
GET /api/trading/stats
Returns: win_rate, total_pnl, best_trade, worst_trade
```

### Disconnect Account
```
DELETE /api/trading/disconnect
```

## Paper vs Live Trading

### Paper Trading (RECOMMENDED TO START)
- ✅ Simulated trades
- ✅ No real money
- ✅ Same API as live
- ✅ Perfect for testing
- ✅ Default mode

```json
{
  "trading_mode": "paper"
}
```

### Live Trading (REAL MONEY)
- ⚠️ Real money execution
- ⚠️ Real P&L
- ⚠️ Commission charges
- ⚠️ Market hours only
- ⚠️ Use with caution!

```json
{
  "trading_mode": "live"
}
```

## Risk Management

### Automatic Checks
- ✅ Account balance validated
- ✅ Position size limits enforced
- ✅ Stop loss automation
- ✅ Max loss per trade limit (default $500)

### Best Practices
1. **Start with paper trading**
2. **Use stop losses** on all trades
3. **Check account balance** before trading
4. **Monitor positions** regularly
5. **Start small** - test with 1 share

## Monitoring

### Auto-Refresh
- Account info updates every 30 seconds
- Positions refresh automatically
- Check dashboard for real-time P&L

### Manual Check
```bash
# Get account info
curl http://localhost:8000/api/trading/account

# Get positions
curl http://localhost:8000/api/trading/positions

# Get trading stats
curl http://localhost:8000/api/trading/stats
```

## Troubleshooting

### Can't Connect
**Problem**: "Failed to connect to Alpaca API"
**Solution**: 
1. Check API key and secret are correct
2. Verify they're from [alpaca.markets](https://alpaca.markets) not another broker
3. Make sure they're not expired

### Order Won't Place
**Problem**: "Insufficient buying power"
**Solution**:
1. Check account balance: `GET /api/trading/account`
2. Reduce position size
3. Verify market is open (9:30 AM - 4:00 PM ET)

### No Positions Showing
**Problem**: Orders placed but no positions
**Solution**:
1. Wait a few seconds for processing
2. Manually refresh page
3. Check order status: `GET /api/trading/orders`

### P&L Not Updating
**Problem**: Balance seems stuck
**Solution**:
1. Wait 30 seconds for auto-sync
2. Click refresh button on dashboard
3. Check `day_pnl` field in account info

## Next Steps

### Learn More
- Read [TRADING_INTEGRATION_GUIDE.md](TRADING_INTEGRATION_GUIDE.md) for detailed docs
- Check API reference in guide
- Review database schema

### Advanced Features
- Set auto stop losses
- Create limit orders
- Track prediction accuracy
- View trading statistics
- Connect to multiple accounts

### Go Live
- After successful paper trading
- Start with small position sizes
- Monitor closely
- Consider risk limits
- Keep API keys secure

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+T` | Open Trading Panel |
| `Ctrl+B` | Buy form |
| `Ctrl+S` | Sell form |
| `Ctrl+R` | Refresh account |

## API Endpoints Cheat Sheet

```
POST   /api/trading/connect        Connect account
DELETE /api/trading/disconnect     Disconnect account
GET    /api/trading/status         Check connection status
GET    /api/trading/account        Account info & balance
GET    /api/trading/positions      Open positions
GET    /api/trading/orders         Order history
GET    /api/trading/stats          Performance stats
POST   /api/trading/buy            Place buy order
POST   /api/trading/sell           Place sell order
```

## Example Workflow

1. **Connect** account in paper mode
2. **Check** account balance (`/api/trading/account`)
3. **View** positions (`/api/trading/positions`)
4. **Place** buy order for AAPL 1 share
5. **Monitor** position (watch P&L update)
6. **Get** prediction for AAPL
7. **Place** order based on prediction
8. **Check** statistics (`/api/trading/stats`)
9. **Review** trade history (`/api/trading/orders`)

## Support

Get help:
1. Check this quick start
2. Read [TRADING_INTEGRATION_GUIDE.md](TRADING_INTEGRATION_GUIDE.md)
3. Check Alpaca docs: https://docs.alpaca.markets
4. Review logs for errors

## Safety Checklist

Before trading live, verify:
- [ ] Can connect account successfully
- [ ] Can place paper trades
- [ ] Understand buy/sell order flow
- [ ] Know how to check balance
- [ ] Understand P&L calculation
- [ ] Have stop losses set up
- [ ] Read risk warnings
- [ ] Starting with small positions
- [ ] Credentials stored securely
- [ ] Monitor account regularly

Once checked, you're ready to trade! 🚀

---

**Remember**: Past performance doesn't guarantee future results. Trade responsibly!
