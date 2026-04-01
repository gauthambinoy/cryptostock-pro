# Backtesting Engine - Testing Guide

## Overview
The Backtesting Engine for AssetPulse allows users to test investment strategies on historical data with comprehensive risk metrics.

## Components Implemented

### Backend Components

#### 1. Historical Data Fetcher (`backend/app/services/historical_fetcher.py`)
- **Functions:**
  - `fetch_stock_history()` - Fetches stock data from yfinance (supports 5, 10, 20 year periods)
  - `fetch_crypto_history()` - Fetches crypto data from CoinGecko API
  - `_get_cached_prices()` - Retrieves cached prices from database
  - `_cache_prices()` - Stores prices in database for faster retrieval
  - `get_cached_or_fetch()` - Synchronous wrapper for data fetching

- **Supported Assets:**
  - Stocks: AAPL, GOOGL, MSFT, TSLA, SPY, VTI, etc. (any yfinance symbol)
  - Crypto: BTC, ETH, BNB, XRP, ADA, SOL, DOGE, MATIC, LINK, UNI

- **Data Storage:**
  - Caches in `historical_prices` table for faster retrieval
  - Updates daily via API calls
  - Supports differential updates

#### 2. Backtest Service (`backend/app/services/backtest_service.py`)
- **Core Methods:**
  - `backtest_strategy()` - Main backtesting engine
  - `calculate_sharpe_ratio()` - Risk-adjusted return metric (default risk-free rate: 2%)
  - `calculate_max_drawdown()` - Peak-to-trough decline
  - `calculate_win_rate()` - Profitable trades percentage
  - `compare_to_benchmark()` - Compare to S&P 500 (SPY)
  - `monte_carlo_simulation()` - 1000 scenario simulation for risk analysis

- **Supported Strategies:**
  - `buy_and_hold` - Simple buy at start, sell at end
  - `sma_crossover` - SMA(20) crosses SMA(50) trading signals

- **Metrics Calculated:**
  - Total Return %
  - Annual Return %
  - Sharpe Ratio (risk-adjusted returns)
  - Max Drawdown % (worst peak-to-trough decline)
  - Win Rate % (profitable trades)
  - Trade Count
  - Monthly Returns Heatmap
  - Monte Carlo Statistics (worst case, median, best case)

#### 3. Database Models (`backend/app/models.py`)
```python
# Backtest Model
class Backtest(Base):
    - user_id (FK to User)
    - symbol
    - asset_type (stock/crypto)
    - start_date, end_date
    - strategy
    - Metrics: total_return_percent, annual_return_percent, sharpe_ratio, 
              max_drawdown_percent, win_rate_percent, total_trades
    - Benchmark: benchmark_symbol, benchmark_return_percent, outperformance_percent
    - Results: equity_curve, trades, monthly_returns, monte_carlo_stats (JSON)

# HistoricalPrice Model
class HistoricalPrice(Base):
    - symbol, asset_type
    - date
    - OHLCV data (open, high, low, close, volume)
```

#### 4. API Endpoints (`backend/app/routers/backtest.py`)
```
POST /api/backtest/run
  - Request: { symbol, asset_type, start_date, end_date, strategy }
  - Response: Complete backtest results with all metrics

GET /api/backtest/{backtest_id}
  - Returns: Specific backtest results with full details

GET /api/backtest
  - Query: ?limit=20
  - Returns: List of user's backtests (summary view)

GET /api/backtest/available-periods
  - Returns: Preset period options (1yr, 3yr, 5yr, 10yr, 20yr)
```

### Frontend Components

#### 1. Backtester Page (`frontend/src/pages/Backtester.jsx`)
- **Features:**
  - Symbol input with autoconvert to uppercase
  - Asset type selector (Stock/Crypto)
  - Strategy selector (Buy & Hold, SMA Crossover)
  - Date range picker with custom dates
  - Quick-select preset buttons (1yr, 3yr, 5yr, 10yr, 20yr)
  - Loading state during backtest execution
  - Error handling with user-friendly messages
  - Auto-scroll to results when ready

