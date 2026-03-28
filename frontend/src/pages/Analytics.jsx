import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency, formatPercent, formatDate } from '../utils/helpers';
import { Activity, BarChart3, Grid3X3, PieChart } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Analytics = () => {
  const { portfolios, currentPortfolio, fetchPortfolios, setCurrentPortfolio } = usePortfolioStore();
  const [advanced, setAdvanced] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [pnlCalendar, setPnlCalendar] = useState(null);
  const [sectorBreakdown, setSectorBreakdown] = useState(null);
  const [performanceHistory, setPerformanceHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (currentPortfolio) {
      fetchAnalytics(currentPortfolio.id);
    }
  }, [currentPortfolio]);

  const fetchAnalytics = async (portfolioId) => {
    setIsLoading(true);
    try {
      const [advancedRes, correlationRes, pnlRes, sectorRes, perfRes] = await Promise.allSettled([
        api.get(`/analytics/${portfolioId}/advanced`),
        api.get(`/analytics/${portfolioId}/correlation`),
        api.get(`/analytics/${portfolioId}/pnl-calendar`),
        api.get(`/analytics/${portfolioId}/sector-breakdown`),
        api.get(`/analytics/${portfolioId}/performance-history`),
      ]);
      if (advancedRes.status === 'fulfilled') setAdvanced(advancedRes.value.data);
      if (correlationRes.status === 'fulfilled') setCorrelation(correlationRes.value.data);
      if (pnlRes.status === 'fulfilled') setPnlCalendar(pnlRes.value.data);
      if (sectorRes.status === 'fulfilled') setSectorBreakdown(sectorRes.value.data);
      if (perfRes.status === 'fulfilled') setPerformanceHistory(perfRes.value.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioChange = (e) => {
    const portfolio = portfolios.find((p) => p.id === parseInt(e.target.value));
    if (portfolio) setCurrentPortfolio(portfolio);
  };

  // P&L calendar helpers
  const getDayColor = (value) => {
    if (value === null || value === undefined) return 'bg-dark-300';
    if (value > 0) return value > 100 ? 'bg-success-400' : 'bg-success-500/50';
    if (value < 0) return value < -100 ? 'bg-danger-400' : 'bg-danger-500/50';
    return 'bg-dark-200';
  };

  // Correlation color
  const getCorrelationColor = (value) => {
    if (value === null || value === undefined) return {};
    const absVal = Math.abs(value);
    const opacity = (absVal * 0.8 + 0.1).toFixed(2);
    if (value > 0) return { backgroundColor: `rgba(34, 197, 94, ${opacity})` };
    if (value < 0) return { backgroundColor: `rgba(239, 68, 68, ${opacity})` };
    return { backgroundColor: 'rgba(107, 114, 128, 0.2)' };
  };

  if (!currentPortfolio && !isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="glass-card p-12 text-center">
          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Create a portfolio to see analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-400" />
            Analytics
          </h1>
          <p className="text-gray-400">Advanced portfolio insights</p>
        </div>
        <select
          value={currentPortfolio?.id || ''}
          onChange={handlePortfolioChange}
          className="input-field"
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Cards */}
          {advanced && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-white">
                  {advanced.sharpe_ratio?.toFixed(2) ?? '-'}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">Volatility</p>
                <p className="text-2xl font-bold text-white">
                  {advanced.volatility != null ? formatPercent(advanced.volatility) : '-'}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">Beta</p>
                <p className="text-2xl font-bold text-white">
                  {advanced.beta?.toFixed(2) ?? '-'}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">Max Drawdown</p>
                <p className="text-2xl font-bold text-danger-400">
                  {advanced.max_drawdown != null ? formatPercent(advanced.max_drawdown) : '-'}
                </p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-gray-400 mb-1">CAGR</p>
                <p className="text-2xl font-bold text-success-400">
                  {advanced.cagr != null ? formatPercent(advanced.cagr) : '-'}
                </p>
              </div>
            </div>
          )}

          {/* Performance Chart */}
          {performanceHistory && performanceHistory.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Performance History
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(val) => formatDate(val)}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(val) => formatCurrency(val, 0)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        color: '#fff',
                      }}
                      formatter={(value) => [formatCurrency(value), 'Value']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#0ea5e9' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* P&L Calendar and Sector Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* P&L Heatmap */}
            {pnlCalendar && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-primary-400" />
                  P&L Calendar
                </h2>
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(pnlCalendar.days || pnlCalendar || []).map((day, idx) => (
                    <div
                      key={idx}
                      className={`aspect-square rounded-sm flex items-center justify-center text-xs font-medium ${getDayColor(day?.pnl ?? day?.value ?? day)}`}
                      title={day?.date ? `${day.date}: ${formatCurrency(day.pnl ?? day.value ?? 0)}` : ''}
                    >
                      {day?.day_of_month || ''}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-danger-500/50" />
                    Loss
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-dark-200" />
                    Flat
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-success-500/50" />
                    Profit
                  </div>
                </div>
              </div>
            )}

            {/* Sector Breakdown */}
            {sectorBreakdown && sectorBreakdown.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary-400" />
                  Sector Breakdown
                </h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={sectorBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="sector"
                        label={({ sector, percent }) =>
                          `${sector} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {sectorBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          color: '#fff',
                        }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend
                        wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Correlation Matrix */}
          {correlation && correlation.symbols && correlation.symbols.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-primary-400" />
                Correlation Matrix
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm text-gray-400"></th>
                      {correlation.symbols.map((symbol) => (
                        <th
                          key={symbol}
                          className="px-3 py-2 text-center text-sm font-medium text-gray-300"
                        >
                          {symbol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlation.symbols.map((rowSymbol, rowIdx) => (
                      <tr key={rowSymbol}>
                        <td className="px-3 py-2 text-sm font-medium text-gray-300">
                          {rowSymbol}
                        </td>
                        {correlation.symbols.map((colSymbol, colIdx) => {
                          const value = correlation.matrix?.[rowIdx]?.[colIdx] ?? null;
                          return (
                            <td
                              key={colSymbol}
                              className="px-3 py-2 text-center text-sm font-medium rounded-sm"
                              style={getCorrelationColor(value)}
                            >
                              {value != null ? value.toFixed(2) : '-'}
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
        </>
      )}
    </div>
  );
};

export default Analytics;
