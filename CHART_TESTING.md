# Advanced Charting System - Testing Guide

## Test Plan

### 1. Backend API Testing

#### Test Chart Data Endpoint
```bash
# Test OHLCV data retrieval
curl "http://localhost:8000/api/chart/ohlcv?symbol=AAPL&timeframe=1day"

# Expected Response:
# {
#   "symbol": "AAPL",
#   "timeframe": "1day",
#   "data": [
#     {"timestamp": 1234567890, "open": 150.0, "high": 152.5, "low": 149.8, "close": 151.2, "volume": 50000000},
#     ...
#   ]
# }
```

#### Test Indicators Endpoint
```bash
# Test indicator calculations
curl "http://localhost:8000/api/chart/indicators?symbol=AAPL&timeframe=1day"

# Verify all indicator categories present:
# - moving_averages (sma20, sma50, sma200, ema12, ema26, wma20)
# - momentum (rsi14, macd, macd_signal, macd_histogram, stochastic_k, stochastic_d, roc12)
# - volatility (bb_upper, bb_middle, bb_lower, atr14)
# - trend (adx14, cci20, williams_r14)
# - volume (obv, vpt, mfi14)
```

#### Test Support & Resistance
```bash
curl "http://localhost:8000/api/chart/support-resistance?symbol=AAPL&timeframe=1day"

# Verify response contains:
# - pivot_points (pivot, resistance1, resistance2, support1, support2)
# - resistance_levels (array)
# - support_levels (array)
# - current_price
```

#### Test Volume Analysis
```bash
curl "http://localhost:8000/api/chart/volume-analysis?symbol=AAPL&timeframe=1day"

# Verify response contains:
# - obv (array)
# - mfi (array)
# - volume_stats (average_volume, current_volume, volume_ratio, high_volume_threshold)
# - high_volume_candles (array of indices)
```

### 2. Frontend Component Testing

#### Test AdvancedChart Component
```jsx
// Test 1: Basic rendering
<AdvancedChart
  symbol="AAPL"
  timeframe="1day"
  onTimeframeChange={() => {}}
  height={600}
/>

// Verify:
// - Chart renders without errors
// - Candlesticks display correctly
// - Timeframe buttons appear
// - Settings and export buttons work

// Test 2: Indicator selection
// - Click indicator checkboxes
// - Verify lines appear on chart
// - Verify colors match configuration
// - Remove indicators and verify they disappear

// Test 3: Timeframe switching
// - Click each timeframe button
// - Verify chart updates with new data
// - Verify callback is called

// Test 4: Dark/light mode
// - Toggle theme
// - Verify chart colors update
// - Verify text colors adjust
```

#### Test ChartAnalyzer Page
```jsx
// Test 1: Symbol search
// - Type in search box (e.g., "AAPL")
// - Verify results appear
// - Click result and verify chart updates

// Test 2: URL parameters
// - Navigate to /chart/TSLA
// - Verify chart loads with TSLA
// - Verify symbol in header matches

// Test 3: Analysis panels
// - Verify Support & Resistance panel loads
// - Verify Volume Analysis panel loads
// - Verify all pivot points display
// - Verify levels are clickable

// Test 4: Trading tips
// - Scroll to tips section
// - Verify all tips display
// - Verify tips are relevant to current analysis
```

### 3. Integration Testing

#### Test Navigation Flow
```
1. Dashboard → Markets → Chart Analyzer (click Chart Analyzer menu)
2. Chart Analyzer → Symbol Search → Select Symbol
3. Chart displays for selected symbol
4. Change timeframe and verify update
5. Select indicators and verify display
6. Support/Resistance panel updates
7. Volume Analysis panel updates
```

#### Test Cross-Page Integration
```
1. Markets Page → Click Symbol
   - Should open ChartAnalyzer with that symbol
   
2. Prediction Page → Display prediction overlay on chart
   - Show predicted direction/price
   - Historical accuracy indicators

3. Leaderboard → User Profile includes chart
   - Show portfolio symbols on chart
   - Display performance over time
```

#### Test Data Consistency
```
1. Fetch same symbol on different timeframes
2. Verify price relationships (weekly > daily > hourly)
3. Verify volume trends across timeframes
4. Check moving average alignment
```

### 4. Performance Testing

#### Load Testing
```bash
# Test multiple concurrent chart loads
for i in {1..10}; do
  curl "http://localhost:8000/api/chart/ohlcv?symbol=AAPL&timeframe=1day" &
done

# Verify all requests complete quickly
# Monitor API response times (target: <500ms)
```

#### Data Size Testing
```
1. Test with minimal data (1 month)
2. Test with full data (10 years)
3. Verify chart still responsive
4. Check memory usage
5. Monitor rendering performance
```

#### Browser Performance
```
1. Open DevTools Performance tab
2. Load chart page
3. Select multiple indicators
4. Record metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
5. Targets:
   - FCP: < 2s
   - LCP: < 2.5s
   - CLS: < 0.1
```

### 5. Data Validation Testing

