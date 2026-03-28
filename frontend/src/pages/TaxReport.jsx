import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, getChangeColor, formatDate } from '../utils/helpers';
import { FileText, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const TaxReport = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/tools/tax-report');
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetch();
  }, []);

  const exportCSV = () => {
    if (!data?.transactions?.length) return;
    const lines = ['Symbol,Quantity,Buy Price,Sell Price,Buy Date,Sell Date,Gain/Loss,Term,Holding Days'];
    data.transactions.forEach(t => {
      lines.push(`${t.symbol},${t.quantity},${t.buy_price},${t.sell_price},${t.buy_date || ''},${t.sell_date || ''},${t.gain_loss},${t.term},${t.holding_days}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tax_report.csv'; a.click();
  };

  if (isLoading) return <div className="text-center py-12 text-gray-400 animate-fade-in">Loading tax report...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Report</h1>
          <p className="text-gray-400">Capital gains & losses (FIFO method)</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-success-400" /><span className="text-sm text-gray-400">Total Gains</span></div>
              <p className="text-xl font-bold text-success-400">{formatCurrency(data.total_gains)}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-danger-400" /><span className="text-sm text-gray-400">Total Losses</span></div>
              <p className="text-xl font-bold text-danger-400">{formatCurrency(Math.abs(data.total_losses))}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-primary-400" /><span className="text-sm text-gray-400">Net</span></div>
              <p className={`text-xl font-bold ${getChangeColor(data.net_gain_loss)}`}>{formatCurrency(data.net_gain_loss)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400 mb-2">Short-Term Gains</p>
              <p className="text-xl font-bold text-success-400">{formatCurrency(data.short_term_gains)}</p>
            </div>
            <div className="glass-card p-5">
              <p className="text-sm text-gray-400 mb-2">Long-Term Gains</p>
              <p className="text-xl font-bold text-success-400">{formatCurrency(data.long_term_gains)}</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5"><h2 className="font-semibold">Taxable Events</h2></div>
            {data.transactions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/5">
                      <th className="px-4 py-2">Symbol</th><th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2 text-right">Buy</th><th className="px-4 py-2 text-right">Sell</th>
                      <th className="px-4 py-2 text-right">Gain/Loss</th><th className="px-4 py-2">Term</th>
                      <th className="px-4 py-2 text-right">Days Held</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions.map((t, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2 font-medium">{t.symbol}</td>
                        <td className="px-4 py-2">{t.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(t.buy_price)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(t.sell_price)}</td>
                        <td className={`px-4 py-2 text-right font-medium ${getChangeColor(t.gain_loss)}`}>{t.gain_loss >= 0 ? '+' : ''}{formatCurrency(t.gain_loss)}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs ${t.term === 'long_term' ? 'bg-success-500/20 text-success-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.term === 'long_term' ? 'Long' : 'Short'}</span></td>
                        <td className="px-4 py-2 text-right text-gray-400">{t.holding_days}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No taxable events yet</p>
                <p className="text-sm mt-1">Add sell transactions to generate tax reports</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TaxReport;
