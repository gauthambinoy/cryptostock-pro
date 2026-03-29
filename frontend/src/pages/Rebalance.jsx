import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency } from '../utils/helpers';
import { Scale, ArrowUpDown, PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

const STRATEGIES = [
  { value: 'equal_weight', label: 'Equal Weight' },
  { value: 'market_cap', label: 'Market Cap Weighted' },
];

const Rebalance = () => {
  const { portfolios, currentPortfolio, fetchPortfolios, setCurrentPortfolio } =
    usePortfolioStore();
  const [strategy, setStrategy] = useState('equal_weight');
  const [rebalanceData, setRebalanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (currentPortfolio) {
      fetchRebalanceData(currentPortfolio.id);
    }
  }, [currentPortfolio, strategy]);

  const fetchRebalanceData = async (portfolioId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/tools/rebalance/${portfolioId}?strategy=${strategy}`
      );
      setRebalanceData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch rebalance data');
      setRebalanceData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioChange = (e) => {
    const portfolio = portfolios.find((p) => p.id === parseInt(e.target.value));
    if (portfolio) setCurrentPortfolio(portfolio);
  };

  // Normalize allocation data - handles both object and array formats
  const toChartData = (alloc) => {
    if (!alloc) return [];
    if (Array.isArray(alloc)) {
      return alloc.map((item) => ({
        name: item.symbol || item.name,
        value: item.current_percent ?? item.target_percent ?? item.percent ?? item.weight ?? item.value ?? 0,
      }));
    }
    // Object format: { "AAPL": 25, "BTC": 50, ... }
    return Object.entries(alloc).map(([name, value]) => ({ name, value }));
  };

  const currentAllocation = React.useMemo(() => {
    return toChartData(rebalanceData?.current_allocation || rebalanceData?.holdings);
  }, [rebalanceData]);

  const targetAllocation = React.useMemo(() => {
    const data = toChartData(rebalanceData?.target_allocation);
    if (data.length > 0) return data;
    // Build from suggestions if no explicit target_allocation
    const suggestions = rebalanceData?.suggestions || [];
    if (suggestions.length > 0) {
      return suggestions.map((item) => ({
        name: item.symbol,
        value: item.target_pct ?? item.target_percent ?? 0,
      }));
    }
    return [];
  }, [rebalanceData]);

  const suggestions = React.useMemo(() => {
    if (!rebalanceData?.suggestions && !rebalanceData?.trades) return [];
    return rebalanceData.suggestions || rebalanceData.trades || [];
  }, [rebalanceData]);

  const renderCustomLabel = ({ name, value }) => {
    if (value < 5) return null;
    return `${name} ${typeof value === 'number' ? value.toFixed(0) : value}%`;
  };

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '0.5rem',
    color: '#fff',
  };

  if (!currentPortfolio && !isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Rebalance</h1>
        <div className="glass-card p-12 text-center">
          <Scale className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            Create a portfolio to see rebalancing suggestions.
          </p>
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
            <Scale className="w-6 h-6 text-primary-400" />
            Portfolio Rebalance
          </h1>
          <p className="text-gray-400">Optimize your portfolio allocation</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Strategy Selector */}
          <div className="flex items-center gap-1 bg-dark-300 rounded-lg p-1">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  strategy === s.value
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-6 text-center">
          <Scale className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-danger-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && rebalanceData && (
        <>
          {/* Total Value Banner */}
          {rebalanceData.total_value && (
            <div className="glass-card p-4 flex items-center justify-between">
              <span className="text-gray-400">Total Portfolio Value</span>
              <span className="text-xl font-bold text-white">
                {formatCurrency(rebalanceData.total_value)}
              </span>
            </div>
          )}

          {/* Donut Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Allocation */}
            {currentAllocation.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary-400" />
                  Current Allocation
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={renderCustomLabel}
                      >
                        {currentAllocation.map((_, index) => (
                          <Cell
                            key={`current-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          `${typeof value === 'number' ? value.toFixed(2) : value}%`,
                          'Allocation',
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Target Allocation */}
            {targetAllocation.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-success-400" />
                  Target Allocation
                  <span className="text-sm font-normal text-gray-400">
                    ({strategy === 'equal_weight' ? 'Equal Weight' : 'Market Cap'})
                  </span>
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={targetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={renderCustomLabel}
                      >
                        {targetAllocation.map((_, index) => (
                          <Cell
                            key={`target-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          `${typeof value === 'number' ? value.toFixed(2) : value}%`,
                          'Target',
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Table */}
          {suggestions.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-dark-300">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-primary-400" />
                  Rebalancing Suggestions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-300">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                        Symbol
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                        Action
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Amount $
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Current %
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Target %
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Difference %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map((item, idx) => {
                      const action = (
                        item.action || (item.amount > 0 ? 'buy' : 'sell')
                      ).toLowerCase();
                      const isBuy = action === 'buy';
                      const currentPct = item.current_pct ?? item.current_percent ?? 0;
                      const targetPct = item.target_pct ?? item.target_percent ?? 0;
                      const diff = item.difference ?? item.diff ?? (targetPct - currentPct);
                      const amount = Math.abs(
                        item.amount_usd ?? item.amount ?? item.trade_value ?? 0
                      );

                      return (
                        <tr
                          key={idx}
                          className="border-b border-dark-300/50 hover:bg-dark-300/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            {item.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                isBuy
                                  ? 'bg-success-500/20 text-success-400'
                                  : 'bg-danger-500/20 text-danger-400'
                              }`}
                            >
                              {isBuy ? 'Buy' : 'Sell'}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm font-medium ${
                              isBuy ? 'text-success-400' : 'text-danger-400'
                            }`}
                          >
                            {formatCurrency(amount)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {typeof currentPct === 'number'
                              ? currentPct.toFixed(2)
                              : currentPct}
                            %
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {typeof targetPct === 'number'
                              ? targetPct.toFixed(2)
                              : targetPct}
                            %
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm font-medium ${
                              diff >= 0 ? 'text-success-400' : 'text-danger-400'
                            }`}
                          >
                            {diff >= 0 ? '+' : ''}
                            {typeof diff === 'number' ? diff.toFixed(2) : diff}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Scale className="w-12 h-12 text-success-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-white">Portfolio is balanced!</p>
              <p className="text-gray-400">No rebalancing needed at this time.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Rebalance;
