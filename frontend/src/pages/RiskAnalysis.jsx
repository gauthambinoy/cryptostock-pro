import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { Shield, AlertTriangle, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RiskAnalysis = () => {
  const { portfolios, currentPortfolio, fetchPortfolios } = usePortfolioStore();
  const [riskData, setRiskData] = useState(null);
  const [monteCarloData, setMonteCarloData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  useEffect(() => { fetchPortfolios(); }, []);
  useEffect(() => { if (currentPortfolio) setSelectedPortfolio(currentPortfolio); }, [currentPortfolio]);

  useEffect(() => {
    if (selectedPortfolio) fetchData();
  }, [selectedPortfolio]);

  const fetchData = async () => {
    if (!selectedPortfolio) return;
    setIsLoading(true);
    try {
      const [riskRes, mcRes] = await Promise.allSettled([
        api.get(`/analytics/${selectedPortfolio.id}/risk-score`),
        api.get(`/analytics/${selectedPortfolio.id}/monte-carlo`),
      ]);
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
      if (mcRes.status === 'fulfilled') setMonteCarloData(mcRes.value.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const getRiskColor = (score) => {
    if (score <= 25) return '#22c55e';
    if (score <= 50) return '#eab308';
    if (score <= 75) return '#f97316';
    return '#ef4444';
  };

  const RiskGauge = ({ score }) => {
    const color = getRiskColor(score);
    const angle = (score / 100) * 180;
    const rad = (angle - 90) * Math.PI / 180;
    const nx = 100 + 70 * Math.cos(rad);
    const ny = 100 + 70 * Math.sin(rad);

    return (
      <svg viewBox="0 0 200 120" className="w-64 h-40 mx-auto">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="33%" stopColor="#eab308" />
            <stop offset="66%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${angle / 180 * 251.2} 251.2`} />
        <line x1="100" y1="100" x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill={color} />
        <text x="100" y="90" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">{score}</text>
        <text x="100" y="115" textAnchor="middle" fill="#94a3b8" fontSize="10">/ 100</text>
      </svg>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Analysis</h1>
          <p className="text-gray-400">Portfolio risk score & Monte Carlo simulation</p>
        </div>
        <div className="flex items-center gap-3">
          {portfolios.length > 1 && (
            <select value={selectedPortfolio?.id || ''} onChange={(e) => {
              const p = portfolios.find(p => p.id === parseInt(e.target.value));
              if (p) setSelectedPortfolio(p);
            }} className="input-field bg-dark-300 w-48">
              {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button onClick={fetchData} disabled={isLoading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center py-12 text-gray-400">Loading risk analysis...</div>}

      {riskData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 text-center">
              <h2 className="text-lg font-semibold mb-4">Risk Score</h2>
              <RiskGauge score={riskData.risk_score} />
              <div className="mt-4">
                <span className={`text-xl font-bold px-4 py-2 rounded-full ${
                  riskData.risk_level === 'Low' ? 'bg-success-500/20 text-success-400' :
                  riskData.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  riskData.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-danger-500/20 text-danger-400'
                }`}>{riskData.risk_level} Risk</span>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Risk Factors</h2>
              <div className="space-y-4">
                {Object.entries(riskData.factors).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                      <span>{val.score} / {val.max}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${(val.score / val.max) * 100}%`,
                        backgroundColor: getRiskColor((val.score / val.max) * 100)
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {monteCarloData && (
        <>
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Monte Carlo Simulation (1-Year, 1000 runs)</h2>
            {monteCarloData.sample_paths?.length > 0 && (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monteCarloData.sample_paths[0].map((_, i) => {
                    const point = { day: i };
                    monteCarloData.sample_paths.forEach((path, j) => { point[`sim${j}`] = path[i]; });
                    return point;
                  }).filter((_, i) => i % 5 === 0)}>
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'Trading Days', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={v => [formatCurrency(v), 'Value']} />
                    {monteCarloData.sample_paths.map((_, j) => (
                      <Area key={j} type="monotone" dataKey={`sim${j}`} stroke={`hsl(${j * 18}, 70%, 60%)`}
                        fill={`hsl(${j * 18}, 70%, 60%)`} fillOpacity={0.05} strokeWidth={1} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Worst Case (5%)', value: monteCarloData.worst_case, color: 'text-danger-400' },
              { label: 'Pessimistic (25%)', value: monteCarloData.pessimistic, color: 'text-orange-400' },
              { label: 'Median (50%)', value: monteCarloData.median, color: 'text-yellow-400' },
              { label: 'Optimistic (75%)', value: monteCarloData.optimistic, color: 'text-lime-400' },
              { label: 'Best Case (95%)', value: monteCarloData.best_case, color: 'text-success-400' },
            ].map(item => (
              <div key={item.label} className="glass-card p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RiskAnalysis;
