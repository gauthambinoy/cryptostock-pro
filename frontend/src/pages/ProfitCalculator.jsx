import React, { useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/helpers';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  BarChart3,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

const AMOUNT_PRESETS = [1000, 5000, 10000, 25000];

const QUICK_SYMBOLS = {
  stock: ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'AMD', 'META'],
  crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK'],
};

const getConfidenceBadge = (confidence) => {
  const c = (confidence || '').toLowerCase();
  if (c === 'high') return { text: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  if (c === 'medium' || c === 'moderate') return { text: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  return { text: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/20' };
};

const getRiskStyle = (level) => {
  const l = (level || '').toLowerCase();
  if (l === 'low') return { color: 'text-success-400', bg: 'bg-success-500/5', border: 'border-success-500/20' };
  if (l === 'medium' || l === 'moderate') return { color: 'text-yellow-400', bg: 'bg-yellow-500/5', border: 'border-yellow-500/20' };
  if (l === 'high') return { color: 'text-danger-400', bg: 'bg-danger-500/5', border: 'border-danger-500/20' };
  return { color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
};

/* ───── Summary Stat Card ───── */
const SummaryCard = ({ icon: Icon, label, value, accentColor }) => (
  <div className="glass-card p-5 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className={`p-2 rounded-lg ${accentColor.replace('text-', 'bg-').replace('400', '500/20')}`}>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
    <p className={`text-2xl font-bold ${accentColor}`}>{value}</p>
  </div>
);

/* ───── Custom Bar Chart Tooltip ───── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 !bg-dark-200/95 border border-white/10 text-sm">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="text-xs">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const ProfitCalculator = () => {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCalculation = async () => {
    const sym = symbol.trim().toUpperCase();
    const investmentAmount = parseFloat(amount);
    if (!sym || !investmentAmount || investmentAmount <= 0) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get(
        `/invest/profit-calc?symbol=${sym}&asset_type=${assetType}&investment_amount=${investmentAmount}`
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchCalculation();
  };

  const handlePreset = (val) => {
    setAmount(val.toString());
  };

  const handleQuickSymbol = (sym) => {
    setSymbol(sym);
  };

  /* ─── Derive data from API response ─── */
  const d = result || {};
  const investmentAmount = parseFloat(amount) || d.investment_amount || d.invested || 0;

  // Support both array timeframes and flat result shapes
  const timeframes = d.timeframes || d.breakdown || [];
  const hasFlatShape = timeframes.length === 0 && (d.expected_value_short != null || d.expected_value_medium != null || d.expected_value_long != null);

  // Build normalized timeframe rows
  const normalizedTimeframes = timeframes.length > 0
    ? timeframes
    : hasFlatShape
    ? [
        {
          label: 'Short (1-4 wk)',
          period: '1-4 weeks',
          target_price: d.target_short || null,
          expected_value: d.expected_value_short,
          profit: d.expected_profit_short ?? (d.expected_value_short != null ? d.expected_value_short - investmentAmount : null),
          return_pct: d.expected_return_short ?? (d.expected_value_short != null && investmentAmount > 0 ? ((d.expected_value_short - investmentAmount) / investmentAmount) * 100 : null),
          confidence: d.confidence_short || d.confidence || null,
        },
        {
          label: 'Medium (1-3 mo)',
          period: '1-3 months',
          target_price: d.target_medium || null,
          expected_value: d.expected_value_medium,
          profit: d.expected_profit_medium ?? (d.expected_value_medium != null ? d.expected_value_medium - investmentAmount : null),
          return_pct: d.expected_return_pct ?? d.expected_return_medium ?? (d.expected_value_medium != null && investmentAmount > 0 ? ((d.expected_value_medium - investmentAmount) / investmentAmount) * 100 : null),
          confidence: d.confidence_medium || d.confidence || null,
        },
        {
          label: 'Long (3-12 mo)',
          period: '3-12 months',
          target_price: d.target_long || null,
          expected_value: d.expected_value_long,
          profit: d.expected_profit_long ?? (d.expected_value_long != null ? d.expected_value_long - investmentAmount : null),
          return_pct: d.expected_return_long ?? (d.expected_value_long != null && investmentAmount > 0 ? ((d.expected_value_long - investmentAmount) / investmentAmount) * 100 : null),
          confidence: d.confidence_long || d.confidence || null,
        },
      ].filter((tf) => tf.expected_value != null)
    : [];

  // Summary values (prefer explicit fields, fall back to medium timeframe)
  const mediumTf = normalizedTimeframes.find((tf) => (tf.label || '').toLowerCase().includes('medium')) || normalizedTimeframes[1] || {};
  const expectedValue = d.expected_value ?? d.total_expected_value ?? d.expected_value_medium ?? mediumTf.expected_value ?? null;
  const expectedProfit = d.expected_profit ?? d.expected_profit_medium ?? (expectedValue != null ? expectedValue - investmentAmount : null);
  const expectedReturn = d.expected_return ?? d.expected_return_pct ?? (expectedProfit != null && investmentAmount > 0 ? (expectedProfit / investmentAmount) * 100 : null);

  // Risk
  const stopLossLevel = d.stop_loss ?? d.stop_loss_price ?? null;
  const maxLoss = d.max_loss ?? (stopLossLevel != null && d.current_price != null && investmentAmount > 0
    ? ((stopLossLevel - d.current_price) / d.current_price) * investmentAmount
    : null);

  // Chart data
  const chartData = normalizedTimeframes.map((tf, idx) => ({
    name: tf.label || tf.timeframe || tf.name || `Period ${idx + 1}`,
    Invested: investmentAmount,
    Expected: tf.expected_value ?? tf.value ?? 0,
  }));

  const quickSymbols = QUICK_SYMBOLS[assetType] || QUICK_SYMBOLS.stock;

  // Format confidence - handle both string and numeric
  const fmtConfidence = (val) => {
    if (val == null) return null;
    if (typeof val === 'string') return val;
    // numeric: 0-1 range or 0-100 range
    const pct = val <= 1 ? val * 100 : val;
    return pct >= 75 ? 'high' : pct >= 50 ? 'medium' : 'low';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Page Header ─── */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Profit Calculator</h1>
          <p className="text-gray-400">Estimate potential returns on your investment</p>
        </div>
      </div>

      {/* ─── Input Section ─── */}
      <div className="glass-card p-6 space-y-4">
        {/* Asset type toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setAssetType('stock'); setSymbol(''); }}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'stock'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => { setAssetType('crypto'); setSymbol(''); }}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'crypto'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Crypto
          </button>
        </div>

        {/* Symbol + Amount + Calculate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Symbol */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={assetType === 'stock' ? 'Symbol (e.g. NVDA)' : 'Symbol (e.g. BTC)'}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="input-field w-full pl-12"
            />
          </div>

          {/* Investment amount */}
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              placeholder="Investment amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              min="1"
              className="input-field w-full pl-12"
            />
          </div>

          {/* Calculate button */}
          <button
            onClick={fetchCalculation}
            disabled={isLoading || !symbol.trim() || !amount || parseFloat(amount) <= 0}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Calculator className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
            {isLoading ? 'Calculating...' : 'Calculate Profit'}
          </button>
        </div>

        {/* Amount presets */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 py-1">Quick amounts:</span>
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                amount === preset.toString()
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Quick symbols */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 py-1">Popular:</span>
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => handleQuickSymbol(sym)}
              className={`px-3 py-1 rounded-lg text-sm border transition-all ${
                symbol === sym
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
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
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <DollarSign className="absolute inset-3 w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-gray-400">
            Calculating potential returns for{' '}
            <span className="text-white font-semibold">{symbol}</span>
            {' '}with <span className="text-white font-semibold">${parseFloat(amount).toLocaleString()}</span> investment...
          </p>
        </div>
      )}

      {/* ═══════ RESULTS ═══════ */}
      {result && !isLoading && (
        <div className="space-y-6">
          {/* ─── Summary Cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={DollarSign}
              label="Investment"
              value={formatCurrency(investmentAmount)}
              accentColor="text-primary-400"
            />
            <SummaryCard
              icon={Target}
              label="Expected Value"
              value={expectedValue != null ? formatCurrency(expectedValue) : '--'}
              accentColor="text-emerald-400"
            />
            <SummaryCard
              icon={expectedProfit >= 0 ? TrendingUp : TrendingDown}
              label="Expected Profit"
              value={expectedProfit != null ? `${expectedProfit >= 0 ? '+' : ''}${formatCurrency(expectedProfit)}` : '--'}
              accentColor={expectedProfit >= 0 ? 'text-success-400' : 'text-danger-400'}
            />
            <SummaryCard
              icon={Zap}
              label="Return %"
              value={expectedReturn != null ? formatPercent(expectedReturn) : '--'}
              accentColor={expectedReturn >= 0 ? 'text-success-400' : 'text-danger-400'}
            />
          </div>

          {/* ─── Timeframe Breakdown Table ─── */}
          {normalizedTimeframes.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                Timeframe Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Timeframe</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Target Price</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Expected Value</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Profit</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Return %</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedTimeframes.map((tf, idx) => {
                      const tfProfit = tf.profit ?? (tf.expected_value != null ? tf.expected_value - investmentAmount : null);
                      const tfReturn = tf.return_pct ?? tf.return_percent ?? (tfProfit != null && investmentAmount > 0 ? (tfProfit / investmentAmount) * 100 : null);
                      const isPositive = (tfProfit ?? 0) >= 0;
                      const confStr = fmtConfidence(tf.confidence);
                      const confBadge = confStr ? getConfidenceBadge(confStr) : null;

                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                idx === 0 ? 'bg-blue-400' : idx === 1 ? 'bg-purple-400' : 'bg-emerald-400'
                              }`} />
                              <div>
                                <p className="font-medium text-white">
                                  {tf.label || tf.timeframe || tf.name || `Period ${idx + 1}`}
                                </p>
                                {tf.period && <p className="text-xs text-gray-500">{tf.period}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-gray-200">
                            {tf.target_price != null ? formatCurrency(tf.target_price) : '--'}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-gray-200">
                            {tf.expected_value != null ? formatCurrency(tf.expected_value) : '--'}
                          </td>
                          <td className={`text-right py-4 px-4 font-semibold ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
                            {tfProfit != null ? (
                              <span className="flex items-center justify-end gap-1">
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {isPositive ? '+' : ''}{formatCurrency(tfProfit)}
                              </span>
                            ) : '--'}
                          </td>
                          <td className={`text-right py-4 px-4 font-semibold ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
                            {tfReturn != null ? formatPercent(tfReturn) : '--'}
                          </td>
                          <td className="text-center py-4 px-4">
                            {confBadge ? (
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${confBadge.bg} ${confBadge.color}`}>
                                {confBadge.text}
                              </span>
                            ) : (
                              <span className="text-gray-500">--</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Risk Analysis ─── */}
          {(stopLossLevel != null || maxLoss != null || d.risk_level) && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-danger-400" />
                Risk Analysis
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stopLossLevel != null && (
                  <div className="glass-card !rounded-xl p-4 !bg-danger-500/5 border border-danger-500/20">
                    <p className="text-xs text-gray-400 mb-1">Stop Loss Level</p>
                    <p className="text-xl font-bold text-danger-400">{formatCurrency(stopLossLevel)}</p>
                  </div>
                )}
                {maxLoss != null && (
                  <div className="glass-card !rounded-xl p-4 !bg-orange-500/5 border border-orange-500/20">
                    <p className="text-xs text-gray-400 mb-1">Max Potential Loss</p>
                    <p className="text-xl font-bold text-orange-400">{formatCurrency(Math.abs(maxLoss))}</p>
                    {investmentAmount > 0 && (
                      <p className="text-xs text-orange-400/70 mt-1">
                        {formatPercent(-(Math.abs(maxLoss) / investmentAmount) * 100)} of investment
                      </p>
                    )}
                  </div>
                )}
                {d.risk_level && (() => {
                  const rs = getRiskStyle(d.risk_level);
                  return (
                    <div className={`glass-card !rounded-xl p-4 !${rs.bg} border ${rs.border}`}>
                      <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                      <p className={`text-xl font-bold capitalize ${rs.color}`}>{d.risk_level}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── Bar Chart: Invested vs Expected ─── */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Investment vs Expected Value
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(val) =>
                        val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`
                      }
                      axisLine={{ stroke: '#374151' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend
                      wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '12px' }}
                    />
                    <Bar
                      dataKey="Invested"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    />
                    <Bar
                      dataKey="Expected"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={60}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.Expected >= entry.Invested ? '#22c55e' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ─── Recommendation Text ─── */}
          {(d.recommendation || d.recommendation_text || d.summary) && (
            <div className="glass-card p-6 border border-primary-500/20">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-400" />
                Recommendation
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {d.recommendation || d.recommendation_text || d.summary}
              </p>
            </div>
          )}

          {/* ─── Disclaimer ─── */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm text-gray-400">
              These projections are estimates based on current market data and analysis models.
              Actual returns may vary significantly. Past performance does not guarantee future
              results. This is not financial advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitCalculator;
