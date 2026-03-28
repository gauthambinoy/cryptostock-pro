import React, { useState, useEffect, useCallback } from 'react';
import { Gauge, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock, BarChart3 } from 'lucide-react';
import { marketAPI } from '../utils/api';
import { useMarketStore } from '../utils/store';

const SENTIMENT_CONFIG = {
  extremeFear: { label: 'Extreme Fear', color: '#ef4444', textClass: 'text-danger-400', bgClass: 'bg-danger-500/20' },
  fear:        { label: 'Fear', color: '#f97316', textClass: 'text-orange-400', bgClass: 'bg-orange-500/20' },
  neutral:     { label: 'Neutral', color: '#eab308', textClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20' },
  greed:       { label: 'Greed', color: '#84cc16', textClass: 'text-lime-400', bgClass: 'bg-lime-500/20' },
  extremeGreed:{ label: 'Extreme Greed', color: '#22c55e', textClass: 'text-success-400', bgClass: 'bg-success-500/20' },
};

const calculateSentiment = (changePercent) => {
  if (changePercent < -5) return { key: 'extremeFear', score: Math.max(0, 20 + (changePercent + 5) * 4) };
  if (changePercent < -2) return { key: 'fear', score: 20 + ((changePercent + 5) / 3) * 20 };
  if (changePercent <= 2)  return { key: 'neutral', score: 40 + ((changePercent + 2) / 4) * 20 };
  if (changePercent <= 5)  return { key: 'greed', score: 60 + ((changePercent - 2) / 3) * 20 };
  return { key: 'extremeGreed', score: Math.min(100, 80 + (changePercent - 5) * 4) };
};

// SVG Gauge Component
const SentimentGauge = ({ score, sentiment }) => {
  const config = SENTIMENT_CONFIG[sentiment];
  // Arc parameters
  const cx = 150;
  const cy = 140;
  const r = 110;
  const startAngle = Math.PI;      // 180 degrees (left)
  const endAngle = 0;              // 0 degrees (right)
  const totalAngle = Math.PI;      // 180 degrees total

  // Needle angle based on score (0-100 maps to PI to 0)
  const needleAngle = startAngle - (score / 100) * totalAngle;
  const needleLength = r - 15;
  const needleX = cx + needleLength * Math.cos(needleAngle);
  const needleY = cy - needleLength * Math.sin(needleAngle);

  // Gradient arc segments
  const segments = [
    { start: 0, end: 0.2, color: '#ef4444' },
    { start: 0.2, end: 0.4, color: '#f97316' },
    { start: 0.4, end: 0.6, color: '#eab308' },
    { start: 0.6, end: 0.8, color: '#84cc16' },
    { start: 0.8, end: 1, color: '#22c55e' },
  ];

  const arcPath = (startFrac, endFrac) => {
    const a1 = startAngle - startFrac * totalAngle;
    const a2 = startAngle - endFrac * totalAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    const largeArc = (endFrac - startFrac) > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <svg viewBox="0 0 300 170" className="w-full max-w-sm mx-auto">
      {/* Background arc */}
      <path
        d={arcPath(0, 1)}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Colored segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={arcPath(seg.start, seg.end)}
          fill="none"
          stroke={seg.color}
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}

      {/* Tick marks */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const angle = startAngle - (tick / 100) * totalAngle;
        const innerR = r + 12;
        const outerR = r + 22;
        const x1 = cx + innerR * Math.cos(angle);
        const y1 = cy - innerR * Math.sin(angle);
        const x2 = cx + outerR * Math.cos(angle);
        const y2 = cy - outerR * Math.sin(angle);
        return (
          <g key={tick}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <text
              x={cx + (outerR + 12) * Math.cos(angle)}
              y={cy - (outerR + 12) * Math.sin(angle)}
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke={config.color}
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          transition: 'all 1s ease-out',
          filter: `drop-shadow(0 0 6px ${config.color})`,
        }}
      />
      {/* Needle center dot */}
      <circle cx={cx} cy={cy} r="6" fill={config.color} />
      <circle cx={cx} cy={cy} r="3" fill="white" />

      {/* Score text */}
      <text x={cx} y={cy - 30} fill="white" fontSize="36" fontWeight="bold" textAnchor="middle">
        {Math.round(score)}
      </text>
      <text x={cx} y={cy - 10} fill={config.color} fontSize="14" fontWeight="600" textAnchor="middle">
        {config.label}
      </text>
    </svg>
  );
};

