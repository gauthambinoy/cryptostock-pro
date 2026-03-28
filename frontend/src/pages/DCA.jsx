import React, { useState } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import { Calculator, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DCA = () => {
  const [symbol, setSymbol] = useState('BTC');
  const [assetType, setAssetType] = useState('crypto');
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [months, setMonths] = useState(12);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const presets = [100, 250, 500, 1000];

  const calculate = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/tools/dca?symbol=${symbol}&asset_type=${assetType}&monthly_amount=${monthlyAmount}&months=${months}`);
      setResult(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const chartData = result?.monthly_data?.map((m, i) => ({
    month: m.month,
    invested: (i + 1) * monthlyAmount,
    value: m.cumulative_value,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">DCA Calculator</h1>
        <p className="text-gray-400">Dollar Cost Averaging strategy simulator</p>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Symbol</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="input-field" placeholder="BTC, AAPL..." />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Type</label>
            <div className="flex gap-2">
              {['stock', 'crypto'].map(t => (
                <button key={t} onClick={() => setAssetType(t)} className={`flex-1 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  assetType === t ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-white/5 text-gray-400'
                }`}>{t === 'stock' ? 'Stock' : 'Crypto'}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Monthly Amount</label>
            <input type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(parseFloat(e.target.value))} className="input-field" />
            <div className="flex gap-1 mt-2">
              {presets.map(p => (
                <button key={p} onClick={() => setMonthlyAmount(p)} className={`text-xs px-2 py-1 rounded ${monthlyAmount === p ? 'bg-primary-500/30 text-primary-400' : 'bg-white/5 text-gray-400'}`}>${p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Months</label>
            <input type="number" value={months} onChange={e => setMonths(parseInt(e.target.value))} className="input-field" min="1" max="120" />
          </div>
          <button onClick={calculate} disabled={isLoading} className="btn-primary flex items-center justify-center gap-2 h-12">
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400">Total Invested</p>
              <p className="text-2xl font-bold">{formatCurrency(result.total_invested)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400">Current Value</p>
              <p className="text-2xl font-bold">{formatCurrency(result.current_value)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400">Total Return</p>
              <p className={`text-2xl font-bold ${getChangeColor(result.total_return)}`}>
                {result.total_return >= 0 ? '+' : ''}{formatCurrency(result.total_return)}
              </p>
            </div>
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400">Return %</p>
              <p className={`text-2xl font-bold ${getChangeColor(result.total_return_percent)}`}>
                {formatPercent(result.total_return_percent)}
              </p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Investment Growth</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={v => [formatCurrency(v)]} />
                  <Legend />
                  <Line type="monotone" dataKey="invested" stroke="#64748b" strokeDasharray="5 5" name="Total Invested" dot={false} />
                  <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} name="Portfolio Value" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5"><h2 className="font-semibold">Monthly Breakdown</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/5">
                    <th className="px-4 py-2">Month</th><th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Shares</th><th className="px-4 py-2 text-right">Total Shares</th>
                    <th className="px-4 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthly_data.map(m => (
                    <tr key={m.month} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-2">{m.month}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(m.price)}</td>
                      <td className="px-4 py-2 text-right">{m.shares_bought.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right">{m.cumulative_shares.toFixed(4)}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatCurrency(m.cumulative_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DCA;
