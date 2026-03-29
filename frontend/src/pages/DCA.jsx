import React, { useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PRESETS = [
  { label: '$100/mo', value: 100 },
  { label: '$250/mo', value: 250 },
  { label: '$500/mo', value: 500 },
  { label: '$1,000/mo', value: 1000 },
];

const DCA = () => {
  const [symbol, setSymbol] = useState('BTC');
  const [assetType, setAssetType] = useState('crypto');
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [months, setMonths] = useState(12);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/tools/dca?symbol=${encodeURIComponent(symbol)}&asset_type=${assetType}&monthly_amount=${monthlyAmount}&months=${months}`
      );
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate DCA');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = React.useMemo(() => {
    if (!result) return [];
    const items = result.monthly_data || result.schedule || result.history || [];
    return items.map((item, idx) => ({
      month: item.month ?? idx + 1,
      totalInvested: item.total_invested ?? item.cumulative_invested ?? (idx + 1) * monthlyAmount,
      cumulativeValue: item.cumulative_value ?? item.current_value ?? item.value,
    }));
  }, [result, monthlyAmount]);

  const summary = React.useMemo(() => {
    if (!result) return null;
    const s = result.summary || result;
    return {
      totalInvested: s.total_invested ?? monthlyAmount * months,
      currentValue: s.current_value ?? 0,
      totalReturn: s.total_return ?? 0,
      returnPercent: s.return_percent ?? s.total_return_percent ?? 0,
    };
  }, [result, monthlyAmount, months]);

  const tableData = React.useMemo(() => {
    if (!result) return [];
    return result.monthly_data || result.schedule || result.history || [];
  }, [result]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary-400" />
          DCA Calculator
        </h1>
        <p className="text-gray-400">Dollar Cost Averaging simulation</p>
      </div>

      {/* Input Form */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Symbol */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTC, AAPL, ETH..."
              className="input-field w-full"
            />
          </div>

          {/* Asset Type Toggle */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Asset Type</label>
            <div className="flex items-center gap-1 bg-dark-300 rounded-lg p-1">
              <button
                onClick={() => setAssetType('stock')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  assetType === 'stock'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Stock
              </button>
              <button
                onClick={() => setAssetType('crypto')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  assetType === 'crypto'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Crypto
              </button>
            </div>
          </div>

          {/* Monthly Amount */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Monthly Amount ($)</label>
            <input
              type="number"
              min="1"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              className="input-field w-full"
            />
          </div>

          {/* Months */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Number of Months</label>
            <input
              type="number"
              min="1"
              max="120"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-sm text-gray-400">Quick:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setMonthlyAmount(preset.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                monthlyAmount === preset.value
                  ? 'border-primary-500 text-primary-400 bg-primary-500/10'
                  : 'border-dark-300 text-gray-400 hover:border-gray-500'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={isLoading || !symbol}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Calculator className="w-4 h-4" />
          )}
          {isLoading ? 'Calculating...' : 'Calculate'}
        </button>

        {error && <p className="text-danger-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Results */}
      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-400">Total Invested</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(summary.totalInvested)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <p className="text-sm text-gray-400">Current Value</p>
              </div>
              <p className="text-2xl font-bold text-primary-400">
                {formatCurrency(summary.currentValue)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-success-400" />
                <p className="text-sm text-gray-400">Total Return</p>
              </div>
              <p className={`text-2xl font-bold ${getChangeColor(summary.totalReturn)}`}>
                {summary.totalReturn >= 0 ? '+' : ''}
                {formatCurrency(summary.totalReturn)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-success-400" />
                <p className="text-sm text-gray-400">Return %</p>
              </div>
              <p className={`text-2xl font-bold ${getChangeColor(summary.returnPercent)}`}>
                {formatPercent(summary.returnPercent)}
              </p>
            </div>
          </div>

          {/* Line Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                Value Over Time
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="month"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      label={{
                        value: 'Month',
                        position: 'insideBottom',
                        offset: -5,
                        fill: '#9ca3af',
                      }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        color: '#fff',
                      }}
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name === 'totalInvested' ? 'Total Invested' : 'Portfolio Value',
                      ]}
                      labelFormatter={(label) => `Month ${label}`}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'totalInvested' ? 'Total Invested' : 'Portfolio Value'
                      }
                      wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalInvested"
                      stroke="#6b7280"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="totalInvested"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeValue"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#0ea5e9' }}
                      name="cumulativeValue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detail Table */}
          {tableData.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-dark-300">
                <h2 className="text-lg font-semibold">Monthly Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-300">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                        Month
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Shares Bought
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Cumulative Shares
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Cumulative Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-dark-300/50 hover:bg-dark-300/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-white">
                          {row.month ?? idx + 1}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {(row.shares_bought ?? row.units_bought)?.toFixed(6) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {(row.cumulative_shares ?? row.total_units)?.toFixed(6) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-white">
                          {formatCurrency(
                            row.cumulative_value ?? row.current_value ?? row.value
                          )}
                        </td>
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

export default DCA;
