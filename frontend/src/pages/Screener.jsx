import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { formatCurrency, formatCompact, formatPercent, getChangeColor } from '../utils/helpers';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SORT_OPTIONS = [
  { value: 'change', label: 'Change %' },
  { value: 'price', label: 'Price' },
  { value: 'volume', label: 'Volume' },
  { value: 'market_cap', label: 'Market Cap' },
  { value: 'symbol', label: 'Symbol' },
];

const SkeletonRow = () => (
  <tr className="border-b border-dark-300/50">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-dark-300 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}px` }} />
      </td>
    ))}
  </tr>
);

const Screener = () => {
  const navigate = useNavigate();
  const [assetType, setAssetType] = useState('stock');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minChange: '',
    maxChange: '',
    sortBy: 'change',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchScreenerData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        asset_type: assetType,
        sort_by: filters.sortBy,
        limit: '30',
      });
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.minChange) params.append('min_change', filters.minChange);
      if (filters.maxChange) params.append('max_change', filters.maxChange);

      const response = await api.get(`/tools/screener?${params.toString()}`);
      setResults(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch screener data:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [assetType, filters]);

  useEffect(() => {
    fetchScreenerData();
  }, [fetchScreenerData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredResults = searchQuery
    ? results.filter(
        (r) =>
          (r.symbol || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : results;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-primary-400" />
            Asset Screener
          </h1>
          <p className="text-gray-400">Filter and discover assets</p>
        </div>

        {/* Asset Type Toggle */}
        <div className="flex items-center gap-1 bg-dark-300 rounded-lg p-1">
          <button
            onClick={() => setAssetType('stock')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              assetType === 'stock'
                ? 'bg-primary-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Stocks
          </button>
          <button
            onClick={() => setAssetType('crypto')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              assetType === 'crypto'
                ? 'bg-primary-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Crypto
          </button>
        </div>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? 'border-primary-500 text-primary-400 bg-primary-500/10'
              : 'border-dark-300 text-gray-400 hover:border-gray-500'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="glass-card p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Min Price</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Max Price</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Min Change %</label>
              <input
                type="number"
                placeholder="-100"
                value={filters.minChange}
                onChange={(e) => handleFilterChange('minChange', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Max Change %</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxChange}
                onChange={(e) => handleFilterChange('maxChange', e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="input-field w-full"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-300">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Symbol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Name</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Change %</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Volume</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No assets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredResults.map((asset, idx) => (
                  <tr
                    key={asset.symbol || idx}
                    onClick={() => navigate('/markets')}
                    className="border-b border-dark-300/50 hover:bg-dark-300/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{asset.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm truncate max-w-[200px]">
                      {asset.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(asset.price ?? asset.current_price)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${getChangeColor(
                        asset.change_percent ?? asset.change
                      )}`}
                    >
                      {formatPercent(asset.change_percent ?? asset.change)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">
                      {asset.volume ? formatCompact(asset.volume) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">
                      {asset.market_cap ? `$${formatCompact(asset.market_cap)}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Count */}
      {!isLoading && (
        <p className="text-sm text-gray-500 text-right">
          Showing {filteredResults.length} of {results.length} results
        </p>
      )}
    </div>
  );
};

export default Screener;
