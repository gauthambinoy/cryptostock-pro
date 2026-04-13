import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const EVENT_TYPES = [
  { id: 'all', label: 'All Events' },
  { id: 'earnings_report', label: 'Earnings' },
  { id: 'fed_speech', label: 'Fed/Central Bank' },
  { id: 'crypto_regulation', label: 'Crypto' },
  { id: 'merger_acquisition', label: 'M&A' },
  { id: 'regulatory', label: 'Regulatory' },
  { id: 'geopolitical', label: 'Geopolitical' },
  { id: 'product_launch', label: 'Product' },
  { id: 'sec_filing', label: 'SEC Filing' },
];

const IMPACT_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-slate-500 text-white',
};

const TYPE_COLORS = {
  earnings_report: 'bg-blue-500/20 text-blue-400',
  fed_speech: 'bg-purple-500/20 text-purple-400',
  crypto_regulation: 'bg-orange-500/20 text-orange-400',
  merger_acquisition: 'bg-green-500/20 text-green-400',
  regulatory: 'bg-red-500/20 text-red-400',
  geopolitical: 'bg-yellow-500/20 text-yellow-400',
  product_launch: 'bg-cyan-500/20 text-cyan-400',
  sec_filing: 'bg-pink-500/20 text-pink-400',
};

export default function EventSignals() {
  const [signals, setSignals] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('all');
  const [direction, setDirection] = useState('all');
  const [selectedSignal, setSelectedSignal] = useState(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (eventType !== 'all') params.event_type = eventType;
      if (direction !== 'all') params.direction = direction;
      const res = await api.get('/event-signals/live', { params });
      setSignals(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [eventType, direction]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  useEffect(() => {
    api.get('/event-signals/calendar').then(r => setCalendar(r.data)).catch(() => {});
    api.get('/event-signals/accuracy').then(r => setAccuracy(r.data)).catch(() => {});
    api.get('/event-signals/trending').then(r => setTrending(r.data)).catch(() => {});

    // Auto refresh every 30s
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const bullishCount = signals.filter(s => s.signal_direction === 'bullish').length;
  const bearishCount = signals.filter(s => s.signal_direction === 'bearish').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Event Trading Signals</h1>
          <p className="text-slate-400">AI-powered market event detection and trade signals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm">Live</span>
        </div>
      </div>

      {/* Trending Symbols Ticker */}
      <div className="bg-slate-800 rounded-xl p-3 mb-6 border border-slate-700 overflow-x-auto">
        <div className="flex gap-4">
          <span className="text-slate-500 text-sm whitespace-nowrap">Trending:</span>
          {trending.map(t => (
            <div key={t.symbol} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-white font-semibold text-sm">{t.symbol}</span>
              <span className="text-slate-400 text-xs">{t.mentions} events</span>
              <span className={`text-xs ${t.sentiment === 'bullish' ? 'text-green-400' : t.sentiment === 'bearish' ? 'text-red-400' : 'text-slate-400'}`}>
                {t.sentiment === 'bullish' ? '▲' : t.sentiment === 'bearish' ? '▼' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex gap-1 overflow-x-auto">
              {EVENT_TYPES.map(t => (
                <button key={t.id} onClick={() => setEventType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${eventType === t.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {['all', 'bullish', 'bearish'].map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${direction === d ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Signal Cards */}
          {loading ? (
            <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : (
            <div className="space-y-3">
              {signals.map(signal => (
                <div key={signal.id}
                  className={`bg-slate-800 rounded-xl p-4 border transition-all cursor-pointer hover:border-blue-500 ${
                    signal.impact_score === 'critical' ? 'border-red-500/50 animate-pulse-slow' : 'border-slate-700'
                  }`}
                  onClick={() => setSelectedSignal(signal)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[signal.event_type] || 'bg-slate-700 text-slate-300'}`}>
                        {signal.event_type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${IMPACT_COLORS[signal.impact_score]}`}>
                        {signal.impact_score.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-slate-500 text-xs whitespace-nowrap">{signal.hours_ago}h ago</span>
                  </div>

                  <h3 className="text-white font-semibold mb-2">{signal.title}</h3>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Direction */}
                    <div className={`flex items-center gap-1 ${signal.signal_direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                      <span className="text-lg">{signal.signal_direction === 'bullish' ? '↑' : '↓'}</span>
                      <span className="font-bold text-sm uppercase">{signal.signal_direction}</span>
                      <span className="text-xs">({signal.signal_confidence}%)</span>
                    </div>

                    {/* Action */}
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      signal.suggested_action === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {signal.suggested_action.toUpperCase()}
                    </span>

                    {/* Symbols */}
                    <div className="flex gap-1">
                      {signal.affected_symbols.map(s => (
                        <span key={s} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">{s}</span>
                      ))}
                    </div>

                    <span className="text-slate-500 text-xs ml-auto">{signal.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          {accuracy && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-3">Signal Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Accuracy</span>
                  <span className="text-green-400 font-bold">{accuracy.overall_accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Signals Today</span>
                  <span className="text-white font-bold">{accuracy.signals_today}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Bullish / Bearish</span>
                  <span className="text-white">{bullishCount} / {bearishCount}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 h-full" style={{ width: `${bullishCount / Math.max(signals.length, 1) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${bearishCount / Math.max(signals.length, 1) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Event Calendar */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Upcoming Events</h3>
            <div className="space-y-2">
              {calendar.slice(0, 6).map((e, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div>
                    <div className="text-white text-sm font-medium">{e.event}</div>
                    <div className="text-slate-500 text-xs">{e.date}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${IMPACT_COLORS[e.impact]}`}>
                      {e.countdown_days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accuracy by Type */}
          {accuracy && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-3">Accuracy by Type</h3>
              <div className="space-y-2">
                {Object.entries(accuracy.by_type).map(([type, acc]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400 capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-white">{acc}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSignal(null)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[selectedSignal.event_type]}`}>
                {selectedSignal.event_type.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold ${IMPACT_COLORS[selectedSignal.impact_score]}`}>
                {selectedSignal.impact_score}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">{selectedSignal.title}</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`text-2xl font-bold ${selectedSignal.signal_direction === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedSignal.signal_direction === 'bullish' ? '↑ BULLISH' : '↓ BEARISH'}
                </div>
                <div className="text-white font-bold text-lg">{selectedSignal.signal_confidence}% confidence</div>
              </div>

              <div>
                <h4 className="text-slate-400 text-sm mb-1">Affected Symbols</h4>
                <div className="flex gap-2">
                  {selectedSignal.affected_symbols.map(s => (
                    <span key={s} className="bg-slate-700 text-white px-3 py-1 rounded font-medium">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-slate-400 text-sm mb-1">Historical Pattern</h4>
                <p className="text-slate-300 text-sm">{selectedSignal.historical_pattern}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-slate-400 text-xs">Action</div>
                  <div className={`font-bold uppercase ${selectedSignal.suggested_action === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedSignal.suggested_action}
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-slate-400 text-xs">Horizon</div>
                  <div className="text-white font-medium capitalize">{selectedSignal.time_horizon?.replace('_', ' ')}</div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 text-center">
                  <div className="text-slate-400 text-xs">Source</div>
                  <div className="text-white font-medium">{selectedSignal.source}</div>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedSignal(null)} className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
