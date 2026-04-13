import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, RefreshCw, Activity, AlertTriangle, TrendingUp,
  TrendingDown, DollarSign, BarChart2, Target, ChevronDown,
  ChevronUp, Eye, EyeOff,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (price) => {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(3)}`;
  if (price >= 0.001) return `$${price.toFixed(5)}`;
  return `$${price.toFixed(8)}`;
};

const fmtUSD = (val) => {
  if (!val) return '$0';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${Math.round(val).toLocaleString()}`;
};

const dirColor = (dir) => {
  if (dir === 'LONG') return 'text-emerald-400';
  if (dir === 'SHORT') return 'text-rose-400';
  return 'text-slate-400';
};

const dirBadge = (dir) => {
  if (dir === 'LONG')
    return 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400';
  if (dir === 'SHORT')
    return 'bg-rose-500/15 border border-rose-500/30 text-rose-400';
  return 'bg-slate-700/50 border border-slate-600 text-slate-400';
};

const fgColor = (val) => {
  if (val >= 75) return 'text-red-400';
  if (val >= 55) return 'text-orange-400';
  if (val >= 45) return 'text-yellow-400';
  if (val >= 25) return 'text-blue-400';
  return 'text-purple-400';
};

const StrengthBar = ({ strength, dir }) => {
  const color =
    dir === 'LONG' ? 'bg-emerald-500' : dir === 'SHORT' ? 'bg-rose-500' : 'bg-slate-500';
  return (
    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, strength)}%` }} />
    </div>
  );
};

// ─── Capital Setup Modal ───────────────────────────────────────────────────────

const CapitalModal = ({ onSave, initial = { capital: 50, risk: 2 } }) => {
  const [cap, setCap] = useState(initial.capital);
  const [risk, setRisk] = useState(initial.risk);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">💰</div>
          <h2 className="text-white text-2xl font-bold">Intraday Setup</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Tell me your budget and I'll calculate optimal leverage, position sizes,
            and tailored signals — built around your capital.
          </p>
        </div>

        <div className="space-y-5">
          {/* Capital input */}
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">
              How much are you investing today? (€)
            </label>
            <input
              type="number"
              value={cap}
              onChange={(e) => setCap(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-xl font-bold focus:border-blue-500 focus:outline-none"
              placeholder="50"
              min={1}
            />
            <div className="flex gap-2 mt-2">
              {[10, 25, 50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setCap(v)}
                  className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                    cap === v
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  €{v}
                </button>
              ))}
            </div>
          </div>

          {/* Risk slider */}
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-2">
              Risk per trade:{' '}
              <span className="text-yellow-400 font-bold">{risk}%</span>
              {' '}={' '}
              <span className="text-rose-400 font-bold">
                €{((cap * risk) / 100).toFixed(2)} max loss
              </span>
            </label>
            <input
              type="range"
              min={0.5} max={5} step={0.5}
              value={risk}
              onChange={(e) => setRisk(parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-slate-500 text-xs mt-1">
              <span>0.5% Conservative</span>
              <span>5% Aggressive</span>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-200/80">
            ⚠️ Leverage trading is high risk. Signals are for informational purposes only.
            Always use stop losses and never risk more than you can afford to lose.
          </div>

          <button
            onClick={() => onSave(cap, risk)}
            disabled={cap <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-lg"
          >
            Launch Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Signal Detail Drawer ──────────────────────────────────────────────────────

const SignalDetail = ({ item, onClose }) => {
  if (!item) return null;
  const { signal: s, leverage: lev } = item;
  const isLong = s.direction === 'LONG';

  return (
    <div className={`mt-3 rounded-xl border p-4 ${
      isLong
        ? 'bg-emerald-900/10 border-emerald-700/30'
        : s.direction === 'SHORT'
        ? 'bg-rose-900/10 border-rose-700/30'
        : 'bg-slate-800 border-slate-700'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-xl">
            {item.symbol}{' '}
            <span className={`text-base ${dirColor(s.direction)}`}>
              {s.direction === 'LONG' ? '▲ LONG' : s.direction === 'SHORT' ? '▼ SHORT' : '— NEUTRAL'}
            </span>
          </h3>
          <p className="text-slate-400 text-sm mt-0.5">{s.reason}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none px-1">
          ✕
        </button>
      </div>

      {/* Technical snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-800/70 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">RSI 15m / 1h / 4h</p>
          <p className="text-white font-mono text-sm">
            {s.rsi_15m?.toFixed(0)} / {s.rsi_1h?.toFixed(0)} / {s.rsi_4h?.toFixed(0)}
          </p>
        </div>
        <div className="bg-slate-800/70 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">ATR Volatility</p>
          <p className="text-white text-sm">{s.atr_pct?.toFixed(2)}% / candle</p>
        </div>
        <div className="bg-slate-800/70 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">Funding Rate</p>
          <p className={`text-sm font-mono ${item.funding_rate > 0 ? 'text-red-400' : item.funding_rate < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {item.funding_rate > 0 ? '+' : ''}{item.funding_rate?.toFixed(4)}%
          </p>
        </div>
        <div className="bg-slate-800/70 rounded-lg p-3">
          <p className="text-slate-500 text-xs mb-1">24h Volume</p>
          <p className="text-white text-sm">${item.volume_24h_m}M</p>
        </div>
      </div>

      {/* Trade plan */}
      {lev && lev.suggested_leverage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Leverage</p>
            <p className="text-yellow-400 text-2xl font-bold">{lev.suggested_leverage}x</p>
          </div>
          <div className="bg-slate-800/70 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Position / Margin</p>
            <p className="text-white text-sm font-bold">€{lev.position_size_eur}</p>
            <p className="text-slate-500 text-xs">€{lev.margin_eur} margin</p>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Take Profit</p>
            <p className="text-emerald-400 font-bold">+{lev.tp_pct}%</p>
            <p className="text-emerald-600 text-xs font-mono">
              {fmt(isLong ? lev.tp_long : lev.tp_short)}
            </p>
          </div>
          <div className="bg-rose-900/20 border border-rose-800/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs mb-1">Stop / Liquidation</p>
            <p className="text-rose-400 font-bold">-{lev.sl_pct}%</p>
            <p className="text-slate-500 text-xs">Liq: -{lev.liq_pct}%</p>
          </div>
        </div>
      )}

      {/* Algorithm breakdown */}
      {s.all_signals?.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs mb-2 font-medium uppercase tracking-wide">
            Algorithm Breakdown ({s.all_signals.length} signals fired)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {s.all_signals.map((algo, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 rounded-md border font-medium ${
                  algo.direction === 'LONG'
                    ? 'border-emerald-700/50 text-emerald-400 bg-emerald-900/20'
                    : algo.direction === 'SHORT'
                    ? 'border-rose-700/50 text-rose-400 bg-rose-900/20'
                    : 'border-slate-700 text-slate-400'
                }`}
              >
                {algo.name} {algo.strength.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {!item.full_analysis && (
        <p className="text-slate-600 text-xs mt-3">
          * Lite analysis (RSI only). This asset ranks outside the top 30 by volume.
        </p>
      )}
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────

const IntradayDashboard = () => {
  const storedCap = parseFloat(localStorage.getItem('intraday_capital') || '0');
  const storedRisk = parseFloat(localStorage.getItem('intraday_risk') || '2');

  const [showModal, setShowModal] = useState(storedCap <= 0);
  const [capital, setCapital] = useState(storedCap || 50);
  const [riskPct, setRiskPct] = useState(storedRisk);

  const [pulse, setPulse] = useState(null);
  const [signals, setSignals] = useState([]);
  const [whales, setWhales] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [funding, setFunding] = useState([]);

  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState('');

  const [sortBy, setSortBy] = useState('strength');
  const [filterDir, setFilterDir] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showSide, setShowSide] = useState(true);

  const fetchAll = useCallback(async () => {
    if (capital <= 0) return;
    setLoading(true);
    setError('');
    try {
      const [p, s, w, l, f] = await Promise.all([
        fetch('/api/intraday/market-pulse', {}).then((r) => r.json()),
        fetch(`/api/intraday/signals?capital=${capital}&risk_pct=${riskPct}`, {
          credentials: 'include',
        }).then((r) => r.json()),
        fetch('/api/intraday/whale-feed', {}).then((r) => r.json()),
        fetch('/api/intraday/liquidations', {}).then((r) => r.json()),
        fetch('/api/intraday/funding-rates', {}).then((r) => r.json()),
      ]);
      setPulse(p);
      setSignals(Array.isArray(s) ? s : []);
      setWhales(Array.isArray(w) ? w : []);
      setLiquidations(Array.isArray(l) ? l : []);
      setFunding(Array.isArray(f) ? f : []);
      setLastUpdate(new Date());
      setCountdown(30);
    } catch (err) {
      setError('Failed to fetch market data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [capital, riskPct]);

  // Initial load
  useEffect(() => {
    if (!showModal) fetchAll();
  }, [showModal, fetchAll]);

  // Auto-refresh countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchAll();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const handleCapitalSave = (cap, risk) => {
    localStorage.setItem('intraday_capital', String(cap));
    localStorage.setItem('intraday_risk', String(risk));
    setCapital(cap);
    setRiskPct(risk);
    setShowModal(false);
  };

  const filtered = signals
    .filter((s) => filterDir === 'ALL' || s.signal.direction === filterDir)
    .sort((a, b) => {
      if (sortBy === 'strength') return b.signal.strength - a.signal.strength;
      if (sortBy === 'change') return Math.abs(b.change_24h) - Math.abs(a.change_24h);
      if (sortBy === 'volume') return b.volume_24h_m - a.volume_24h_m;
      if (sortBy === 'funding')
        return Math.abs(b.funding_rate || 0) - Math.abs(a.funding_rate || 0);
      return 0;
    });

  const longCount = signals.filter((s) => s.signal.direction === 'LONG').length;
  const shortCount = signals.filter((s) => s.signal.direction === 'SHORT').length;

  return (
    <>
      {showModal && (
        <CapitalModal
          onSave={handleCapitalSave}
          initial={{ capital, risk: riskPct }}
        />
      )}

      <div className="space-y-5">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-400" size={22} />
              Intraday Command Center
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {signals.length} instruments · 8-algo ensemble · live leverage calculator
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowModal(true)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <DollarSign size={13} className="text-yellow-400" />
              €{capital} · {riskPct}% risk
            </button>
            <button
              onClick={() => setShowSide((v) => !v)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 p-1.5 rounded-lg transition-colors"
              title="Toggle side panel"
            >
              {showSide ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : `${countdown}s`}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/40 text-red-300 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* ── Market Pulse Strip ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* BTC */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">BTC Price</p>
            <p className="text-white text-lg font-bold">
              {pulse ? `$${pulse.btc_price?.toLocaleString()}` : '—'}
            </p>
            {pulse && (
              <p className={`text-xs font-medium mt-0.5 ${pulse.btc_change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pulse.btc_change_24h >= 0 ? '▲' : '▼'} {Math.abs(pulse.btc_change_24h).toFixed(2)}% 24h
              </p>
            )}
          </div>

          {/* Fear & Greed */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Fear & Greed</p>
            {pulse ? (
              <>
                <p className={`text-lg font-bold ${fgColor(pulse.fear_greed)}`}>
                  {pulse.fear_greed}{' '}
                  <span className="text-xs font-normal">{pulse.fear_greed_label}</span>
                </p>
                <div className="w-full h-1.5 bg-slate-700 rounded mt-1.5">
                  <div
                    className={`h-full rounded ${pulse.fear_greed > 50 ? 'bg-red-400' : 'bg-blue-400'}`}
                    style={{ width: `${pulse.fear_greed}%` }}
                  />
                </div>
              </>
            ) : <p className="text-slate-500">—</p>}
          </div>

          {/* BTC Dominance */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">BTC Dominance</p>
            <p className="text-white text-lg font-bold">
              {pulse ? `${pulse.btc_dominance}%` : '—'}
            </p>
            {pulse && (
              <p className="text-slate-500 text-xs mt-0.5">
                {pulse.btc_dominance > 55 ? '⚠️ Alt season unlikely' : '✅ Alts may pump'}
              </p>
            )}
          </div>

          {/* Signal summary */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs mb-1">Signal Bias</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-emerald-400 font-bold text-sm">▲ {longCount} LONG</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400 font-bold text-sm">▼ {shortCount} SHORT</span>
            </div>
            {pulse && (
              <p className="text-slate-500 text-xs mt-1">
                Mkt cap: ${(pulse.total_market_cap_b / 1000).toFixed(1)}T
              </p>
            )}
          </div>
        </div>

        {/* ── Main Grid ──────────────────────────────────────────────────────── */}
        <div className={`grid gap-5 ${showSide ? 'xl:grid-cols-3' : 'grid-cols-1'}`}>
          {/* ── Signal Table (2/3) ─────────────────────────────────────────── */}
          <div className={showSide ? 'xl:col-span-2' : ''}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-700">
                <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
                  <Activity size={15} className="text-blue-400" />
                  Live Signals ({filtered.length})
                  {loading && (
                    <span className="text-slate-500 text-xs font-normal">Scanning…</span>
                  )}
                </h2>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {['ALL', 'LONG', 'SHORT'].map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setFilterDir(dir)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                        filterDir === dir
                          ? dir === 'LONG'
                            ? 'bg-emerald-500 text-white'
                            : dir === 'SHORT'
                            ? 'bg-rose-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1"
                  >
                    <option value="strength">Strength</option>
                    <option value="change">24h Change</option>
                    <option value="volume">Volume</option>
                    <option value="funding">Funding Rate</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/50">
                      <th className="text-left px-4 py-2.5 font-medium">#</th>
                      <th className="text-left px-3 py-2.5 font-medium">Asset</th>
                      <th className="text-right px-3 py-2.5 font-medium">Price</th>
                      <th className="text-right px-3 py-2.5 font-medium">24h %</th>
                      <th className="text-center px-3 py-2.5 font-medium">Signal</th>
                      <th className="text-center px-3 py-2.5 font-medium">Strength</th>
                      <th className="text-right px-3 py-2.5 font-medium">Lev.</th>
                      <th className="text-right px-3 py-2.5 font-medium">TP / SL</th>
                      <th className="text-right px-3 py-2.5 font-medium">Margin</th>
                      <th className="text-center px-3 py-2.5 font-medium">Algos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => {
                      const s = item.signal;
                      const lev = item.leverage || {};
                      const isTop3 = i < 3 && s.strength > 55;
                      const isSelected = selectedItem?.symbol === item.symbol;

                      return (
                        <React.Fragment key={item.symbol}>
                          <tr
                            onClick={() =>
                              setSelectedItem(isSelected ? null : item)
                            }
                            className={`border-b border-slate-700/30 cursor-pointer transition-colors
                              ${isSelected ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}
                              ${isTop3 ? 'bg-slate-750' : ''}
                            `}
                          >
                            {/* Rank */}
                            <td className="px-4 py-2.5 text-slate-500">
                              {isTop3 ? (
                                <span className="text-yellow-400">★</span>
                              ) : (
                                i + 1
                              )}
                            </td>
                            {/* Symbol */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-semibold">{item.symbol}</span>
                                {item.has_futures && (
                                  <span className="text-slate-600 text-xs">PERP</span>
                                )}
                                {!item.full_analysis && (
                                  <span className="text-slate-700 text-xs" title="Lite analysis">·</span>
                                )}
                              </div>
                            </td>
                            {/* Price */}
                            <td className="px-3 py-2.5 text-right text-white font-mono">
                              {fmt(item.price)}
                            </td>
                            {/* 24h */}
                            <td className={`px-3 py-2.5 text-right font-medium ${item.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {item.change_24h >= 0 ? '+' : ''}{item.change_24h.toFixed(2)}%
                            </td>
                            {/* Signal badge */}
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${dirBadge(s.direction)}`}>
                                {s.direction === 'LONG'
                                  ? '▲ LONG'
                                  : s.direction === 'SHORT'
                                  ? '▼ SHORT'
                                  : '— WAIT'}
                              </span>
                            </td>
                            {/* Strength */}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`font-bold ${dirColor(s.direction)}`}>
                                  {s.strength.toFixed(0)}%
                                </span>
                                <StrengthBar strength={s.strength} dir={s.direction} />
                              </div>
                            </td>
                            {/* Leverage */}
                            <td className="px-3 py-2.5 text-right">
                              <span className="text-yellow-400 font-bold">
                                {lev.suggested_leverage || '—'}x
                              </span>
                            </td>
                            {/* TP / SL */}
                            <td className="px-3 py-2.5 text-right">
                              {lev.tp_pct ? (
                                <div>
                                  <div className="text-emerald-400">+{lev.tp_pct.toFixed(1)}%</div>
                                  <div className="text-rose-400">-{lev.sl_pct.toFixed(1)}%</div>
                                </div>
                              ) : '—'}
                            </td>
                            {/* Margin */}
                            <td className="px-3 py-2.5 text-right text-slate-300">
                              {lev.margin_eur ? `€${lev.margin_eur.toFixed(2)}` : '—'}
                            </td>
                            {/* Algo confluence */}
                            <td className="px-3 py-2.5 text-center">
                              <span className={`font-semibold ${
                                s.confluence >= 4 ? 'text-yellow-400' :
                                s.confluence >= 3 ? 'text-blue-400' : 'text-slate-500'
                              }`}>
                                {s.confluence}/{s.algo_count || 8}
                              </span>
                            </td>
                          </tr>

                          {/* Inline detail row */}
                          {isSelected && (
                            <tr>
                              <td colSpan={10} className="px-4 pb-3">
                                <SignalDetail item={item} onClose={() => setSelectedItem(null)} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center text-slate-500 py-12">
                          {loading
                            ? 'Scanning 60+ markets across 8 algorithms…'
                            : 'No signals match the current filter.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Side Panel (1/3) ──────────────────────────────────────────────── */}
          {showSide && (
            <div className="space-y-4">
              {/* Whale Feed */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐋</span>
                    <h3 className="text-white font-semibold text-sm">Whale Feed</h3>
                  </div>
                  <span className="text-slate-500 text-xs">&gt;$80K trades</span>
                </div>
                <div className="divide-y divide-slate-700/40 max-h-56 overflow-y-auto">
                  {whales.length > 0 ? (
                    whales.map((w, i) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            w.side === 'BUY'
                              ? 'bg-emerald-900/50 text-emerald-400'
                              : 'bg-rose-900/50 text-rose-400'
                          }`}>
                            {w.side}
                          </span>
                          <span className="text-white text-sm font-medium">{w.symbol}</span>
                        </div>
                        <span className="text-slate-300 text-xs font-mono">
                          {fmtUSD(w.usd_value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-600 text-xs text-center py-6">
                      {loading ? 'Scanning trades…' : 'No large trades detected'}
                    </p>
                  )}
                </div>
              </div>

              {/* Funding Rates */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-purple-400" />
                    <h3 className="text-white font-semibold text-sm">Funding Rates</h3>
                  </div>
                  <span className="text-slate-500 text-xs">+ve = longs pay</span>
                </div>
                <div className="divide-y divide-slate-700/40 max-h-56 overflow-y-auto">
                  {funding.slice(0, 18).map((f, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{f.symbol}</span>
                      <span className={`text-xs font-mono font-bold ${
                        f.rate > 0.07 ? 'text-red-400' :
                        f.rate > 0.02 ? 'text-orange-400' :
                        f.rate < -0.04 ? 'text-emerald-400' :
                        f.rate < 0 ? 'text-blue-400' : 'text-slate-400'
                      }`}>
                        {f.rate > 0 ? '+' : ''}{f.rate.toFixed(4)}%
                      </span>
                    </div>
                  ))}
                  {funding.length === 0 && (
                    <p className="text-slate-600 text-xs text-center py-6">
                      {loading ? 'Loading…' : 'No data'}
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Liquidations */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  <h3 className="text-white font-semibold text-sm">Liquidations</h3>
                </div>
                <div className="divide-y divide-slate-700/40 max-h-48 overflow-y-auto">
                  {liquidations.length > 0 ? (
                    liquidations.map((l, i) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${l.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {l.side === 'BUY' ? '📈 SHORT LIQ' : '📉 LONG LIQ'}
                          </span>
                          <span className="text-white text-xs font-medium">{l.symbol}</span>
                        </div>
                        <span className="text-slate-300 text-xs font-mono">
                          {fmtUSD(l.usd_value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-600 text-xs text-center py-5">
                      {loading ? 'Loading…' : 'No recent liquidations'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-slate-600 text-xs pb-2">
          <span>
            {lastUpdate
              ? `Last updated ${lastUpdate.toLocaleTimeString()} · Next in ${countdown}s`
              : 'Loading first scan…'}
          </span>
          <span>
            Top 30 assets: 8-algo full analysis · Remaining: RSI analysis
          </span>
        </div>
      </div>
    </>
  );
};

export default IntradayDashboard;
