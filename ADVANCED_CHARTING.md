# Advanced Charting System - AssetPulse

## Overview
Professional-grade charting system with 50+ technical indicators, real-time price updates, and interactive analysis tools built with TradingView Lightweight Charts library.

## Features

### 1. Chart Component (`frontend/src/components/AdvancedChart.jsx`)
- **Candlestick Charts**: Full OHLCV data visualization
- **Multiple Timeframes**: 1min, 5min, 15min, 1hour, 4hour, 1day, 1week, 1month
- **Real-time Updates**: Updates every 5 seconds
- **Dark Mode**: Fully compatible with dark/light themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Drawing Tools**: Support for annotations and overlay
- **Export Functionality**: Download charts as PNG

### 2. Technical Indicators (50+)

#### Moving Averages
- SMA (Simple Moving Average) - 20, 50, 200 periods
- EMA (Exponential Moving Average) - 12, 26 periods  
- WMA (Weighted Moving Average) - 20 periods

#### Momentum Indicators
- RSI (Relative Strength Index) - 14 periods
- MACD (Moving Average Convergence Divergence)
- Stochastic Oscillator (%K, %D)
- Rate of Change (ROC) - 12 periods

#### Volatility Indicators
- Bollinger Bands - Upper, Middle, Lower bands
- ATR (Average True Range) - 14 periods

#### Trend Indicators
- ADX (Average Directional Index) - 14 periods
- CCI (Commodity Channel Index) - 20 periods
- Williams %R - 14 periods

#### Volume Indicators
- OBV (On Balance Volume)
- VPT (Volume Price Trend)
- MFI (Money Flow Index) - 14 periods

### 3. Analysis Tools

#### Support & Resistance Levels
- Automatic pivot point calculation
- Dynamic support/resistance detection
- Multiple level identification (R1, R2, S1, S2)
- Visual level display on chart

#### Volume Analysis
- Volume statistics (average, current, ratio)
- High volume candle identification
- Volume trend visualization
- OBV and MFI overlays

#### Chart Analyzer Page (`frontend/src/pages/ChartAnalyzer.jsx`)
- Symbol search across stocks and crypto
- Multi-timeframe analysis
- Indicator selector with multi-select
- Real-time support/resistance display
- Volume analysis panel
- Trading tips and analysis guide

## File Structure

### Backend
```
backend/app/
├── services/
│   └── indicators_service.py      # 50+ indicator calculations
└── routers/
    └── chart.py                    # API endpoints
```

### Frontend
```
frontend/src/
├── components/
│   └── AdvancedChart.jsx           # Main chart component
└── pages/
    └── ChartAnalyzer.jsx           # Full chart analyzer page
```

## API Endpoints

### Chart Data
```
GET /api/chart/ohlcv
  Parameters:
    - symbol: string (required, e.g., "AAPL")
    - timeframe: string (default: "1day")
      Options: 1min, 5min, 15min, 1hour, 4hour, 1day, 1week, 1month
  
  Response:
    {
      "symbol": "AAPL",
      "timeframe": "1day",
      "data": [
        {
          "timestamp": 1234567890,
          "open": 150.0,
          "high": 152.5,
          "low": 149.8,
          "close": 151.2,
          "volume": 50000000
        },
        ...
      ]
    }
```

### Technical Indicators
```
GET /api/chart/indicators
  Parameters:
    - symbol: string (required)
    - timeframe: string (default: "1day")
    - indicators: array of strings (optional, comma-separated)
  
  Response:
    {
      "symbol": "AAPL",
      "timeframe": "1day",
      "indicators": {
        "moving_averages": {
          "sma20": [150.2, 150.5, 150.8, ...],
          "sma50": [149.8, 150.1, 150.3, ...],
          "ema12": [150.3, 150.6, 150.9, ...]
        },
        "momentum": {
          "rsi14": [45.2, 48.3, 52.1, ...],
          "macd": [0.45, 0.52, 0.61, ...]
        },
        "volatility": {
          "bb_upper": [153.2, 153.5, 153.8, ...],
          "bb_lower": [148.2, 148.5, 148.8, ...]
        },
        "trend": { ... },
        "volume": { ... }
      }
    }
```

### Support & Resistance
```
GET /api/chart/support-resistance
  Parameters:
    - symbol: string (required)
    - timeframe: string (default: "1day")
  
  Response:
    {
      "symbol": "AAPL",
      "timeframe": "1day",
      "pivot_points": {
        "pivot": 151.0,
        "resistance1": 152.5,
        "resistance2": 154.0,
        "support1": 149.5,
        "support2": 148.0
      },
      "resistance_levels": [152.5, 153.2, 154.0],
      "support_levels": [149.5, 148.8, 148.0],
      "current_price": 151.2
    }
```

