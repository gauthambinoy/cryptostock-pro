# Live Trading Integration for AssetPulse

Complete guide for the Alpaca API trading integration enabling live and paper trading with real-time execution.

## Overview

The Live Trading Integration provides a complete end-to-end trading system that:
- Connects to Alpaca API for order execution
- Supports both paper (simulated) and live (real money) trading
- Tracks trades and correlates with prediction accuracy
- Manages risk with automatic validation and loss limits
- Provides real-time portfolio tracking

## Architecture

### Backend Components

#### 1. **TradingService** (`backend/app/services/trading_service.py`)
Low-level Alpaca API wrapper handling:
- Connection management
- Order placement (market & limit orders)
- Account information retrieval
- Position tracking
- Order history management
- Order validation

```python
service = TradingService(api_key, secret_key, base_url)
order = service.place_buy_order("AAPL", 10, limit_price=150.00)
positions = service.get_positions()
account = service.get_account()
```

#### 2. **TradingManager** (`backend/app/services/trading_service.py`)
High-level trading operations with database persistence:
- Account connection/disconnection
- Trade execution with validation
- P&L calculation
- Trade statistics
- Prediction accuracy correlation

```python
manager = TradingManager(db)
success, msg = manager.connect_account(user_id, api_key, secret_key, "paper")
success, msg, trade_id = manager.execute_trade(
    user_id, "AAPL", 10, "buy", prediction_direction="up"
)
stats = manager.calculate_trade_stats(user_id)
```

#### 3. **Trading Router** (`backend/app/routers/trading.py`)
REST API endpoints:
- `POST /api/trading/connect` - Connect Alpaca account
- `DELETE /api/trading/disconnect` - Disconnect account
- `GET /api/trading/account` - Account info
- `GET /api/trading/positions` - Open positions
- `GET /api/trading/orders` - Order history
- `GET /api/trading/stats` - Trading statistics
- `POST /api/trading/buy` - Place buy order
- `POST /api/trading/sell` - Place sell order
- `GET /api/trading/status` - Connection status

#### 4. **Database Models** (`backend/app/models.py`)

**TradingAccount**
- Stores user's Alpaca credentials (encrypted)
- Account balance and buying power
- Day P&L tracking
- Risk limits (max loss per trade, auto stop loss %)

**TradeExecution**
- Detailed trade records
- Entry/exit prices and P&L
- Order status and fill information
- Commission tracking
- Prediction correlation (prediction_id, direction, confidence, accuracy)

### Frontend Components

#### 1. **TradingPanel.jsx**
Complete trading interface with:
- Account connection form (API key, secret key, trading mode)
- Account dashboard (balance, buying power, day P&L)
- Buy/Sell order forms
- Open positions table
- Order history with P&L
- Trading statistics
- Risk warnings

#### 2. **Dashboard Integration**
- Trading account status card when connected
- Quick link to trading panel
- Account balance display

#### 3. **Prediction Integration**
- "Trade" button on prediction results
- Bullish predictions → Buy orders
- Bearish predictions → Sell orders
- Pre-fills symbol and prediction data

## Setup Instructions

### 1. Install Dependencies

```bash
pip install alpaca-trade-api==3.2.0
```

### 2. Get Alpaca API Credentials