#### 2. Backtest Results Component (`frontend/src/components/BacktestResults.jsx`)
- **Display Sections:**
  1. **Summary Cards:**
     - Total Return (with color coding)
     - Annual Return
     - Sharpe Ratio (with "Good/Moderate" indicator)
     - Max Drawdown
     - Win Rate with trade count

  2. **Benchmark Comparison:**
     - Strategy Return vs S&P 500 Return
     - Outperformance metrics
     - Success/underperformance indicators

  3. **Equity Curve Chart:**
     - Area chart with gradient
     - Starting value normalized to 100%
     - Hover tooltips with exact values
     - Interactive with zoom/pan capability

  4. **Monte Carlo Simulation Results:**
     - Best Case (95th percentile)
     - Median Scenario
     - Worst Case (5th percentile)
     - Standard Deviation

  5. **Monthly Returns Heatmap:**
     - Year-by-month visualization
     - Color-coded returns (dark green for +5%+, light green for positive, red for negative)
     - Hover tooltips with exact values
     - Compact display for multi-year results

  6. **Trades Table:**
     - Entry/Exit dates and prices
     - Return percentage per trade
     - Duration in days
     - Sorted by magnitude of return
     - Limited to 20 most significant trades with disclosure
     - Expandable for full list

## Testing Instructions

### 1. Test Data Setup
No special setup needed - system fetches real historical data from:
- **Stocks:** yfinance (Yahoo Finance)
- **Crypto:** CoinGecko (free API, no authentication required)

### 2. Recommended Test Cases

#### Test 1: BTC 5-Year Backtest
```
Symbol: BTC
Asset Type: Crypto
Period: 5 Years (preset button)
Strategy: Buy & Hold
Expected Results:
- High total return (BTC performed well historically)
- Moderate to high Sharpe ratio
- Significant volatility (high drawdown expected)
- Single trade (buy at start, sell at end)
- Comparison showing likely outperformance vs S&P500
```

#### Test 2: AAPL 10-Year Backtest
```
Symbol: AAPL
Asset Type: Stock
Period: 10 Years (preset button)
Strategy: Buy & Hold
Expected Results:
- Strong total return (AAPL trending upward)
- Good Sharpe ratio (stable growth)
- Moderate drawdown
- Single trade
- Outperformance vs S&P500
```

#### Test 3: SPY 20-Year Backtest
```
Symbol: SPY
Asset Type: Stock
Period: 20 Years (preset button)
Strategy: Buy & Hold
Expected Results:
- Solid returns (~300-400% over 20 years)
- Moderate Sharpe ratio
- Can compare 1-to-1 if also running as benchmark
- Long-term trend visualization
```

#### Test 4: AAPL SMA Crossover
```
Symbol: AAPL
Asset Type: Stock
Period: 5 Years
Strategy: SMA Crossover (20/50)
Expected Results:
- Multiple trades (not just buy & hold)
- Win rate percentage
- Comparison to buy & hold strategy
- Monthly returns showing trading activity
- Monte Carlo simulation with range of outcomes
```

#### Test 5: BTC SMA Crossover
```
Symbol: BTC
Asset Type: Crypto
Period: 5 Years
Strategy: SMA Crossover
Expected Results:
- Many trades (crypto is volatile)
- Mixed win/loss trades
- Comparison to buy & hold
- High volatility in returns
- Monte Carlo showing wide range of outcomes
```

### 3. Manual Testing Steps

1. **Login to the application**
   - Navigate to `/backtester` route or click "Backtester" in Tools menu

2. **Run BTC 5-Year Test:**
   - Input: Symbol = BTC, Asset Type = Crypto, Strategy = Buy & Hold
   - Click "5 Years" preset
   - Click "Run Backtest"
   - Wait for results (should take 5-10 seconds for first run, faster on subsequent runs due to caching)

