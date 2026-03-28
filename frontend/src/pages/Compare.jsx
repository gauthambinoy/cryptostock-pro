import React, { useEffect, useState, useMemo } from 'react';
import { usePortfolioStore } from '../utils/store';
import { portfolioAPI, marketAPI } from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { GitCompare, BarChart3, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  portfolio1: '#818cf8', // indigo-400
  portfolio2: '#f472b6', // pink-400
  sp500: '#60a5fa',      // blue-400
  btc: '#f59e0b',        // amber-500
};

const Compare = () => {
  const { portfolios, fetchPortfolios } = usePortfolioStore();
  const [portfolioA, setPortfolioA] = useState('');
  const [portfolioB, setPortfolioB] = useState('');
  const [perfA, setPerfA] = useState(null);
  const [perfB, setPerfB] = useState(null);
  const [benchmarkSP, setBenchmarkSP] = useState(null);
  const [benchmarkBTC, setBenchmarkBTC] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (portfolios.length === 0) {
      fetchPortfolios();
    }
  }, []);

  useEffect(() => {
    if (portfolios.length >= 2 && !portfolioA && !portfolioB) {
      setPortfolioA(portfolios[0].id.toString());
      if (portfolios.length > 1) {
        setPortfolioB(portfolios[1].id.toString());
      }
    }
  }, [portfolios]);

  const loadComparison = async () => {
    if (!portfolioA || !portfolioB) return;
    setIsLoading(true);
    try {
      const [resA, resB, resSP, resBTC] = await Promise.all([
        portfolioAPI.getPerformance(portfolioA),
        portfolioAPI.getPerformance(portfolioB),
        marketAPI.getStockHistory('^GSPC', '3mo').catch(() => null),
        marketAPI.getCryptoHistory('BTC', 90).catch(() => null),
      ]);
      setPerfA(resA.data);
      setPerfB(resB.data);
      setBenchmarkSP(resSP?.data || null);
      setBenchmarkBTC(resBTC?.data || null);
    } catch (error) {
      console.error('Failed to load comparison:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (portfolioA && portfolioB) {
      loadComparison();
    }
  }, [portfolioA, portfolioB]);

  const portfolioAName = useMemo(
    () => portfolios.find((p) => p.id.toString() === portfolioA)?.name || 'Portfolio A',
    [portfolioA, portfolios]
  );
  const portfolioBName = useMemo(
    () => portfolios.find((p) => p.id.toString() === portfolioB)?.name || 'Portfolio B',
    [portfolioB, portfolios]
  );

  // Build chart data
  const chartData = useMemo(() => {
    const historyA = perfA?.history || perfA?.daily_values || [];
    const historyB = perfB?.history || perfB?.daily_values || [];
    const spHistory = benchmarkSP?.prices || benchmarkSP?.history || benchmarkSP || [];
    const btcHistory = benchmarkBTC?.prices || benchmarkBTC?.history || benchmarkBTC || [];

    // Normalize to percentage change from first value
    const normalize = (arr, valueKey) => {
      if (!arr || arr.length === 0) return {};
      const firstVal = arr[0]?.[valueKey] || arr[0]?.value || arr[0]?.close || arr[0]?.price;
      if (!firstVal) return {};
      const result = {};
      arr.forEach((item) => {
        const date = item.date || item.timestamp;
        const val = item[valueKey] || item.value || item.close || item.price;
        if (date && val) {
          const key = new Date(date).toISOString().split('T')[0];
          result[key] = ((val - firstVal) / firstVal) * 100;
        }
      });
      return result;
    };

    const normA = normalize(historyA, 'value');
    const normB = normalize(historyB, 'value');
    const normSP = normalize(Array.isArray(spHistory) ? spHistory : [], 'close');
    const normBTC = normalize(Array.isArray(btcHistory) ? btcHistory : [], 'price');

    const allDates = new Set([
      ...Object.keys(normA),
      ...Object.keys(normB),
      ...Object.keys(normSP),
      ...Object.keys(normBTC),
    ]);

    return [...allDates]
      .sort()
      .map((date) => ({
        date,
        [portfolioAName]: normA[date] ?? null,
        [portfolioBName]: normB[date] ?? null,
        'S&P 500': normSP[date] ?? null,
        BTC: normBTC[date] ?? null,
      }));
  }, [perfA, perfB, benchmarkSP, benchmarkBTC, portfolioAName, portfolioBName]);

  // Stats for comparison table
  const getStats = (perf, name) => {
    if (!perf) return { name, value: '-', returnPct: '-', volatility: '-', best: '-', worst: '-' };
    const holdings = perf.holdings || [];
    const best = holdings.reduce(
      (top, h) => ((h.change_percent || 0) > (top.change_percent || -Infinity) ? h : top),
      { symbol: '-', change_percent: -Infinity }
    );
    const worst = holdings.reduce(
      (bot, h) => ((h.change_percent || 0) < (bot.change_percent || Infinity) ? h : bot),
      { symbol: '-', change_percent: Infinity }
    );
    return {
      name,
      value: perf.total_value ?? perf.portfolio_value ?? 0,
      returnPct: perf.total_return_percent ?? perf.return_percent ?? 0,
      volatility: perf.volatility ?? perf.std_dev ?? null,
      best: best.symbol !== '-' ? `${best.symbol} (${formatPercent(best.change_percent)})` : '-',
      worst: worst.symbol !== '-' ? `${worst.symbol} (${formatPercent(worst.change_percent)})` : '-',
    };
  };

  const statsA = getStats(perfA, portfolioAName);
  const statsB = getStats(perfB, portfolioBName);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="glass-card p-3 border border-white/10 text-sm">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value != null ? `${entry.value.toFixed(2)}%` : '-'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500">
          <GitCompare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Portfolio Compare</h1>
          <p className="text-gray-400">Compare portfolios against each other and benchmarks</p>
        </div>
      </div>

      {/* Portfolio Selection */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Portfolio A</label>
            <select
              value={portfolioA}
              onChange={(e) => setPortfolioA(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Select portfolio</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <GitCompare className="w-5 h-5 text-primary-400" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400">Portfolio B</label>
            <select
              value={portfolioB}
              onChange={(e) => setPortfolioB(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Select portfolio</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadComparison}
            disabled={isLoading || !portfolioA || !portfolioB}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Compare
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold">Performance Over Time (% Change)</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#9ca3af' }}
                />
                <Line
                  type="monotone"
                  dataKey={portfolioAName}
                  stroke={COLORS.portfolio1}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={portfolioBName}
                  stroke={COLORS.portfolio2}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="S&P 500"
                  stroke={COLORS.sp500}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="BTC"
                  stroke={COLORS.btc}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Legend supplement */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.sp500 }} />
              <span className="text-gray-400">S&P 500 (benchmark)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: COLORS.btc }} />
              <span className="text-gray-400">BTC (benchmark)</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Comparison Table */}
      {perfA && perfB && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              Stats Comparison
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="px-6 py-4 font-medium">Metric</th>
                  <th className="px-6 py-4 font-medium text-right" style={{ color: COLORS.portfolio1 }}>
                    {portfolioAName}
                  </th>
                  <th className="px-6 py-4 font-medium text-right" style={{ color: COLORS.portfolio2 }}>
                    {portfolioBName}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-400">Total Value</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(statsA.value)}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(statsB.value)}</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-400">Return %</td>
                  <td className="px-6 py-4 text-right">
                    <span className={statsA.returnPct >= 0 ? 'text-success-400' : 'text-danger-400'}>
                      {typeof statsA.returnPct === 'number' ? formatPercent(statsA.returnPct) : statsA.returnPct}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={statsB.returnPct >= 0 ? 'text-success-400' : 'text-danger-400'}>
                      {typeof statsB.returnPct === 'number' ? formatPercent(statsB.returnPct) : statsB.returnPct}
                    </span>
                  </td>
                </tr>
                {(statsA.volatility != null || statsB.volatility != null) && (
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-400">Volatility</td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {statsA.volatility != null ? `${statsA.volatility.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {statsB.volatility != null ? `${statsB.volatility.toFixed(2)}%` : '-'}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-400">Best Asset</td>
                  <td className="px-6 py-4 text-right text-success-400">{statsA.best}</td>
                  <td className="px-6 py-4 text-right text-success-400">{statsB.best}</td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-gray-400">Worst Asset</td>
                  <td className="px-6 py-4 text-right text-danger-400">{statsA.worst}</td>
                  <td className="px-6 py-4 text-right text-danger-400">{statsB.worst}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading comparison data...</p>
        </div>
      )}

      {/* No portfolios */}
      {portfolios.length < 2 && !isLoading && (
        <div className="glass-card p-12 text-center">
          <GitCompare className="w-8 h-8 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            You need at least 2 portfolios to compare. Create more portfolios to use this feature.
          </p>
        </div>
      )}
    </div>
  );
};

export default Compare;
