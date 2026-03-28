import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate, formatPercent } from '../utils/helpers';
import { DollarSign, Plus, Trash2, BarChart } from 'lucide-react';
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Dividends = () => {
  const [dividends, setDividends] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    amount_per_share: '',
    shares: '',
    payment_date: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [divRes, sumRes] = await Promise.allSettled([
        api.get('/dividends'),
        api.get('/dividends/summary'),
      ]);
      if (divRes.status === 'fulfilled') setDividends(divRes.value.data);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    } catch (error) {
      console.error('Failed to fetch dividends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/dividends', {
        symbol: formData.symbol.toUpperCase().trim(),
        amount_per_share: parseFloat(formData.amount_per_share),
        shares: parseFloat(formData.shares),
        payment_date: formData.payment_date || null,
      });
      setFormData({ symbol: '', amount_per_share: '', shares: '', payment_date: '' });
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      setFormError(error.response?.data?.detail || 'Failed to add dividend');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/dividends/${id}`);
      setDividends((prev) => prev.filter((d) => d.id !== id));
      // Refresh summary after delete
      const sumRes = await api.get('/dividends/summary');
      setSummary(sumRes.data);
    } catch (error) {
      console.error('Failed to delete dividend:', error);
    }
  };

  // Build chart data: income by symbol
  const chartData = Object.entries(
    dividends.reduce((acc, d) => {
      const total = (d.amount_per_share || 0) * (d.shares || 0);
      acc[d.symbol] = (acc[d.symbol] || 0) + total;
      return acc;
    }, {})
  )
    .map(([symbol, total]) => ({ symbol, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary-400" />
            Dividends
          </h1>
          <p className="text-gray-400">Track your dividend income</p>
        </div>
        <button
          onClick={() => {
            setFormData({ symbol: '', amount_per_share: '', shares: '', payment_date: '' });
            setFormError('');
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Dividend
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-500/20">
                <DollarSign className="w-5 h-5 text-success-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Income</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(summary.total_income)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <BarChart className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Projected Annual</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(summary.projected_annual)}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <DollarSign className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Average Yield</p>
                <p className="text-xl font-bold text-white">
                  {summary.average_yield != null ? formatPercent(summary.average_yield) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Dividend Income Chart */}
          {chartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-primary-400" />
                Income by Symbol
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBar data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="symbol"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
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
                      formatter={(value) => [formatCurrency(value), 'Income']}
                    />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </RechartsBar>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Dividends Table */}
          <div className="glass-card overflow-hidden">
            {dividends.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">No dividends recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-300">
                      <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Symbol</th>
                      <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Amount/Share</th>
                      <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Shares</th>
                      <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Total</th>
                      <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Payment Date</th>
                      <th className="text-right text-sm text-gray-400 font-medium px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividends.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-dark-300/50 hover:bg-dark-300/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{d.symbol}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {formatCurrency(d.amount_per_share)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {d.shares}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-success-400">
                          {formatCurrency((d.amount_per_share || 0) * (d.shares || 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(d.payment_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1.5 rounded-lg hover:bg-danger-500/20 text-gray-500 hover:text-danger-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Dividend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Add Dividend</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="e.g. AAPL"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount per Share</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_per_share}
                  onChange={(e) => setFormData({ ...formData, amount_per_share: e.target.value })}
                  placeholder="0.82"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Shares</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.shares}
                  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                  placeholder="100"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              {formError && (
                <p className="text-danger-400 text-sm">{formError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dividends;
