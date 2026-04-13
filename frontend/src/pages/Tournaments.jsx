import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const STATUS_COLORS = {
  upcoming: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-slate-500/20 text-slate-400',
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', description: '', starting_balance: 100000, max_participants: 50,
    prize_description: '', start_date: '', end_date: '',
  });
  const [tradeForm, setTradeForm] = useState({ symbol: '', side: 'buy', quantity: '', price: '' });
  const [tradeResult, setTradeResult] = useState(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/tournaments', { params });
      setTournaments(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const openTournament = async (t) => {
    try {
      const res = await api.get(`/tournaments/${t.id}`);
      setTournamentDetail(res.data);
      setActiveTournament(t);
      // Fetch trades if joined
      if (t.is_joined) {
        const trRes = await api.get(`/tournaments/${t.id}/trades`);
        setTrades(trRes.data);
      }
    } catch (e) { console.error(e); }
  };

  const joinTournament = async (id) => {
    try {
      await api.post(`/tournaments/${id}/join`);
      await openTournament({ id, is_joined: true });
      fetchTournaments();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to join'); }
  };

  const createTournament = async () => {
    try {
      await api.post('/tournaments', createForm);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', starting_balance: 100000, max_participants: 50, prize_description: '', start_date: '', end_date: '' });
      fetchTournaments();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to create'); }
  };

  const executeTrade = async () => {
    if (!activeTournament) return;
    setTradeResult(null);
    try {
      const res = await api.post(`/tournaments/${activeTournament.id}/trade`, {
        ...tradeForm,
        quantity: parseFloat(tradeForm.quantity),
        price: parseFloat(tradeForm.price),
      });
      setTradeResult(res.data);
      setTradeForm({ symbol: '', side: 'buy', quantity: '', price: '' });
      // Refresh
      await openTournament({ ...activeTournament, is_joined: true });
    } catch (e) { alert(e.response?.data?.detail || 'Trade failed'); }
  };

  // Tournament detail view
  if (activeTournament && tournamentDetail) {
    const td = tournamentDetail;
    const userEntry = td.leaderboard?.find(l => l.is_current_user);

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <button onClick={() => { setActiveTournament(null); setTournamentDetail(null); }}
          className="text-slate-400 hover:text-white mb-4 text-sm">← Back to Tournaments</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">{td.name}</h1>
            <p className="text-slate-400">{td.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${STATUS_COLORS[td.status]}`}>
            {td.status.toUpperCase()}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Starting Balance</div>
            <div className="text-white font-bold text-xl">${td.starting_balance?.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Participants</div>
            <div className="text-white font-bold text-xl">{td.leaderboard?.length || 0}/{td.max_participants}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">Start</div>
            <div className="text-white font-bold">{formatDate(td.start_date)}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm">End</div>
            <div className="text-white font-bold">{formatDate(td.end_date)}</div>
          </div>
          {userEntry && (
            <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/50">
              <div className="text-slate-400 text-sm">Your P&L</div>
              <div className={`font-bold text-xl ${userEntry.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {userEntry.total_pnl >= 0 ? '+' : ''}${userEntry.total_pnl.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Prize */}
        {td.prize_description && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/30 mb-6">
            <span className="text-yellow-400 font-semibold">Prize: </span>
            <span className="text-white">{td.prize_description}</span>
          </div>
        )}

        {/* Trade Button */}
        {td.status === 'active' && userEntry && (
          <div className="mb-6">
            <button onClick={() => setShowTrade(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
              Execute Trade (Balance: ${userEntry.balance?.toLocaleString()})
            </button>
          </div>
        )}

        {!activeTournament.is_joined && td.status !== 'completed' && (
          <button onClick={() => joinTournament(td.id)}
            className="mb-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold">
            Join Tournament
          </button>
        )}

        {/* Leaderboard */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-white font-bold text-lg">Leaderboard</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-400">
                <th className="text-left p-3">Rank</th>
                <th className="text-left p-3">Trader</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-right p-3">P&L</th>
                <th className="text-right p-3">P&L %</th>
                <th className="text-right p-3">Trades</th>
                <th className="text-right p-3">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {(td.leaderboard || []).map(p => (
                <tr key={p.user_id} className={`border-t border-slate-700 ${p.is_current_user ? 'bg-blue-500/10' : ''}`}>
                  <td className="p-3">
                    <span className={`font-bold ${p.rank <= 3 ? 'text-yellow-400' : 'text-slate-300'}`}>
                      {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                    </span>
                  </td>
                  <td className="p-3 text-white font-medium">{p.username} {p.is_current_user ? '(You)' : ''}</td>
                  <td className="p-3 text-right text-white">${p.balance.toLocaleString()}</td>
                  <td className={`p-3 text-right font-bold ${p.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.total_pnl >= 0 ? '+' : ''}${p.total_pnl.toLocaleString()}
                  </td>
                  <td className={`p-3 text-right ${p.total_pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.total_pnl_pct >= 0 ? '+' : ''}{p.total_pnl_pct.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right text-slate-300">{p.total_trades}</td>
                  <td className="p-3 text-right text-slate-300">{p.win_rate.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trade History */}
        {trades.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-white font-bold">Your Trades</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400">
                  <th className="text-left p-3">Symbol</th>
                  <th className="text-left p-3">Side</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-left p-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(tr => (
                  <tr key={tr.id} className="border-t border-slate-700">
                    <td className="p-3 text-white font-medium">{tr.symbol}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${tr.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tr.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300">{tr.quantity}</td>
                    <td className="p-3 text-right text-slate-300">${tr.price.toFixed(2)}</td>
                    <td className="p-3 text-right text-white">${tr.total_value.toLocaleString()}</td>
                    <td className={`p-3 text-right font-medium ${tr.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tr.pnl !== 0 ? `${tr.pnl >= 0 ? '+' : ''}$${tr.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3 text-slate-400 text-xs">{tr.created_at ? new Date(tr.created_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Trade Modal */}
        {showTrade && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowTrade(false); setTradeResult(null); }}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-white mb-4">Execute Paper Trade</h2>
              {tradeResult ? (
                <div className="text-center py-4">
                  <div className="text-green-400 text-xl font-bold mb-2">{tradeResult.message}</div>
                  <div className="text-slate-300">New Balance: ${tradeResult.balance?.toLocaleString()}</div>
                  <button onClick={() => { setShowTrade(false); setTradeResult(null); }}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Done</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={tradeForm.symbol} onChange={e => setTradeForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    placeholder="Symbol (e.g., AAPL)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
                  <div className="flex gap-2">
                    <button onClick={() => setTradeForm(f => ({ ...f, side: 'buy' }))}
                      className={`flex-1 py-2.5 rounded-lg font-medium ${tradeForm.side === 'buy' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>BUY</button>
                    <button onClick={() => setTradeForm(f => ({ ...f, side: 'sell' }))}
                      className={`flex-1 py-2.5 rounded-lg font-medium ${tradeForm.side === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>SELL</button>
                  </div>
                  <input value={tradeForm.quantity} onChange={e => setTradeForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="Quantity" type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
                  <input value={tradeForm.price} onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="Price per share" type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
                  {tradeForm.quantity && tradeForm.price && (
                    <div className="text-slate-400 text-sm text-center">
                      Total: ${(parseFloat(tradeForm.quantity || 0) * parseFloat(tradeForm.price || 0)).toLocaleString()}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setShowTrade(false)} className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                    <button onClick={executeTrade} disabled={!tradeForm.symbol || !tradeForm.quantity || !tradeForm.price}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">Execute</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tournament list view
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Trading Tournaments</h1>
          <p className="text-slate-400">Compete with paper trading for prizes and glory</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">
          + Create Tournament
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6">
        {['', 'upcoming', 'active', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-lg">No tournaments yet</p>
          <p className="text-sm mt-1">Create one to start competing!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map(t => (
            <div key={t.id} onClick={() => openTournament(t)}
              className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[t.status]}`}>
                  {t.status.toUpperCase()}
                </span>
                <span className="text-slate-400 text-sm">{t.participant_count}/{t.max_participants} traders</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{t.name}</h3>
              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{t.description || 'No description'}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  ${t.starting_balance?.toLocaleString()} start
                </span>
                <span className="text-slate-500">
                  {formatDate(t.start_date)} - {formatDate(t.end_date)}
                </span>
              </div>
              {t.is_joined && (
                <div className={`mt-2 text-sm font-medium ${(t.user_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Your P&L: {(t.user_pnl || 0) >= 0 ? '+' : ''}${(t.user_pnl || 0).toLocaleString()}
                </div>
              )}
              {t.prize_description && (
                <div className="mt-2 text-yellow-400 text-xs">🏆 {t.prize_description}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">Create Tournament</h2>
            <div className="space-y-3">
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Tournament name" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description" rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs">Start Date</label>
                  <input type="datetime-local" value={createForm.start_date} onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs">End Date</label>
                  <input type="datetime-local" value={createForm.end_date} onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs">Starting Balance ($)</label>
                  <input type="number" value={createForm.starting_balance} onChange={e => setCreateForm(f => ({ ...f, starting_balance: parseInt(e.target.value) || 100000 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs">Max Participants</label>
                  <input type="number" value={createForm.max_participants} onChange={e => setCreateForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 50 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <input value={createForm.prize_description} onChange={e => setCreateForm(f => ({ ...f, prize_description: e.target.value }))}
                placeholder="Prize (e.g., 3 months Pro free)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                <button onClick={createTournament} disabled={!createForm.name || !createForm.start_date || !createForm.end_date}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
