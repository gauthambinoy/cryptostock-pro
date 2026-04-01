"""
Technical Indicators Service
Provides 50+ technical indicators for chart analysis
"""
import logging
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from functools import lru_cache
import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


class IndicatorsService:
    """Service for calculating technical indicators"""

    # Cache calculations for 5 minutes
    CACHE_TTL = 300

    @staticmethod
    def validate_ohlcv(data: List[Dict]) -> bool:
        """Validate OHLCV data structure"""
        if not data:
            return False
        required_keys = {'open', 'high', 'low', 'close', 'volume'}
        return all(all(key in item for key in required_keys) for item in data)

    # ============== Moving Averages ==============

    @staticmethod
    def sma(data: List[float], period: int = 20) -> List[Optional[float]]:
        """Simple Moving Average"""
        if len(data) < period:
            return [None] * len(data)
        result = [None] * (period - 1)
        for i in range(period - 1, len(data)):
            result.append(np.mean(data[i - period + 1:i + 1]))
        return result

    @staticmethod
    def ema(data: List[float], period: int = 20) -> List[Optional[float]]:
        """Exponential Moving Average"""
        if len(data) < period:
            return [None] * len(data)

        multiplier = 2 / (period + 1)
        ema_values = [None] * (period - 1)
        sma_val = np.mean(data[:period])
        ema_values.append(sma_val)

        for i in range(period, len(data)):
            ema_val = data[i] * multiplier + ema_values[-1] * (1 - multiplier)
            ema_values.append(ema_val)

        return ema_values

    @staticmethod
    def wma(data: List[float], period: int = 20) -> List[Optional[float]]:
        """Weighted Moving Average"""
        if len(data) < period:
            return [None] * len(data)

        weights = np.arange(1, period + 1)
        result = [None] * (period - 1)

        for i in range(period - 1, len(data)):
            window = data[i - period + 1:i + 1]
            wma_val = np.sum(np.array(window) * weights) / np.sum(weights)
            result.append(wma_val)

        return result

    # ============== Momentum Indicators ==============

    @staticmethod
    def rsi(data: List[float], period: int = 14) -> List[Optional[float]]:
        """Relative Strength Index"""
        if len(data) < period + 1:
            return [None] * len(data)

        deltas = np.diff(data)
        gains = [max(d, 0) for d in deltas]
        losses = [abs(min(d, 0)) for d in deltas]

        result = [None] * period
        avg_gain = np.mean(gains[:period])
        avg_loss = np.mean(losses[:period])

        for i in range(period, len(data)):
            if i == period:
                rs = avg_gain / avg_loss if avg_loss != 0 else 0
            else:
                avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
                avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period
                rs = avg_gain / avg_loss if avg_loss != 0 else 0

            rsi_val = 100 - (100 / (1 + rs)) if rs >= 0 else 100
            result.append(rsi_val)

        return result

    @staticmethod
    def macd(data: List[float],
             fast: int = 12, slow: int = 26,
             signal: int = 9) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        """MACD - Moving Average Convergence Divergence"""
        if len(data) < slow:
            return ([None] * len(data), [None] * len(data), [None] * len(data))

        ema_fast = IndicatorsService.ema(data, fast)
        ema_slow = IndicatorsService.ema(data, slow)

        macd_line = [None] * len(data)
        for i in range(slow - 1, len(data)):
            if ema_fast[i] is not None and ema_slow[i] is not None:
                macd_line[i] = ema_fast[i] - ema_slow[i]

        signal_line = IndicatorsService.ema(
            [x for x in macd_line if x is not None],
            signal
        )

        # Pad signal line
        signal_padded = [None] * (len(data) - len(signal_line)) + signal_line

        # Histogram
        histogram = [None] * len(data)
        for i in range(len(data)):
            if macd_line[i] is not None and signal_padded[i] is not None:
                histogram[i] = macd_line[i] - signal_padded[i]

        return (macd_line, signal_padded, histogram)

    @staticmethod
    def stochastic(high: List[float], low: List[float], close: List[float],
                   period: int = 14, smoothK: int = 3, smoothD: int = 3) -> Tuple[List[Optional[float]], List[Optional[float]]]:
        """Stochastic Oscillator"""
        if len(high) < period:
            return ([None] * len(close), [None] * len(close))

        k_values = []
        for i in range(period - 1, len(close)):
            high_max = max(high[i - period + 1:i + 1])
            low_min = min(low[i - period + 1:i + 1])

            if high_max == low_min:
                k = 50
            else:
                k = 100 * (close[i] - low_min) / (high_max - low_min)
            k_values.append(k)

        # Pad
        k_values = [None] * (period - 1) + k_values

        # Smooth K
        k_smoothed = IndicatorsService.sma(
            [x for x in k_values if x is not None],
            smoothK
        )
        k_smoothed = [None] * (len(k_values) - len(k_smoothed)) + k_smoothed

        # Smooth D (of K)
        d_smoothed = IndicatorsService.sma(
            [x for x in k_smoothed if x is not None],
            smoothD
        )
        d_smoothed = [None] * (len(k_smoothed) - len(d_smoothed)) + d_smoothed

        return (k_smoothed, d_smoothed)

    # ============== Volatility Indicators ==============

    @staticmethod
    def bollinger_bands(data: List[float], period: int = 20,
                       num_std: float = 2.0) -> Tuple[List[Optional[float]], List[Optional[float]], List[Optional[float]]]:
        """Bollinger Bands"""
        if len(data) < period:
            return ([None] * len(data), [None] * len(data), [None] * len(data))

        sma_vals = IndicatorsService.sma(data, period)

        upper = [None] * len(data)
        lower = [None] * len(data)

        for i in range(period - 1, len(data)):
            window = data[i - period + 1:i + 1]
            std_dev = np.std(window)
            middle = sma_vals[i]

            upper[i] = middle + (std_dev * num_std)
            lower[i] = middle - (std_dev * num_std)

        return (upper, sma_vals, lower)

    @staticmethod
    def atr(high: List[float], low: List[float], close: List[float],
            period: int = 14) -> List[Optional[float]]:
        """Average True Range"""
        if len(high) < period:
            return [None] * len(close)

        tr_values = []
        for i in range(len(high)):
            if i == 0:
                tr = high[i] - low[i]
            else:
                tr = max(
                    high[i] - low[i],
                    abs(high[i] - close[i - 1]),
                    abs(low[i] - close[i - 1])
                )
            tr_values.append(tr)

        result = [None] * (period - 1)
        atr_val = np.mean(tr_values[:period])
        result.append(atr_val)

        for i in range(period, len(tr_values)):
            atr_val = (atr_val * (period - 1) + tr_values[i]) / period
            result.append(atr_val)

        return result

    # ============== Trend Indicators ==============

    @staticmethod
    def adx(high: List[float], low: List[float], close: List[float],
            period: int = 14) -> List[Optional[float]]:
        """Average Directional Index"""
        if len(high) < period + 1:
            return [None] * len(close)

        # Calculate Plus and Minus DM
        plus_dm = []
        minus_dm = []

        for i in range(1, len(high)):
            up = high[i] - high[i - 1]
            down = low[i - 1] - low[i]

            plus = up if (up > 0 and up > down) else 0
            minus = down if (down > 0 and down > up) else 0

            plus_dm.append(plus)
            minus_dm.append(minus)

        # Calculate TR for normalization
        tr_values = []
        for i in range(1, len(high)):
            tr = max(
                high[i] - low[i],
                abs(high[i] - close[i - 1]),
                abs(low[i] - close[i - 1])
            )
            tr_values.append(tr)

        # Calculate DI
        result = [None]
        plus_di_sum = sum(plus_dm[:period])
        minus_di_sum = sum(minus_dm[:period])
        tr_sum = sum(tr_values[:period])

        for i in range(period, len(tr_values)):
            if i > period:
                plus_di_sum = plus_di_sum - plus_dm[i - period] + plus_dm[i - 1]
                minus_di_sum = minus_di_sum - minus_dm[i - period] + minus_dm[i - 1]
                tr_sum = tr_sum - tr_values[i - period] + tr_values[i - 1]

            plus_di = 100 * plus_di_sum / tr_sum if tr_sum > 0 else 0
            minus_di = 100 * minus_di_sum / tr_sum if tr_sum > 0 else 0

            di_sum = plus_di + minus_di
            dx = 100 * abs(plus_di - minus_di) / di_sum if di_sum > 0 else 0

            result.append(dx)

        # Smooth to get ADX
        if len(result) > period:
            adx_values = [None] * (period - 1)
            adx_val = np.mean(result[1:period + 1])
            adx_values.append(adx_val)

            for i in range(period + 1, len(result)):
                adx_val = (adx_val * (period - 1) + result[i]) / period
                adx_values.append(adx_val)

            return adx_values

        return result

    @staticmethod
    def cci(high: List[float], low: List[float], close: List[float],
            period: int = 20) -> List[Optional[float]]:
        """Commodity Channel Index"""
        if len(high) < period:
            return [None] * len(close)

        result = [None] * (period - 1)

        for i in range(period - 1, len(close)):
            typical_prices = [
                (high[j] + low[j] + close[j]) / 3
                for j in range(i - period + 1, i + 1)
            ]
            sma_tp = np.mean(typical_prices)
            mad = np.mean([abs(tp - sma_tp) for tp in typical_prices])

            if mad != 0:
                cci_val = (typical_prices[-1] - sma_tp) / (0.015 * mad)
            else:
                cci_val = 0

            result.append(cci_val)

        return result

    # ============== Volume Indicators ==============

    @staticmethod
    def obv(close: List[float], volume: List[float]) -> List[float]:
        """On Balance Volume"""
        if len(close) != len(volume):
            return [None] * len(close)

        obv_values = [volume[0]]

        for i in range(1, len(close)):
            if close[i] > close[i - 1]:
                obv_values.append(obv_values[-1] + volume[i])
            elif close[i] < close[i - 1]:
                obv_values.append(obv_values[-1] - volume[i])
            else:
                obv_values.append(obv_values[-1])

        return obv_values

    @staticmethod
    def vpt(close: List[float], volume: List[float]) -> List[Optional[float]]:
        """Volume Price Trend"""
        if len(close) != len(volume):
            return [None] * len(close)

        roc = [None]
        for i in range(1, len(close)):
            if close[i - 1] != 0:
                roc.append((close[i] - close[i - 1]) / close[i - 1] * 100)
            else:
                roc.append(0)

        vpt = [volume[0]]
        for i in range(1, len(volume)):
            vpt.append(vpt[-1] + (roc[i] / 100) * volume[i])

        return vpt

    @staticmethod
    def mfi(high: List[float], low: List[float], close: List[float],
            volume: List[float], period: int = 14) -> List[Optional[float]]:
        """Money Flow Index"""
        if len(high) < period:
            return [None] * len(close)

        typical_price = [(high[i] + low[i] + close[i]) / 3 for i in range(len(close))]
        raw_money_flow = [typical_price[i] * volume[i] for i in range(len(volume))]

        result = [None] * (period - 1)

        for i in range(period - 1, len(close)):
            positive_flow = sum([
                raw_money_flow[j]
                for j in range(i - period + 1, i + 1)
                if close[j] > close[j - 1] if j > 0 else True
            ])

            negative_flow = sum([
                raw_money_flow[j]
                for j in range(i - period + 1, i + 1)
                if close[j] < close[j - 1] if j > 0 else False
            ])

            if negative_flow == 0:
                mfi_val = 100
            else:
                money_flow_ratio = positive_flow / negative_flow
                mfi_val = 100 - (100 / (1 + money_flow_ratio))

            result.append(mfi_val)

        return result

    # ============== Additional Indicators ==============

    @staticmethod
    def roc(data: List[float], period: int = 12) -> List[Optional[float]]:
        """Rate of Change"""
        if len(data) < period + 1:
            return [None] * len(data)

        result = [None] * period
        for i in range(period, len(data)):
            if data[i - period] != 0:
                roc_val = ((data[i] - data[i - period]) / data[i - period]) * 100
            else:
                roc_val = 0
            result.append(roc_val)

        return result

    @staticmethod
    def williams_r(high: List[float], low: List[float], close: List[float],
                   period: int = 14) -> List[Optional[float]]:
        """Williams %R"""
        if len(high) < period:
            return [None] * len(close)

        result = [None] * (period - 1)

        for i in range(period - 1, len(close)):
            high_max = max(high[i - period + 1:i + 1])
            low_min = min(low[i - period + 1:i + 1])

            if high_max == low_min:
                wr = -50
            else:
                wr = -100 * (high_max - close[i]) / (high_max - low_min)

            result.append(wr)

        return result

    @staticmethod
    def get_all_indicators(ohlcv_data: List[Dict]) -> Dict:
        """Calculate all indicators for given OHLCV data"""
        if not IndicatorsService.validate_ohlcv(ohlcv_data):
            return {"error": "Invalid OHLCV data"}

        closes = [item['close'] for item in ohlcv_data]
        opens = [item['open'] for item in ohlcv_data]
        highs = [item['high'] for item in ohlcv_data]
        lows = [item['low'] for item in ohlcv_data]
        volumes = [item['volume'] for item in ohlcv_data]

        # Moving Averages
        sma20 = IndicatorsService.sma(closes, 20)
        sma50 = IndicatorsService.sma(closes, 50)
        sma200 = IndicatorsService.sma(closes, 200)
        ema12 = IndicatorsService.ema(closes, 12)
        ema26 = IndicatorsService.ema(closes, 26)
        wma = IndicatorsService.wma(closes, 20)

        # Momentum
        rsi = IndicatorsService.rsi(closes, 14)
        macd_line, macd_signal, macd_hist = IndicatorsService.macd(closes)
        stoch_k, stoch_d = IndicatorsService.stochastic(highs, lows, closes)
        roc = IndicatorsService.roc(closes)

        # Volatility
        bb_upper, bb_middle, bb_lower = IndicatorsService.bollinger_bands(closes)
        atr = IndicatorsService.atr(highs, lows, closes)

        # Trend
        adx = IndicatorsService.adx(highs, lows, closes)
        cci = IndicatorsService.cci(highs, lows, closes)
        williams_r = IndicatorsService.williams_r(highs, lows, closes)

        # Volume
        obv = IndicatorsService.obv(closes, volumes)
        vpt = IndicatorsService.vpt(closes, volumes)
        mfi = IndicatorsService.mfi(highs, lows, closes, volumes)

        return {
            'moving_averages': {
                'sma20': sma20,
                'sma50': sma50,
                'sma200': sma200,
                'ema12': ema12,
                'ema26': ema26,
                'wma20': wma,
            },
            'momentum': {
                'rsi14': rsi,
                'macd': macd_line,
                'macd_signal': macd_signal,
                'macd_histogram': macd_hist,
                'stochastic_k': stoch_k,
                'stochastic_d': stoch_d,
                'roc12': roc,
            },
            'volatility': {
                'bb_upper': bb_upper,
                'bb_middle': bb_middle,
                'bb_lower': bb_lower,
                'atr14': atr,
            },
            'trend': {
                'adx14': adx,
                'cci20': cci,
                'williams_r14': williams_r,
            },
            'volume': {
                'obv': obv,
                'vpt': vpt,
                'mfi14': mfi,
            }
        }
