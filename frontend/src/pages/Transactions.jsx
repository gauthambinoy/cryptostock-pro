import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { ArrowUpCircle, ArrowDownCircle, Download, Filter } from 'lucide-react';

const Transactions = () => {
  const { portfolios, fetchPortfolios } = usePortfolioStore();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioFilter, setPortfolioFilter] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (portfolioFilter) params.append('portfolio_id', portfolioFilter);
      if (assetTypeFilter) params.append('asset_type', assetTypeFilter);
      if (typeFilter) params.append('type', typeFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/transactions${query}`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [portfolioFilter, assetTypeFilter, typeFilter]);

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/transactions/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  // Summary calculations
  const totalBuys = transactions
    .filter((t) => t.type === 'buy')
    .reduce((sum, t) => sum + (t.quantity * t.price), 0);
  const totalSells = transactions
    .filter((t) => t.type === 'sell')
    .reduce((sum, t) => sum + (t.quantity * t.price), 0);
  const netInvested = totalBuys - totalSells;
  const totalCount = transactions.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-gray-400">View and manage your trades</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-500/20">
              <ArrowUpCircle className="w-5 h-5 text-success-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Buys</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalBuys)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-danger-500/20">
              <ArrowDownCircle className="w-5 h-5 text-danger-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Sells</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalSells)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <Filter className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Net Invested</p>
              <p className="text-xl font-bold text-white">{formatCurrency(netInvested)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/20">
              <Download className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-xl font-bold text-white">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filters:</span>
          </div>
          <select
            value={portfolioFilter}
            onChange={(e) => setPortfolioFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Portfolios</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Asset Types</option>
            <option value="stock">Stocks</option>
            <option value="crypto">Crypto</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-300">
                  <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Symbol</th>
                  <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Type</th>
                  <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Quantity</th>
                  <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Price</th>
                  <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Total</th>
                  <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-dark-300/50 hover:bg-dark-300/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDateTime(tx.date || tx.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{tx.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      {tx.type === 'buy' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-500/20 text-success-400">
                          <ArrowUpCircle className="w-3 h-3" />
                          Buy
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-500/20 text-danger-400">
                          <ArrowDownCircle className="w-3 h-3" />
                          Sell
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-300">
                      {tx.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-300">
                      {formatCurrency(tx.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-white">
                      {formatCurrency(tx.quantity * tx.price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {tx.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
