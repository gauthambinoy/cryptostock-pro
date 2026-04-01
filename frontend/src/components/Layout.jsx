import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../utils/store';
import { useTheme } from './ThemeProvider';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Flame,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Eye,
  ArrowLeftRight,
  BarChart3,
  Target,
  DollarSign,
  Newspaper,
  Brain,
  ArrowRightLeft,
  Trophy,
  GitCompare,
  Share2,
  Gauge,
  Sun,
  Moon,
  FileDown,
  Shield,
  SlidersHorizontal,
  Calculator,
  FileText,
  Scale,
  Zap,
  Search,
  BarChart2,
  MessageCircle
} from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Invest',
      items: [
        { path: '/top-picks', icon: Zap, label: 'Top Picks Today' },
        { path: '/invest/analyze', icon: Search, label: 'Deep Analysis' },
        { path: '/market-pulse', icon: BarChart2, label: 'Market Pulse' },
        { path: '/profit-calc', icon: Calculator, label: 'Profit Calculator' },
      ]
    },
    {
      title: 'Portfolio',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/risk', icon: Shield, label: 'Risk Analysis' },
        { path: '/rebalance', icon: Scale, label: 'Rebalance' },
      ]
    },
    {
      title: 'Markets',
      items: [
        { path: '/markets', icon: TrendingUp, label: 'Markets' },
        { path: '/chart', icon: BarChart3, label: 'Chart Analyzer' },
        { path: '/watchlist', icon: Eye, label: 'Watchlist' },
        { path: '/screener', icon: SlidersHorizontal, label: 'Screener' },
        { path: '/gainers', icon: Flame, label: 'Top Gainers' },
        { path: '/losers', icon: TrendingDown, label: 'Top Losers' },
        { path: '/news', icon: Newspaper, label: 'News Feed' },
        { path: '/fear-greed', icon: Gauge, label: 'Fear & Greed' },
      ]
    },
    {
      title: 'Tools',
      items: [
        { path: '/prediction', icon: Brain, label: 'AI Prediction' },
        { path: '/chat', icon: MessageCircle, label: 'AI Chat' },
        { path: '/backtester', icon: BarChart2, label: 'Backtester' },
        { path: '/dca', icon: Calculator, label: 'DCA Calculator' },
        { path: '/converter', icon: ArrowRightLeft, label: 'Converter' },
        { path: '/alerts', icon: Bell, label: 'Alerts' },
        { path: '/compare', icon: GitCompare, label: 'Compare' },
      ]
    },
    {
      title: 'Finance',
      items: [
        { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
        { path: '/tax-report', icon: FileText, label: 'Tax Report' },
        { path: '/goals', icon: Target, label: 'Goals' },
        { path: '/dividends', icon: DollarSign, label: 'Dividends' },
      ]
    },
    {
      title: 'Social',
      items: [
        { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
        { path: '/share', icon: Share2, label: 'Share Portfolio' },
      ]
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-dark-300 border-r border-white/5
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 sticky top-0 bg-dark-300 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-success-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">CryptoStock</span>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 pb-24">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ path, icon: Icon, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm
                      ${isActive
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-dark-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/5 bg-dark-300/50 backdrop-blur-xl sticky top-0 z-40">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400">
            <span>Press</span>
            <kbd className="px-2 py-1 bg-white/10 rounded-md text-xs font-mono">Ctrl+K</kbd>
            <span>to search</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 glass-card py-2 animate-fade-in">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