1. Create account at [alpaca.markets](https://alpaca.markets)
2. Go to Dashboard → API Keys
3. Copy API Key and Secret Key
4. Keep credentials secure!

### 3. Database Migration

Run alembic to create trading tables:
```bash
alembic revision --autogenerate -m "Add trading tables"
alembic upgrade head
```

Or manually execute:
```sql
-- Will be created by SQLAlchemy on first run
-- Models auto-create tables
```

### 4. Environment Configuration

No additional environment variables needed. Credentials are user-provided and stored securely in database.

## API Reference

### Connect Trading Account
```bash
curl -X POST http://localhost:8000/api/trading/connect \
  -H "Content-Type: application/json" \
  -b "access_token=YOUR_JWT" \
  -d '{
    "api_key": "YOUR_ALPACA_KEY",
    "secret_key": "YOUR_ALPACA_SECRET",
    "trading_mode": "paper"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Connected to Alpaca paper trading",
  "account": {
    "account_balance": 100000.0,
    "buying_power": 95000.0,
    "day_pnl": 250.50,
    "day_pnl_percent": 0.25,
    "trading_mode": "paper",
    "is_connected": true,
    "last_synced": "2026-04-01T12:00:00Z"
  }
}
```

### Get Account Info
```bash
curl http://localhost:8000/api/trading/account \
  -b "access_token=YOUR_JWT"
```

### Place Buy Order
```bash
curl -X POST http://localhost:8000/api/trading/buy \
  -H "Content-Type: application/json" \
  -b "access_token=YOUR_JWT" \
  -d '{
    "symbol": "AAPL",
    "quantity": 10,
    "order_type": "market",
    "stop_loss": 145.00,
    "prediction_id": 123,
    "prediction_direction": "up",
    "prediction_confidence": 85.5
  }'
```

### Get Trading Statistics
```bash
curl http://localhost:8000/api/trading/stats \
  -b "access_token=YOUR_JWT"
```

Response:
```json
{
  "total_trades": 15,
  "winning_trades": 10,
  "losing_trades": 5,
  "win_rate": 66.67,
  "total_pnl": 2500.00,
  "avg_pnl": 166.67,
  "best_trade": 750.00,
  "worst_trade": -250.00
}
```

## Features

### Paper Trading
- Simulated trading without real money
- Same API as live trading
- Perfect for testing strategies
- No real risk

### Live Trading
- Real money execution on Alpaca
- Real-time account updates
- Production-grade order management
- **WARNING**: Requires careful credential handling

### Order Types
- **Market Orders**: Instant execution at market price
- **Limit Orders**: Execute at specified price or better

### Risk Management
- **Validation**: Check balance before execution
- **Max Loss Per Trade**: Configurable limit (default $500)
- **Auto Stop Loss**: Automatic stop loss percentage (default 2%)
- **Position Tracking**: Real-time P&L for all positions

### Prediction Correlation
- Track which predictions led to trades
- Correlate prediction accuracy with trade outcomes
- Calculate win rate based on prediction signals
- Compare prediction P&L vs actual trade P&L

### Trade History
- Complete execution history
- Entry/exit prices and commissions
- Prediction direction and confidence
- Prediction accuracy (was it correct?)
- Timestamps and order status

## Security

### Credentials Handling
1. **Encryption**: Credentials encrypted in database
2. **HTTPS Only**: All API calls use HTTPS
3. **JWT Auth**: All endpoints require valid JWT token
4. **No Logging**: Credentials never logged
5. **Secure Storage**: Never exposed in responses

### Best Practices
1. Use paper trading first to test
2. Start with small position sizes
3. Use stop losses on all trades
4. Monitor account regularly
5. Use strong, unique API credentials
6. Consider IP whitelisting in Alpaca settings

## Frontend Usage

### Connecting Account

```jsx
const [apiKey, setApiKey] = useState("");
const [secretKey, setSecretKey] = useState("");
const [mode, setMode] = useState("paper");

const handleConnect = async () => {
  const response = await fetch("/api/trading/connect", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      secret_key: secretKey,
      trading_mode: mode,
    }),
  });
  
  const data = await response.json();
  if (response.ok) {
    // Account connected
    setAccount(data.account);
  }
};
```

### Placing Orders

```jsx
const handleBuyOrder = async () => {
  const response = await fetch("/api/trading/buy", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: "AAPL",
      quantity: 10,
      order_type: "market",
      stop_loss: 145.00,
    }),
  });
  
  const data = await response.json();
  if (response.ok) {
    console.log("Order placed:", data.trade_id);
  }
};
```

### Monitoring Positions

```jsx
useEffect(() => {
  const fetchPositions = async () => {
    const response = await fetch("/api/trading/positions", {
      credentials: "include",
    });
    const positions = await response.json();
    setPositions(positions);
  };
  
  // Refresh every 30 seconds
  const interval = setInterval(fetchPositions, 30000);
  return () => clearInterval(interval);
}, []);
```

## Database Schema

### TradingAccount
```sql
CREATE TABLE trading_accounts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  alpaca_api_key VARCHAR(255),
  alpaca_secret_key VARCHAR(255),
  is_connected BOOLEAN DEFAULT FALSE,
  trading_mode ENUM('paper', 'live'),
  account_balance FLOAT,
  buying_power FLOAT,
  day_pnl FLOAT,
  day_pnl_percent FLOAT,
  last_synced TIMESTAMP,
  max_loss_per_trade FLOAT DEFAULT 500.0,
  auto_stop_loss_percent FLOAT DEFAULT 2.0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### TradeExecution
```sql
CREATE TABLE trade_executions (
  id INTEGER PRIMARY KEY,
  trading_account_id INTEGER NOT NULL,
  alpaca_order_id VARCHAR(100),
  symbol VARCHAR(20),
  side ENUM('buy', 'sell'),
  order_type ENUM('market', 'limit'),
  quantity FLOAT,
  filled_quantity FLOAT,
  price FLOAT,
  filled_price FLOAT,
  total_cost FLOAT,
  status ENUM('pending', 'filled', 'partially_filled', 'cancelled', 'rejected'),
  commission FLOAT DEFAULT 0.0,
  prediction_id INTEGER,
  prediction_direction VARCHAR(20),
  prediction_confidence FLOAT,
  prediction_accuracy BOOLEAN,
  entry_price FLOAT,
  exit_price FLOAT,
  realized_pnl FLOAT,
  realized_pnl_percent FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  executed_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Error Handling

### Common Errors

**Error: "Trading account not connected"**
- Solution: User needs to connect Alpaca account first
- Check `/api/trading/status` endpoint

**Error: "Insufficient buying power"**
- Solution: Account balance too low
- Check `/api/trading/account` for available buying power

**Error: "Trade loss exceeds max allowed"**
- Solution: Trade size would exceed max loss limit
- Reduce position size or increase max loss limit

**Error: "Failed to connect to Alpaca API"**
- Solution: Invalid API credentials
- Check API key and secret in Alpaca dashboard

## Performance Optimization

### Caching
- Account info cached with 30-second refresh
- Positions updated every 30 seconds
- Order history cached with refresh on new orders

### Rate Limits
- Alpaca allows 200 requests per minute
- Frontend batches requests efficiently
- No per-endpoint limits within app

### Database
- Indexes on (user_id, created_at) for fast queries
- Indexes on (symbol, user_id) for position lookups
- Indexes on alpaca_order_id for order status

## Testing

### Paper Trading Workflow

1. **Connect Account**
   - Use paper trading mode
   - No real money required

2. **Place Test Orders**
   - Buy AAPL 1 share market order
   - Should fill immediately
   - Check positions

3. **Monitor P&L**
   - Watch position as market moves
   - Check daily P&L updates
   - Verify order history

4. **Disconnect**
   - Test account disconnect
   - Verify reconnection

### Example Test Script
```python
import requests

BASE_URL = "http://localhost:8000/api"
HEADERS = {"Cookie": "access_token=YOUR_JWT"}

# Check status
r = requests.get(f"{BASE_URL}/trading/status", headers=HEADERS)
print(r.json())

# Connect account
r = requests.post(f"{BASE_URL}/trading/connect", 
  json={
    "api_key": "PK123456",
    "secret_key": "SECRET123",
    "trading_mode": "paper"
  }, 
  headers=HEADERS)
print(r.json())

# Get account
r = requests.get(f"{BASE_URL}/trading/account", headers=HEADERS)
print(r.json())

# Place order
r = requests.post(f"{BASE_URL}/trading/buy",
  json={
    "symbol": "AAPL",
    "quantity": 1,
    "order_type": "market"
  },
  headers=HEADERS)
print(r.json())

# Get positions
r = requests.get(f"{BASE_URL}/trading/positions", headers=HEADERS)
print(r.json())

# Get stats
r = requests.get(f"{BASE_URL}/trading/stats", headers=HEADERS)
print(r.json())
```

## Troubleshooting

### Credentials Not Saving
- Check database connection
- Verify encryption is working
- Check user_id is correct

### Orders Not Executing
- Verify market hours (9:30 AM - 4:00 PM ET)
- Check account has buying power
- Verify symbol is valid
- Check for position limits

### P&L Not Updating
- Allow 30 seconds for sync
- Manually refresh or check `/api/trading/account`
- Verify market is open
- Check order status in `/api/trading/orders`

### Prediction Not Correlating
- Ensure `prediction_id` passed to trade endpoint
- Check prediction exists in database
- Verify trade is filled (status='filled')
- Check prediction accuracy calculation

## Future Enhancements

1. **Advanced Order Types**
   - Trailing stops
   - One-cancels-other (OCO)
   - Fill-or-kill (FOK)

2. **Portfolio Rebalancing**
   - Automatic rebalancing on schedule
   - Target allocation management
   - Tax-loss harvesting

3. **Options Trading**
   - Call/put orders
   - Spreads
   - Greeks calculation

4. **Alerts & Notifications**
   - Order fill notifications
   - Price alerts
   - Risk warnings

5. **Backtesting**
   - Paper trading simulation
   - Historical performance
   - Strategy optimization

6. **Advanced Analytics**
   - Drawdown analysis
   - Sharpe ratio calculation
   - Risk metrics

## Support

For issues or questions:
1. Check this guide
2. Review API response errors
3. Check Alpaca documentation: https://docs.alpaca.markets
4. Check logs for detailed errors
5. Verify credentials and permissions

## References

- [Alpaca API Documentation](https://docs.alpaca.markets)
- [alpaca-trade-api Python SDK](https://github.com/alpacahq/alpaca-trade-api-python)
- [AssetPulse Prediction API](/api/prediction)
- [Trading Panel Component](/frontend/src/pages/TradingPanel.jsx)
