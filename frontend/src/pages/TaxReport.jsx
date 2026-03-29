import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate, getChangeColor } from '../utils/helpers';
import { FileText, Download, DollarSign } from 'lucide-react';

const TaxReport = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTaxReport();
  }, []);

  const fetchTaxReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/tools/tax-report');
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch tax report');
    } finally {
      setIsLoading(false);
    }
  };

  const summary = React.useMemo(() => {
    if (!reportData) return null;
    const s = reportData.summary || reportData;
    return {
      totalGains: s.total_gains ?? 0,
      totalLosses: s.total_losses ?? 0,
      netGainLoss: s.net_gain_loss ?? s.net ?? (s.total_gains ?? 0) + (s.total_losses ?? 0),
      shortTermGains: s.short_term_gains ?? s.short_term ?? 0,
      longTermGains: s.long_term_gains ?? s.long_term ?? 0,
    };
  }, [reportData]);

  const events = React.useMemo(() => {
    if (!reportData) return [];
    return reportData.events || reportData.taxable_events || reportData.transactions || [];
  }, [reportData]);

  const exportCSV = () => {
    if (!events.length) return;

    const headers = [
      'Date',
      'Symbol',
      'Type',
      'Quantity',
      'Buy Price',
      'Sell Price',
      'Gain/Loss',
      'Holding Period',
      'Term',
      'Holding Days',
    ];
    const rows = events.map((e) => [
      e.date || e.sell_date || '',
      e.symbol || '',
      e.type || 'Sell',
      e.quantity ?? '',
      e.buy_price ?? e.price ?? '',
      e.sell_price ?? '',
      e.gain_loss ?? e.gain ?? e.pnl ?? '',
      e.holding_period ?? '',
      e.term ?? '',
      e.holding_days ?? '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tax_report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-400" />
            Tax Report
          </h1>
          <p className="text-gray-400">Capital gains and taxable events</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!events.length}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="glass-card p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-danger-400 text-lg">{error}</p>
          <button onClick={fetchTaxReport} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && reportData && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-success-400" />
                  <p className="text-sm text-gray-400">Total Gains</p>
                </div>
                <p className="text-xl font-bold text-success-400">
                  {formatCurrency(summary.totalGains)}
                </p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-danger-400" />
                  <p className="text-sm text-gray-400">Total Losses</p>
                </div>
                <p className="text-xl font-bold text-danger-400">
                  {formatCurrency(Math.abs(summary.totalLosses))}
                </p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary-400" />
                  <p className="text-sm text-gray-400">Net Gain/Loss</p>
                </div>
                <p className={`text-xl font-bold ${getChangeColor(summary.netGainLoss)}`}>
                  {formatCurrency(summary.netGainLoss)}
                </p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <p className="text-sm text-gray-400">Short-term Gains</p>
                </div>
                <p className="text-xl font-bold text-orange-400">
                  {formatCurrency(summary.shortTermGains)}
                </p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <p className="text-sm text-gray-400">Long-term Gains</p>
                </div>
                <p className="text-xl font-bold text-blue-400">
                  {formatCurrency(summary.longTermGains)}
                </p>
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-dark-300">
              <h2 className="text-lg font-semibold">Taxable Events</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-300">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                      Gain/Loss
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Holding Period
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No taxable events found.</p>
                        <p className="text-sm mt-1">
                          Add sell transactions to generate tax reports.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    events.map((event, idx) => {
                      const gainLoss = event.gain_loss ?? event.gain ?? event.pnl ?? 0;
                      const eventType = event.type || 'Sell';
                      const isBuy = eventType.toLowerCase() === 'buy';
                      const holdingLabel =
                        event.holding_period ||
                        event.term ||
                        (event.holding_days
                          ? `${event.holding_days}d`
                          : '-');

                      return (
                        <tr
                          key={idx}
                          className="border-b border-dark-300/50 hover:bg-dark-300/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {formatDate(event.date || event.sell_date)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            {event.symbol}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                isBuy
                                  ? 'bg-success-500/20 text-success-400'
                                  : 'bg-danger-500/20 text-danger-400'
                              }`}
                            >
                              {eventType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {event.quantity ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {formatCurrency(event.sell_price ?? event.price)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right text-sm font-medium ${getChangeColor(
                              gainLoss
                            )}`}
                          >
                            {gainLoss >= 0 ? '+' : ''}
                            {formatCurrency(gainLoss)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                (event.term || '').includes('long')
                                  ? 'bg-success-500/20 text-success-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {holdingLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TaxReport;
