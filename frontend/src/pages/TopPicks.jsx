import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Zap,
  BarChart3,
  CircleDot,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

// ─── Signal config ───────────────────────────────────────────────
const SIGNAL_CONFIG = {
  strong_buy: {
    label: 'STRONG BUY',
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500',
    ring: 'ring-green-500/40',
    glow: '0 0 18px rgba(34,197,94,0.45)',
  },
  buy: {
    label: 'BUY',
    bg: 'bg-green-400/15',
    text: 'text-green-400',
    border: 'border-green-400',
    ring: 'ring-green-400/30',
    glow: 'none',
  },
  hold: {
    label: 'HOLD',
    bg: 'bg-yellow-400/15',
    text: 'text-yellow-400',
    border: 'border-yellow-400',
    ring: 'ring-yellow-400/30',
    glow: 'none',
  },
  sell: {
    label: 'SELL',
    bg: 'bg-red-400/15',
    text: 'text-red-400',
    border: 'border-red-400',
    ring: 'ring-red-400/30',
    glow: 'none',
  },
  strong_sell: {
    label: 'STRONG SELL',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500',
    ring: 'ring-red-500/40',
    glow: '0 0 18px rgba(239,68,68,0.45)',
  },
};

const RISK_CONFIG = {
  low: { label: 'Low Risk', bg: 'bg-green-500/15', text: 'text-green-400' },
  medium: { label: 'Medium Risk', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  high: { label: 'High Risk', bg: 'bg-red-500/15', text: 'text-red-400' },
};

const ASSET_TABS = [
  { key: 'all', label: 'All' },
  { key: 'stock', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
];

const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'expected_return', label: 'Expected Return' },
  { key: 'confidence', label: 'Confidence' },
];

