import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Command, LayoutDashboard, Briefcase, TrendingUp, Star, Flame, BarChart3, ArrowDownUp, Target, Coins, Newspaper, BrainCircuit, ArrowLeftRight, Trophy, GitCompare, Bell, ChevronRight, Plus, X } from 'lucide-react';
import { marketAPI } from '../utils/api';

const PAGES = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
  { name: 'Markets', path: '/markets', icon: TrendingUp },
  { name: 'Watchlist', path: '/watchlist', icon: Star },
  { name: 'Gainers', path: '/gainers', icon: Flame },
  { name: 'Losers', path: '/losers', icon: TrendingUp },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Transactions', path: '/transactions', icon: ArrowDownUp },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Dividends', path: '/dividends', icon: Coins },
  { name: 'News', path: '/news', icon: Newspaper },
  { name: 'Prediction', path: '/prediction', icon: BrainCircuit },
  { name: 'Converter', path: '/converter', icon: ArrowLeftRight },
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { name: 'Compare', path: '/compare', icon: GitCompare },
  { name: 'Alerts', path: '/alerts', icon: Bell },
];

const ACTIONS = [
  { name: 'Add Holding', description: 'Add a new investment to your portfolio', icon: Plus, action: 'add-holding' },
  { name: 'Create Alert', description: 'Set up a new price alert', icon: Bell, action: 'create-alert' },
];

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [assetResults, setAssetResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setAssetResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search assets when query changes
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length >= 2) {
      setIsSearching(true);
      searchTimeout.current = setTimeout(async () => {
        try {
          const response = await marketAPI.search(query);
          setAssetResults(response.data?.slice(0, 5) || []);
        } catch {
          setAssetResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setAssetResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  // Filter pages and actions
  const lowerQuery = query.toLowerCase();
  const filteredPages = query
    ? PAGES.filter(p => p.name.toLowerCase().includes(lowerQuery))
    : PAGES.slice(0, 6);
  const filteredActions = query
    ? ACTIONS.filter(a => a.name.toLowerCase().includes(lowerQuery))
    : ACTIONS;

  // Build flat list of all results for keyboard navigation
  const allResults = [];
  filteredPages.forEach(p => allResults.push({ type: 'page', data: p }));
  assetResults.forEach(a => allResults.push({ type: 'asset', data: a }));
  filteredActions.forEach(a => allResults.push({ type: 'action', data: a }));

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, assetResults.length]);

  const handleSelect = useCallback((item) => {
    setIsOpen(false);
    if (item.type === 'page') {
      navigate(item.data.path);
    } else if (item.type === 'asset') {
      navigate(`/markets?symbol=${item.data.symbol || item.data.name}`);
    } else if (item.type === 'action') {
      if (item.data.action === 'add-holding') {
        navigate('/portfolio');
      } else if (item.data.action === 'create-alert') {
        navigate('/alerts');
      }
    }
  }, [navigate]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIdx = 0;

  const renderItem = (item, idx) => {
    const isSelected = idx === selectedIndex;
    return (
      <button
        key={`${item.type}-${idx}`}
        data-selected={isSelected}
        onClick={() => handleSelect(item)}
        onMouseEnter={() => setSelectedIndex(idx)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isSelected ? 'bg-primary-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        {item.type === 'page' && (
          <>
            <item.data.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 font-medium">{item.data.name}</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </>
        )}
        {item.type === 'asset' && (
          <>
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-400">
                {(item.data.symbol || item.data.name || '?').slice(0, 3).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.data.symbol || item.data.name}</p>
              {item.data.name && item.data.symbol && (
                <p className="text-xs text-gray-500 truncate">{item.data.name}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </>
        )}
        {item.type === 'action' && (
          <>
            <div className="w-8 h-8 rounded-lg bg-success-500/20 flex items-center justify-center flex-shrink-0">
              <item.data.icon className="w-4 h-4 text-success-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{item.data.name}</p>
              <p className="text-xs text-gray-500">{item.data.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </>
        )}
      </button>
    );
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 glass-card overflow-hidden animate-fade-in shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, assets, actions..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 text-xs rounded bg-white/10 text-gray-400 border border-white/10">
              ESC
            </kbd>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {/* Pages */}
          {filteredPages.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Pages
              </p>
              {filteredPages.map((page) => {
                const idx = currentIdx++;
                return renderItem({ type: 'page', data: page }, idx);
              })}
            </div>
          )}

          {/* Assets */}
          {(assetResults.length > 0 || isSearching) && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Assets
              </p>
              {isSearching && assetResults.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  Searching...
                </div>
              ) : (
                assetResults.map((asset) => {
                  const idx = currentIdx++;
                  return renderItem({ type: 'asset', data: asset }, idx);
                })
              )}
            </div>
          )}

          {/* Actions */}
          {filteredActions.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </p>
              {filteredActions.map((action) => {
                const idx = currentIdx++;
                return renderItem({ type: 'action', data: action }, idx);
              })}
            </div>
          )}

          {/* No results */}
          {query && filteredPages.length === 0 && assetResults.length === 0 && filteredActions.length === 0 && !isSearching && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↓</kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↵</kbd>
            <span>select</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Command className="w-3 h-3" />
            <span>K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default GlobalSearch;
