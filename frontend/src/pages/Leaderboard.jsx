import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import { formatCurrency, formatPercent } from '../utils/helpers';
import {
  Trophy,
  Medal,
  Crown,
  RefreshCw,
  Search,
  Filter,
  User,
} from 'lucide-react';

const podiumStyles = [
  {
    rank: 1,
    gradient: 'from-yellow-500 to-amber-500',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    icon: Crown,
    label: '1st',
    height: 'h-40',
  },
  {
    rank: 2,
    gradient: 'from-gray-300 to-gray-400',
    bg: 'bg-gray-400/20',
    border: 'border-gray-400/30',
    text: 'text-gray-300',
    icon: Medal,
    label: '2nd',
    height: 'h-32',
  },
  {
    rank: 3,
    gradient: 'from-orange-600 to-orange-500',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    icon: Medal,
    label: '3rd',
    height: 'h-24',
  },
];

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchMyRank();
  }, [period]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leaderboard/', {
        params: { period, limit: 100 },
      });
      setLeaderboard(res.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyRank = async () => {
    try {
      const res = await api.get('/leaderboard/my-rank', {
        params: { period },
      });
      setMyRank(res.data);
    } catch (error) {
      console.error('Failed to fetch user rank:', error);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/leaderboard/${userId}`);
  };

  const filtered = leaderboard.filter((entry) =>
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = filtered.slice(0, 3);
  const podiumOrder =
    topThree.length >= 3
      ? [topThree[1], topThree[0], topThree[2]]
      : topThree;
  const podiumStyleOrder =
    topThree.length >= 3
      ? [podiumStyles[1], podiumStyles[0], podiumStyles[2]]
      : podiumStyles.slice(0, topThree.length);

  const isCurrentUser = (entry) => {
    if (!user) return false;
    return entry.user_id === user.id || entry.username === user.username;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Community Leaderboard</h1>
            <p className="text-gray-400">Ranked by prediction accuracy</p>
          </div>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* My Rank Card */}
      {myRank && (
        <div className="glass-card p-6 bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-500/30 flex items-center justify-center">
                <User className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Your Rank</p>
                <p className="text-2xl font-bold text-white">
                  #{myRank.rank || '-'}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <p className="text-sm text-gray-400">Accuracy</p>
                <p className="text-xl font-bold text-success-400">
                  {myRank.accuracy_percentage?.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Filter & Search */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {['monthly', 'yearly', 'all_time'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                period === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {p === 'all_time' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Podium */}
      {topThree.length > 0 && (
        <div className="glass-card p-8">
          <div className="flex items-end justify-center gap-4 md:gap-8">
            {podiumOrder.map((entry, idx) => {
              const style = podiumStyleOrder[idx];
              if (!entry || !style) return null;
              const PodiumIcon = style.icon;
              return (
                <button
                  key={entry.user_id || idx}
                  onClick={() => handleViewProfile(entry.user_id)}
                  className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {/* Avatar & Badge */}
                  <div className="relative mb-3">
                    <div
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white font-bold text-xl md:text-2xl`}
                    >
                      {(entry.username || '?')[0].toUpperCase()}
                    </div>
                    <div
                      className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}
                    >
                      <PodiumIcon className={`w-4 h-4 ${style.text}`} />
                    </div>
                  </div>

                  {/* Name */}
                  <p
                    className={`font-semibold text-sm md:text-base ${
                      isCurrentUser(entry)
                        ? 'text-primary-400'
                        : 'text-white'
                    }`}
                  >
                    {entry.username}
                    {isCurrentUser(entry) && (
                      <span className="text-primary-400 text-xs ml-1">(You)</span>
                    )}
                  </p>

                  {/* Accuracy */}
                  <p className="text-sm font-bold mt-1 text-success-400">
                    {entry.accuracy_percentage?.toFixed(1)}%
                  </p>

                  {/* Win Rate */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {entry.win_rate?.toFixed(1)}% Win Rate
                  </p>

                  {/* Podium bar */}
                  <div
                    className={`w-20 md:w-28 ${style.height} mt-3 rounded-t-xl bg-gradient-to-t ${style.gradient} opacity-20 flex items-center justify-center`}
                  >
                    <span
                      className={`text-2xl font-black ${style.text} opacity-100`}
                    >
                      {style.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                <th className="px-6 py-4 font-medium">Rank</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium text-right">Accuracy</th>
                <th className="px-6 py-4 font-medium text-right">Trades</th>
                <th className="px-6 py-4 font-medium text-right">Win Rate</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, index) => {
                const isCurrent = isCurrentUser(entry);
                return (
                  <tr
                    key={entry.user_id || index}
                    className={`border-b border-white/5 transition-colors ${
                      isCurrent
                        ? 'bg-primary-500/10 hover:bg-primary-500/15'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          entry.rank === 1
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : entry.rank === 2
                            ? 'bg-gray-400/20 text-gray-300'
                            : entry.rank === 3
                            ? 'bg-orange-600/20 text-orange-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            entry.rank <= 3
                              ? `bg-gradient-to-br ${
                                  podiumStyles[entry.rank - 1]?.gradient ||
                                  'from-gray-500 to-gray-600'
                                }`
                              : 'bg-gradient-to-br from-dark-300 to-dark-400'
                          }`}
                        >
                          {(entry.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-semibold ${
                            isCurrent ? 'text-primary-400' : ''
                          }`}>
                            {entry.username}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-primary-400">You</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-success-400">
                        {entry.accuracy_percentage?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-gray-300">
                        {entry.total_trades || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium">
                        {entry.win_rate?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isCurrent && (
                        <button
                          onClick={() => handleViewProfile(entry.user_id)}
                          className="btn-sm btn-primary"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Trophy
              className={`w-8 h-8 text-gray-600 mx-auto mb-4 ${
                isLoading ? 'animate-pulse' : ''
              }`}
            />
            <p className="text-gray-400">
              {isLoading
                ? 'Loading leaderboard...'
                : 'No leaderboard data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
