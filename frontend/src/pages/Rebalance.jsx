import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency } from '../utils/helpers';
import { Scale, ArrowUpDown, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const Rebalance = () => {
  const { portfolios, currentPortfolio, fetchPortfolios } = usePortfolioStore();
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [strategy, setStrategy] = useState('equal_weight');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchPortfolios(); }, []);
  useEffect(() => { if (currentPortfolio) setSelectedPortfolio(currentPortfolio); }, [currentPortfolio]);

  useEffect(() => {
    if (selectedPortfolio) fetchData();
  }, [selectedPortfolio, strategy]);

  const fetchData = async () => {
    if (!selectedPortfolio) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/tools/rebalance/${selectedPortfolio.id}?strategy=${strategy}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const toChartData = (alloc) => Object.entries(alloc || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rebalance Portfolio</h1>
          <p className="text-gray-400">Get suggestions to optimize your allocation</p>
        </div>
        <div className="flex items-center gap-3">
          {portfolios.length > 1 && (
            <select value={selectedPortfolio?.id || ''} onChange={e => {
              const p = portfolios.find(p => p.id === parseInt(e.target.value));
              if (p) setSelectedPortfolio(p);
            }} className="input-field bg-dark-300 w-48">
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            {[{ val: 'equal_weight', label: 'Equal Weight' }, { val: 'market_cap', label: 'Market Cap' }].map(s => (
              <button key={s.val} onClick={() => setStrategy(s.val)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                strategy === s.val ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-gray-400 bg-white/5'
              }`}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-gray-400">Calculating rebalancing suggestions...</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Current Allocation</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={toChartData(data.current_allocation)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {toChartData(data.current_allocation).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${v}%`, 'Allocation']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Target Allocation ({strategy === 'equal_weight' ? 'Equal Weight' : 'Market Cap'})</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={toChartData(data.target_allocation)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {toChartData(data.target_allocation).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`${v}%`, 'Target']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {data.suggestions?.length > 0 ? (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h2 className="font-semibold">Rebalancing Suggestions</h2>
                <p className="text-sm text-gray-400">Total portfolio value: {formatCurrency(data.total_value)}</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-white/5">
                    <th className="px-4 py-3">Symbol</th><th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Current %</th>
                    <th className="px-4 py-3 text-right">Target %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suggestions.map(s => (
                    <tr key={s.symbol} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold">{s.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          s.action === 'buy' ? 'bg-success-500/20 text-success-400' : 'bg-danger-500/20 text-danger-400'
                        }`}>{s.action.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.amount_usd)}</td>
                      <td className="px-4 py-3 text-right">{s.current_pct}%</td>
                      <td className="px-4 py-3 text-right">{s.target_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Scale className="w-12 h-12 text-success-400 mx-auto mb-4" />
              <p className="text-lg font-medium">Portfolio is balanced!</p>
              <p className="text-gray-400">No rebalancing needed</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Rebalance;
