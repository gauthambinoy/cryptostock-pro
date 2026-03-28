import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor, formatCompact } from '../utils/helpers';
import { Filter, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Screener = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assetType, setAssetType] = useState('stock');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minChange, setMinChange] = useState('');
  const [maxChange, setMaxChange] = useState('');
  const [sortBy, setSortBy] = useState('change');
  const navigate = useNavigate();

  const fetchScreener = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ asset_type: assetType, sort_by: sortBy, limit: '30' });
      if (minPrice) params.set('min_price', minPrice);
      if (maxPrice) params.set('max_price', maxPrice);
      if (minChange) params.set('min_change', minChange);
      if (maxChange) params.set('max_change', maxChange);
      const res = await api.get(`/tools/screener?${params}`);
      setResults(res.data);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchScreener(); }, [assetType]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Asset Screener</h1>
        <p className="text-gray-400">Filter and discover stocks & crypto</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-2">
            {['stock', 'crypto'].map(t => (
              <button key={t} onClick={() => setAssetType(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                assetType === t ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-gray-400 hover:text-white bg-white/5'
              }`}>{t === 'stock' ? 'Stocks' : 'Crypto'}</button>
            ))}
          </div>
          <input type="number" placeholder="Min Price" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="input-field w-28" />
          <input type="number" placeholder="Max Price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="input-field w-28" />
          <input type="number" placeholder="Min Change %" value={minChange} onChange={e => setMinChange(e.target.value)} className="input-field w-32" />
          <input type="number" placeholder="Max Change %" value={maxChange} onChange={e => setMaxChange(e.target.value)} className="input-field w-32" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field w-36 bg-dark-300">
            <option value="change">Sort: Change %</option>
            <option value="price">Sort: Price</option>
            <option value="volume">Sort: Volume</option>
          </select>
          <button onClick={fetchScreener} disabled={isLoading} className="btn-primary flex items-center gap-2">
            <Filter className="w-4 h-4" /> {isLoading ? 'Scanning...' : 'Screen'}
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-400 border-b border-white/5">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Change %</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.symbol} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => navigate('/markets')}>
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-semibold">{r.symbol}</td>
                <td className="px-4 py-3 text-gray-400 truncate max-w-[150px]">{r.name}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.price)}</td>
                <td className={`px-4 py-3 text-right font-medium ${getChangeColor(r.change_percent)}`}>{formatPercent(r.change_percent)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{r.volume ? formatCompact(r.volume) : '-'}</td>
                <td className="px-4 py-3 text-right text-gray-400">{r.market_cap ? `$${formatCompact(r.market_cap)}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="text-center py-8 text-gray-400">Scanning assets...</div>}
        {!isLoading && results.length === 0 && <div className="text-center py-8 text-gray-400">No results match your filters</div>}
      </div>
    </div>
  );
};

export default Screener;
