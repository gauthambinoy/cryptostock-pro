import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { Trophy, Medal, Crown, RefreshCw } from 'lucide-react';

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
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/leaderboard');
      setLeaderboard(res.data || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = topThree.length >= 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree;
  const podiumStyleOrder = topThree.length >= 3
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
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-gray-400">Top performers by portfolio returns</p>
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

      {/* Podium */}
      {topThree.length > 0 && (
        <div className="glass-card p-8">
          <div className="flex items-end justify-center gap-4 md:gap-8">
            {podiumOrder.map((entry, idx) => {
              const style = podiumStyleOrder[idx];
              if (!entry || !style) return null;
              const PodiumIcon = style.icon;
              return (
                <div
                  key={entry.username || idx}
                  className="flex flex-col items-center"
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
                      isCurrentUser(entry) ? 'text-primary-400' : 'text-white'
                    }`}
                  >
                    {entry.username}
                    {isCurrentUser(entry) && (
                      <span className="text-primary-400 text-xs ml-1">(You)</span>
                    )}
                  </p>

                  {/* Return */}
                  <p className={`text-sm font-bold mt-1 ${
                    (entry.total_return_percent || 0) >= 0 ? 'text-success-400' : 'text-danger-400'
                  }`}>
                    {formatPercent(entry.total_return_percent || 0)}
                  </p>

                  {/* Value */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatCurrency(entry.portfolio_value || 0)}
                  </p>

                  {/* Podium bar */}
                  <div
                    className={`w-20 md:w-28 ${style.height} mt-3 rounded-t-xl bg-gradient-to-t ${style.gradient} opacity-20 flex items-center justify-center`}
                  >
                    <span className={`text-2xl font-black ${style.text} opacity-100`}>
                      {style.label}
                    </span>
                  </div>
                </div>
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
                <th className="px-6 py-4 font-medium text-right">Total Return</th>
                <th className="px-6 py-4 font-medium text-right">Portfolio Value</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isCurrent = isCurrentUser(entry);
                return (
                  <tr
                    key={entry.username || index}
                    className={`border-b border-white/5 transition-colors ${
                      isCurrent
                        ? 'bg-primary-500/10 hover:bg-primary-500/15'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          rank === 1
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : rank === 2
                            ? 'bg-gray-400/20 text-gray-300'
                            : rank === 3
                            ? 'bg-orange-600/20 text-orange-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            rank <= 3
                              ? `bg-gradient-to-br ${podiumStyles[rank - 1]?.gradient || 'from-gray-500 to-gray-600'}`
                              : 'bg-gradient-to-br from-dark-300 to-dark-400'
                          }`}
                        >
                          {(entry.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-semibold ${isCurrent ? 'text-primary-400' : ''}`}>
                            {entry.username}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-primary-400">You</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          (entry.total_return_percent || 0) >= 0
                            ? 'text-success-400'
                            : 'text-danger-400'
                        }`}
                      >
                        {formatPercent(entry.total_return_percent || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {formatCurrency(entry.portfolio_value || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="p-12 text-center">
            <Trophy
              className={`w-8 h-8 text-gray-600 mx-auto mb-4 ${isLoading ? 'animate-pulse' : ''}`}
            />
            <p className="text-gray-400">
              {isLoading ? 'Loading leaderboard...' : 'No leaderboard data available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