// ─── Score Ring ──────────────────────────────────────────────────
const ScoreRing = ({ score, size = 72, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
};

// ─── Confidence Bar ──────────────────────────────────────────────
const ConfidenceBar = ({ value }) => {
  const color =
    value >= 70
      ? 'bg-green-500'
      : value >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Confidence</span>
        <span className="text-gray-300 font-medium">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

// ─── Skeleton Card ───────────────────────────────────────────────
const SkeletonCard = ({ index }) => (
  <div
    className="glass-card rounded-2xl p-5 space-y-4 animate-pulse"
    style={{ animationDelay: `${index * 80}ms` }}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <div className="h-5 w-20 bg-white/10 rounded" />
        <div className="h-3 w-32 bg-white/5 rounded" />
      </div>
      <div className="h-6 w-24 bg-white/10 rounded-full" />
    </div>
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 bg-white/5 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-6 w-20 bg-white/5 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-10 bg-white/5 rounded-lg" />
      <div className="h-10 bg-white/5 rounded-lg" />
    </div>
    <div className="h-2 bg-white/5 rounded-full" />
    <div className="space-y-1.5">
      <div className="h-3 w-full bg-white/5 rounded" />
      <div className="h-3 w-3/4 bg-white/5 rounded" />
      <div className="h-3 w-5/6 bg-white/5 rounded" />
    </div>
    <div className="h-9 bg-white/5 rounded-lg" />
  </div>
);

// ─── Investment Card ─────────────────────────────────────────────
const InvestmentCard = ({ pick, index }) => {
  const navigate = useNavigate();
  const signal = SIGNAL_CONFIG[pick.signal] || SIGNAL_CONFIG.hold;
  const risk = RISK_CONFIG[pick.risk_level] || RISK_CONFIG.medium;
  const isStrongBuy = pick.signal === 'strong_buy';
  const expectedReturn = pick.expected_return ?? 0;

  return (
    <div
      className={`
        glass-card rounded-2xl p-5 space-y-4
        border border-white/5
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:border-white/10
        opacity-0 animate-fade-in
        ${isStrongBuy ? 'border-l-2 border-l-green-500' : ''}
      `}
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'forwards',
        boxShadow: signal.glow !== 'none' ? signal.glow : undefined,
      }}
    >
      {/* Top row: Symbol + Signal */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{pick.symbol}</h3>
          <p className="text-xs text-gray-400 truncate">{pick.name}</p>
        </div>
        <span
          className={`
            shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
            ${signal.bg} ${signal.text} ring-1 ${signal.ring}
          `}
          style={{
            boxShadow: signal.glow !== 'none' ? signal.glow : undefined,
          }}
        >
          <Zap className="w-3 h-3" />
          {signal.label}
        </span>
      </div>

      {/* Score ring + Price / Return */}
      <div className="flex items-center gap-4">
        <ScoreRing score={pick.overall_score ?? 0} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Current Price</p>
          <p className="text-base font-semibold text-white">
            {formatCurrency(pick.current_price)}
          </p>
          <p className={`text-xl font-bold ${expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(expectedReturn)}
          </p>
        </div>
      </div>

      {/* Target + Stop Loss */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
            <Target className="w-3 h-3" />
            Target{pick.timeframe ? ` (${pick.timeframe})` : ''}
          </div>
          <p className="text-sm font-semibold text-green-400">
            {formatCurrency(pick.target_price)}
          </p>
        </div>
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
            <ShieldAlert className="w-3 h-3" />
            Stop Loss
          </div>
          <p className="text-sm font-semibold text-red-400">
            {formatCurrency(pick.stop_loss)}
          </p>
        </div>
      </div>

      {/* Confidence */}
      <ConfidenceBar value={pick.confidence ?? 0} />

      {/* Risk badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${risk.bg} ${risk.text}`}>
          <AlertTriangle className="w-3 h-3" />
          {risk.label}
        </span>
      </div>

      {/* Reasons */}
      {pick.reasons && pick.reasons.length > 0 && (
        <ul className="space-y-1">
          {pick.reasons.slice(0, 3).map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <CircleDot className="w-3 h-3 mt-0.5 shrink-0 text-gray-600" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Deep Analysis button */}
      <button
        onClick={() => navigate(`/invest/analyze/${pick.symbol}`)}
        className="
          w-full flex items-center justify-center gap-2
          rounded-lg py-2.5 text-sm font-medium
          bg-gradient-to-r from-primary-600/30 to-primary-500/20
          border border-primary-500/20
          text-primary-300 hover:text-white
          hover:from-primary-600/50 hover:to-primary-500/30
          transition-all duration-200
        "
      >
        <BarChart3 className="w-4 h-4" />
        Deep Analysis
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────
const TopPicks = () => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assetType, setAssetType] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPicks = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { data } = await api.get(
        `/invest/top-picks?asset_type=${assetType}&limit=20`
      );

      let results = Array.isArray(data) ? data : data.picks ?? data.results ?? [];

      // Client-side sort
      results = [...results].sort((a, b) => {
        if (sortBy === 'score') return (b.overall_score ?? 0) - (a.overall_score ?? 0);
        if (sortBy === 'expected_return') return (b.expected_return ?? 0) - (a.expected_return ?? 0);
        if (sortBy === 'confidence') return (b.confidence ?? 0) - (a.confidence ?? 0);
        return 0;
      });

      setPicks(results);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load top picks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assetType, sortBy]);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  const handleRefresh = () => fetchPicks(true);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-7 h-7 text-yellow-400" />
          <h1 className="text-2xl font-bold text-white">Top Investment Picks</h1>
        </div>
        <p className="text-gray-400 text-sm ml-10">
          AI-powered profit predictions updated in real-time
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-xl px-4 py-3 flex flex-wrap items-center gap-4">
        {/* Asset type toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          {ASSET_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAssetType(tab.key)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                ${
                  assetType === tab.key
                    ? 'bg-primary-600/40 text-primary-300 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Loading State ──────────────────────────────────── */}
      {loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
            </div>
            <p className="text-sm text-gray-400">Analyzing 35+ assets...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Error State ────────────────────────────────────── */}
      {!loading && error && (
        <div className="glass-card rounded-xl p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => fetchPicks()}
            className="btn-primary text-sm px-4 py-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ─── Empty State ────────────────────────────────────── */}
      {!loading && !error && picks.length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center space-y-4">
          <Inbox className="w-14 h-14 text-gray-600 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-300">No picks available</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Our AI models are currently recalculating. Top investment picks will appear here once analysis is complete. Try refreshing in a few moments.
          </p>
          <button
            onClick={handleRefresh}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}

      {/* ─── Cards Grid ─────────────────────────────────────── */}
      {!loading && !error && picks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {picks.map((pick, i) => (
            <InvestmentCard key={pick.symbol || i} pick={pick} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPicks;
