import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import { Eye, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const Watchlist = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newAssetType, setNewAssetType] = useState('stock');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/watchlist');
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setAddLoading(true);
    setAddError('');
    try {
      await api.post('/watchlist', {
        symbol: newSymbol.toUpperCase().trim(),
        asset_type: newAssetType,
      });
      setNewSymbol('');
      setNewAssetType('stock');
      setShowAddModal(false);
      fetchWatchlist();
    } catch (error) {
      setAddError(error.response?.data?.detail || 'Failed to add to watchlist');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete watchlist item:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary-400" />
            Watchlist
          </h1>
          <p className="text-gray-400">Track your favorite assets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            No assets in your watchlist
          </h2>
          <p className="text-gray-500 mb-6">
            Start tracking assets by adding them to your watchlist.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Asset
          </button>
        </div>
      )}

      {/* Watchlist Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const change = item.change_24h || 0;
            const changePercent = item.change_percent_24h || 0;
            const isPositive = change >= 0;

            return (
              <div key={item.id} className="glass-card p-4 animate-slide-in">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.symbol}</h3>
                    <p className="text-sm text-gray-400">{item.name || item.asset_type}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-danger-500/20 text-gray-500 hover:text-danger-400 transition-colors"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-2">
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(item.current_price)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger-400" />
                  )}
                  <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                    {formatCurrency(Math.abs(change))}
                  </span>
                  <span className={`text-sm font-medium ${getChangeColor(changePercent)}`}>
                    ({formatPercent(changePercent)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Add to Watchlist</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="e.g. AAPL, BTC"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Asset Type</label>
                <select
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="stock">Stock</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              {addError && (
                <p className="text-danger-400 text-sm">{addError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {addLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
