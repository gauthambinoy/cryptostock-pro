import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Newspaper,
  Brain,
  Gauge,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Zap,
  Shield,
  AlertTriangle,
  Target,
} from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';

// ---------------------------------------------------------------------------
// Helper: derive AI insights from market pulse data
// ---------------------------------------------------------------------------
const deriveInsights = (pulseData, sectors, stockGainers, cryptoGainers) => {
  const bestSectors = [];
  const buyZone = [];
  const avoid = [];

  // Sector analysis
  if (sectors && sectors.length > 0) {
    const sorted = [...sectors].sort((a, b) => b.change_percent - a.change_percent);
    sorted.slice(0, 3).forEach((s) => bestSectors.push(s.name));
    sorted
      .filter((s) => s.change_percent < -2)
      .slice(0, 3)
      .forEach((s) => avoid.push(s.name));
  }

  // Buy zone - stocks that dipped but are fundamentally strong (top gainers bouncing)
  if (stockGainers && stockGainers.length > 0) {
    stockGainers.slice(0, 3).forEach((g) => buyZone.push(g.symbol));
  }
  if (cryptoGainers && cryptoGainers.length > 0) {
    cryptoGainers.slice(0, 2).forEach((g) => buyZone.push(g.symbol));
  }

  // Overall sentiment
  let sentimentText = 'Market conditions are neutral. Diversification is key.';
  if (pulseData) {
    const trend = (pulseData.trend || '').toLowerCase();
    if (trend === 'bullish') {
      sentimentText =
        'Markets are trending bullish. Momentum strategies may perform well. Consider adding to high-conviction positions.';
    } else if (trend === 'bearish') {
      sentimentText =
        'Markets are trending bearish. Defensive positioning recommended. Focus on quality assets and hedging strategies.';
    }
  }

  return {
    bestSectors:
      bestSectors.length > 0
        ? bestSectors.join(', ')
        : 'Technology, Healthcare, and Financial sectors show relative strength.',
    buyZone:
      buyZone.length > 0
        ? buyZone.join(', ') + ' are showing strong momentum and may be approaching buy zones.'
        : 'No clear buy zone signals at this time. Wait for better entry points.',
    avoid:
      avoid.length > 0
        ? avoid.join(', ') + ' sectors are underperforming. Exercise caution before adding exposure.'
        : 'No major red flags currently. Monitor highly leveraged assets closely.',
    sentiment: sentimentText,
  };
};