3. **Verify Results Display:**
   - Summary cards appear with correct metrics
   - Equity curve chart loads and shows starting value of ~1.0
   - Benchmark comparison shows S&P500 return for comparison
   - Monte Carlo stats show reasonable range (best case > median > worst case)
   - Monthly returns heatmap visualizes returns by month
   - Trades list shows buy/sell transactions

4. **Test Error Handling:**
   - Try invalid symbol: "INVALID123"
   - Try invalid date range: Start > End
   - Verify error message appears

5. **Test Caching:**
   - Run same backtest twice
   - Second run should be significantly faster (cached data)
   - Check database table `historical_prices` for stored data

### 4. Performance Metrics to Observe

**Sharpe Ratio Interpretation:**
- > 1.0: Good risk-adjusted returns
- 0.5 - 1.0: Moderate
- < 0.5: Poor

**Max Drawdown Interpretation:**
- 0 - 10%: Excellent (very stable)
- 10 - 20%: Good
- 20 - 40%: Moderate
- > 40%: Risky

**Win Rate Interpretation:**
- > 50%: More winning trades than losing
- < 50%: More losing trades (but might have high average win size)

### 5. Database Verification

```sql
-- Check backtest records
SELECT id, symbol, asset_type, strategy, total_return_percent, sharpe_ratio 
FROM backtests 
ORDER BY created_at DESC 
LIMIT 5;

-- Check cached historical prices
SELECT COUNT(*) as price_count, symbol, asset_type 
FROM historical_prices 
GROUP BY symbol, asset_type;
```

## API Usage Examples

### Example 1: Run Backtest
```bash
curl -X POST http://localhost:8000/api/backtest/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d {
    "symbol": "BTC",
    "asset_type": "crypto",
    "start_date": "2019-04-01T00:00:00Z",
    "end_date": "2024-04-01T00:00:00Z",
    "strategy": "buy_and_hold"
  }
```

### Example 2: Get Backtest Results
```bash
curl http://localhost:8000/api/backtest/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: List User Backtests
```bash
curl http://localhost:8000/api/backtest?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Known Limitations

1. **Data Availability:**
   - Some cryptocurrencies may have limited historical data
   - For daily data, CoinGecko free API limited to ~4 years

2. **Strategy Complexity:**
   - Currently implements buy_and_hold and simple SMA crossover
   - More complex strategies can be added to `backtest_service.py`

3. **Backtesting Assumptions:**
   - No slippage modeling
   - No transaction costs
   - Assumes perfect execution at closing price
   - No position sizing (always goes all-in)

4. **Monte Carlo Limitations:**
   - Uses normal distribution assumption
   - Based on historical returns as proxy for future

## Future Enhancements

1. **Additional Strategies:**
   - RSI overbought/oversold
   - MACD crossovers
   - Bollinger Band mean reversion

2. **Advanced Features:**
   - Transaction cost modeling
   - Portfolio backtesting (multiple assets)
   - Parameter optimization
   - Walk-forward analysis

3. **Performance:**
   - Vectorized calculations for large datasets
   - Async backtest execution
   - Background job processing for long-running backtests

4. **Risk Management:**
   - Stop-loss implementation
   - Position sizing strategies
   - Correlation analysis across strategies

## Troubleshooting

### Issue: "No data found for symbol"
- **Cause:** Symbol not found or doesn't have historical data for period
- **Solution:** Verify symbol spelling, try different time period

### Issue: Backtest takes too long
- **Cause:** Data not cached, fetching from API
- **Solution:** First run is slower, subsequent runs use cache. Check network connectivity

### Issue: NaN in Sharpe Ratio or other metrics
- **Cause:** Insufficient data or zero variance in returns
- **Solution:** Use longer time period, avoid very short backtests

### Issue: Monte Carlo shows same value for all scenarios
- **Cause:** Very low volatility in historical data
- **Solution:** Normal for stable assets, try more volatile asset or longer period

## Support

For issues or feature requests, please contact development team with:
- Symbol tested
- Time period used
- Strategy selected
- Error message (if any)
