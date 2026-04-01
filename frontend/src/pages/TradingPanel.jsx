import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Zap, Wallet } from "lucide-react";

const TradingPanel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tradingMode, setTradingMode] = useState("paper");
  const [account, setAccount] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [connectMode, setConnectMode] = useState("paper");

  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buySymbol, setBuySymbol] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [buyOrderType, setBuyOrderType] = useState("market");
  const [buyLimitPrice, setBuyLimitPrice] = useState("");
  const [buyStopLoss, setBuyStopLoss] = useState("");

  const [showSellForm, setShowSellForm] = useState(false);
  const [sellSymbol, setSellSymbol] = useState("");
  const [sellQuantity, setSellQuantity] = useState("");
  const [sellOrderType, setSellOrderType] = useState("market");
  const [sellLimitPrice, setSellLimitPrice] = useState("");

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
          checkTradingStatus();
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // Check trading connection status
  const checkTradingStatus = async () => {
    try {
      const response = await fetch("/api/trading/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.is_connected);
        setTradingMode(data.trading_mode);
        if (data.is_connected) {
          fetchAccountInfo();
          fetchPositions();
          fetchOrders();
          fetchStats();
        }
      }
    } catch (err) {
      console.error("Error checking trading status:", err);
    }
  };

  // Fetch account information
  const fetchAccountInfo = async () => {
    try {
      const response = await fetch("/api/trading/account", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAccount(data);
      }
    } catch (err) {
      console.error("Error fetching account:", err);
    }
  };

  // Fetch open positions
  const fetchPositions = async () => {
    try {
      const response = await fetch("/api/trading/positions", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setPositions(data);
      }
    } catch (err) {
      console.error("Error fetching positions:", err);
    }
  };

  // Fetch order history
  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/trading/orders?limit=10", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  // Fetch trading statistics
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/trading/stats", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Connect trading account
  const handleConnectAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/trading/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          api_key: apiKey,
          secret_key: secretKey,
          trading_mode: connectMode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setAccount(data.account);
        setIsConnected(true);
        setTradingMode(connectMode);
        setShowConnectForm(false);
        setApiKey("");
        setSecretKey("");
        // Refresh data
        setTimeout(() => {
          fetchAccountInfo();
          fetchPositions();
          fetchOrders();
          fetchStats();
        }, 1000);
      } else {
        setError(data.detail || "Failed to connect account");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect account
  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect your trading account?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/trading/disconnect", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccess("Account disconnected");
        setIsConnected(false);
        setAccount(null);
        setPositions([]);
        setOrders([]);
        setStats(null);
      } else {
        setError("Failed to disconnect account");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Place buy order
  const handleBuyOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        symbol: buySymbol.toUpperCase(),
        quantity: parseFloat(buyQuantity),
        order_type: buyOrderType,
      };

      if (buyOrderType === "limit" && buyLimitPrice) {
        body.limit_price = parseFloat(buyLimitPrice);
      }

      if (buyStopLoss) {
        body.stop_loss = parseFloat(buyStopLoss);
      }

      const response = await fetch("/api/trading/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowBuyForm(false);
        setBuySymbol("");
        setBuyQuantity("");
        setBuyLimitPrice("");
        setBuyStopLoss("");
        // Refresh data
        setTimeout(() => {
          fetchPositions();
          fetchOrders();
          fetchStats();
          fetchAccountInfo();
        }, 1000);
      } else {
        setError(data.detail || "Failed to place order");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Place sell order
  const handleSellOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        symbol: sellSymbol.toUpperCase(),
        quantity: parseFloat(sellQuantity),
        order_type: sellOrderType,
      };

      if (sellOrderType === "limit" && sellLimitPrice) {
        body.limit_price = parseFloat(sellLimitPrice);
      }

      const response = await fetch("/api/trading/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowSellForm(false);
        setSellSymbol("");
        setSellQuantity("");
        setSellLimitPrice("");
        // Refresh data
        setTimeout(() => {
          fetchPositions();
          fetchOrders();
          fetchStats();
          fetchAccountInfo();
        }, 1000);
      } else {
        setError(data.detail || "Failed to place order");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      fetchAccountInfo();
      fetchPositions();
      fetchOrders();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Alert colors
  const getStatusColor = (status) => {
    switch (status) {
      case "filled":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "partially_filled":
        return "text-blue-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getPnLColor = (pnl) => {
    if (!pnl) return "text-gray-600";
    return pnl > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                <Zap className="text-yellow-400" />
                Live Trading
              </h1>
              <p className="text-slate-400">
                {isConnected
                  ? `Connected to ${tradingMode} trading`
                  : "Connect your Alpaca account to start trading"}
              </p>
            </div>
            <div>
              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-400" size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-600 rounded-lg">
            {success}
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg border border-blue-600">
            <h2 className="text-2xl font-bold mb-4">Connect Your Trading Account</h2>
            <p className="text-slate-300 mb-6">
              Connect your Alpaca account to execute live or paper trades. Your API
              credentials are encrypted and stored securely.
            </p>

            {!showConnectForm ? (
              <button
                onClick={() => setShowConnectForm(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition"
              >
                Connect Alpaca Account
              </button>
            ) : (
              <form onSubmit={handleConnectAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Trading Mode
                  </label>
                  <select
                    value={connectMode}
                    onChange={(e) => setConnectMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="paper">Paper Trading (Simulated)</option>
                    <option value="live">Live Trading (Real Money)</option>
                  </select>
                  {connectMode === "live" && (
                    <div className="mt-2 p-3 bg-red-900/50 border border-red-600 rounded text-sm text-yellow-200">
                      WARNING: Live trading uses real money. Only enable if you're
                      confident in your strategy.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Alpaca API key"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter your Alpaca secret key"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {loading ? "Connecting..." : "Connect"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConnectForm(false)}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Connected State */}
        {isConnected && account && (
          <>
            {/* Account Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-sm">Account Balance</p>
                  <Wallet size={18} className="text-blue-400" />
                </div>
                <p className="text-3xl font-bold">
                  ${account.account_balance.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Buying Power</p>
                <p className="text-3xl font-bold">
                  ${account.buying_power.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div
                className={`bg-slate-700/50 border rounded-lg p-4 ${
                  account.day_pnl >= 0 ? "border-green-600" : "border-red-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-sm">Day P&L</p>
                  {account.day_pnl >= 0 ? (
                    <TrendingUp size={18} className="text-green-400" />
                  ) : (
                    <TrendingDown size={18} className="text-red-400" />
                  )}
                </div>
                <p className={`text-3xl font-bold ${getPnLColor(account.day_pnl)}`}>
                  ${account.day_pnl.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className={`text-sm ${getPnLColor(account.day_pnl)}`}>
                  {account.day_pnl_percent.toFixed(2)}%
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Trading Mode</p>
                <p className="text-3xl font-bold capitalize">
                  <span
                    className={
                      tradingMode === "live"
                        ? "text-red-400"
                        : "text-blue-400"
                    }
                  >
                    {tradingMode}
                  </span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              {!showBuyForm && (
                <button
                  onClick={() => setShowBuyForm(true)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <TrendingUp size={20} /> Buy Stock
                </button>
              )}
              {!showSellForm && (
                <button
                  onClick={() => setShowSellForm(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <TrendingDown size={20} /> Sell Stock
                </button>
              )}
            </div>

            {/* Buy Form */}
            {showBuyForm && (
              <div className="mb-8 p-6 bg-slate-700/50 border border-green-600 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Place Buy Order</h3>
                <form onSubmit={handleBuyOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={buySymbol}
                        onChange={(e) => setBuySymbol(e.target.value)}
                        placeholder="AAPL"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(e.target.value)}
                        placeholder="100"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Order Type
                      </label>
                      <select
                        value={buyOrderType}
                        onChange={(e) => setBuyOrderType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                      </select>
                    </div>

                    {buyOrderType === "limit" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Limit Price
                        </label>
                        <input
                          type="number"
                          value={buyLimitPrice}
                          onChange={(e) => setBuyLimitPrice(e.target.value)}
                          placeholder="150.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Stop Loss (Optional)
                      </label>
                      <input
                        type="number"
                        value={buyStopLoss}
                        onChange={(e) => setBuyStopLoss(e.target.value)}
                        placeholder="145.00"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {loading ? "Placing Order..." : "Place Buy Order"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBuyForm(false)}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sell Form */}
            {showSellForm && (
              <div className="mb-8 p-6 bg-slate-700/50 border border-red-600 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Place Sell Order</h3>
                <form onSubmit={handleSellOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Symbol
                      </label>
                      <input
                        type="text"
                        value={sellSymbol}
                        onChange={(e) => setSellSymbol(e.target.value)}
                        placeholder="AAPL"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(e.target.value)}
                        placeholder="100"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Order Type
                      </label>
                      <select
                        value={sellOrderType}
                        onChange={(e) => setSellOrderType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                      </select>
                    </div>

                    {sellOrderType === "limit" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Limit Price
                        </label>
                        <input
                          type="number"
                          value={sellLimitPrice}
                          onChange={(e) => setSellLimitPrice(e.target.value)}
                          placeholder="160.00"
                          step="0.01"
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition disabled:opacity-50"
                    >
                      {loading ? "Placing Order..." : "Place Sell Order"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSellForm(false)}
                      className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Win Rate</p>
                  <p className="text-3xl font-bold text-green-400">
                    {stats.win_rate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    {stats.winning_trades}/{stats.total_trades} trades
                  </p>
                </div>

                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Total P&L</p>
                  <p className={`text-3xl font-bold ${getPnLColor(stats.total_pnl)}`}>
                    ${stats.total_pnl.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">Best Trade</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${stats.best_trade.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Open Positions */}
            {positions && positions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Open Positions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-3 px-4">Symbol</th>
                        <th className="text-right py-3 px-4">Quantity</th>
                        <th className="text-right py-3 px-4">Entry Price</th>
                        <th className="text-right py-3 px-4">Current Price</th>
                        <th className="text-right py-3 px-4">P&L</th>
                        <th className="text-right py-3 px-4">P&L %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => (
                        <tr
                          key={pos.symbol}
                          className="border-b border-slate-700 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 font-semibold">{pos.symbol}</td>
                          <td className="text-right py-3 px-4">
                            {pos.quantity.toLocaleString("en-US", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-4">
                            ${pos.entry_price.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            ${pos.current_price.toFixed(2)}
                          </td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${getPnLColor(
                              pos.unrealized_pl
                            )}`}
                          >
                            ${pos.unrealized_pl.toFixed(2)}
                          </td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${getPnLColor(
                              pos.unrealized_pl
                            )}`}
                          >
                            {pos.unrealized_pl_pct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Order History */}
            {orders && orders.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Recent Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-left py-3 px-4">Symbol</th>
                        <th className="text-left py-3 px-4">Side</th>
                        <th className="text-right py-3 px-4">Quantity</th>
                        <th className="text-right py-3 px-4">Price</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-right py-3 px-4">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-slate-700 hover:bg-slate-700/30"
                        >
                          <td className="py-3 px-4 font-semibold">{order.symbol}</td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                order.side === "buy"
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {order.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4">
                            {order.quantity.toLocaleString("en-US", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-4">
                            ${order.price.toFixed(2)}
                          </td>
                          <td className={`text-center py-3 px-4 capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${getPnLColor(
                              order.pnl
                            )}`}
                          >
                            {order.pnl ? `$${order.pnl.toFixed(2)}` : "---"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk Warning */}
            <div className="mt-8 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-yellow-400 mt-1 flex-shrink-0" />
              <div className="text-sm text-yellow-100">
                <strong>Risk Warning:</strong> Trading involves risk. Start with paper trading to test your
                strategy. Use stop losses to limit losses. Only enable live trading when confident in your
                strategy.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TradingPanel;
