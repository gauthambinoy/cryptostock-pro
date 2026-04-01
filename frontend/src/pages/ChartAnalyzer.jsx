import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, Eye, AlertCircle, BarChart3, Volume2 } from 'lucide-react';
import AdvancedChart from '../components/AdvancedChart';

const ChartAnalyzer = () => {
  const { symbol: urlSymbol } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || 'AAPL');
  const [timeframe, setTimeframe] = useState('1day');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [supportResistance, setSupportResistance] = useState(null);
  const [volumeAnalysis, setVolumeAnalysis] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/market/search?query=${query}`);
      const result = await response.json();
      setSearchResults(result.results?.slice(0, 10) || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSymbol = (symbol) => {
    setSelectedSymbol(symbol.toUpperCase());
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const fetchSupportResistance = async () => {
    try {
      const response = await fetch(
        `/api/chart/support-resistance?symbol=${selectedSymbol}&timeframe=${timeframe}`
      );
      const result = await response.json();
      setSupportResistance(result);
    } catch (error) {
      console.error('Failed to fetch support/resistance:', error);
    }
  };

  const fetchVolumeAnalysis = async () => {
    try {
      const response = await fetch(
        `/api/chart/volume-analysis?symbol=${selectedSymbol}&timeframe=${timeframe}`
      );
      const result = await response.json();
      setVolumeAnalysis(result);
    } catch (error) {
      console.error('Failed to fetch volume analysis:', error);
    }
  };

  useEffect(() => {
    fetchSupportResistance();
    fetchVolumeAnalysis();
  }, [selectedSymbol, timeframe]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Chart Analyzer</h1>
            <p className="text-slate-600 dark:text-slate-400">Advanced technical analysis with 50+ indicators</p>
          </div>
        </div>
      </div>

      {/* Symbol Search Bar */}
      <div className="relative max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search stocks or crypto (e.g., AAPL, BTC)..."
            className="w-full px-4 py-3 pl-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
          />
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        </div>

        {/* Search Results Dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => selectSymbol(result.symbol)}
                className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-0 transition"
              >
                <div className="font-semibold text-slate-900 dark:text-white">{result.symbol}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{result.name}</div>
              </button>
            ))}
          </div>
        )}

        {showSearch && !isSearching && searchQuery && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center text-slate-500 dark:text-slate-400">
            No results found
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden">
        <AdvancedChart
          symbol={selectedSymbol}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          height={500}
        />
      </div>

      {/* Analysis Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support & Resistance */}
        {supportResistance && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Support & Resistance</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Pivot Points</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Pivot</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      ${supportResistance.pivot_points.pivot}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Current</div>
                    <div className="text-lg font-bold text-emerald-500">
                      ${supportResistance.current_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">R1</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      ${supportResistance.pivot_points.resistance1}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded p-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">S1</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      ${supportResistance.pivot_points.support1}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Resistance Levels</h4>
                <div className="flex flex-wrap gap-2">
                  {supportResistance.resistance_levels.map((level, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium"
                    >
                      ${level}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Support Levels</h4>
                <div className="flex flex-wrap gap-2">
                  {supportResistance.support_levels.map((level, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
                    >
                      ${level}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Volume Analysis */}
        {volumeAnalysis && (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Volume Analysis</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Avg Volume</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {(volumeAnalysis.volume_stats.average_volume / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Current Vol</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {(volumeAnalysis.volume_stats.current_volume / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Volume Ratio</div>
                  <div className={`text-lg font-bold ${volumeAnalysis.volume_stats.volume_ratio > 1 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                    {volumeAnalysis.volume_stats.volume_ratio.toFixed(2)}x
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">High Vol Candles</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {volumeAnalysis.high_volume_candles.length}
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-200 dark:border-blue-900 rounded p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {volumeAnalysis.volume_stats.volume_ratio > 1.5
                      ? 'High volume detected - strong price action likely'
                      : 'Volume is normal - watch for breakout signals'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trading Tips */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Analysis Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">Moving Averages</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Use SMA 50/200 for trend direction</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">RSI</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Above 70 = overbought, Below 30 = oversold</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">MACD</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Watch for signal line crossovers</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">Bollinger Bands</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Identify volatility and reversal points</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">Volume</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Confirm trends with volume increase</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-sm">Support/Resistance</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Key levels for entry and exit points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalyzer;
