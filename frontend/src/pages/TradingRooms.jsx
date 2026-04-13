import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const CATEGORIES = ['all', 'general', 'crypto', 'stocks', 'options', 'education'];

function TimeAgo({ date }) {
  if (!date) return null;
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return <span>{seconds}s ago</span>;
  if (seconds < 3600) return <span>{Math.floor(seconds / 60)}m ago</span>;
  if (seconds < 86400) return <span>{Math.floor(seconds / 3600)}h ago</span>;
  return <span>{Math.floor(seconds / 86400)}d ago</span>;
}

function TradeShareCard({ metadata }) {
  if (!metadata) return null;
  const isBuy = metadata.action === 'buy';
  return (
    <div className={`mt-1 p-3 rounded-lg border ${isBuy ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isBuy ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {metadata.action?.toUpperCase()}
        </span>
        <span className="text-white font-bold">{metadata.symbol}</span>
        {metadata.price && <span className="text-slate-400">@ ${metadata.price}</span>}
      </div>
      {metadata.notes && <p className="text-slate-400 text-sm mt-1">{metadata.notes}</p>}
    </div>
  );
}

export default function TradingRooms() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showTradeShare, setShowTradeShare] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', category: 'general', is_private: false });
  const [tradeForm, setTradeForm] = useState({ symbol: '', action: 'buy', price: '', notes: '' });
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      const res = await api.get('/rooms', { params });
      setRooms(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const joinRoom = async (room) => {
    try {
      await api.post(`/rooms/${room.id}/join`);
      const [msgsRes, partRes] = await Promise.all([
        api.get(`/rooms/${room.id}/messages`),
        api.get(`/rooms/${room.id}/participants`),
      ]);
      setMessages(msgsRes.data);
      setParticipants(partRes.data);
      setActiveRoom(room);
      setOnlineCount(room.online_count || 0);

      // Connect WebSocket
      try {
        const tokenRes = await api.get('/rooms/ws-token');
        const wsToken = tokenRes.data.token;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsHost = import.meta.env.VITE_WS_URL || window.location.host;
        const ws = new WebSocket(`${wsProtocol}://${wsHost}/api/rooms/${room.id}/ws?token=${wsToken}`);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'message') {
            setMessages(prev => [...prev, data]);
          } else if (data.type === 'system') {
            setMessages(prev => [...prev, { ...data, id: Date.now(), username: 'System' }]);
            if (data.online_count !== undefined) setOnlineCount(data.online_count);
          }
        };

        ws.onclose = () => console.log('WebSocket disconnected');
        wsRef.current = ws;
      } catch (e) {
        console.log('WebSocket connection failed, using polling mode');
      }
    } catch (e) { console.error(e); }
  };

  const leaveRoom = async () => {
    if (activeRoom) {
      try { await api.post(`/rooms/${activeRoom.id}/leave`); } catch (e) {}
      wsRef.current?.close();
      wsRef.current = null;
      setActiveRoom(null);
      setMessages([]);
      setParticipants([]);
      fetchRooms();
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: input, message_type: 'text' }));
    setInput('');
  };

  const shareTrade = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      content: `${tradeForm.action.toUpperCase()} ${tradeForm.symbol} @ $${tradeForm.price}`,
      message_type: 'trade_share',
      metadata: tradeForm,
    }));
    setTradeForm({ symbol: '', action: 'buy', price: '', notes: '' });
    setShowTradeShare(false);
  };

  const createRoom = async () => {
    try {
      await api.post('/rooms', createForm);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', category: 'general', is_private: false });
      fetchRooms();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to create room'); }
  };

  const categoryColors = {
    general: 'bg-slate-600', crypto: 'bg-purple-600', stocks: 'bg-blue-600',
    options: 'bg-orange-600', education: 'bg-green-600',
  };

  // Room list view
  if (!activeRoom) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Trading Rooms</h1>
            <p className="text-slate-400">Join live discussions with other traders</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">
            + Create Room
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${category === c ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {c}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms..."
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm flex-1 max-w-xs" />
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">No rooms found</p>
            <p className="text-sm mt-1">Create one to start trading together!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <div key={room.id} onClick={() => joinRoom(room)}
                className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${categoryColors[room.category] || 'bg-slate-600'}`}>
                    {room.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-sm">{room.online_count || 0}</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{room.name}</h3>
                <p className="text-slate-400 text-sm mb-3 line-clamp-2">{room.description || 'No description'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Host: <span className="text-slate-300">{room.host}</span></span>
                  <span className="text-slate-500">{room.participant_count} members</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Room Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">Create Trading Room</h2>
              <div className="space-y-4">
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Room name" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
                <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description" rows={3} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
                <select value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white">
                  <option value="general">General</option>
                  <option value="crypto">Crypto</option>
                  <option value="stocks">Stocks</option>
                  <option value="options">Options</option>
                  <option value="education">Education</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                  <button onClick={createRoom} disabled={!createForm.name.trim()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">Create</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat view
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar - Participants */}
      <div className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold text-sm">Participants ({onlineCount})</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {participants.map(p => (
            <div key={p.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800">
              <div className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 text-sm truncate">{p.username}</span>
              {p.is_moderator && <span className="text-yellow-400 text-xs">MOD</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded text-white ${categoryColors[activeRoom.category] || 'bg-slate-600'}`}>
              {activeRoom.category}
            </span>
            <h2 className="text-white font-semibold">{activeRoom.name}</h2>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 text-sm">{onlineCount}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTradeShare(true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm">
              Share Trade
            </button>
            <button onClick={leaveRoom} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-sm">
              Leave
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={msg.type === 'system' || msg.username === 'System' ? 'text-center' : ''}>
              {msg.type === 'system' || msg.username === 'System' ? (
                <span className="text-slate-500 text-sm italic">{msg.content}</span>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-blue-400 font-semibold text-sm">{msg.username}</span>
                    <span className="text-slate-600 text-xs"><TimeAgo date={msg.created_at} /></span>
                  </div>
                  <p className="text-slate-200 text-sm">{msg.content}</p>
                  {msg.message_type === 'trade_share' && <TradeShareCard metadata={msg.metadata} />}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" autoFocus />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium">Send</button>
          </div>
        </form>
      </div>

      {/* Trade Share Modal */}
      {showTradeShare && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowTradeShare(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm border border-slate-700" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Share a Trade</h2>
            <div className="space-y-3">
              <input value={tradeForm.symbol} onChange={e => setTradeForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="Symbol (e.g., AAPL)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setTradeForm(f => ({ ...f, action: 'buy' }))}
                  className={`flex-1 py-2 rounded-lg font-medium ${tradeForm.action === 'buy' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Buy</button>
                <button type="button" onClick={() => setTradeForm(f => ({ ...f, action: 'sell' }))}
                  className={`flex-1 py-2 rounded-lg font-medium ${tradeForm.action === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Sell</button>
              </div>
              <input value={tradeForm.price} onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))}
                placeholder="Price" type="number" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <input value={tradeForm.notes} onChange={e => setTradeForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)" className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white" />
              <div className="flex gap-3">
                <button onClick={() => setShowTradeShare(false)} className="flex-1 bg-slate-700 text-white py-2.5 rounded-lg">Cancel</button>
                <button onClick={shareTrade} disabled={!tradeForm.symbol} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">Share</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
