"""
Chart API Routes
Endpoints for charting and technical analysis data
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import yfinance as yf
import pandas as pd

from ..services.indicators_service import IndicatorsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chart", tags=["chart"])


def get_ohlcv_data(symbol: str, period: str = '1y', interval: str = '1d') -> List[dict]:
    """Fetch OHLCV data from yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            raise ValueError(f"No data found for {symbol}")

        data = []
        for idx, row in hist.iterrows():
            data.append({
                'timestamp': int(idx.timestamp()),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume']),
            })

        return data
    except Exception as e:
        logger.error(f"Error fetching OHLCV data for {symbol}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


def convert_interval_to_period(timeframe: str, days: int = 365) -> tuple:
    """Convert timeframe to yfinance period and interval"""
    interval_map = {
        '1min': ('5d', '1m'),
        '5min': ('60d', '5m'),
        '15min': ('60d', '15m'),
        '1hour': ('730d', '1h'),
        '4hour': ('730d', '4h'),
        '1day': ('10y', '1d'),
        '1week': ('10y', '1wk'),
        '1month': ('10y', '1mo'),
    }
    return interval_map.get(timeframe, ('1y', '1d'))


@router.get('/ohlcv')
async def get_ohlcv(
    symbol: str = Query(...),
    timeframe: str = Query('1day', description="1min, 5min, 15min, 1hour, 4hour, 1day, 1week, 1month"),
):
    """Get OHLCV candlestick data"""
    try:
        period, interval = convert_interval_to_period(timeframe)
        data = get_ohlcv_data(symbol.upper(), period=period, interval=interval)
        return {
            'symbol': symbol.upper(),
            'timeframe': timeframe,
            'data': data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/indicators')
async def get_indicators(
    symbol: str = Query(...),
    timeframe: str = Query('1day'),
    indicators: Optional[List[str]] = Query(None, description="Specific indicators to calculate"),
):
    """Calculate technical indicators for a symbol"""
    try:
        period, interval = convert_interval_to_period(timeframe)
        ohlcv_data = get_ohlcv_data(symbol.upper(), period=period, interval=interval)

        if not ohlcv_data:
            raise HTTPException(status_code=404, detail="No data found")

        all_indicators = IndicatorsService.get_all_indicators(ohlcv_data)

        if indicators:
            filtered = {}
            for cat in all_indicators:
                if cat in indicators:
                    filtered[cat] = all_indicators[cat]
            return {
                'symbol': symbol.upper(),
                'timeframe': timeframe,
                'indicators': filtered
            }

        return {
            'symbol': symbol.upper(),
            'timeframe': timeframe,
            'indicators': all_indicators
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating indicators: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/support-resistance')
async def get_support_resistance(
    symbol: str = Query(...),
    timeframe: str = Query('1day'),
):
    """Calculate support and resistance levels"""
    try:
        period, interval = convert_interval_to_period(timeframe)
        ohlcv_data = get_ohlcv_data(symbol.upper(), period=period, interval=interval)

        if not ohlcv_data:
            raise HTTPException(status_code=404, detail="No data found")

        closes = [item['close'] for item in ohlcv_data[-100:]]  # Last 100 candles
        highs = [item['high'] for item in ohlcv_data[-100:]]
        lows = [item['low'] for item in ohlcv_data[-100:]]

        # Calculate pivot points
        high = max(highs)
        low = min(lows)
        close = closes[-1]

        pivot = (high + low + close) / 3
        r1 = (2 * pivot) - low
        r2 = pivot + (high - low)
        s1 = (2 * pivot) - high
        s2 = pivot - (high - low)

        # Find support and resistance from recent price action
        recent_closes = closes[-30:] if len(closes) >= 30 else closes
        resistance_levels = sorted(set(round(h, 2) for h in highs[-30:]), reverse=True)[:3]
        support_levels = sorted(set(round(l, 2) for l in lows[-30:]))[:3]

        return {
            'symbol': symbol.upper(),
            'timeframe': timeframe,
            'pivot_points': {
                'pivot': round(pivot, 2),
                'resistance1': round(r1, 2),
                'resistance2': round(r2, 2),
                'support1': round(s1, 2),
                'support2': round(s2, 2),
            },
            'resistance_levels': resistance_levels,
            'support_levels': support_levels,
            'current_price': close,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating support/resistance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/volume-analysis')
async def get_volume_analysis(
    symbol: str = Query(...),
    timeframe: str = Query('1day'),
):
    """Analyze volume patterns"""
    try:
        period, interval = convert_interval_to_period(timeframe)
        ohlcv_data = get_ohlcv_data(symbol.upper(), period=period, interval=interval)

        if not ohlcv_data:
            raise HTTPException(status_code=404, detail="No data found")

        closes = [item['close'] for item in ohlcv_data]
        volumes = [item['volume'] for item in ohlcv_data]
        highs = [item['high'] for item in ohlcv_data]
        lows = [item['low'] for item in ohlcv_data]

        # Calculate volume indicators
        obv = IndicatorsService.obv(closes, volumes)
        mfi = IndicatorsService.mfi(highs, lows, closes, volumes)

        # Volume statistics
        avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1

        # Identify high volume candles
        high_volume_threshold = avg_volume * 1.5
        high_volume_indices = [i for i, v in enumerate(volumes[-30:]) if v > high_volume_threshold]

        return {
            'symbol': symbol.upper(),
            'timeframe': timeframe,
            'obv': obv[-50:] if len(obv) >= 50 else obv,
            'mfi': mfi[-50:] if len(mfi) >= 50 else mfi,
            'volume_stats': {
                'average_volume': round(avg_volume),
                'current_volume': current_volume,
                'volume_ratio': round(volume_ratio, 2),
                'high_volume_threshold': round(high_volume_threshold),
            },
            'high_volume_candles': high_volume_indices,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing volume: {e}")
        raise HTTPException(status_code=500, detail=str(e))
