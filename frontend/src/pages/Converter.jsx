import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import { ArrowLeftRight, RefreshCw, DollarSign } from 'lucide-react';

const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'CHF'];

const Converter = () => {
  const [activeTab, setActiveTab] = useState('fiat');

  // Fiat state
  const [fiatFrom, setFiatFrom] = useState('USD');
  const [fiatTo, setFiatTo] = useState('EUR');
  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatResult, setFiatResult] = useState(null);
  const [fiatLoading, setFiatLoading] = useState(false);

  // Crypto state
  const [cryptoFrom, setCryptoFrom] = useState('BTC');
  const [cryptoTo, setCryptoTo] = useState('USD');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoResult, setCryptoResult] = useState(null);
  const [cryptoLoading, setCryptoLoading] = useState(false);

  // Rates table
  const [rates, setRates] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const res = await api.get('/converter/rates');
      setRates(res.data);
    } catch (error) {
      console.error('Failed to fetch rates:', error);
    } finally {
      setRatesLoading(false);
    }
  };

  const convertFiat = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) return;
    setFiatLoading(true);
    setFiatResult(null);
    try {
      const res = await api.get(
        `/converter/fiat?from=${fiatFrom}&to=${fiatTo}&amount=${fiatAmount}`
      );
      setFiatResult(res.data);
    } catch (error) {
      console.error('Fiat conversion failed:', error);
    } finally {
      setFiatLoading(false);
    }
  };

  const convertCrypto = async () => {
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) return;
    setCryptoLoading(true);
    setCryptoResult(null);
    try {
      const res = await api.get(
        `/converter/crypto?from=${cryptoFrom}&to=${cryptoTo}&amount=${cryptoAmount}`
      );
      setCryptoResult(res.data);
    } catch (error) {
      console.error('Crypto conversion failed:', error);
    } finally {
      setCryptoLoading(false);
    }
  };

  const swapFiat = () => {
    setFiatFrom(fiatTo);
    setFiatTo(fiatFrom);
    setFiatResult(null);
  };

  const swapCrypto = () => {
    const temp = cryptoFrom;
    setCryptoFrom(cryptoTo);
    setCryptoTo(temp);
    setCryptoResult(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Currency Converter</h1>
          <p className="text-gray-400">Convert between fiat and crypto currencies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('fiat')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'fiat'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          Fiat
        </button>
        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'crypto'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          Crypto
        </button>
      </div>

      {/* Fiat Converter */}
      {activeTab === 'fiat' && (
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Fiat Currency Converter</h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            {/* From */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">From</label>
              <select
                value={fiatFrom}
                onChange={(e) => setFiatFrom(e.target.value)}
                className="input-field w-full"
              >
                {FIAT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={fiatAmount}
                onChange={(e) => setFiatAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && convertFiat()}
                className="input-field w-full"
                min="0"
                step="any"
              />
            </div>

            {/* Swap */}
            <button
              onClick={swapFiat}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all self-center"
            >
              <ArrowLeftRight className="w-5 h-5 text-primary-400" />
            </button>

            {/* To */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">To</label>
              <select
                value={fiatTo}
                onChange={(e) => setFiatTo(e.target.value)}
                className="input-field w-full"
              >
                {FIAT_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Result display */}
              <div className="input-field w-full flex items-center min-h-[42px] bg-white/5">
                {fiatResult != null ? (
                  <span className="text-white font-semibold">
                    {typeof fiatResult === 'object'
                      ? fiatResult.result?.toFixed(2) ?? fiatResult.converted?.toFixed(2) ?? '-'
                      : parseFloat(fiatResult).toFixed(2)}{' '}
                    {fiatTo}
                  </span>
                ) : (
                  <span className="text-gray-500">Result</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={convertFiat}
            disabled={fiatLoading || !fiatAmount}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${fiatLoading ? 'animate-spin' : ''}`} />
            {fiatLoading ? 'Converting...' : 'Convert'}
          </button>

          {fiatResult && typeof fiatResult === 'object' && fiatResult.rate && (
            <p className="text-sm text-gray-400">
              Exchange rate: 1 {fiatFrom} = {fiatResult.rate.toFixed(4)} {fiatTo}
            </p>
          )}
        </div>
      )}

      {/* Crypto Converter */}
      {activeTab === 'crypto' && (
        <div className="glass-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">Crypto Converter</h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            {/* From */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">From (Symbol)</label>
              <input
                type="text"
                placeholder="e.g. BTC, ETH"
                value={cryptoFrom}
                onChange={(e) => setCryptoFrom(e.target.value.toUpperCase())}
                className="input-field w-full"
              />
              <input
                type="number"
                placeholder="Amount"
                value={cryptoAmount}
                onChange={(e) => setCryptoAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && convertCrypto()}
                className="input-field w-full"
                min="0"
                step="any"
              />
            </div>

            {/* Swap */}
            <button
              onClick={swapCrypto}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all self-center"
            >
              <ArrowLeftRight className="w-5 h-5 text-orange-400" />
            </button>

            {/* To */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">To (Symbol / Currency)</label>
              <input
                type="text"
                placeholder="e.g. USD, ETH"
                value={cryptoTo}
                onChange={(e) => setCryptoTo(e.target.value.toUpperCase())}
                className="input-field w-full"
              />
              {/* Result display */}
              <div className="input-field w-full flex items-center min-h-[42px] bg-white/5">
                {cryptoResult != null ? (
                  <span className="text-white font-semibold">
                    {typeof cryptoResult === 'object'
                      ? cryptoResult.result?.toFixed(6) ?? cryptoResult.converted?.toFixed(6) ?? '-'
                      : parseFloat(cryptoResult).toFixed(6)}{' '}
                    {cryptoTo}
                  </span>
                ) : (
                  <span className="text-gray-500">Result</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={convertCrypto}
            disabled={cryptoLoading || !cryptoAmount || !cryptoFrom.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${cryptoLoading ? 'animate-spin' : ''}`} />
            {cryptoLoading ? 'Converting...' : 'Convert'}
          </button>

          {cryptoResult && typeof cryptoResult === 'object' && cryptoResult.rate && (
            <p className="text-sm text-gray-400">
              Exchange rate: 1 {cryptoFrom} = {cryptoResult.rate.toFixed(6)} {cryptoTo}
            </p>
          )}
        </div>
      )}

      {/* Exchange Rates Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-400" />
              Exchange Rates
            </h3>
            <button
              onClick={fetchRates}
              disabled={ratesLoading}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${ratesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {rates && typeof rates === 'object' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="px-6 py-4 font-medium">Currency</th>
                  <th className="px-6 py-4 font-medium text-right">Rate (vs USD)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rates.rates || rates).map(([currency, rate]) => (
                  <tr
                    key={currency}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium">{currency}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300">
                      {typeof rate === 'number' ? rate.toFixed(4) : rate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <RefreshCw className={`w-8 h-8 text-gray-600 mx-auto mb-4 ${ratesLoading ? 'animate-spin' : ''}`} />
            <p className="text-gray-400">
              {ratesLoading ? 'Loading exchange rates...' : 'No rate data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Converter;