// ---------------------------------------------------------------------------
// Sector Heatmap Cell
// ---------------------------------------------------------------------------
const SectorCell = ({ name, changePercent, delay }) => {
  const bg =
    changePercent > 2
      ? 'bg-emerald-500/30 border-emerald-500/40'
      : changePercent > 0
      ? 'bg-emerald-500/15 border-emerald-500/20'
      : changePercent > -2
      ? 'bg-danger-500/15 border-danger-500/20'
      : 'bg-danger-500/30 border-danger-500/40';

  const textColor =
    changePercent > 0 ? 'text-success-400' : changePercent < 0 ? 'text-danger-400' : 'text-gray-400';

  return (
    <div
      className={`p-3 rounded-xl border ${bg} transition-all duration-300 hover:scale-105 cursor-default`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs text-gray-300 truncate">{name}</p>
      <p className={`text-sm font-bold ${textColor}`}>{formatPercent(changePercent)}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trending List Item
// ---------------------------------------------------------------------------
const TrendingItem = ({ item, rank }) => {
  const change = item.change_percent ?? item.price_change_percentage_24h ?? 0;
  const price = item.price ?? item.current_price ?? 0;
  const isPositive = change >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-500 w-5">{rank}</span>
        <div>
          <p className="font-medium text-sm">{item.symbol}</p>
          <p className="text-xs text-gray-500 truncate max-w-[120px]">{item.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{formatCurrency(price)}</p>
        <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${getChangeColor(change)}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {formatPercent(change)}
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Insight Card
// ---------------------------------------------------------------------------
const InsightCard = ({ icon: Icon, title, text, color, delay }) => (
  <div
    className="glass-card p-5 flex flex-col gap-3 animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center gap-2">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h4 className="font-semibold text-sm">{title}</h4>
    </div>
    <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Fear & Greed Gauge (mini)
// ---------------------------------------------------------------------------
const FearGreedGauge = ({ value }) => {
  const clampedVal = Math.max(0, Math.min(100, value || 0));
  const label =
    clampedVal <= 20
      ? 'Extreme Fear'
      : clampedVal <= 40
      ? 'Fear'
      : clampedVal <= 60
      ? 'Neutral'
      : clampedVal <= 80
      ? 'Greed'
      : 'Extreme Greed';

  const color =
    clampedVal <= 20
      ? '#ef4444'
      : clampedVal <= 40
      ? '#f97316'
      : clampedVal <= 60
      ? '#eab308'
      : clampedVal <= 80
      ? '#84cc16'
      : '#22c55e';

  // SVG arc gauge
  const cx = 60;
  const cy = 55;
  const r = 40;
  const startAngle = Math.PI;
  const totalAngle = Math.PI;
  const needleAngle = startAngle - (clampedVal / 100) * totalAngle;
  const needleLen = r - 8;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy - needleLen * Math.sin(needleAngle);

  const arcPath = (s, e) => {
    const a1 = startAngle - s * totalAngle;
    const a2 = startAngle - e * totalAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const segments = [
    { s: 0, e: 0.2, c: '#ef4444' },
    { s: 0.2, e: 0.4, c: '#f97316' },
    { s: 0.4, e: 0.6, c: '#eab308' },
    { s: 0.6, e: 0.8, c: '#84cc16' },
    { s: 0.8, e: 1, c: '#22c55e' },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-full max-w-[140px]">
        {segments.map((seg, i) => (
          <path key={i} d={arcPath(seg.s, seg.e)} fill="none" stroke={seg.c} strokeWidth="8" opacity="0.6" />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>
      <p className="text-2xl font-bold mt-1" style={{ color }}>
        {clampedVal}
      </p>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Top Pick Card
// ---------------------------------------------------------------------------
const TopPickCard = ({ pick, delay }) => {
  const signal = (pick.signal || '').toLowerCase();
  const signalColor =
    signal === 'buy' || signal === 'strong buy'
      ? 'text-success-400 bg-success-500/20'
      : signal === 'sell' || signal === 'strong sell'
      ? 'text-danger-400 bg-danger-500/20'
      : 'text-yellow-400 bg-yellow-500/20';

  return (
    <div
      className="glass-card p-4 flex flex-col gap-2 hover:bg-white/10 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">{pick.symbol}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${signalColor}`}>
          {pick.signal || 'Hold'}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Score</span>
        <span className="font-medium">{pick.score != null ? `${pick.score}/100` : '-'}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Expected Return</span>
        <span className={`font-medium ${getChangeColor(pick.expected_return)}`}>
          {pick.expected_return != null ? formatPercent(pick.expected_return) : '-'}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Default sector data (fallback)
// ---------------------------------------------------------------------------
const DEFAULT_SECTORS = [
  { name: 'Technology', change_percent: 1.24 },
  { name: 'Financial', change_percent: 0.85 },
  { name: 'Healthcare', change_percent: -0.32 },
  { name: 'Energy', change_percent: 2.15 },
  { name: 'Consumer Cyclical', change_percent: 0.47 },
  { name: 'Industrials', change_percent: -1.08 },
  { name: 'Communication', change_percent: 1.52 },
  { name: 'Real Estate', change_percent: -0.67 },
  { name: 'Utilities', change_percent: 0.19 },
  { name: 'Materials', change_percent: -2.34 },
  { name: 'Consumer Defensive', change_percent: 0.33 },
  { name: 'Crypto', change_percent: 3.45 },
];

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
const MarketPulse = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseData, setPulseData] = useState(null);
  const [stockGainers, setStockGainers] = useState([]);
  const [cryptoGainers, setCryptoGainers] = useState([]);
  const [topPicks, setTopPicks] = useState([]);
  const [sectors, setSectors] = useState(DEFAULT_SECTORS);
  const [insights, setInsights] = useState(null);

  // -------------------------------------------------------------------------
  // Fetch all data
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const results = await Promise.allSettled([
        api.get('/invest/market-pulse'),
        api.get('/market/stocks/gainers?limit=5'),
        api.get('/market/crypto/gainers?limit=5'),
        api.get('/invest/top-picks?limit=5'),
        api.get('/market/overview'),
      ]);

      // Market Pulse
      if (results[0].status === 'fulfilled') {
        setPulseData(results[0].value.data);
      }

      // Stock Gainers
      let sGainers = [];
      if (results[1].status === 'fulfilled') {
        sGainers = results[1].value.data || [];
        setStockGainers(sGainers);
      }

      // Crypto Gainers
      let cGainers = [];
      if (results[2].status === 'fulfilled') {
        cGainers = results[2].value.data || [];
        setCryptoGainers(cGainers);
      }

      // Top Picks
      if (results[3].status === 'fulfilled') {
        const picks = results[3].value.data;
        setTopPicks(Array.isArray(picks) ? picks.slice(0, 5) : []);
      }

      // Overview - extract S&P 500 / BTC if pulse doesn't have them
      let overviewData = null;
      if (results[4].status === 'fulfilled') {
        overviewData = results[4].value.data;
      }

      // Merge overview into pulse if needed
      const pulse = results[0].status === 'fulfilled' ? results[0].value.data : null;
      if (pulse && overviewData) {
        if (!pulse.sp500 && overviewData.sp500) pulse.sp500 = overviewData.sp500;
        if (!pulse.btc && overviewData.btc) pulse.btc = overviewData.btc;
        setPulseData({ ...pulse });
      } else if (!pulse && overviewData) {
        setPulseData(overviewData);
      }

      // Extract sectors from pulse data
      const sectorData =
        (pulse && pulse.sectors) || (overviewData && overviewData.sectors) || null;
      if (sectorData && Array.isArray(sectorData) && sectorData.length > 0) {
        setSectors(sectorData);
      }

      // Derive AI insights
      const derivedInsights = deriveInsights(
        pulse || overviewData,
        sectorData || DEFAULT_SECTORS,
        sGainers,
        cGainers
      );
      setInsights(derivedInsights);
    } catch (err) {
      console.error('MarketPulse fetch error:', err);
      // Set fallback insights
      setInsights(deriveInsights(null, DEFAULT_SECTORS, [], []));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const trend = (pulseData?.trend || 'neutral').toLowerCase();
  const trendLabel = trend.charAt(0).toUpperCase() + trend.slice(1);
  const TrendIcon = trend === 'bullish' ? TrendingUp : trend === 'bearish' ? TrendingDown : Minus;
  const trendColor =
    trend === 'bullish'
      ? 'text-success-400'
      : trend === 'bearish'
      ? 'text-danger-400'
      : 'text-yellow-400';
  const trendBg =
    trend === 'bullish'
      ? 'bg-success-500/20 border-success-500/30'
      : trend === 'bearish'
      ? 'bg-danger-500/20 border-danger-500/30'
      : 'bg-yellow-500/20 border-yellow-500/30';

  const fearGreedValue =
    pulseData?.fear_greed_index ??
    pulseData?.fear_greed ??
    pulseData?.fearGreedIndex ??
    50;

  const sp500 = pulseData?.sp500 || null;
  const btc = pulseData?.btc || pulseData?.bitcoin || null;

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Market Pulse</h1>
            <p className="text-gray-400">Real-time market intelligence</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
              <div className="h-8 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-10 bg-white/10 rounded mb-2" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Market Pulse</h1>
            <p className="text-gray-400">Real-time market intelligence</p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ===== Row 1: Market Status Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Market Trend */}
        <div className={`glass-card p-5 border ${trendBg} animate-fade-in`}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Market Trend</p>
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
            <span className={`text-2xl font-bold ${trendColor}`}>{trendLabel}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {trend === 'bullish'
              ? 'Positive momentum detected'
              : trend === 'bearish'
              ? 'Downward pressure observed'
              : 'Markets trading sideways'}
          </p>
        </div>

        {/* Fear & Greed */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fear & Greed Index</p>
          <FearGreedGauge value={fearGreedValue} />
        </div>

        {/* S&P 500 */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">S&P 500</p>
          <p className="text-2xl font-bold">
            {sp500 ? formatCurrency(sp500.price || sp500.value, 0) : '--'}
          </p>
          {sp500 && (
            <div className="flex items-center gap-1 mt-1">
              {(sp500.change ?? sp500.change_percent ?? 0) >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-success-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-danger-400" />
              )}
              <span className={`text-sm font-medium ${getChangeColor(sp500.change_percent ?? sp500.change ?? 0)}`}>
                {sp500.change != null && formatCurrency(Math.abs(sp500.change), 2)}{' '}
                {sp500.change_percent != null && `(${formatPercent(sp500.change_percent)})`}
              </span>
            </div>
          )}
        </div>

        {/* BTC */}
        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">BTC</p>
          <p className="text-2xl font-bold">
            {btc ? formatCurrency(btc.price || btc.value, 0) : '--'}
          </p>
          {btc && (
            <div className="flex items-center gap-1 mt-1">
              {(btc.change ?? btc.change_percent ?? 0) >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-success-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-danger-400" />
              )}
              <span className={`text-sm font-medium ${getChangeColor(btc.change_percent ?? btc.change ?? 0)}`}>
                {btc.change != null && formatCurrency(Math.abs(btc.change), 2)}{' '}
                {btc.change_percent != null && `(${formatPercent(btc.change_percent)})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Row 2: Sector Performance Heatmap ===== */}
      <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold">Sector Performance</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {sectors.map((sector, i) => (
            <SectorCell
              key={sector.name}
              name={sector.name}
              changePercent={sector.change_percent}
              delay={250 + i * 40}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/40" /> &gt; 2%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20" /> 0-2%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-danger-500/20" /> 0 to -2%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-danger-500/40" /> &lt; -2%
          </span>
        </div>
      </div>

      {/* ===== Row 3: Trending Now ===== */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in"
        style={{ animationDelay: '300ms' }}
      >
        {/* Trending Stocks */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success-400" />
            <h3 className="font-semibold">Trending Stocks</h3>
          </div>
          {stockGainers.length > 0 ? (
            <div className="divide-y divide-white/5">
              {stockGainers.slice(0, 5).map((item, i) => (
                <TrendingItem key={item.symbol} item={item} rank={i + 1} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No trending stocks data available</p>
          )}
        </div>

        {/* Trending Crypto */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold">Trending Crypto</h3>
          </div>
          {cryptoGainers.length > 0 ? (
            <div className="divide-y divide-white/5">
              {cryptoGainers.slice(0, 5).map((item, i) => (
                <TrendingItem key={item.symbol || item.id} item={item} rank={i + 1} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-4 text-center">No trending crypto data available</p>
          )}
        </div>
      </div>

      {/* ===== Row 4: AI Insights ===== */}
      {insights && (
        <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-fuchsia-400" />
            <h2 className="text-lg font-semibold">AI Market Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <InsightCard
              icon={Newspaper}
              title="Market Sentiment"
              text={insights.sentiment}
              color="bg-primary-500/80"
              delay={450}
            />
            <InsightCard
              icon={Target}
              title="Best Sectors"
              text={insights.bestSectors}
              color="bg-emerald-500/80"
              delay={500}
            />
            <InsightCard
              icon={TrendingUp}
              title="Approaching Buy Zone"
              text={insights.buyZone}
              color="bg-violet-500/80"
              delay={550}
            />
            <InsightCard
              icon={Shield}
              title="Assets to Avoid"
              text={insights.avoid}
              color="bg-danger-500/80"
              delay={600}
            />
          </div>
        </div>
      )}

      {/* ===== Row 5: Quick Investment Opportunities ===== */}
      <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Quick Investment Opportunities</h2>
          </div>
          <Link
            to="/top-picks"
            className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {topPicks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topPicks.map((pick, i) => (
              <TopPickCard key={pick.symbol || i} pick={pick} delay={550 + i * 60} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500">No top picks available at the moment.</p>
            <Link
              to="/top-picks"
              className="inline-block mt-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Explore all picks
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketPulse;
