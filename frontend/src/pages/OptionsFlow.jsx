import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function formatNum(n, decimals = 2) {
  if (n === undefined || n === null) return '-';
  return Number(n).toFixed(decimals);
}

function GreekGauge({ label, value, min, max, color }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="bg-slate-900 rounded-lg p-3">
      <div className="flex justify-between mb-1">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className={`font-bold text-sm ${color}`}>{formatNum(value, 4)}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function OptionsFlow() {
  const [tab, setTab] = useState('chain');
  const [symbol, setSymbol] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('AAPL');
  const [chain, setChain] = useState(null);
  const [expirations, setExpirations] = useState([]);
  const [selectedExp, setSelectedExp] = useState(30);
  const [unusual, setUnusual] = useState([]);
  const [loading, setLoading] = useState(false);

  // Greeks calculator
  const [greekInputs, setGreekInputs] = useState({ spot_price: 150, strike: 150, expiration_days: 30, risk_free_rate: 0.05, volatility: 0.3, option_type: 'call' });
  const [greeks, setGreeks] = useState(null);

  // P&L calculator
  const [strategy, setStrategy] = useState('long_call');
  const [pnlResult, setPnlResult] = useState(null);
  const [pnlInputs, setPnlInputs] = useState({ strike: 150, premium: 5, quantity: 1 });

  // IV Surface
  const [ivSurface, setIvSurface] = useState(null);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const [chainRes, expRes] = await Promise.all([
        api.get(`/options/chain/${symbol}`, { params: { expiration_days: selectedExp } }),
        api.get(`/options/expirations/${symbol}`),
      ]);
      setChain(chainRes.data);
      setExpirations(expRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchUnusual = async () => {
    try {
      const res = await api.get('/options/unusual-activity');
      setUnusual(res.data);
    } catch (e) { console.error(e); }
  };

  const calcGreeks = async () => {
    try {
      const res = await api.post('/options/calculate-greeks', greekInputs);
      setGreeks(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchIVSurface = async () => {
    try {
      const res = await api.get(`/options/iv-surface/${symbol}`);
      setIvSurface(res.data);
    } catch (e) { console.error(e); }
  };

  const calcPnL = async () => {
    const strategies = {
      long_call: [{ strike: pnlInputs.strike, premium: pnlInputs.premium, quantity: pnlInputs.quantity, option_type: 'call', position: 'long' }],
      long_put: [{ strike: pnlInputs.strike, premium: pnlInputs.premium, quantity: pnlInputs.quantity, option_type: 'put', position: 'long' }],
      bull_spread: [
        { strike: pnlInputs.strike, premium: pnlInputs.premium, quantity: 1, option_type: 'call', position: 'long' },
        { strike: pnlInputs.strike + 10, premium: pnlInputs.premium * 0.4, quantity: 1, option_type: 'call', position: 'short' },
      ],
      bear_spread: [
        { strike: pnlInputs.strike + 10, premium: pnlInputs.premium, quantity: 1, option_type: 'put', position: 'long' },
        { strike: pnlInputs.strike, premium: pnlInputs.premium * 0.4, quantity: 1, option_type: 'put', position: 'short' },
      ],
      straddle: [
        { strike: pnlInputs.strike, premium: pnlInputs.premium, quantity: 1, option_type: 'call', position: 'long' },
        { strike: pnlInputs.strike, premium: pnlInputs.premium * 0.9, quantity: 1, option_type: 'put', position: 'long' },
      ],
      iron_condor: [
        { strike: pnlInputs.strike - 10, premium: pnlInputs.premium * 0.3, quantity: 1, option_type: 'put', position: 'short' },
        { strike: pnlInputs.strike - 20, premium: pnlInputs.premium * 0.1, quantity: 1, option_type: 'put', position: 'long' },
        { strike: pnlInputs.strike + 10, premium: pnlInputs.premium * 0.3, quantity: 1, option_type: 'call', position: 'short' },
        { strike: pnlInputs.strike + 20, premium: pnlInputs.premium * 0.1, quantity: 1, option_type: 'call', position: 'long' },
      ],
    };
    try {
      const res = await api.post('/options/profit-loss', { legs: strategies[strategy] || strategies.long_call });
      setPnlResult(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchChain(); fetchUnusual(); }, []);

  const doSearch = () => {
    setSymbol(searchInput.toUpperCase());
    setTimeout(() => fetchChain(), 100);
  };

  const TABS = [
    { id: 'chain', label: 'Options Chain' },
    { id: 'greeks', label: 'Greeks Calculator' },
    { id: 'unusual', label: 'Unusual Activity' },
    { id: 'pnl', label: 'P&L Diagram' },
    { id: 'surface', label: 'IV Surface' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Options Flow & Greeks</h1>
      <p className="text-slate-400 mb-6">Options chain analysis, Greeks calculation, and unusual activity detection.</p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input value={searchInput} onChange={e => setSearchInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Symbol (e.g., AAPL)"
          className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white w-40" />
        <button onClick={doSearch} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">Analyze</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'unusual') fetchUnusual(); if (t.id === 'surface') fetchIVSurface(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Options Chain */}
      {tab === 'chain' && (
        <div>
          {/* Expiration selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {expirations.slice(0, 8).map(exp => (
              <button key={exp.date} onClick={() => { setSelectedExp(exp.days_to_expiry); setTimeout(fetchChain, 50); }}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${selectedExp === exp.days_to_expiry ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {exp.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : chain && (
            <div>
              <div className="text-center mb-4">
                <span className="text-white font-bold text-xl">{chain.symbol}</span>
                <span className="text-slate-400 ml-3">Spot: ${formatNum(chain.spot_price)}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400">
                      <th colSpan="8" className="text-center text-green-400 p-2 border-b border-slate-700">CALLS</th>
                      <th className="p-2 bg-slate-950 border-b border-slate-700 text-white">Strike</th>
                      <th colSpan="8" className="text-center text-red-400 p-2 border-b border-slate-700">PUTS</th>
                    </tr>
                    <tr className="bg-slate-900 text-slate-500 text-xs">
                      <th className="p-2">Last</th><th className="p-2">Bid</th><th className="p-2">Ask</th>
                      <th className="p-2">Vol</th><th className="p-2">OI</th><th className="p-2">IV</th>
                      <th className="p-2">Delta</th><th className="p-2">Theta</th>
                      <th className="p-2 bg-slate-950"></th>
                      <th className="p-2">Last</th><th className="p-2">Bid</th><th className="p-2">Ask</th>
                      <th className="p-2">Vol</th><th className="p-2">OI</th><th className="p-2">IV</th>
                      <th className="p-2">Delta</th><th className="p-2">Theta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chain.calls.map((call, i) => {
                      const put = chain.puts[i];
                      const isATM = Math.abs(call.strike - chain.spot_price) < (chain.spot_price * 0.02);
                      return (
                        <tr key={call.strike} className={`border-t border-slate-800 ${isATM ? 'bg-blue-500/10' : ''} ${call.itm ? 'bg-green-500/5' : ''}`}>
                          <td className="p-1.5 text-right text-green-400">{formatNum(call.last)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(call.bid)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(call.ask)}</td>
                          <td className="p-1.5 text-right text-slate-400">{call.volume}</td>
                          <td className="p-1.5 text-right text-slate-400">{call.open_interest}</td>
                          <td className="p-1.5 text-right text-yellow-400">{call.iv}%</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(call.delta, 3)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(call.theta, 4)}</td>
                          <td className={`p-1.5 text-center font-bold bg-slate-950 ${isATM ? 'text-blue-400' : 'text-white'}`}>${call.strike}</td>
                          <td className="p-1.5 text-right text-red-400">{formatNum(put?.last)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(put?.bid)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(put?.ask)}</td>
                          <td className="p-1.5 text-right text-slate-400">{put?.volume}</td>
                          <td className="p-1.5 text-right text-slate-400">{put?.open_interest}</td>
                          <td className="p-1.5 text-right text-yellow-400">{put?.iv}%</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(put?.delta, 3)}</td>
                          <td className="p-1.5 text-right text-slate-300">{formatNum(put?.theta, 4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Greeks Calculator */}
      {tab === 'greeks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
            <h3 className="text-white font-semibold">Input Parameters</h3>
            {[
              ['spot_price', 'Spot Price ($)', 'number'],
              ['strike', 'Strike Price ($)', 'number'],
              ['expiration_days', 'Days to Expiry', 'number'],
              ['risk_free_rate', 'Risk-Free Rate', 'number'],
              ['volatility', 'Volatility (sigma)', 'number'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-slate-400 text-sm">{label}</label>
                <input type="number" step="any" value={greekInputs[key]}
                  onChange={e => setGreekInputs(g => ({ ...g, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mt-1" />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setGreekInputs(g => ({ ...g, option_type: 'call' }))}
                className={`flex-1 py-2 rounded-lg ${greekInputs.option_type === 'call' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Call</button>
              <button onClick={() => setGreekInputs(g => ({ ...g, option_type: 'put' }))}
                className={`flex-1 py-2 rounded-lg ${greekInputs.option_type === 'put' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Put</button>
            </div>
            <button onClick={calcGreeks} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium">Calculate Greeks</button>
          </div>

          <div className="space-y-4">
            {greeks ? (
              <>
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-white font-semibold mb-2">Option Price</h3>
                  <div className="text-3xl font-bold text-green-400">${formatNum(greeks.price)}</div>
                </div>
                <GreekGauge label="Delta" value={greeks.greeks?.delta || greeks.delta} min={-1} max={1} color="text-blue-400" />
                <GreekGauge label="Gamma" value={greeks.greeks?.gamma || greeks.gamma} min={0} max={0.1} color="text-purple-400" />
                <GreekGauge label="Theta" value={greeks.greeks?.theta || greeks.theta} min={-1} max={0} color="text-red-400" />
                <GreekGauge label="Vega" value={greeks.greeks?.vega || greeks.vega} min={0} max={1} color="text-green-400" />
                <GreekGauge label="Rho" value={greeks.greeks?.rho || greeks.rho} min={-0.5} max={0.5} color="text-yellow-400" />
              </>
            ) : (
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center text-slate-400">
                Enter parameters and click Calculate to see Greeks
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unusual Activity */}
      {tab === 'unusual' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Strike</th>
                <th className="text-left p-3">Expiry</th>
                <th className="text-right p-3">Volume</th>
                <th className="text-right p-3">OI</th>
                <th className="text-right p-3">V/OI</th>
                <th className="text-right p-3">Premium</th>
                <th className="text-center p-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {unusual.map((u, i) => (
                <tr key={i} className="border-t border-slate-700 hover:bg-slate-750">
                  <td className="p-3 text-white font-bold">{u.symbol}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.option_type === 'call' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.option_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-300">${u.strike}</td>
                  <td className="p-3 text-slate-400">{u.expiration}</td>
                  <td className="p-3 text-right text-white font-medium">{u.volume.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-400">{u.open_interest.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${u.vol_oi_ratio > 3 ? 'text-yellow-400' : 'text-slate-300'}`}>{u.vol_oi_ratio}x</span>
                  </td>
                  <td className="p-3 text-right text-slate-300">${(u.total_premium / 1000).toFixed(0)}K</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.sentiment === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.sentiment.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* P&L Calculator */}
      {tab === 'pnl' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Strategy Builder</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                ['long_call', 'Long Call'], ['long_put', 'Long Put'],
                ['bull_spread', 'Bull Spread'], ['bear_spread', 'Bear Spread'],
                ['straddle', 'Straddle'], ['iron_condor', 'Iron Condor'],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setStrategy(id)}
                  className={`py-2 rounded-lg text-sm font-medium ${strategy === id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 text-sm">Strike</label>
                <input type="number" value={pnlInputs.strike} onChange={e => setPnlInputs(p => ({ ...p, strike: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mt-1" />
              </div>
              <div>
                <label className="text-slate-400 text-sm">Premium</label>
                <input type="number" value={pnlInputs.premium} onChange={e => setPnlInputs(p => ({ ...p, premium: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mt-1" />
              </div>
              <div>
                <label className="text-slate-400 text-sm">Quantity</label>
                <input type="number" value={pnlInputs.quantity} onChange={e => setPnlInputs(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white mt-1" />
              </div>
            </div>
            <button onClick={calcPnL} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium">Calculate P&L</button>
          </div>

          {pnlResult && (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Max Profit</div>
                  <div className="text-green-400 font-bold text-lg">${pnlResult.max_profit > 100000 ? '∞' : pnlResult.max_profit.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Max Loss</div>
                  <div className="text-red-400 font-bold text-lg">${Math.abs(pnlResult.max_loss).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Breakeven</div>
                  <div className="text-white font-bold text-lg">{pnlResult.breakevens.map(b => `$${b}`).join(', ') || 'N/A'}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Net Premium</div>
                  <div className={`font-bold text-lg ${pnlResult.total_premium >= 0 ? 'text-green-400' : 'text-red-400'}`}>${pnlResult.total_premium.toLocaleString()}</div>
                </div>
              </div>

              {/* Simple P&L visualization */}
              <div className="h-48 flex items-end gap-px">
                {pnlResult.data.filter((_, i) => i % 3 === 0).map((d, i) => {
                  const maxAbs = Math.max(Math.abs(pnlResult.max_profit), Math.abs(pnlResult.max_loss)) || 1;
                  const height = Math.abs(d.pnl) / maxAbs * 100;
                  const isPositive = d.pnl >= 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center relative group" style={{ minHeight: '100%' }}>
                      <div className="absolute bottom-1/2 w-full" style={{ height: '1px', background: '#475569' }} />
                      <div className={`w-full rounded-sm ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ height: `${height / 2}%`, position: 'absolute', [isPositive ? 'bottom' : 'top']: '50%' }}
                        title={`$${d.price}: ${d.pnl >= 0 ? '+' : ''}$${d.pnl}`} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>${pnlResult.data[0]?.price}</span>
                <span>Price at Expiration</span>
                <span>${pnlResult.data[pnlResult.data.length - 1]?.price}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IV Surface */}
      {tab === 'surface' && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h3 className="text-white font-semibold mb-4">Implied Volatility Surface - {symbol}</h3>
          {ivSurface ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-2 text-left">DTE</th>
                    {ivSurface.surface[0]?.ivs.map((iv, i) => (
                      <th key={i} className="p-2 text-center">{iv.strike_pct}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ivSurface.surface.map((row, i) => (
                    <tr key={i} className="border-t border-slate-700">
                      <td className="p-2 text-white font-medium">{row.expiration_days}d</td>
                      {row.ivs.map((iv, j) => {
                        const intensity = Math.min(1, iv.iv / 60);
                        const bg = `rgba(59, 130, 246, ${intensity * 0.5})`;
                        return (
                          <td key={j} className="p-2 text-center text-white font-medium" style={{ background: bg }}>
                            {iv.iv}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">Loading IV Surface...</div>
          )}
        </div>
      )}
    </div>
  );
}
