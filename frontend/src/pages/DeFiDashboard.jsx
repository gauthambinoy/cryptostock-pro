import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const CHAINS = ['All', 'Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism', 'Solana', 'Avalanche'];
const CATEGORIES = ['all', 'staking', 'lending', 'liquidity', 'yield_farming'];
const CATEGORY_LABELS = { all: 'All', staking: 'Staking', lending: 'Lending', liquidity: 'Liquidity Pools', yield_farming: 'Yield Farming' };

function formatTVL(tvl) {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(1)}K`;
  return `$${tvl.toFixed(0)}`;
}

function RiskBadge({ score }) {
  const color = score <= 3 ? 'text-green-400 bg-green-400/10' : score <= 6 ? 'text-yellow-400 bg-yellow-400/10' : 'text-red-400 bg-red-400/10';
  const label = score <= 3 ? 'Low' : score <= 6 ? 'Medium' : 'High';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label} ({score})</span>;
}

export default function DeFiDashboard() {
  const [pools, setPools] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [chains, setChains] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('apy');
  const [tab, setTab] = useState('yields');
  const [compareAsset, setCompareAsset] = useState('ETH');
  const [comparison, setComparison] = useState([]);

  const fetchYields = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort_by: sortBy, limit: 50 };
      if (selectedChain !== 'All') params.chain = selectedChain;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      const res = await api.get('/defi/yields', { params });
      setPools(res.data.pools || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedChain, selectedCategory, sortBy]);

  useEffect(() => { fetchYields(); }, [fetchYields]);

  useEffect(() => {
    api.get('/defi/protocols').then(r => setProtocols(r.data)).catch(() => {});
    api.get('/defi/chains').then(r => setChains(r.data)).catch(() => {});
    api.get('/defi/watchlist').then(r => setWatchlist(r.data)).catch(() => {});
  }, []);

  const compare = async () => {
    try {
      const res = await api.get('/defi/yield-comparison', { params: { asset: compareAsset } });
      setComparison(res.data);
    } catch (e) { console.error(e); }
  };

  const addToWatchlist = async (pool) => {
    try {
      await api.post('/defi/watchlist', { protocol: pool.protocol, pool_id: pool.pool_id, chain: pool.chain, asset: pool.symbol });
      const res = await api.get('/defi/watchlist');
      setWatchlist(res.data);
    } catch (e) { console.error(e); }
  };

  const removeFromWatchlist = async (id) => {
    try {
      await api.delete(`/defi/watchlist/${id}`);
      setWatchlist(w => w.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  };

  // Stats
  const avgApy = pools.length ? (pools.reduce((s, p) => s + p.apy, 0) / pools.length).toFixed(1) : '0';
  const highestApy = pools.length ? Math.max(...pools.map(p => p.apy)).toFixed(1) : '0';
  const totalTVL = pools.reduce((s, p) => s + p.tvl, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">DeFi Yield Dashboard</h1>
      <p className="text-slate-400 mb-6">Explore yields across DeFi protocols. Data from DeFi Llama.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Protocols Tracked</div>
          <div className="text-2xl font-bold text-white">{protocols.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Average APY</div>
          <div className="text-2xl font-bold text-green-400">{avgApy}%</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Highest APY</div>
          <div className="text-2xl font-bold text-yellow-400">{highestApy}%</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Total TVL</div>
          <div className="text-2xl font-bold text-blue-400">{formatTVL(totalTVL)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'yields', label: 'Top Yields' },
          { id: 'protocols', label: 'Protocols' },
          { id: 'compare', label: 'Yield Comparison' },
          { id: 'watchlist', label: `Watchlist (${watchlist.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Top Yields */}
      {tab === 'yields' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-1 overflow-x-auto">
              {CHAINS.map(c => (
                <button key={c} onClick={() => setSelectedChain(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedChain === c ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${selectedCategory === c ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-1.5 border border-slate-700">
              <option value="apy">Sort by APY</option>
              <option value="tvl">Sort by TVL</option>
              <option value="risk">Sort by Risk (Low first)</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-sm">
                    <th className="text-left p-4">Protocol</th>
                    <th className="text-left p-4">Pool</th>
                    <th className="text-left p-4">Chain</th>
                    <th className="text-right p-4">APY</th>
                    <th className="text-right p-4">TVL</th>
                    <th className="text-center p-4">Category</th>
                    <th className="text-center p-4">Risk</th>
                    <th className="text-center p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((p, i) => (
                    <tr key={i} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="p-4 text-white font-medium">{p.protocol}</td>
                      <td className="p-4 text-slate-300">{p.symbol}</td>
                      <td className="p-4"><span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">{p.chain}</span></td>
                      <td className="p-4 text-right text-green-400 font-bold">{p.apy}%</td>
                      <td className="p-4 text-right text-slate-300">{formatTVL(p.tvl)}</td>
                      <td className="p-4 text-center"><span className="text-xs text-slate-400 capitalize">{p.category?.replace('_', ' ')}</span></td>
                      <td className="p-4 text-center"><RiskBadge score={p.risk_score} /></td>
                      <td className="p-4 text-center">
                        <button onClick={() => addToWatchlist(p)} className="text-blue-400 hover:text-blue-300 text-sm">+ Watch</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pools.length === 0 && <div className="text-center text-slate-400 py-8">No pools found matching filters</div>}
            </div>
          )}
        </div>
      )}

      {/* Protocols */}
      {tab === 'protocols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {protocols.map((p, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-500 transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg">{p.name}</h3>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{p.category}</span>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-2">{formatTVL(p.tvl)}</div>
              <div className="flex gap-2 mb-3">
                <span className={`text-sm ${p.change_1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>24h: {p.change_1d > 0 ? '+' : ''}{p.change_1d}%</span>
                <span className={`text-sm ${p.change_7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>7d: {p.change_7d > 0 ? '+' : ''}{p.change_7d}%</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(p.chains || []).slice(0, 5).map(c => (
                  <span key={c} className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yield Comparison */}
      {tab === 'compare' && (
        <div>
          <div className="flex gap-3 mb-6">
            <input value={compareAsset} onChange={e => setCompareAsset(e.target.value)}
              placeholder="Enter asset (e.g., ETH, USDC)"
              className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white flex-1 max-w-xs" />
            <button onClick={compare} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium">Compare</button>
          </div>

          {comparison.length > 0 && (
            <div className="space-y-3">
              {comparison.map((c, i) => {
                const maxApy = Math.max(...comparison.map(x => x.apy));
                return (
                  <div key={i} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-semibold">{c.protocol}</span>
                        <span className="text-slate-400 text-sm ml-2">{c.chain}</span>
                      </div>
                      <div className="text-green-400 font-bold text-lg">{c.apy}%</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(c.apy / maxApy) * 100}%` }} />
                      </div>
                      <span className="text-slate-400 text-sm">{formatTVL(c.tvl)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {comparison.length === 0 && <p className="text-slate-400">Enter an asset name and click Compare to see yields across protocols.</p>}
        </div>
      )}

      {/* Watchlist */}
      {tab === 'watchlist' && (
        <div>
          {watchlist.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">No DeFi positions watched yet</p>
              <p className="text-sm">Browse the Top Yields tab and click "+ Watch" to add pools.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map(w => (
                <div key={w.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{w.protocol}</span>
                    <span className="text-slate-400 mx-2">|</span>
                    <span className="text-slate-300">{w.asset}</span>
                    <span className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded ml-2">{w.chain}</span>
                  </div>
                  <button onClick={() => removeFromWatchlist(w.id)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
