import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useTheme } from './ThemeProvider';
import { Copy, Download, Settings, X, Plus, Trash2 } from 'lucide-react';

const AdvancedChart = ({
  symbol,
  timeframe = '1day',
  onTimeframeChange,
  height = 600,
  width = '100%'
}) => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const [data, setData] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [selectedIndicators, setSelectedIndicators] = useState(new Set(['sma20', 'sma50']));
  const [isLoading, setIsLoading] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [activeDrawingTool, setActiveDrawingTool] = useState(null);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(true);

  const TIMEFRAMES = [
    { value: '1min', label: '1m' },
    { value: '5min', label: '5m' },
    { value: '15min', label: '15m' },
    { value: '1hour', label: '1h' },
    { value: '4hour', label: '4h' },
    { value: '1day', label: '1d' },
    { value: '1week', label: '1w' },
    { value: '1month', label: '1M' },
  ];

  const INDICATORS_AVAILABLE = {
    'Moving Averages': {
      sma20: { name: 'SMA 20', color: '#FF6B35' },
      sma50: { name: 'SMA 50', color: '#004E89' },
      sma200: { name: 'SMA 200', color: '#F77F00' },
      ema12: { name: 'EMA 12', color: '#06A77D' },
      ema26: { name: 'EMA 26', color: '#D62839' },
    },
    'Momentum': {
      rsi14: { name: 'RSI 14', type: 'oscillator' },
      macd: { name: 'MACD', type: 'oscillator' },
      stochastic_k: { name: 'Stochastic %K', type: 'oscillator' },
    },
    'Volatility': {
      bb_upper: { name: 'BB Upper', color: '#A23B72' },
      bb_lower: { name: 'BB Lower', color: '#A23B72' },
      atr14: { name: 'ATR 14', type: 'oscillator' },
    },
    'Trend': {
      adx14: { name: 'ADX 14', type: 'oscillator' },
      cci20: { name: 'CCI 20', type: 'oscillator' },
    },
    'Volume': {
      obv: { name: 'OBV', type: 'volume' },
      mfi14: { name: 'MFI 14', type: 'oscillator' },
    },
  };

  const chartConfig = {
    layout: {
      background: { color: theme === 'dark' ? '#0F172A' : '#FFFFFF' },
      textColor: theme === 'dark' ? '#E0E7FF' : '#000000',
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: theme === 'dark' ? '#334155' : '#E2E8F0',
    },
    grid: {
      vertLines: { color: theme === 'dark' ? '#1E293B' : '#F1F5F9' },
      hLines: { color: theme === 'dark' ? '#1E293B' : '#F1F5F9' },
    },
  };

  const fetchChartData = useCallback(async () => {
    if (!symbol) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/chart/ohlcv?symbol=${symbol}&timeframe=${timeframe}`
      );
      const result = await response.json();
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchIndicators = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(
        `/api/chart/indicators?symbol=${symbol}&timeframe=${timeframe}`
      );
      const result = await response.json();
      if (result.indicators) {
        setIndicators(result.indicators);
      }
    } catch (error) {
      console.error('Failed to fetch indicators:', error);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchChartData();
    fetchIndicators();
  }, [symbol, timeframe, fetchChartData, fetchIndicators]);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    // Initialize chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      timeScale: chartConfig.timeScale,
      layout: chartConfig.layout,
      grid: chartConfig.grid,
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#06A77D',
      downColor: '#D62839',
      borderVisible: true,
      wickUpColor: '#06A77D',
      wickDownColor: '#D62839',
    });

    candleSeriesRef.current = candleSeries;

    // Format data for lightweight-charts
    const formattedData = data.map((candle) => ({
      time: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeries.setData(formattedData);

    // Add selected indicators as line series
    selectedIndicators.forEach((indicatorKey) => {
      const found = Object.values(INDICATORS_AVAILABLE)
        .flatMap(cat => Object.entries(cat))
        .find(([key]) => key === indicatorKey);

      if (!found) return;

      const [, config] = found;
      if (config.type === 'oscillator' || config.type === 'volume') return; // Skip non-price indicators for now

      const indicatorData = indicators?.moving_averages?.[indicatorKey] ||
                           indicators?.volatility?.[indicatorKey];

      if (indicatorData) {
        const lineSeries = chart.addLineSeries({
          color: config.color,
          lineWidth: 1,
        });

        const lineData = formattedData.map((candle, idx) => ({
          time: candle.time,
          value: indicatorData[idx],
        })).filter(item => item.value !== null);

        lineSeries.setData(lineData);
      }
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, selectedIndicators, indicators, height, theme]);

  const toggleIndicator = (indicatorKey) => {
    const newSet = new Set(selectedIndicators);
    if (newSet.has(indicatorKey)) {
      newSet.delete(indicatorKey);
    } else {
      newSet.add(indicatorKey);
    }
    setSelectedIndicators(newSet);
  };

  const exportChart = () => {
    if (chartRef.current) {
      const link = document.createElement('a');
      link.href = chartRef.current.takeScreenshot();
      link.download = `${symbol}-${timeframe}-${new Date().getTime()}.png`;
      link.click();
    }
  };

  const getCurrentPrice = () => {
    if (!data.length) return 0;
    return data[data.length - 1].close;
  };

  const getHighLow = () => {
    if (!data.length) return { high: 0, low: 0 };
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
    };
  };

  const { high, low } = getHighLow();

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">{symbol}</h3>
          <span className="text-2xl font-bold text-emerald-400">${getCurrentPrice().toFixed(2)}</span>
          <div className="text-sm text-slate-400">
            <div>H: ${high.toFixed(2)}</div>
            <div>L: ${low.toFixed(2)}</div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            title="Toggle Indicators"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={exportChart}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
            title="Export Chart"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chart */}
        <div
          ref={containerRef}
          className="flex-1 rounded-lg overflow-hidden border border-slate-700 dark:border-slate-800"
          style={{ height: `${height}px` }}
        />

        {/* Indicator Control Panel */}
        {showIndicatorPanel && (
          <div className="w-full lg:w-64 bg-slate-800 dark:bg-slate-900 rounded-lg border border-slate-700 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Indicators</h4>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {Object.entries(INDICATORS_AVAILABLE).map(([category, indicatorGroup]) => (
                <div key={category} className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-400 uppercase px-1">{category}</h5>
                  <div className="space-y-1">
                    {Object.entries(indicatorGroup).map(([key, config]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-700 cursor-pointer transition group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIndicators.has(key)}
                          onChange={() => toggleIndicator(key)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{config.name}</div>
                          {config.type && (
                            <div className="text-xs text-slate-500">{config.type}</div>
                          )}
                        </div>
                        {config.color && (
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: config.color }}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

export default AdvancedChart;
