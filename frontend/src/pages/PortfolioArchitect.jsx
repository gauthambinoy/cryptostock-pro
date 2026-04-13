import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const INTEREST_OPTIONS = [
  { id: 'AI', label: 'AI & Machine Learning', icon: '🤖' },
  { id: 'Blockchain', label: 'Blockchain & Crypto', icon: '⛓️' },
  { id: 'Green Energy', label: 'Green Energy', icon: '🌱' },
  { id: 'Healthcare', label: 'Healthcare & Biotech', icon: '🏥' },
  { id: 'Gaming', label: 'Gaming & Metaverse', icon: '🎮' },
  { id: 'DeFi', label: 'DeFi & Web3', icon: '💰' },
  { id: 'Blue Chip', label: 'Blue Chip Stocks', icon: '🏢' },
  { id: 'Dividends', label: 'Dividend Income', icon: '💵' },
  { id: 'Emerging Markets', label: 'Emerging Markets', icon: '🌍' },
  { id: 'Cybersecurity', label: 'Cybersecurity', icon: '🔒' },
];

const RISK_LABELS = { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' };
const HORIZON_LABELS = { short: 'Short (< 1 year)', medium: 'Medium (1-5 years)', long: 'Long (5+ years)' };

export default function PortfolioArchitect() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(false);
  const [form, setForm] = useState({
    age: 30,
    investment_amount: 10000,
    risk_tolerance: 'moderate',
    investment_horizon: 'medium',
    interests: [],
  });

  useEffect(() => {
    api.get('/portfolio-architect/templates').then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  const toggleInterest = (id) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id) ? f.interests.filter(i => i !== id) : [...f.interests, id],
    }));
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/portfolio-architect/generate', form);
      setResult(res.data);
      setStep(3);
    } catch (err) {
      alert(err.response?.data?.detail || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (template) => {
    setForm(f => ({
      ...f,
      risk_tolerance: template.risk_tolerance,
      investment_horizon: template.investment_horizon,
      interests: template.interests,
    }));
    setStep(2);
  };

  const applyPortfolio = async () => {
    if (!result) return;
    setApplying(true);
    try {
      await api.post('/portfolio-architect/apply', {
        portfolio_name: result.portfolio_name,
        assets: result.assets,
      });
      setApplied(true);
      setStep(4);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create portfolio');
    } finally {
      setApplying(false);
    }
  };

  const riskColor = { conservative: 'text-green-400', moderate: 'text-yellow-400', aggressive: 'text-red-400' };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">AI Portfolio Architect</h1>
      <p className="text-slate-400 mb-8">Let AI build your perfect portfolio based on your goals and interests.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <React.Fragment key={s}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 rounded ${step > s ? 'bg-blue-600' : 'bg-slate-700'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Profile */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Quick Start Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-blue-500 transition-all">
                    <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                    <p className="text-slate-400 text-sm mb-2">{t.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {t.interests.map(i => (
                        <span key={i} className="bg-slate-700 text-xs text-slate-300 px-2 py-0.5 rounded">{i}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold text-white">Or Build Custom</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <label className="block text-sm text-slate-300 mb-2">Your Age</label>
              <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: parseInt(e.target.value) || 18 }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" min={18} max={100} />
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <label className="block text-sm text-slate-300 mb-2">Investment Amount ($)</label>
              <input type="number" value={form.investment_amount} onChange={e => setForm(f => ({ ...f, investment_amount: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" min={100} />
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <label className="block text-sm text-slate-300 mb-3">Risk Tolerance</label>
              <div className="flex gap-3">
                {Object.entries(RISK_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, risk_tolerance: val }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.risk_tolerance === val ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <label className="block text-sm text-slate-300 mb-3">Investment Horizon</label>
              <div className="flex gap-3">
                {Object.entries(HORIZON_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, investment_horizon: val }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.investment_horizon === val ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => setStep(2)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
            Next: Choose Interests →
          </button>
        </div>
      )}

      {/* Step 2: Interests */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Select Your Interests & Sectors</h2>
          <p className="text-slate-400 mb-6">Pick at least 2 sectors you believe in. AI will diversify across them.</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {INTEREST_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => toggleInterest(opt.id)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  form.interests.includes(opt.id)
                    ? 'border-blue-500 bg-blue-500/10 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                }`}>
                <div className="text-2xl mb-2">{opt.icon}</div>
                <div className="text-sm font-medium">{opt.label}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-all">
              ← Back
            </button>
            <button onClick={generate} disabled={loading || form.interests.length < 1}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2">
              {loading ? (
                <><div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> Generating...</>
              ) : (
                'Generate Portfolio →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Total Assets</div>
              <div className="text-2xl font-bold text-white">{result.total_assets}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Stocks / Crypto</div>
              <div className="text-2xl font-bold text-white">{result.stock_allocation}% / {result.crypto_allocation}%</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Projected Return</div>
              <div className="text-2xl font-bold text-green-400">{result.projected_annual_return.min}% - {result.projected_annual_return.max}%</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-slate-400 text-sm">Diversification</div>
              <div className="text-2xl font-bold text-blue-400">{result.diversification_score}/100</div>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Allocation Breakdown</h3>
            <div className="flex rounded-lg overflow-hidden h-8">
              {result.assets.map((a, i) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'];
                return (
                  <div key={a.symbol} className={`${colors[i % colors.length]} relative group`}
                    style={{ width: `${a.allocation_pct}%` }} title={`${a.symbol}: ${a.allocation_pct}%`}>
                    {a.allocation_pct > 6 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{a.symbol}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {result.assets.map((a, i) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500'];
                return (
                  <div key={a.symbol} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
                    {a.symbol} ({a.allocation_pct}%)
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assets Table */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-sm">
                  <th className="text-left p-4">Asset</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Theme</th>
                  <th className="text-right p-4">Allocation</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-left p-4 hidden md:table-cell">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {result.assets.map(a => (
                  <tr key={a.symbol} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="p-4">
                      <div className="text-white font-semibold">{a.symbol}</div>
                      <div className="text-slate-400 text-sm">{a.name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${a.asset_type === 'crypto' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {a.asset_type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 text-sm">{a.theme}</td>
                    <td className="p-4 text-right text-white font-semibold">{a.allocation_pct}%</td>
                    <td className="p-4 text-right text-green-400">${a.dollar_amount.toLocaleString()}</td>
                    <td className="p-4 text-slate-400 text-sm hidden md:table-cell">{a.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-slate-400">Rebalancing: </span>
              <span className="text-white font-semibold capitalize">{result.rebalancing_frequency}</span>
            </div>
            <div className={riskColor[result.risk_profile.tolerance]}>
              Risk: {result.risk_profile.tolerance.charAt(0).toUpperCase() + result.risk_profile.tolerance.slice(1)}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg transition-all">
              ← Regenerate
            </button>
            <button onClick={applyPortfolio} disabled={applying}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-semibold transition-all">
              {applying ? 'Creating...' : 'Create This Portfolio ✓'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && applied && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Portfolio Created!</h2>
          <p className="text-slate-400 mb-8">Your AI-optimized portfolio has been added to your account.</p>
          <div className="flex gap-4 justify-center">
            <a href="/portfolio" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all">
              View Portfolio
            </a>
            <button onClick={() => { setStep(1); setResult(null); setApplied(false); }}
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg transition-all">
              Build Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
