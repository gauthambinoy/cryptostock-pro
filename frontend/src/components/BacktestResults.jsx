import React, { useMemo } from 'react';
import { forwardRef } from 'react';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts';
import { TrendingUp, Target, AlertTriangle, BarChart3, Activity } from 'lucide-react';

const BacktestResults = forwardRef(({ results }, ref) => {
  const {
    symbol,
    strategy,
    total_return_percent,
    annual_return_percent,
    sharpe_ratio,
    max_drawdown_percent,
    win_rate_percent,
    total_trades,
    benchmark_return_percent,
    outperformance_percent,
    equity_curve,
    trades,
    monthly_returns,
    monte_carlo_stats,
  } = results;

  // Prepare equity curve chart data
  const equityCurveData = useMemo(() => {
    if (!equity_curve || equity_curve.length === 0) return [];
    return equity_curve.map((value, idx) => ({
      day: idx,
      equity: (value * 100).toFixed(2),
    }));
  }, [equity_curve]);

  // Prepare trades table data
  const tradesData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    return trades.sort((a, b) => {
      return Math.abs(b.return_percent) - Math.abs(a.return_percent);
    });
  }, [trades]);

  // Prepare monthly returns heatmap
  const monthlyData = useMemo(() => {
    if (!monthly_returns) return [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];

    Object.keys(monthly_returns).sort().forEach((year) => {
      const yearData = monthly_returns[year];
      months.forEach((month, idx) => {
        const returnVal = yearData[String(idx + 1)] ?? null;
        if (returnVal !== null) {
          data.push({
            year,
            month: month.substring(0, 1),
            value: returnVal,
          });
        }
      });
    });

    return data;
  }, [monthly_returns]);

  // Get color for return values
  const getReturnColor = (value) => {
    if (value > 5) return 'bg-green-900';
    if (value > 0) return 'bg-green-800';
    if (value < -5) return 'bg-red-900';
    if (value < 0) return 'bg-red-800';
    return 'bg-gray-700';
  };

  const getTextColor = (value) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div ref={ref} className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Return */}
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Total Return
          </div>
          <div className={`text-2xl font-bold ${getChangeColor(total_return_percent)}`}>
            {formatPercent(total_return_percent)}
          </div>
        </div>

        {/* Annual Return */}
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Annual Return
          </div>
          <div className={`text-2xl font-bold ${getChangeColor(annual_return_percent)}`}>
            {formatPercent(annual_return_percent)}
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Activity className="w-4 h-4" />
            Sharpe Ratio
          </div>
          <div className={`text-2xl font-bold ${sharpe_ratio > 1 ? 'text-green-400' : 'text-yellow-400'}`}>
            {sharpe_ratio.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">{sharpe_ratio > 1 ? 'Good' : 'Moderate'} risk-adjusted</p>
        </div>

        {/* Max Drawdown */}
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Max Drawdown
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatPercent(max_drawdown_percent)}
          </div>
        </div>

        {/* Win Rate */}
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
            <Target className="w-4 h-4" />
            Win Rate
          </div>
          <div className={`text-2xl font-bold ${win_rate_percent >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
            {formatPercent(win_rate_percent)}
          </div>
          <p className="text-xs text-gray-500 mt-1">{total_trades} trades</p>
        </div>
      </div>

      {/* Benchmark Comparison */}
      {benchmark_return_percent !== null && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Benchmark Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">Strategy Return</p>
              <p className={`text-2xl font-bold ${getChangeColor(total_return_percent)}`}>
                {formatPercent(total_return_percent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">S&P 500 Return</p>
              <p className={`text-2xl font-bold ${getChangeColor(benchmark_return_percent)}`}>
                {formatPercent(benchmark_return_percent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Outperformance</p>
              <p className={`text-2xl font-bold ${getChangeColor(outperformance_percent)}`}>
                {outperformance_percent > 0 ? '+' : ''}{formatPercent(outperformance_percent)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {outperformance_percent > 0
                  ? 'Beat the benchmark'
                  : 'Underperformed benchmark'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Equity Curve Chart */}
      {equityCurveData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={equityCurveData}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #8b5cf6',
                  borderRadius: '8px',
                }}
                formatter={(value) => `${value}%`}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#8b5cf6"
                fillOpacity={1}
                fill="url(#colorEquity)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">
            Starting value: 100% | Final value: {(equity_curve[equity_curve.length - 1] * 100).toFixed(2)}%
          </p>
        </div>
      )}

      {/* Monte Carlo Simulation */}
      {monte_carlo_stats && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Monte Carlo Simulation (1000 scenarios)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">Best Case (95%)</p>
              <p className={`text-2xl font-bold ${getChangeColor(monte_carlo_stats.best_case)}`}>
                {formatPercent(monte_carlo_stats.best_case)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Median</p>
              <p className={`text-2xl font-bold ${getChangeColor(monte_carlo_stats.median)}`}>
                {formatPercent(monte_carlo_stats.median)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Worst Case (5%)</p>
              <p className={`text-2xl font-bold ${getChangeColor(monte_carlo_stats.worst_case)}`}>
                {formatPercent(monte_carlo_stats.worst_case)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Std Dev</p>
              <p className="text-2xl font-bold text-blue-400">
                {monte_carlo_stats.std_dev.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Returns Heatmap */}
      {monthlyData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Returns Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {Array.from(new Set(monthlyData.map((d) => d.year))).sort().map((year) => (
                  <tr key={year}>
                    <td className="text-gray-400 font-mono text-right pr-4 py-2 whitespace-nowrap">
                      {year}
                    </td>
                    {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, idx) => {
                      const data = monthlyData.find((d) => d.year === year && d.month === month);
                      const value = data?.value ?? null;
                      return (
                        <td key={`${year}-${idx}`} className="p-1">
                          {value !== null ? (
                            <div
                              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold ${getReturnColor(value)} ${getTextColor(value)}`}
                              title={`${month} ${year}: ${value > 0 ? '+' : ''}${value.toFixed(2)}%`}
                            >
                              {Math.abs(value) > 10 ? `${value.toFixed(0)}%` : value.toFixed(0)}
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-800 rounded"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trades List */}
      {tradesData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Trades ({tradesData.length} total)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400 font-semibold">Entry Date</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-semibold">Entry Price</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-semibold">Exit Date</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-semibold">Exit Price</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-semibold">Return</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {tradesData.slice(0, 20).map((trade, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-900/30">
                    <td className="py-2 px-3 text-gray-300">{trade.entry_date}</td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {formatCurrency(trade.entry_price)}
                    </td>
                    <td className="py-2 px-3 text-gray-300">{trade.exit_date}</td>
                    <td className="text-right py-2 px-3 text-gray-300">
                      {formatCurrency(trade.exit_price)}
                    </td>
                    <td className={`text-right py-2 px-3 font-bold ${getChangeColor(trade.return_percent)}`}>
                      {trade.return_percent > 0 ? '+' : ''}{formatPercent(trade.return_percent)}
                    </td>
                    <td className="text-right py-2 px-3 text-gray-400">
                      {trade.duration_days} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tradesData.length > 20 && (
            <p className="text-xs text-gray-500 mt-2">
              Showing 20 of {tradesData.length} trades (sorted by magnitude)
            </p>
          )}
        </div>
      )}

      {/* Info */}
      <div className="glass-card p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-sm text-blue-200">
          Backtest results are based on historical data. Past performance does not guarantee future results.
          Always do your own research before investing.
        </p>
      </div>
    </div>
  );
});

BacktestResults.displayName = 'BacktestResults';

export default BacktestResults;
