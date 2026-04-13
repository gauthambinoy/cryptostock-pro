import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { usePortfolioStore, useMarketStore, useAuthStore, useAlertsStore } from '../utils/store';
import { formatCurrency, formatPercent, getChangeColor, formatCompact } from '../utils/helpers';
import { Link } from 'react-router-dom';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Activity,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Crown,
  Target,
  Briefcase,
  Users,
  CheckCircle2,
  Sparkles,
  Globe,
  Shield,
  Eye,
  DollarSign,
  Flame,
  PieChart,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react';

const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#ef4444'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Linear congruential generator constants (Numerical Recipes)
const LCG_MULTIPLIER = 9301;
const LCG_INCREMENT = 49297;
const LCG_MODULUS = 233280;

/** Returns a seeded pseudo-random number in [0, 1) */
const seededRandom = (seed, index) =>
  (((seed * (index + 1) * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS) / LCG_MODULUS);

const LIVE_DOT_SMALL_STYLE = { width: 5, height: 5 };

// ─── Animated counter hook ───
const useCountUp = (end, duration = 1200) => {
  const [count, setCount] = useState(0);
  const prevEnd = useRef(0);

  useEffect(() => {
    if (end === prevEnd.current) return;
    prevEnd.current = end;
    const startVal = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(startVal + (end - startVal) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);

  return count;
};

// ─── Skeleton loader ───
const SkeletonCard = () => (
  <div className="glass-premium p-6 space-y-4">
    <div className="skeleton h-3 w-24" />
    <div className="skeleton h-8 w-32" />
    <div className="skeleton h-3 w-20" />
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 py-4 px-2">
    <div className="skeleton w-10 h-10 rounded-xl" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-2.5 w-32" />
    </div>
    <div className="skeleton h-4 w-16" />
  </div>
);

// ─── Sparkline mini-chart ───
const MiniSparkline = ({ data, color = '#0ea5e9', height = 32 }) => (
  <div className="sparkline-container">
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// ─── Greeting logic ───
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', emoji: '☀️' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
  if (h < 21) return { text: 'Good Evening', emoji: '🌅' };
  return { text: 'Good Night', emoji: '🌙' };
};

// ═══════════════════════════════════════
//  DASHBOARD COMPONENT
// ═══════════════════════════════════════
const Dashboard = () => {
  const { user } = useAuthStore();
  const { portfolios, holdings, fetchPortfolios, isLoading: portfolioLoading } = usePortfolioStore();
  const { overview, stockGainers, cryptoGainers, fetchOverview, isLoading: marketLoading } = useMarketStore();
  const { alerts, fetchAlerts } = useAlertsStore();
  const [tradingAccount, setTradingAccount] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchTradingAccount = async () => {
    try {
      const response = await fetch('/api/trading/status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.is_connected) {
          const accountResponse = await fetch('/api/trading/account', { credentials: 'include' });
          if (accountResponse.ok) {
            setTradingAccount(await accountResponse.json());
          }
        }
      }
    } catch (err) {
      console.debug('Trading account unavailable:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchPortfolios(), fetchOverview(), fetchAlerts(), fetchTradingAccount()])
      .finally(() => setInitialLoad(false));
  }, []);

  // ─── Calculated values ───
  const totalValue = portfolios.reduce((sum, p) => sum + (p.total_value || 0), 0);
  const totalGainLoss = portfolios.reduce((sum, p) => sum + (p.total_gain_loss || 0), 0);
  const totalGainLossPercent = totalValue > 0
    ? (totalGainLoss / (totalValue - totalGainLoss)) * 100
    : 0;
  const totalAssets = portfolios.reduce((sum, p) => sum + (p.holdings?.length || 0), 0);
  const activeAlerts = alerts.filter(a => a.is_active).length;
  const goalTarget = Math.max(totalValue * 1.3, 10000);
  const goalPercent = totalValue > 0 ? Math.min(Math.round((totalValue / goalTarget) * 100), 100) : 0;

  // Animated counters
  const animatedTotal = useCountUp(totalValue, 1500);
  const animatedPnL = useCountUp(Math.abs(totalGainLoss), 1200);
  const animatedGoal = useCountUp(goalPercent, 1000);
  const animatedAssets = useCountUp(totalAssets, 800);

  // ─── Allocation data ───
  const allocationData = holdings.length > 0
    ? holdings.map((h, i) => ({
        name: h.symbol,
        value: h.current_value || h.quantity * (h.current_price || h.buy_price),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : portfolios.map((p, i) => ({
        name: p.name,
        value: p.total_value || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
  const allocationTotal = allocationData.reduce((sum, d) => sum + d.value, 0);

  // ─── Sparkline data (seeded, stable) ───
  const generateSparkline = useCallback((seed, points = 20) => {
    const arr = [];
    let val = seed || 50;
    for (let i = 0; i < points; i++) {
      val += (seededRandom(seed, i) - 0.45) * 10;
      arr.push({ v: Math.max(0, val) });
    }
    return arr;
  }, []);

  const sparkData = useMemo(() => ({
    portfolio: generateSparkline(Math.round(totalValue) || 100),
    pnl: generateSparkline((Math.round(totalGainLoss) || 50) + 200),
    goal: generateSparkline(goalPercent + 300),
    assets: generateSparkline(totalAssets + 400),
  }), [totalValue, totalGainLoss, goalPercent, totalAssets, generateSparkline]);

  // ─── Profit chart data ───
  const profitChartData = useMemo(() => {
    const seed = Math.round(totalValue) || 1000;
    return Array.from({ length: 24 }, (_, i) => ({
      label: i % 4 === 0 ? MONTHS[Math.floor(i / 2) % 12] : '',
      value: totalValue > 0
        ? totalValue * (0.6 + seededRandom(seed, i) * 0.5) * ((i + 1) / 24)
        : 500 + (seededRandom(seed, i) * 300) * (i / 24),
    }));
  }, [totalValue]);

  // ─── Top movers ───
  const topMovers = useMemo(() => [
    ...stockGainers.slice(0, 4).map(s => ({ ...s, type: 'stock' })),
    ...cryptoGainers.slice(0, 4).map(c => ({ ...c, type: 'crypto' })),
  ].sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0)).slice(0, 6),
    [stockGainers, cryptoGainers]
  );

  // ─── Activity & notification data ───
  const activityItems = useMemo(() => [
    ...(overview?.btc ? [{
      icon: <TrendingUp className="w-4 h-4" />,
      iconBg: 'bg-success-500/20 text-success-400',
      text: `BTC trading at ${formatCurrency(overview.btc.price, 0)}`,
      time: 'Live',
      live: true,
    }] : []),
    ...(overview?.eth ? [{
      icon: <BarChart3 className="w-4 h-4" />,
      iconBg: 'bg-primary-500/20 text-primary-400',
      text: `ETH at ${formatCurrency(overview.eth.price, 0)}`,
      time: 'Live',
      live: true,
    }] : []),
    ...(portfolios.length > 0 ? [{
      icon: <Briefcase className="w-4 h-4" />,
      iconBg: 'bg-purple-500/20 text-purple-400',
      text: `${portfolios.length} portfolio${portfolios.length > 1 ? 's' : ''} tracked`,
      time: 'Active',
    }] : []),
    ...(activeAlerts > 0 ? [{
      icon: <Bell className="w-4 h-4" />,
      iconBg: 'bg-yellow-500/20 text-yellow-400',
      text: `${activeAlerts} active price alert${activeAlerts > 1 ? 's' : ''}`,
      time: 'Monitoring',
    }] : []),
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      iconBg: 'bg-success-500/20 text-success-400',
      text: 'Market data synced successfully',
      time: 'Just now',
    },
  ], [overview, portfolios, activeAlerts]);

  const notificationItems = useMemo(() => [
    ...(stockGainers.length > 0 ? [{
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      text: `${stockGainers[0]?.symbol} surging ${formatPercent(stockGainers[0]?.change_percent)}`,
      time: 'Top Stock Gainer',
      badge: 'hot',
    }] : []),
    ...(cryptoGainers.length > 0 ? [{
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      text: `${cryptoGainers[0]?.symbol} up ${formatPercent(cryptoGainers[0]?.change_percent)}`,
      time: 'Crypto Alert',
      badge: 'new',
    }] : []),
    ...(overview?.sp500 ? [{
      icon: overview.sp500.change >= 0
        ? <ArrowUpRight className="w-4 h-4 text-success-400" />
        : <ArrowDownRight className="w-4 h-4 text-danger-400" />,
      text: `S&P 500 ${formatPercent(overview.sp500.change_percent)} today`,
      time: 'Market Update',
    }] : []),
    ...(overview?.nasdaq ? [{
      icon: overview.nasdaq.change >= 0
        ? <ArrowUpRight className="w-4 h-4 text-success-400" />
        : <ArrowDownRight className="w-4 h-4 text-danger-400" />,
      text: `NASDAQ ${formatPercent(overview.nasdaq.change_percent)} today`,
      time: 'Market Update',
    }] : []),
  ], [stockGainers, cryptoGainers, overview]);

  const handleRefresh = useCallback(() => {
    fetchPortfolios();
    fetchOverview();
    fetchAlerts();
  }, [fetchPortfolios, fetchOverview, fetchAlerts]);

  const isLoading = portfolioLoading || marketLoading;
  const greeting = getGreeting();

  // ─── Loading skeletons ───
  if (initialLoad && isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-56" />
            <div className="skeleton h-4 w-40" />
          </div>
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-premium p-6">
            <div className="skeleton h-5 w-40 mb-6" />
            <div className="flex items-center gap-8">
              <div className="skeleton w-48 h-48 rounded-full" />
              <div className="flex-1 space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-4 w-full" />)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
        <div className="glass-premium p-6">
          <div className="skeleton h-5 w-32 mb-4" />
          {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ════ MAIN GRID ════ */}
      <div className="flex gap-6">
        {/* ════ LEFT / MAIN ════ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between animate-slide-up">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2.5">
                Overview
                <span className="text-lg">{greeting.emoji}</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {greeting.text}, <span className="font-medium text-gray-300">{user?.full_name || user?.username || 'Investor'}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 border border-success-500/20">
                <div className="live-dot" />
                <span className="text-xs font-medium text-success-400">Live</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
                           glass-premium border-0 hover:!transform-none
                           text-gray-300 hover:text-white group"
              >
                <RefreshCw className={`w-4 h-4 transition-transform group-hover:rotate-180 duration-500 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Trading Account Banner ── */}
          {tradingAccount && (
            <div className="animate-slide-up glass-premium p-4 !border-l-4 !border-l-yellow-400 !rounded-l-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      Live Trading Active
                      <span className="live-dot" />
                    </p>
                    <p className="text-xs text-gray-400">Balance: {formatCurrency(tradingAccount.account_balance)}</p>
                  </div>
                </div>
                <Link to="/trading" className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Open Panel <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ══════ KPI STAT CARDS ══════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Portfolio Value */}
            <div className="animate-slide-up glass-premium stat-card-premium p-5 card-press group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio Value</p>
                <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center group-hover:bg-primary-500/25 transition-colors">
                  <Wallet className="w-4 h-4 text-primary-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {formatCurrency(animatedTotal, 0)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {totalGainLossPercent >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-success-500/15 text-success-400">
                    <ArrowUpRight className="w-3 h-3" />
                    {Math.abs(totalGainLossPercent).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-danger-500/15 text-danger-400">
                    <ArrowDownRight className="w-3 h-3" />
                    {Math.abs(totalGainLossPercent).toFixed(1)}%
                  </span>
                )}
                <span className="text-[11px] text-gray-500">total return</span>
              </div>
              <div className="mt-3 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                <MiniSparkline data={sparkData.portfolio} color="#0ea5e9" />
              </div>
            </div>

            {/* Card 2: Total P&L */}
            <div className="animate-slide-up-delay-1 glass-premium stat-card-premium p-5 card-press group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total P&L</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  totalGainLoss >= 0
                    ? 'bg-success-500/15 group-hover:bg-success-500/25'
                    : 'bg-danger-500/15 group-hover:bg-danger-500/25'
                }`}>
                  {totalGainLoss >= 0
                    ? <TrendingUp className="w-4 h-4 text-success-400" />
                    : <TrendingDown className="w-4 h-4 text-danger-400" />
                  }
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1">
                <span className={totalGainLoss >= 0 ? 'text-success-400' : 'text-danger-400'}>
                  {totalGainLoss >= 0 ? '+' : '-'}{formatCurrency(animatedPnL, 0)}
                </span>
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  totalGainLoss >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                }`}>
                  {formatPercent(totalGainLossPercent)}
                </span>
                <span className="text-[11px] text-gray-500">all time</span>
              </div>
              <div className="mt-3 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                <MiniSparkline data={sparkData.pnl} color={totalGainLoss >= 0 ? '#22c55e' : '#ef4444'} />
              </div>
            </div>

            {/* Card 3: Portfolio Goal */}
            <div className="animate-slide-up-delay-2 glass-premium stat-card-premium p-5 card-press group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio Goal</p>
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                  <Target className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {Math.round(animatedGoal)}%
              </p>
              <div className="mt-2">
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${goalPercent}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9)',
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Target: {formatCurrency(goalTarget, 0)}
                </p>
              </div>
            </div>

            {/* Card 4: Active Holdings */}
            <div className="animate-slide-up-delay-3 glass-premium stat-card-premium p-5 card-press group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Holdings</p>
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center group-hover:bg-orange-500/25 transition-colors">
                  <PieChart className="w-4 h-4 text-orange-400" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {Math.round(animatedAssets)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400">
                  {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-3 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                <MiniSparkline data={sparkData.assets} color="#f97316" />
              </div>
            </div>
          </div>

          {/* ══════ PORTFOLIO OVERVIEW + METRICS ══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Donut + Breakdown (2 cols) */}
            <div className="lg:col-span-2 animate-slide-up-delay-2 glass-premium p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary-400" />
                  </div>
                  <h2 className="text-base font-semibold">Portfolio Overview</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="live-dot" />
                  <span>Real-time</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Donut */}
                <div className="relative w-52 h-52 flex-shrink-0">
                  {allocationData.length > 0 && allocationTotal > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={true}
                            animationBegin={200}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15,23,42,0.95)',
                              backdropFilter: 'blur(16px)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.75rem',
                              color: '#fff',
                              fontSize: '12px',
                              boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-xs text-gray-500 mb-0.5">Total</p>
                        <p className="text-xl font-bold">${formatCompact(allocationTotal)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-full border-2 border-dashed border-white/10">
                      <div className="text-center px-6">
                        <Sparkles className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Add holdings to<br />see allocation</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Market Breakdown */}
                <div className="flex-1 w-full space-y-2.5">
                  {overview?.sp500 && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
                        <span className="text-sm text-gray-300">S&P 500</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(overview.sp500.price, 0)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          overview.sp500.change >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                        }`}>
                          {formatPercent(overview.sp500.change_percent)}
                        </span>
                      </div>
                    </div>
                  )}
                  {overview?.nasdaq && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                        <span className="text-sm text-gray-300">NASDAQ</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(overview.nasdaq.price, 0)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          overview.nasdaq.change >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                        }`}>
                          {formatPercent(overview.nasdaq.change_percent)}
                        </span>
                      </div>
                    </div>
                  )}
                  {overview?.btc && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                        <span className="text-sm text-gray-300">Bitcoin</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(overview.btc.price, 0)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          overview.btc.change >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                        }`}>
                          {formatPercent(overview.btc.change_percent)}
                        </span>
                      </div>
                    </div>
                  )}
                  {overview?.eth && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                        <span className="text-sm text-gray-300">Ethereum</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatCurrency(overview.eth.price, 0)}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          overview.eth.change >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                        }`}>
                          {formatPercent(overview.eth.change_percent)}
                        </span>
                      </div>
                    </div>
                  )}
                  {allocationData.filter(d => d.value > 0).length === 0 && !overview && (
                    <div className="text-center py-6 text-sm text-gray-500">
                      No data available yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mini metric cards */}
            <div className="space-y-4 animate-slide-up-delay-3">
              {/* Market Movers */}
              <div className="glass-premium p-5 card-press">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Market Movers</p>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <p className="text-3xl font-bold">
                    {stockGainers.length + cryptoGainers.length}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-500/15 text-success-400">
                    +{stockGainers.length} stocks
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Tracked gainers across markets</p>
                <div className="mt-3 flex gap-1">
                  {CHART_COLORS.slice(0, stockGainers.length + cryptoGainers.length).map((c, i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: c, opacity: 0.6 }} />
                  ))}
                </div>
              </div>

              {/* Net Profit */}
              <div className="glass-premium p-5 card-press">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    totalGainLoss >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-danger-500/15 text-danger-400'
                  }`}>
                    {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-3xl font-bold">
                  <span className={totalGainLoss >= 0 ? 'text-success-400' : 'text-danger-400'}>
                    {formatCurrency(Math.abs(totalGainLoss), 0)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-2">Cumulative returns</p>
                {/* Tiny inline chart */}
                <div className="mt-3 h-10 opacity-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitChartData.slice(-12)}>
                      <defs>
                        <linearGradient id="miniProfitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={totalGainLoss >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={totalGainLoss >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={totalGainLoss >= 0 ? '#22c55e' : '#ef4444'}
                        strokeWidth={1.5}
                        fill="url(#miniProfitGrad)"
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ TOP MOVERS TABLE ══════ */}
          <div className="animate-slide-up-delay-4 glass-premium p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <h2 className="text-base font-semibold">Top Movers</h2>
              </div>
              <Link to="/gainers" className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 pb-3 border-b border-white/[0.04] mb-1">
              <div className="col-span-4 flex items-center gap-1 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                Asset <ChevronUp className="w-3 h-3" />
              </div>
              <div className="col-span-3 text-[11px] text-gray-500 font-semibold uppercase tracking-wider text-right">Price</div>
              <div className="col-span-3 text-[11px] text-gray-500 font-semibold uppercase tracking-wider text-right">Change</div>
              <div className="col-span-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wider text-right">Vol</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.03]">
              {topMovers.map((item, idx) => (
                <div
                  key={item.symbol}
                  className={`grid grid-cols-12 gap-3 py-3.5 row-hover-glow rounded-lg px-2 -mx-2 transition-all duration-300 ${
                    hoveredRow === idx ? 'bg-white/[0.03]' : ''
                  }`}
                  onMouseEnter={() => setHoveredRow(idx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform duration-300 ${
                      hoveredRow === idx ? 'scale-110' : ''
                    } ${
                      item.type === 'crypto'
                        ? 'bg-gradient-to-br from-orange-500 to-amber-400 shadow-orange-500/20'
                        : 'bg-gradient-to-br from-primary-500 to-blue-600 shadow-primary-500/20'
                    }`}>
                      {item.symbol?.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.symbol}</p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[120px]">{item.name}</p>
                    </div>
                  </div>
                  <p className="col-span-3 text-sm font-semibold text-right self-center tabular-nums">
                    {formatCurrency(item.price)}
                  </p>
                  <div className="col-span-3 text-right self-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                      (item.change_percent || 0) >= 0
                        ? 'bg-success-500/15 text-success-400'
                        : 'bg-danger-500/15 text-danger-400'
                    } ${hoveredRow === idx ? 'scale-105' : ''}`}>
                      {(item.change_percent || 0) >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {formatPercent(item.change_percent)}
                    </span>
                  </div>
                  <p className="col-span-2 text-xs text-gray-500 text-right self-center tabular-nums">
                    {item.volume ? formatCompact(item.volume) : '—'}
                  </p>
                </div>
              ))}
              {topMovers.length === 0 && (
                <div className="py-12 text-center">
                  <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm text-gray-500">Loading market data...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════ RIGHT SIDEBAR ════ */}
        <div className="hidden xl:flex xl:flex-col w-80 flex-shrink-0 gap-5 smooth-scroll">

          {/* Notifications */}
          <div className="animate-slide-up glass-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-400" />
                Notifications
              </h3>
              {notificationItems.length > 0 && (
                <span className="badge-bounce text-[10px] font-bold bg-danger-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                  {notificationItems.length}
                </span>
              )}
            </div>
            <div className="space-y-3.5">
              {notificationItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
                  <div className="mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[11px] text-gray-500">{item.time}</p>
                      {item.badge === 'hot' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                          Hot
                        </span>
                      )}
                      {item.badge === 'new' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {notificationItems.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No new notifications</p>
              )}
            </div>
          </div>

          {/* Activities */}
          <div className="animate-slide-up-delay-1 glass-premium p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-gray-400" />
              Activities
            </h3>
            <div className="space-y-3">
              {activityItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.live && <div className="live-dot" style={LIVE_DOT_SMALL_STYLE} />}
                      <p className="text-[11px] text-gray-500">{item.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profit Chart */}
          <div className="animate-slide-up-delay-2 glass-premium p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 font-medium">Total Profit</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <Clock className="w-3 h-3" /> 12mo
              </div>
            </div>
            <p className="text-xl font-bold mb-4">
              {formatCurrency(totalValue, 2)}
            </p>
            <div className="h-28 -mx-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitChartData}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#profitGradient)"
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '11px',
                      boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
                    }}
                    formatter={(value) => [formatCurrency(value), 'Value']}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="animate-slide-up-delay-3 glass-premium p-5 gradient-border overflow-visible"
               style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(139,92,246,0.08))' }}>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Premium Plan</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-4xl font-extrabold">$30</span>
              <span className="text-sm text-gray-400">Per Month</span>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Unlock AI predictions, advanced analytics, real-time alerts and more
            </p>
            <Link
              to="/pricing"
              className="block w-full text-center py-3 px-4 text-white text-sm font-semibold rounded-xl transition-all duration-300
                         bg-gradient-to-r from-primary-500 to-purple-500 hover:from-primary-400 hover:to-purple-400
                         hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
            >
              Get Started →
            </Link>
            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" /> 4.9 Rating</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="animate-slide-up-delay-4 glass-premium p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-400" />
              Quick Actions
            </h3>
            <div className="space-y-1">
              {[
                { label: 'AI Predictions', path: '/prediction', icon: Target, color: 'text-purple-400 bg-purple-500/15' },
                { label: 'Market Pulse', path: '/market-pulse', icon: Activity, color: 'text-primary-400 bg-primary-500/15' },
                { label: 'Leaderboard', path: '/leaderboard', icon: Users, color: 'text-yellow-400 bg-yellow-500/15' },
                { label: 'AI Chat', path: '/chat', icon: Sparkles, color: 'text-success-400 bg-success-500/15' },
              ].map(({ label, path, icon: Icon, color }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-300 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
