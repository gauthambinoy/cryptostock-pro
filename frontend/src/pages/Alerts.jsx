import React, { useEffect, useState } from 'react';
import { useAlertsStore } from '../utils/store';
import { formatCurrency, formatDateTime, getChangeColor } from '../utils/helpers';
import { 
  Bell, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  Clock,
  X,
  Search
} from 'lucide-react';
import { marketAPI } from '../utils/api';

const Alerts = () => {
  const { alerts, fetchAlerts, createAlert, deleteAlert, isLoading } = useAlertsStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDeleteAlert = async (alertId) => {
    if (confirm('Delete this alert?')) {
      await deleteAlert(alertId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Price Alerts</h1>
            <p className="text-gray-400">Get notified when prices hit your targets</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Alerts List */}
      <div className="glass-card overflow-hidden">
        {alerts.length > 0 ? (
          <div className="divide-y divide-white/5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 hover:bg-white/5 transition-colors ${
                  alert.is_triggered ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold
                      ${alert.asset_type === 'crypto'
                        ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
                        : 'bg-gradient-to-br from-primary-500 to-blue-500'
                      }`}
                    >
                      {alert.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{alert.symbol}</p>
                        {alert.is_triggered && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-success-500/20 text-success-400 rounded text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Triggered
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {alert.alert_type === 'price_above' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-success-400" />
                            <span>Alert when price goes above</span>
                          </>
                        )}
                        {alert.alert_type === 'price_below' && (
                          <>
                            <TrendingDown className="w-4 h-4 text-danger-400" />
                            <span>Alert when price goes below</span>
                          </>
                        )}
                        <span className="font-medium text-white">{formatCurrency(alert.target_value)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-danger-400 hover:bg-danger-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Alert Details Row */}
                <div className="ml-16 flex items-center gap-6 text-sm text-gray-400">
                  <div>
                    <p className="text-xs text-gray-500">Current Price</p>
                    <p className="text-white font-medium">{alert.current_price ? formatCurrency(alert.current_price) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-white">{formatDateTime(alert.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.notify_email && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">📧 Email</span>
                    )}
                    {alert.notify_sms && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">📱 SMS</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Frequency</p>
                    <p className="text-white capitalize">{alert.frequency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
            <p className="text-gray-400 mb-4">Create your first price alert to get notified</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Alert
            </button>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showModal && (
        <CreateAlertModal
          onClose={() => setShowModal(false)}
          onCreate={async (data) => {
            const success = await createAlert(data);
            if (success) setShowModal(false);
            return success;
          }}
        />
      )}
    </div>
  );
};

// Create Alert Modal Component
const CreateAlertModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    asset_type: 'stock',
    alert_type: 'price_above',
    target_value: '',
    notify_email: true,
    notify_sms: false,
    frequency: 'immediately'
  });
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCurrentPrice = async () => {
    if (!formData.symbol) return;
    
    try {
      let response;
      if (formData.asset_type === 'crypto') {
        response = await marketAPI.getCryptoQuote(formData.symbol);
      } else {
        response = await marketAPI.getStockQuote(formData.symbol);
      }
      setCurrentPrice(response.data.price);
    } catch (err) {
      setCurrentPrice(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCurrentPrice, 500);
    return () => clearTimeout(timer);
  }, [formData.symbol, formData.asset_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.symbol || !formData.target_value) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await onCreate({
        ...formData,
        target_value: parseFloat(formData.target_value)
      });
      
      if (!success) {
        setError('Failed to create alert');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Create Price Alert</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset Type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, asset_type: 'stock' })}
              className={`flex-1 py-3 rounded-xl border transition-all ${
                formData.asset_type === 'stock'
                  ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              Stock
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, asset_type: 'crypto' })}
              className={`flex-1 py-3 rounded-xl border transition-all ${
                formData.asset_type === 'crypto'
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              Crypto
            </button>
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., AAPL or BTC"
              className="input-field"
            />
            {currentPrice && (
              <p className="text-sm text-gray-400 mt-2">
                Current price: <span className="text-white font-medium">{formatCurrency(currentPrice)}</span>
              </p>
            )}
          </div>

          {/* Alert Type */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Alert When</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, alert_type: 'price_above' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  formData.alert_type === 'price_above'
                    ? 'bg-success-500/20 border-success-500 text-success-400'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Above
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, alert_type: 'price_below' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                  formData.alert_type === 'price_below'
                    ? 'bg-danger-500/20 border-danger-500 text-danger-400'
                    : 'border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Below
              </button>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Target Price (USD)</label>
            <input
              type="number"
              step="any"
              value={formData.target_value}
              onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
              placeholder="0.00"
              className="input-field"
            />
          </div>

          {/* Notification Settings */}
          <div className="border-t border-white/10 pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">Notifications</h3>

            {/* Email Notification */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notify_email"
                checked={formData.notify_email}
                onChange={(e) => setFormData({ ...formData, notify_email: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-primary-500 cursor-pointer"
              />
              <label htmlFor="notify_email" className="text-sm text-gray-400 cursor-pointer flex-1">
                Email notifications
              </label>
            </div>

            {/* SMS Notification */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notify_sms"
                checked={formData.notify_sms}
                onChange={(e) => setFormData({ ...formData, notify_sms: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 text-primary-500 cursor-pointer"
                title="SMS alerts available for premium users"
              />
              <label htmlFor="notify_sms" className="text-sm text-gray-400 cursor-pointer flex-1">
                SMS alerts (Premium)
              </label>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
              >
                <option value="immediately">Immediately</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-danger-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Alerts;
