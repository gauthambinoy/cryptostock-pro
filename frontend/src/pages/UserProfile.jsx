import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import { formatCurrency, formatPercent } from '../utils/helpers';
import {
  ArrowLeft,
  Award,
  TrendingUp,
  Users,
  Copy,
  Heart,
  Loader,
} from 'lucide-react';
import BadgeDisplay from '../components/BadgeDisplay';

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/leaderboard/${userId}`);
      setProfile(res.data);
      setIsFollowing(res.data.is_following);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const res = await api.post(`/leaderboard/${userId}/follow`);
      setIsFollowing(true);
      setSuccessMessage('Now following user!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const res = await api.delete(`/leaderboard/${userId}/follow`);
      setIsFollowing(false);
      setSuccessMessage('Unfollowed user');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const handleCopyAlerts = async () => {
    if (!isFollowing) {
      setSuccessMessage('You must follow this user first');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setIsCopying(true);
    try {
      const res = await api.post(`/leaderboard/${userId}/copy-alerts`);
      setSuccessMessage(
        `Copied ${res.data.copied_alerts} alerts from this user!`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy alerts:', error);
      setSuccessMessage('Failed to copy alerts');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">User not found</h2>
        <button
          onClick={() => navigate('/leaderboard')}
          className="btn btn-primary"
        >
          Back to Leaderboard
        </button>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.user_id;
  const stats = profile.stats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/leaderboard')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">User Profile</h1>
      </div>

      {successMessage && (
        <div className="glass-card p-4 bg-success-500/20 border border-success-500/30">
          <p className="text-success-400">{successMessage}</p>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-4xl font-bold">
            {(profile.username || '?')[0].toUpperCase()}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div>
              <h2 className="text-3xl font-bold mb-2">{profile.username}</h2>
              {profile.full_name && (
                <p className="text-gray-400 mb-4">{profile.full_name}</p>
              )}
            </div>

            {/* Follow/Unfollow Buttons */}
            {!isOwnProfile && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() =>
                    isFollowing ? handleUnfollow() : handleFollow()
                  }
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                    isFollowing
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={handleCopyAlerts}
                  disabled={isCopying || !isFollowing}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-success-500 text-white hover:bg-success-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Copy className="w-4 h-4" />
                  {isCopying ? 'Copying...' : 'Copy Alerts'}
                </button>
              </div>
            )}
          </div>

          {/* Followers */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-2xl font-bold">
                {profile.followers_count}
              </span>
            </div>
            <p className="text-sm text-gray-400">Followers</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Accuracy */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Prediction Accuracy</p>
              <p className="text-4xl font-bold text-success-400">
                {stats.accuracy_percentage?.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-success-400 opacity-20" />
          </div>
          <p className="text-xs text-gray-500">
            {stats.total_predictions} predictions
          </p>
        </div>

        {/* Win Rate */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Win Rate</p>
              <p className="text-4xl font-bold text-primary-400">
                {stats.win_rate?.toFixed(1)}%
              </p>
            </div>
            <Award className="w-6 h-6 text-primary-400 opacity-20" />
          </div>
          <p className="text-xs text-gray-500">
            {stats.correct_predictions} out of {stats.total_predictions}
          </p>
        </div>

        {/* Best Trade */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Best Trade Return</p>
              <p className="text-4xl font-bold text-success-400">
                {stats.best_trade_return?.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-success-400 opacity-20" />
          </div>
          <p className="text-xs text-gray-500">Single trade performance</p>
        </div>

        {/* Total Trades */}
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Trades</p>
              <p className="text-4xl font-bold">
                {stats.total_trades || 0}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Completed trades</p>
        </div>

        {/* Member Since */}
        <div className="glass-card p-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">Member Since</p>
            <p className="text-lg font-bold">
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-4">Profile created</p>
        </div>
      </div>

      {/* Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-400" />
            Earned Badges
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {profile.badges.map((badge) => (
              <BadgeDisplay key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {(!profile.badges || profile.badges.length === 0) && (
        <div className="glass-card p-8 text-center">
          <Award className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No badges earned yet</p>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
