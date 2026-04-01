import React, { useEffect, useState } from 'react';
import { usePortfolioStore, useMarketStore } from '../utils/store';
import { formatCurrency, formatPercent, getChangeColor, formatCompact } from '../utils/helpers';
import StatCard from '../components/StatCard';
import PriceCard from '../components/PriceCard';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  Flame,
  Bitcoin,
  BarChart3,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { portfolios, fetchPortfolios, isLoading: portfolioLoading } = usePortfolioStore();
  const { overview, stockGainers, cryptoGainers, fetchOverview, isLoading: marketLoading } = useMarketStore();
  const [tradingAccount, setTradingAccount] = useState(null);
  const [loadingTrading, setLoadingTrading] = useState(false);

  // Fetch trading account status
  const fetchTradingAccount = async () => {
    setLoadingTrading(true);
    try {
      const response = await fetch('/api/trading/status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.is_connected) {
          const accountResponse = await fetch('/api/trading/account', {
            credentials: 'include',
          });
          if (accountResponse.ok) {
            const account = await accountResponse.json();
            setTradingAccount(account);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching trading account:', err);
    } finally {
      setLoadingTrading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
    fetchOverview();
    fetchTradingAccount();
  }, []);

  // Calculate totals from all portfolios
  const totalValue = portfolios.reduce((sum, p) => sum + (p.total_value || 0), 0);
  const totalGainLoss = portfolios.reduce((sum, p) => sum + (p.total_gain_loss || 0), 0);
  const totalGainLossPercent = totalValue > 0 
    ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 
    : 0;

  const handleRefresh = () => {
    fetchPortfolios();
    fetchOverview();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400">Your portfolio at a glance</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={portfolioLoading || marketLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(portfolioLoading || marketLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Trading Account Alert */}
      {tradingAccount && (
        <div className="glass-card p-4 border border-blue-500/50 bg-blue-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-semibold">Live Trading Active</p>
                <p className="text-sm text-gray-400">Balance: {formatCurrency(tradingAccount.account_balance)}</p>
              </div>
            </div>
            <Link to="/trading" className="btn-secondary flex items-center gap-2">
              Trading Panel
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Portfolio Value"
          value={totalValue}
          change={totalGainLoss}
          changePercent={totalGainLossPercent}
          icon={Wallet}
        />
        <StatCard
          title="Total Gain/Loss"
          value={Math.abs(totalGainLoss)}
          changePercent={totalGainLossPercent}
          icon={totalGainLoss >= 0 ? TrendingUp : TrendingDown}
          prefix={totalGainLoss >= 0 ? '+' : '-'}
        />
        <StatCard
          title="Portfolios"
          value={portfolios.length}
          isCurrency={false}
          icon={PieChart}
        />
        <StatCard
          title="Assets Tracked"
          value={portfolios.reduce((sum, p) => sum + (p.holdings?.length || 0), 0)}
          isCurrency={false}
          icon={BarChart3}
        />
      </div>

      {/* Market Overview */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overview.sp500 && (
            <div className="glass-card p-4">
              <p className="text-sm text-gray-400 mb-1">S&P 500</p>
              <p className="text-xl font-bold">{formatCurrency(overview.sp500.price, 0)}</p>
              <p className={`text-sm ${getChangeColor(overview.sp500.change)}`}>
                {formatPercent(overview.sp500.change_percent)}
              </p>
            </div>
          )}
          {overview.nasdaq && (
            <div className="glass-card p-4">
              <p className="text-sm text-gray-400 mb-1">NASDAQ</p>
              <p className="text-xl font-bold">{formatCurrency(overview.nasdaq.price, 0)}</p>
              <p className={`text-sm ${getChangeColor(overview.nasdaq.change)}`}>
                {formatPercent(overview.nasdaq.change_percent)}
              </p>
            </div>
          )}
          {overview.btc && (
            <div className="glass-card p-4">
              <p className="text-sm text-gray-400 mb-1">Bitcoin</p>
              <p className="text-xl font-bold">{formatCurrency(overview.btc.price, 0)}</p>
              <p className={`text-sm ${getChangeColor(overview.btc.change)}`}>
                {formatPercent(overview.btc.change_percent)}
              </p>
            </div>
          )}
          {overview.eth && (
            <div className="glass-card p-4">
              <p className="text-sm text-gray-400 mb-1">Ethereum</p>
              <p className="text-xl font-bold">{formatCurrency(overview.eth.price, 0)}</p>
              <p className={`text-sm ${getChangeColor(overview.eth.change)}`}>
                {formatPercent(overview.eth.change_percent)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top Gainers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Gainers */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Top Stock Gainers</h2>
          </div>
          <div className="space-y-3">
            {stockGainers.slice(0, 5).map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{stock.symbol}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[100px]">{stock.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(stock.price)}</p>
                  <p className="text-sm text-success-400">{formatPercent(stock.change_percent)}</p>
                </div>
              </div>
            ))}
            {stockGainers.length === 0 && (
              <p className="text-gray-400 text-center py-4">Loading...</p>
            )}
          </div>
        </div>

        {/* Crypto Gainers */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bitcoin className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold">Top Crypto Gainers (24h)</h2>
          </div>
          <div className="space-y-3">
            {cryptoGainers.slice(0, 5).map((crypto) => (
              <div key={crypto.symbol} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xs font-bold">
                    {crypto.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{crypto.symbol}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[100px]">{crypto.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(crypto.price)}</p>
                  <p className="text-sm text-success-400">{formatPercent(crypto.change_percent)}</p>
                </div>
              </div>
            ))}
            {cryptoGainers.length === 0 && (
              <p className="text-gray-400 text-center py-4">Loading...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
