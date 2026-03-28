import React, { useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { Brain, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

const POPULAR_STOCKS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'NVDA', 'META'];
const POPULAR_CRYPTO = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP'];

const signalConfig = {
  BULLISH: { color: 'text-success-400', bg: 'bg-success-500/20', border: 'border-success-500/30', icon: TrendingUp },
  BEARISH: { color: 'text-danger-400', bg: 'bg-danger-500/20', border: 'border-danger-500/30', icon: TrendingDown },
  NEUTRAL: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: Minus },
};

const Prediction = () => {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = async (sym) => {
    const targetSymbol = sym || symbol;
    if (!targetSymbol.trim()) return;

    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const res = await api.get(
        `/prediction/${assetType}/${targetSymbol.toUpperCase().trim()}`
      );
      setPrediction(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (sym) => {
    setSymbol(sym);
    fetchPrediction(sym);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') fetchPrediction();
  };

  const signal = prediction?.signal?.toUpperCase() || 'NEUTRAL';
  const config = signalConfig[signal] || signalConfig.NEUTRAL;
  const SignalIcon = config.icon;
  const confidence = prediction?.confidence ?? 0;
  const quickSymbols = assetType === 'stock' ? POPULAR_STOCKS : POPULAR_CRYPTO;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Price Prediction</h1>
          <p className="text-gray-400">Technical analysis powered signal prediction</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="glass-card p-6 space-y-4">
        {/* Asset Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setAssetType('stock')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'stock'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setAssetType('crypto')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              assetType === 'crypto'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            Crypto
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Enter ${assetType === 'stock' ? 'stock' : 'crypto'} symbol (e.g. ${assetType === 'stock' ? 'AAPL' : 'BTC'})...`}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="input-field w-full pl-12"
            />
          </div>
          <button
            onClick={() => fetchPrediction()}
            disabled={isLoading || !symbol.trim()}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Brain className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
            {isLoading ? 'Analyzing...' : 'Predict'}
          </button>
        </div>

        {/* Quick Access */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 py-1">Popular:</span>
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => handleQuickSelect(sym)}
              className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-sm border border-white/10 hover:bg-white/10 hover:text-white transition-all"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border-danger-500/30">
          <p className="text-danger-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="glass-card p-12 text-center">
          <Brain className="w-10 h-10 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Running technical analysis...</p>
        </div>
      )}

      {/* Results */}
      {prediction && !isLoading && (
        <div className="space-y-4">
          {/* Signal Card */}
          <div className={`glass-card p-6 border ${config.border}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Symbol & Signal */}
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${config.bg}`}>
                  <SignalIcon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{prediction.symbol}</h2>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg mt-1 ${config.bg}`}>
                    <span className={`text-lg font-bold ${config.color}`}>{signal}</span>
                  </div>
                </div>
              </div>

              {/* Current Price */}
              {prediction.current_price != null && (
                <div className="text-right">
                  <p className="text-sm text-gray-400">Current Price</p>
                  <p className="text-2xl font-bold">{formatCurrency(prediction.current_price)}</p>
                </div>
              )}
            </div>

            {/* Confidence Meter */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Confidence</span>
                <span className={`text-sm font-bold ${config.color}`}>{confidence.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    signal === 'BULLISH'
                      ? 'bg-gradient-to-r from-success-500 to-green-400'
                      : signal === 'BEARISH'
                      ? 'bg-gradient-to-r from-danger-500 to-red-400'
                      : 'bg-gradient-to-r from-yellow-500 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(confidence, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Predicted Direction */}
            {prediction.direction && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-400">Predicted Direction:</span>
                <div className={`flex items-center gap-1 ${config.color}`}>
                  <SignalIcon className="w-4 h-4" />
                  <span className="font-medium capitalize">{prediction.direction}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reasons / Indicators */}
          {prediction.reasons && prediction.reasons.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" />
                Technical Indicators
              </h3>
              <div className="space-y-3">
                {prediction.reasons.map((reason, index) => {
                  const reasonSignal = reason.signal?.toUpperCase();
                  const reasonConfig = signalConfig[reasonSignal] || signalConfig.NEUTRAL;
                  const ReasonIcon = reasonConfig.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-xl ${reasonConfig.bg} border ${reasonConfig.border}`}
                    >
                      <ReasonIcon className={`w-5 h-5 mt-0.5 shrink-0 ${reasonConfig.color}`} />
                      <div>
                        <p className="font-medium">
                          {reason.indicator || reason.name}
                          {reason.signal && (
                            <span className={`ml-2 text-sm ${reasonConfig.color}`}>
                              ({reason.signal})
                            </span>
                          )}
                        </p>
                        {reason.explanation && (
                          <p className="text-sm text-gray-400 mt-1">{reason.explanation}</p>
                        )}
                        {reason.value != null && (
                          <p className="text-sm text-gray-500 mt-1">
                            Value: {typeof reason.value === 'number' ? reason.value.toFixed(2) : reason.value}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Brain className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm text-gray-400">
              This prediction is based on technical indicators only and should not be considered
              financial advice. Always do your own research before making investment decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prediction;