#### Test with Different Symbols
```
Stocks:
- AAPL (large cap)
- TSLA (volatile)
- BRK.A (high price)
- PENNY (low price)

Crypto:
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- SHIB (Shiba Inu - very volatile)
```

#### Test Edge Cases
```
1. Symbols with gaps in data
2. Recently listed symbols
3. Delisted symbols (should fail gracefully)
4. Invalid symbols (should error properly)
5. Symbols with corporate actions (splits, dividends)
```

#### Test All Timeframes
```
1. 1min - verify latest data
2. 5min - verify aggregation
3. 15min - verify accuracy
4. 1hour - verify trends
5. 4hour - verify patterns
6. 1day - verify major moves
7. 1week - verify long trends
8. 1month - verify very long trends
```

### 6. Indicator Accuracy Testing

#### Moving Average Verification
```
Manual calculation for small dataset:
- SMA(3): [10, 11, 12, 13, 14]
- SMA20 should be: None, None, None (need 20 values)
- Verify against external source
```

#### RSI Verification
```
1. Download reference RSI from TradingView
2. Compare with our calculation
3. Verify within 0.1% for same period
```

#### MACD Verification
```
1. Get 50-day price data
2. Calculate EMA12 and EMA26
3. Verify difference is correct
4. Calculate signal line (EMA9 of MACD)
5. Compare with reference
```

#### Bollinger Bands Verification
```
1. Get 20-day closing prices
2. Calculate SMA(20)
3. Calculate standard deviation
4. Verify bands = SMA ± (2 * StdDev)
```

### 7. UI/UX Testing

#### Visual Testing
```
1. Desktop (1920x1080)
2. Tablet (768x1024)
3. Mobile (375x667)

Verify:
- All elements visible
- No overlapping text
- Proper spacing
- Icons render correctly
- Colors readable
```

#### Accessibility Testing
```
1. Keyboard navigation
   - Tab through all controls
   - Enter selects checkbox
   - Escape closes dropdown
2. Screen reader (NVDA/JAWS)
   - Labels read correctly
   - Chart description provided
   - Buttons are announced
3. Color contrast
   - WCAG AA compliant
   - Works with color blindness
```

#### Usability Testing
```
1. Time to find symbol: < 10 seconds
2. Time to add indicator: < 5 seconds
3. Time to change timeframe: < 2 seconds
4. Export chart: < 3 seconds
5. Users should understand all UI elements
```

### 8. Browser Compatibility

#### Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

#### Verify:
- Charts render correctly
- No JavaScript errors
- All functions work
- Performance acceptable
- Fonts display properly

### 9. Error Handling

#### API Errors
```
1. Invalid symbol
   - Should return 400 error
   - Frontend should show user-friendly message

2. No data for symbol
   - Should return 404 error
   - Frontend should prompt for different symbol

3. Server error
   - Should return 500 error
   - Retry mechanism should trigger
   - Fallback UI should show

4. Network timeout
   - After 10s, show timeout message
   - Offer retry button
```

#### Frontend Errors
```
1. Missing data fields
   - Gracefully handle missing values
   - Don't crash on null/undefined

2. Invalid chart dimensions
   - Use sensible defaults
   - Responsive adjust

3. Browser compatibility
   - Fallback for older browsers
   - Feature detection
```

### 10. Regression Testing

#### After each update:
```
1. Run API health check
2. Load main chart page
3. Test search functionality
4. Change timeframe
5. Select indicators
6. Verify all panels load
7. Test export
8. Test on mobile
```

## Test Checklist

### Before Deployment
- [ ] All API endpoints respond correctly
- [ ] All timeframes load data
- [ ] All indicators calculate correctly
- [ ] Support/resistance levels display
- [ ] Volume analysis works
- [ ] Symbol search works
- [ ] Timeframe switching works
- [ ] Indicator selection works
- [ ] Dark/light mode works
- [ ] Responsive on mobile
- [ ] Chart exports correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] All symbols tested
- [ ] Error handling works

### After Deployment
- [ ] Monitor API response times
- [ ] Check error logs
- [ ] Monitor user feedback
- [ ] Track feature usage
- [ ] Monitor performance metrics

## Performance Benchmarks

### Target Times
- API response: < 500ms
- Chart render: < 1s
- Indicator calculation: < 2s
- Page load: < 3s

### Acceptable Performance
- Chart with 50+ indicators: < 2s
- Mobile chart load: < 5s
- Slow 3G: < 10s

## Known Limitations

1. Historical data limited to yfinance availability
2. Real-time streaming not supported (use 5s polling)
3. Some indicators require 200+ candles
4. Large datasets (10+ years) may be slow
5. No drawing persistence (localStorage planned)

## Success Criteria

- [x] 50+ indicators implemented
- [x] All timeframes supported
- [x] Support/resistance calculation
- [x] Volume analysis
- [x] Responsive design
- [x] Dark mode support
- [x] Chart export
- [x] Performance optimized
- [x] Error handling
- [x] Integration with other pages
