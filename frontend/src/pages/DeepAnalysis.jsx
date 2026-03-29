import React, { useState, useMemo } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, formatNumber } from '../utils/helpers';
import {
  Search,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  Target,
  Shield,
  Zap,
  DollarSign,
  MessageSquare,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

const QUICK_SYMBOLS = {
  stock: ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'],
  crypto: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'XRP'],
};

const SIGNAL_CONFIG = {
  STRONG_BUY: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'STRONG BUY' },
  BUY: { color: 'text-success-400', bg: 'bg-success-500/20', border: 'border-success-500/30', label: 'BUY' },
  HOLD: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'HOLD' },
  SELL: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'SELL' },
  STRONG_SELL: { color: 'text-danger-400', bg: 'bg-danger-500/20', border: 'border-danger-500/30', label: 'STRONG SELL' },
};

const getScoreColor = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

const getScoreLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Neutral';
  if (score >= 20) return 'Weak';
  return 'Poor';
};

const getConfidenceLabel = (val) => {
  if (val >= 75) return { text: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  if (val >= 50) return { text: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  return { text: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/20' };
};

const getRiskBadge = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'low') return { text: 'Low Risk', color: 'text-success-400', bg: 'bg-success-500/20' };
  if (l === 'medium' || l === 'moderate') return { text: 'Medium Risk', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  if (l === 'high') return { text: 'High Risk', color: 'text-orange-400', bg: 'bg-orange-500/20' };
  return { text: level || 'N/A', color: 'text-gray-400', bg: 'bg-white/5' };
};

/* ───── Circular Gauge (SVG) ───── */
const CircularGauge = ({ score, size = 160 }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = ((score ?? 0) / 100) * circumference;
  const color = getScoreColor(score);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth="10"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-1000 ease-out"
        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
      />
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        fill={color}
        fontSize="36"
        fontWeight="bold"
      >
        {score ?? '--'}
      </text>
      <text
        x={center}
        y={center + 16}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize="13"
      >
        {score != null ? getScoreLabel(score) : ''}
      </text>
    </svg>
  );
};

/* ───── Score Dimension Card ───── */
const DimensionCard = ({ title, icon: Icon, score, metrics, signals, gradient }) => {
  const color = getScoreColor(score ?? 0);
  return (
    <div className="glass-card p-5 flex flex-col gap-3 hover:bg-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <span className="text-2xl font-bold" style={{ color }}>
          {score ?? '--'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(score ?? 0, 100)}%`, backgroundColor: color }}
        />
      </div>

      {/* Key metrics */}
      {metrics && metrics.length > 0 && (
        <div className="space-y-1.5 mt-1">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{m.label}</span>
              <span className="font-medium text-gray-200">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Signal explanations */}
      {signals && signals.length > 0 && (
        <div className="mt-1 space-y-1">
          {signals.slice(0, 3).map((s, i) => {
            const isBullish =
              (s.signal || s.type || '').toLowerCase().includes('bull') ||
              (s.signal || s.type || '').toLowerCase().includes('buy');
            return (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <span className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${isBullish ? 'bg-success-400' : 'bg-danger-400'}`} />
                <span className="text-gray-400 leading-tight">{s.explanation || s.message || s.name || ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ───── Price Levels Mini Chart ───── */
const PriceLevelsChart = ({ entry, shortTarget, medTarget, longTarget, stopLoss, current }) => {
  const levels = [
    { name: 'Stop Loss', value: stopLoss, color: '#ef4444' },
    { name: 'Entry', value: entry, color: '#3b82f6' },
    { name: 'Current', value: current, color: '#a78bfa' },
    { name: 'Short Target', value: shortTarget, color: '#22c55e' },
    { name: 'Med Target', value: medTarget, color: '#10b981' },
    { name: 'Long Target', value: longTarget, color: '#059669' },
  ].filter((l) => l.value != null);

  if (levels.length === 0) return null;

  const allValues = levels.map((l) => l.value);
  const minVal = Math.min(...allValues) * 0.97;
  const maxVal = Math.max(...allValues) * 1.03;

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={[{ name: 'Price Levels', value: 0 }]}
          margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal vertical={false} />
          <YAxis domain={[minVal, maxVal]} hide />
          <XAxis hide />
          {levels.map((level) => (
            <ReferenceLine
              key={level.name}
              y={level.value}
              stroke={level.color}
              strokeWidth={2}
              strokeDasharray={level.name === 'Stop Loss' ? '6 3' : level.name === 'Current' ? '3 3' : '0'}
              label={{
                value: `${level.name}: ${formatCurrency(level.value)}`,
                position: 'right',
                fill: level.color,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const DeepAnalysis = () => {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async (sym) => {
    const target = (sym || symbol).trim().toUpperCase();
    if (!target) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await api.get(`/invest/analyze/${target}?asset_type=${assetType}`);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (sym) => {
    setSymbol(sym);
    fetchAnalysis(sym);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchAnalysis();
  };

  /* Derive data from API response */
  const d = analysis || {};
  const scores = d.scores || d.dimensions || {};
  const prediction = d.prediction || d.profit_prediction || {};
  const reasons = d.reasons || d.signals || [];
  const signalKey = (d.signal || d.recommendation || 'HOLD').toUpperCase().replace(/\s+/g, '_');
  const signalCfg = SIGNAL_CONFIG[signalKey] || SIGNAL_CONFIG.HOLD;

  /* Build dimension cards */
  const dimensionCards = useMemo(() => {
    if (!analysis) return [];
    const s = scores;
    return [
      {
        title: 'Technical Score',
        icon: Activity,
        gradient: 'from-blue-500 to-cyan-500',
        score: s.technical ?? s.technical_score ?? null,
        metrics: [
          s.rsi != null && { label: 'RSI', value: (s.rsi ?? 0).toFixed(1) },
          s.macd != null && { label: 'MACD', value: (s.macd ?? 0).toFixed(2) },
          (s.sma_20 || s.sma20) != null && { label: 'SMA 20', value: formatCurrency(s.sma_20 ?? s.sma20) },
          (s.sma_50 || s.sma50) != null && { label: 'SMA 50', value: formatCurrency(s.sma_50 ?? s.sma50) },
        ].filter(Boolean),
        signals: reasons.filter((r) => (r.category || r.type || '').toLowerCase().includes('tech')),
      },
      {
        title: 'Fundamental Score',
        icon: BarChart3,
        gradient: 'from-purple-500 to-pink-500',
        score: s.fundamental ?? s.fundamental_score ?? null,
        metrics: [
          s.pe_ratio != null && { label: 'P/E Ratio', value: (s.pe_ratio ?? 0).toFixed(1) },
          s.profit_margin != null && { label: 'Profit Margin', value: formatPercent(s.profit_margin) },
          s.revenue_growth != null && { label: 'Revenue Growth', value: formatPercent(s.revenue_growth) },
          s.eps != null && { label: 'EPS', value: `$${(s.eps ?? 0).toFixed(2)}` },
        ].filter(Boolean),
        signals: reasons.filter((r) => (r.category || r.type || '').toLowerCase().includes('fund')),
      },
      {
        title: 'Sentiment Score',
        icon: MessageSquare,
        gradient: 'from-orange-500 to-red-500',
        score: s.sentiment ?? s.sentiment_score ?? null,
        metrics: [
          s.news_count != null && { label: 'News Articles', value: s.news_count },
          s.reddit_mentions != null && { label: 'Reddit Mentions', value: formatNumber(s.reddit_mentions) },
          s.fear_greed != null && { label: 'Fear & Greed', value: s.fear_greed },
          s.social_score != null && { label: 'Social Score', value: s.social_score },
        ].filter(Boolean),
        signals: reasons.filter((r) => (r.category || r.type || '').toLowerCase().includes('sent')),
      },
      {
        title: 'Value Score',
        icon: DollarSign,
        gradient: 'from-emerald-500 to-teal-500',
        score: s.value ?? s.value_score ?? null,
        metrics: [
          s.fair_value != null && { label: 'Fair Value', value: formatCurrency(s.fair_value) },
          s.discount_pct != null && { label: 'Discount', value: formatPercent(s.discount_pct) },
          s.analyst_target != null && { label: 'Analyst Target', value: formatCurrency(s.analyst_target) },
          s.pb_ratio != null && { label: 'P/B Ratio', value: (s.pb_ratio ?? 0).toFixed(2) },
        ].filter(Boolean),
        signals: reasons.filter((r) => (r.category || r.type || '').toLowerCase().includes('val')),
      },
      {
        title: 'Momentum Score',
        icon: Zap,
        gradient: 'from-yellow-500 to-amber-500',
        score: s.momentum ?? s.momentum_score ?? null,
        metrics: [
          s.change_7d != null && { label: '7D Change', value: formatPercent(s.change_7d) },
          s.change_30d != null && { label: '30D Change', value: formatPercent(s.change_30d) },
          s.change_90d != null && { label: '90D Change', value: formatPercent(s.change_90d) },
          s.volume_change != null && { label: 'Volume Change', value: formatPercent(s.volume_change) },
        ].filter(Boolean),
        signals: reasons.filter((r) => (r.category || r.type || '').toLowerCase().includes('mom')),
      },
    ];
  }, [analysis, scores, reasons]);

  const quickSymbols = QUICK_SYMBOLS[assetType] || QUICK_SYMBOLS.stock;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Page Header ─── */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Deep Analysis</h1>
          <p className="text-gray-400">Comprehensive investment analysis for any asset</p>
        </div>
      </div>

      {/* ─── Search Section ─── */}
      <div className="glass-card p-6 space-y-4">
        {/* Asset type toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setAssetType('stock')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'stock'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setAssetType('crypto')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'crypto'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Crypto
          </button>
        </div>

        {/* Symbol input + Analyze button */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Enter ${assetType === 'stock' ? 'stock' : 'crypto'} symbol (e.g. ${assetType === 'stock' ? 'AAPL' : 'BTC'})...`}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="input-field w-full pl-12"
            />
          </div>
          <button
            onClick={() => fetchAnalysis()}
            disabled={isLoading || !symbol.trim()}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Brain className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Quick access */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 py-1">Quick:</span>
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => handleQuickSelect(sym)}
              className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-sm border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="glass-card p-4 border-danger-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-danger-400 shrink-0" />
          <p className="text-danger-400">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {isLoading && (
        <div className="glass-card p-16 text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
            <Brain className="absolute inset-3 w-10 h-10 text-primary-400 animate-pulse" />
          </div>
          <p className="text-gray-400">Running deep analysis on <span className="text-white font-semibold">{symbol}</span>...</p>
          <p className="text-gray-600 text-sm">Analyzing technicals, fundamentals, sentiment, value and momentum</p>
        </div>
      )}

      {/* ═══════ RESULTS ═══════ */}
      {analysis && !isLoading && (
        <div className="space-y-6">
          {/* ─── Header Card ─── */}
          <div className={`glass-card p-6 border ${signalCfg.border}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Left: Symbol + Gauge */}
              <div className="flex items-center gap-6 flex-1">
                <CircularGauge score={d.overall_score ?? d.score ?? null} size={140} />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">{d.symbol || symbol}</h2>
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${signalCfg.bg} ${signalCfg.color}`}>
                      {signalCfg.label}
                    </span>
                  </div>
                  {d.name && <p className="text-gray-400">{d.name}</p>}
                  {d.current_price != null && (
                    <p className="text-2xl font-bold">{formatCurrency(d.current_price)}</p>
                  )}
                  {d.expected_return != null && (
                    <div className="flex items-center gap-1 text-sm">
                      {d.expected_return >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-success-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-danger-400" />
                      )}
                      <span className={d.expected_return >= 0 ? 'text-success-400' : 'text-danger-400'}>
                        Expected Return: {formatPercent(d.expected_return)}
                      </span>
                      {(d.timeframe || prediction.timeframe) && (
                        <span className="text-gray-500 ml-1">
                          in {d.timeframe || prediction.timeframe}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Key Levels */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
                {(d.entry_price ?? prediction.entry_price) != null && (
                  <div className="glass-card !rounded-xl p-3 text-center !bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-gray-400 mb-1">Entry</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatCurrency(d.entry_price ?? prediction.entry_price)}
                    </p>
                  </div>
                )}
                {(d.target_price ?? prediction.target_price) != null && (
                  <div className="glass-card !rounded-xl p-3 text-center !bg-success-500/5 border border-success-500/20">
                    <p className="text-xs text-gray-400 mb-1">Target</p>
                    <p className="text-lg font-bold text-success-400">
                      {formatCurrency(d.target_price ?? prediction.target_price)}
                    </p>
                  </div>
                )}
                {(d.stop_loss ?? prediction.stop_loss) != null && (
                  <div className="glass-card !rounded-xl p-3 text-center !bg-danger-500/5 border border-danger-500/20">
                    <p className="text-xs text-gray-400 mb-1">Stop Loss</p>
                    <p className="text-lg font-bold text-danger-400">
                      {formatCurrency(d.stop_loss ?? prediction.stop_loss)}
                    </p>
                  </div>
                )}
                {d.risk_reward_ratio != null && (
                  <div className="glass-card !rounded-xl p-3 text-center !bg-purple-500/5 border border-purple-500/20">
                    <p className="text-xs text-gray-400 mb-1">Risk / Reward</p>
                    <p className="text-lg font-bold text-purple-400">{d.risk_reward_ratio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── 5 Score Dimension Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dimensionCards.map((card) => (
              <DimensionCard key={card.title} {...card} />
            ))}
          </div>

          {/* ─── Profit Prediction Card ─── */}
          {(prediction.entry_price != null || d.entry_price != null) && (
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-400" />
                  Profit Prediction
                </h3>
                <div className="flex items-center gap-2">
                  {(prediction.confidence ?? d.confidence) != null && (() => {
                    const conf = getConfidenceLabel(prediction.confidence ?? d.confidence);
                    return (
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${conf.bg} ${conf.color}`}>
                        {conf.text} Confidence
                      </span>
                    );
                  })()}
                  {(prediction.risk_level ?? d.risk_level) && (() => {
                    const rb = getRiskBadge(prediction.risk_level ?? d.risk_level);
                    return (
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${rb.bg} ${rb.color}`}>
                        {rb.text}
                      </span>
                    );
                  })()}
                  {(prediction.timeframe ?? d.timeframe) && (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary-500/20 text-primary-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {prediction.timeframe ?? d.timeframe}
                    </span>
                  )}
                </div>
              </div>

              {/* Target levels grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card !rounded-xl p-4 !bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-gray-400 mb-1">Entry Price</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatCurrency(prediction.entry_price ?? d.entry_price)}
                  </p>
                </div>
                {(prediction.short_target ?? prediction.target_short) != null && (
                  <div className="glass-card !rounded-xl p-4 !bg-success-500/5 border border-success-500/20">
                    <p className="text-xs text-gray-400 mb-1">Short Target</p>
                    <p className="text-xl font-bold text-success-400">
                      {formatCurrency(prediction.short_target ?? prediction.target_short)}
                    </p>
                  </div>
                )}
                {(prediction.medium_target ?? prediction.target_medium) != null && (
                  <div className="glass-card !rounded-xl p-4 !bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-gray-400 mb-1">Medium Target</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {formatCurrency(prediction.medium_target ?? prediction.target_medium)}
                    </p>
                  </div>
                )}
                {(prediction.long_target ?? prediction.target_long) != null && (
                  <div className="glass-card !rounded-xl p-4 !bg-teal-500/5 border border-teal-500/20">
                    <p className="text-xs text-gray-400 mb-1">Long Target</p>
                    <p className="text-xl font-bold text-teal-400">
                      {formatCurrency(prediction.long_target ?? prediction.target_long)}
                    </p>
                  </div>
                )}
              </div>

              {/* Price levels mini chart */}
              <PriceLevelsChart
                entry={prediction.entry_price ?? d.entry_price}
                shortTarget={prediction.short_target ?? prediction.target_short}
                medTarget={prediction.medium_target ?? prediction.target_medium}
                longTarget={prediction.long_target ?? prediction.target_long}
                stopLoss={prediction.stop_loss ?? d.stop_loss}
                current={d.current_price}
              />

              {/* Confidence bar */}
              {(prediction.confidence ?? d.confidence) != null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Prediction Confidence</span>
                    <span className="text-sm font-bold text-primary-400">
                      {(prediction.confidence ?? d.confidence).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-400 transition-all duration-1000"
                      style={{ width: `${Math.min(prediction.confidence ?? d.confidence, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Top Reasons / Signals Card ─── */}
          {reasons.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary-400" />
                Analysis Signals ({reasons.length})
              </h3>
              <div className="space-y-2">
                {reasons.map((reason, idx) => {
                  const isBullish =
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('bull') ||
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('buy') ||
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('positive');
                  const isBearish =
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('bear') ||
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('sell') ||
                    (reason.signal || reason.type || reason.direction || '').toLowerCase().includes('negative');

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                        isBullish
                          ? 'bg-success-500/5 border border-success-500/10'
                          : isBearish
                          ? 'bg-danger-500/5 border border-danger-500/10'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-gray-300 shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {isBullish ? (
                          <TrendingUp className="w-4 h-4 text-success-400 shrink-0 mt-0.5" />
                        ) : isBearish ? (
                          <TrendingDown className="w-4 h-4 text-danger-400 shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {reason.indicator || reason.name || reason.title || `Signal ${idx + 1}`}
                            {reason.signal && (
                              <span className={`ml-2 text-xs ${isBullish ? 'text-success-400' : isBearish ? 'text-danger-400' : 'text-gray-400'}`}>
                                ({reason.signal})
                              </span>
                            )}
                          </p>
                          {(reason.explanation || reason.message || reason.description) && (
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              {reason.explanation || reason.message || reason.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Disclaimer ─── */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm text-gray-400">
              This analysis is for informational purposes only. It combines technical, fundamental,
              sentiment, value, and momentum indicators. Always do your own research before making
              investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepAnalysis;
