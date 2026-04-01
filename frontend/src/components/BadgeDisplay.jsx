import React, { useState } from 'react';
import { Award, Trophy, Zap, Target, TrendingUp } from 'lucide-react';

const rarityColors = {
  common: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/30',
    text: 'text-gray-300',
    glow: 'shadow-lg shadow-gray-500/20',
  },
  uncommon: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    text: 'text-green-300',
    glow: 'shadow-lg shadow-green-500/20',
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    glow: 'shadow-lg shadow-blue-500/20',
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    glow: 'shadow-lg shadow-purple-500/20',
  },
  legendary: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    glow: 'shadow-lg shadow-yellow-500/20',
  },
};

const badgeIcons = {
  'Top 1% Accuracy': Trophy,
  'Top 10% Accuracy': Award,
  '90% Accuracy Achieved': TrendingUp,
  'Winning Streak': Zap,
  'Prolific Trader': Target,
};

const BadgeDisplay = ({ badge }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = rarityColors[badge.rarity || 'common'];
  const IconComponent = badgeIcons[badge.name] || Award;

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-full aspect-square rounded-lg border-2 ${colors.bg} ${colors.border} ${colors.glow} flex items-center justify-center p-2 transition-transform hover:scale-105`}
      >
        <IconComponent className={`w-8 h-8 ${colors.text}`} />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 left-1/2 bottom-full mb-2 transform -translate-x-1/2 w-48 bg-dark-800 rounded-lg border border-white/10 p-3 shadow-xl">
          <p className={`font-bold text-sm mb-1 ${colors.text}`}>
            {badge.name}
          </p>
          <p className="text-xs text-gray-400 mb-2">
            {badge.description}
          </p>
          <p className={`text-xs font-medium ${colors.text}`}>
            {badge.rarity?.charAt(0).toUpperCase() +
              badge.rarity?.slice(1) || 'Common'}
          </p>
          {badge.earned_at && (
            <p className="text-xs text-gray-500 mt-2">
              Earned:{' '}
              {new Date(badge.earned_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;
