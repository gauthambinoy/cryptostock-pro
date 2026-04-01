import React from 'react';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ 
  title, 
  value, 
  change, 
  changePercent, 
  icon: Icon,
  isCurrency = true,
  prefix = '',
  suffix = ''
}) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className="glass-card p-6 animate-fade-in dark:bg-white/5 dark:border-white/10 bg-gray-100/50 dark:text-white text-gray-900 border-gray-200/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold dark:text-white text-gray-900">
            {prefix}
            {isCurrency ? formatCurrency(value) : value}
            {suffix}
          </p>
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-primary-500/20">
            <Icon className="w-6 h-6 text-primary-400" />
          </div>
        )}
      </div>
      
      {(change !== undefined || changePercent !== undefined) && (
        <div className="flex items-center gap-2 mt-4">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
            isPositive ? 'bg-success-500/20' : 'bg-danger-500/20'
          }`}>
            <TrendIcon className={`w-4 h-4 ${getChangeColor(change)}`} />
            <span className={`text-sm font-medium ${getChangeColor(change)}`}>
              {formatPercent(changePercent)}
            </span>
          </div>
          {change !== undefined && (
            <span className={`text-sm ${getChangeColor(change)}`}>
              {change >= 0 ? '+' : ''}{formatCurrency(change)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
