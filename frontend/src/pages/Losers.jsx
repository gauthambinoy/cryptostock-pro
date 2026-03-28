import React, { useEffect, useState } from 'react';
import { marketAPI } from '../utils/api';
import { formatCurrency, formatPercent, formatCompact, getChangeColor } from '../utils/helpers';
import { TrendingDown, RefreshCw, BarChart3, Bitcoin } from 'lucide-react';

const Losers = () => {
  const [stockLosers, setStockLosers] = useState([]);
  const [cryptoLosers, setCryptoLosers] = useState([]);
  const [activeTab, setActiveTab] = useState('stocks');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, cryptoRes] = await Promise.all([
        marketAPI.getStockGainers(20),
        marketAPI.getCryptoGainers(50),
      ]);

      const stockData = (stockRes.data || [])
        .filter((a) => a.change_percent < 0)
        .sort((a, b) => a.change_percent - b.change_percent);

      const cryptoData = (cryptoRes.data || [])
        .filter((a) => a.change_percent < 0)
        .sort((a, b) => a.change_percent - b.change_percent);

      setStockLosers(stockData);
      setCryptoLosers(cryptoData);
    } catch (error) {
      console.error('Failed to fetch losers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLosers = activeTab === 'stocks' ? stockLosers : cryptoLosers;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-danger-500 to-rose-600">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Top Losers</h1>
            <p className="text-gray-400">Today's worst performing assets</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'stocks'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          Stocks
        </button>
        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'crypto'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Bitcoin className="w-5 h-5" />
          Crypto (24h)
        </button>
      </div>

      {/* Losers Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Change</th>
                <th className="px-6 py-4 font-medium text-right">Change %</th>
                <th className="px-6 py-4 font-medium text-right">Volume</th>
                <th className="px-6 py-4 font-medium text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {currentLosers.map((asset, index) => (
                <tr
                  key={asset.symbol}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          asset.asset_type === 'crypto'
                            ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
                            : 'bg-gradient-to-br from-primary-500 to-blue-500'
                        }`}
                      >
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold">{asset.symbol}</p>
                        <p className="text-sm text-gray-400 truncate max-w-[150px]">
                          {asset.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatCurrency(asset.price)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-danger-400">
                      {formatCurrency(asset.change)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-danger-500/20">
                      <TrendingDown className="w-4 h-4 text-danger-400" />
                      <span className="font-medium text-danger-400">
                        {formatPercent(asset.change_percent)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {asset.volume ? `$${formatCompact(asset.volume)}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {asset.market_cap ? `$${formatCompact(asset.market_cap)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentLosers.length === 0 && (
          <div className="p-12 text-center">
            <RefreshCw
              className={`w-8 h-8 text-gray-600 mx-auto mb-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <p className="text-gray-400">
              {isLoading ? 'Loading losers...' : 'No losers data available'}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-danger-500/20">
          <TrendingDown className="w-5 h-5 text-danger-400" />
        </div>
        <p className="text-sm text-gray-400">
          {activeTab === 'stocks'
            ? 'Showing top losing stocks for today based on percentage change'
            : 'Showing top losing cryptocurrencies in the last 24 hours'}
        </p>
      </div>
    </div>
  );
};

export default Losers;