// Mini line chart for historical changes
const HistoryChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const width = 400;
  const height = 120;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.change);
  const minVal = Math.min(...values, -3);
  const maxVal = Math.max(...values, 3);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - ((d.change - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Zero line y position
  const zeroY = padding.top + chartH - ((0 - minVal) / range) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Zero line */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={width - padding.right}
        y2={zeroY}
        stroke="rgba(255,255,255,0.1)"
        strokeDasharray="4 4"
      />
      <text x={padding.left - 5} y={zeroY} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end" dominantBaseline="middle">
        0%
      </text>

      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={p.change >= 0 ? '#22c55e' : '#ef4444'} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
          <text x={p.x} y={height - 5} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

const FearGreed = () => {
  const [btcData, setBtcData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { overview, fetchOverview } = useMarketStore();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [btcRes] = await Promise.all([
        marketAPI.getCryptoQuote('BTC'),
        fetchOverview(),
      ]);
      setBtcData(btcRes.data);

      // Fetch 7-day history for BTC
      try {
        const historyRes = await marketAPI.getCryptoHistory('BTC', 7);
        const prices = historyRes.data?.prices || historyRes.data || [];
        if (Array.isArray(prices) && prices.length >= 2) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const chartData = [];
          for (let i = 1; i < prices.length && i <= 7; i++) {
            const prev = prices[i - 1];
            const curr = prices[i];
            const prevPrice = typeof prev === 'number' ? prev : (prev?.price || prev?.[1] || 0);
            const currPrice = typeof curr === 'number' ? curr : (curr?.price || curr?.[1] || 0);
            const change = prevPrice > 0 ? ((currPrice - prevPrice) / prevPrice) * 100 : 0;
            const date = new Date();
            date.setDate(date.getDate() - (prices.length - 1 - i));
            chartData.push({
              label: days[date.getDay()],
              change: parseFloat(change.toFixed(2)),
            });
          }
          setHistoryData(chartData);
        }
      } catch {
        // History is supplementary; don't block on failure
        setHistoryData([]);
      }
    } catch (err) {
      setError('Failed to fetch market data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOverview]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const btcChange = btcData?.percent_change_24h ?? btcData?.change_percent ?? btcData?.change24h ?? 0;
  const { key: sentimentKey, score } = calculateSentiment(btcChange);
  const sentimentConfig = SENTIMENT_CONFIG[sentimentKey];

  // VIX / market volatility from overview
  const spData = overview?.sp500 || overview?.market_summary?.sp500 || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading market sentiment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary px-6 py-2 inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Gauge className="w-7 h-7 text-primary-400" />
            Fear & Greed Index
          </h1>
          <p className="text-gray-400 mt-1">Market sentiment based on Bitcoin price action</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Gauge */}
        <div className="lg:col-span-2 glass-card p-8">
          <SentimentGauge score={score} sentiment={sentimentKey} />

          {/* BTC Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">BTC Price</p>
              <p className="text-lg font-bold text-white">
                ${(btcData?.price ?? btcData?.current_price ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">24h Change</p>
              <div className="flex items-center justify-center gap-1">
                {btcChange >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger-400" />
                )}
                <p className={`text-lg font-bold ${btcChange >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Sentiment Score</p>
              <p className="text-lg font-bold" style={{ color: sentimentConfig.color }}>
                {Math.round(score)}/100
              </p>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Sentiment Breakdown */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sentiment Scale</h3>
            <div className="space-y-3">
              {Object.entries(SENTIMENT_CONFIG).map(([key, config]) => {
                const isActive = key === sentimentKey;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive ? config.bgClass + ' ring-1 ring-white/10' : 'opacity-50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {config.label}
                    </span>
                    {isActive && (
                      <span className="ml-auto text-xs font-bold" style={{ color: config.color }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Volatility (VIX proxy) */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              Market Volatility
            </h3>
            {spData ? (
              <div className="space-y-3">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">S&P 500</p>
                  <p className="text-lg font-bold text-white">
                    {(spData.price ?? spData.value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p className={`text-sm ${(spData.change_percent ?? spData.change ?? 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {(spData.change_percent ?? spData.change ?? 0) >= 0 ? '+' : ''}
                    {(spData.change_percent ?? spData.change ?? 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Market overview data unavailable.</p>
            )}
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      {historyData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            7-Day BTC Price Changes
          </h3>
          <p className="text-sm text-gray-400 mb-4">Daily percentage change used for sentiment calculation</p>
          <div className="max-w-2xl mx-auto">
            <HistoryChart data={historyData} />
          </div>

          {/* Daily sentiment bars */}
          <div className="flex items-end justify-center gap-3 mt-6">
            {historyData.map((day, i) => {
              const { key } = calculateSentiment(day.change);
              const cfg = SENTIMENT_CONFIG[key];
              const barHeight = Math.max(8, Math.abs(day.change) * 12);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>
                    {day.change >= 0 ? '+' : ''}{day.change}%
                  </span>
                  <div
                    className="w-10 rounded-t-lg transition-all"
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: cfg.color,
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-xs text-gray-500">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { range: '0-20', label: 'Extreme Fear', desc: 'BTC down > 5%', color: '#ef4444' },
            { range: '20-40', label: 'Fear', desc: 'BTC down 2-5%', color: '#f97316' },
            { range: '40-60', label: 'Neutral', desc: 'BTC between -2% to +2%', color: '#eab308' },
            { range: '60-80', label: 'Greed', desc: 'BTC up 2-5%', color: '#84cc16' },
            { range: '80-100', label: 'Extreme Greed', desc: 'BTC up > 5%', color: '#22c55e' },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-gray-400">{item.range}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FearGreed;