### Volume Analysis
```
GET /api/chart/volume-analysis
  Parameters:
    - symbol: string (required)
    - timeframe: string (default: "1day")
  
  Response:
    {
      "symbol": "AAPL",
      "timeframe": "1day",
      "obv": [12345670, 12345890, ...],
      "mfi": [55.2, 58.3, 62.1, ...],
      "volume_stats": {
        "average_volume": 50000000,
        "current_volume": 75000000,
        "volume_ratio": 1.5,
        "high_volume_threshold": 75000000
      },
      "high_volume_candles": [0, 2, 5, 8]
    }
```

## Usage

### Basic Chart Display
```jsx
import AdvancedChart from '../components/AdvancedChart';

export default function MyChart() {
  const [timeframe, setTimeframe] = useState('1day');
  
  return (
    <AdvancedChart
      symbol="AAPL"
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      height={600}
    />
  );
}
```

### Accessing Chart Analyzer Page
- Navigate to `/chart` for full analyzer
- Navigate to `/chart/SYMBOL` to view specific symbol
- Use symbol search to switch between assets
- Select timeframe using quick-select buttons
- Click indicators to add/remove from chart

## Implementation Details

### Indicator Calculation
The `IndicatorsService` class provides:
- Efficient numpy-based calculations
- Proper handling of edge cases
- Consistent data formatting
- Cached computations (5-minute TTL)

### Chart Rendering
- Uses TradingView Lightweight Charts for performance
- Handles large datasets efficiently
- Real-time price updates via API
- Smooth animations and transitions
- Responsive to window resizing

### Data Flow
1. User selects symbol and timeframe
2. Frontend requests OHLCV data from `/api/chart/ohlcv`
3. Backend fetches data via yfinance
4. Frontend requests indicators from `/api/chart/indicators`
5. Backend calculates indicators using numpy
6. Chart renders candlesticks + selected indicators
7. Support/resistance and volume analysis fetch simultaneously
8. All data updates every 5 seconds

## Performance Optimization
- Lazy indicator calculation (only requested indicators computed)
- Efficient array operations using numpy
- Frontend data caching with React hooks
- Responsive throttling on resize events
- Lazy loading of heavy components

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (v14+)
- Mobile browsers: Full support

## Installation & Setup

### Backend Dependencies
Already included in requirements.txt:
- yfinance
- numpy
- pandas
- FastAPI

### Frontend Dependencies
```bash
cd frontend
npm install lightweight-charts
```

### Running the System
```bash
# Backend (from project root)
cd backend
uvicorn app.main:app --reload

# Frontend (from project root)
cd frontend
npm run dev
```

## Integration with Other Pages

### From Markets Page
Click on any symbol → Opens ChartAnalyzer with that symbol

### From Prediction Page
Shows chart with prediction overlay displaying predicted direction

### From Leaderboard
User profile includes symbol charts from their portfolio

## Technical Stack
- **Frontend**: React 18, Lightweight-Charts, Tailwind CSS
- **Backend**: FastAPI, NumPy, Pandas, yfinance
- **Data**: Real-time stock/crypto prices via yfinance
- **Caching**: Memory-based (5 min TTL)

## Future Enhancements
- Drawing tools (trend lines, channels, fibs)
- Advanced order types visualization
- Custom indicator creation
- Alert integration with chart
- Historical pattern recognition
- Multi-symbol correlation analysis
- Real-time WebSocket updates
- Chart layout persistence (localStorage)

## Troubleshooting

### Chart Not Rendering
1. Check browser console for errors
2. Ensure symbol exists (try "AAPL" or "BTC")
3. Verify API is running (`/api/health`)
4. Check CORS settings in backend

### No Indicator Data
1. Verify at least 50 candles available
2. Check timeframe supports data range
3. Some indicators need 200+ candles

### Performance Issues
1. Reduce number of selected indicators
2. Use longer timeframes (1day, 1week)
3. Clear browser cache
4. Close other heavy applications

## Contributing
To add new indicators:
1. Add calculation method to `IndicatorsService` class
2. Add to `get_all_indicators()` method
3. Add to `INDICATORS_AVAILABLE` in `AdvancedChart.jsx`
4. Add configuration (color, type, etc.)
5. Test with various symbols/timeframes
