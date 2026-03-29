import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { Shield, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const getRiskColor = (score) => {
  if (score <= 25) return '#22c55e';
  if (score <= 50) return '#eab308';
  if (score <= 75) return '#f97316';
  return '#ef4444';
};

const getRiskLabel = (score) => {
  if (score <= 25) return 'Low Risk';
  if (score <= 50) return 'Medium Risk';
  if (score <= 75) return 'High Risk';
  return 'Very High Risk';
};

const RiskGauge = ({ score }) => {
  const radius = 90;
  const cx = 120;
  const cy = 120;
  const startAngle = -225;
  const endAngle = 45;
  const totalArc = endAngle - startAngle;
  const scoreAngle = startAngle + (score / 100) * totalArc;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const arcPath = (startDeg, endDeg, r) => {
    const start = {
      x: cx + r * Math.cos(toRad(startDeg)),
      y: cy + r * Math.sin(toRad(startDeg)),
    };
    const end = {
      x: cx + r * Math.cos(toRad(endDeg)),
      y: cy + r * Math.sin(toRad(endDeg)),
    };
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const needleEnd = {
    x: cx + (radius - 15) * Math.cos(toRad(scoreAngle)),
    y: cy + (radius - 15) * Math.sin(toRad(scoreAngle)),
  };

  const color = getRiskColor(score);

  return (
    <svg viewBox="0 0 240 160" className="w-full max-w-xs mx-auto">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="33%" stopColor="#eab308" />
          <stop offset="66%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={arcPath(startAngle, endAngle, radius)}
        fill="none"
        stroke="#374151"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Colored arc up to score */}
      <path
        d={arcPath(startAngle, scoreAngle, radius)}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth="14"
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleEnd.x}
        y2={needleEnd.y}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <circle cx={cx} cy={cy} r="6" fill={color} />
      <circle cx={cx} cy={cy} r="3" fill="#1f2937" />
      {/* Score text */}
      <text x={cx} y={cy + 30} textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">
        {score}
      </text>
      <text x={cx} y={cy + 48} textAnchor="middle" fill="#9ca3af" fontSize="12">
        {getRiskLabel(score)}
      </text>
    </svg>
  );
};

const FACTOR_ICONS = {
  concentration: AlertTriangle,
  volatility: Activity,
  crypto_exposure: Shield,
  diversification: Shield,
  beta: TrendingUp,
};

const RiskAnalysis = () => {
  const { portfolios, currentPortfolio, fetchPortfolios, setCurrentPortfolio } = usePortfolioStore();
  const [riskData, setRiskData] = useState(null);
  const [monteCarloData, setMonteCarloData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (currentPortfolio) {
      fetchRiskData(currentPortfolio.id);
    }
  }, [currentPortfolio]);

  const fetchRiskData = async (portfolioId) => {
    setIsLoading(true);
    try {
      const [riskRes, mcRes] = await Promise.allSettled([
        api.get(`/analytics/${portfolioId}/risk-score`),
        api.get(`/analytics/${portfolioId}/monte-carlo`),
      ]);
      if (riskRes.status === 'fulfilled') setRiskData(riskRes.value.data);
      if (mcRes.status === 'fulfilled') setMonteCarloData(mcRes.value.data);
    } catch (error) {
      console.error('Failed to fetch risk data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortfolioChange = (e) => {
    const portfolio = portfolios.find((p) => p.id === parseInt(e.target.value));
    if (portfolio) setCurrentPortfolio(portfolio);
  };

  // Build fan chart data from monte carlo results
  const fanChartData = React.useMemo(() => {
    if (!monteCarloData?.percentiles && !monteCarloData?.sample_paths) return [];

    // If we have percentiles object, use that
    if (monteCarloData.percentiles) {
      const p5 = monteCarloData.percentiles['5'] || monteCarloData.percentiles.p5 || [];
      const p25 = monteCarloData.percentiles['25'] || monteCarloData.percentiles.p25 || [];
      const p50 = monteCarloData.percentiles['50'] || monteCarloData.percentiles.p50 || [];
      const p75 = monteCarloData.percentiles['75'] || monteCarloData.percentiles.p75 || [];
      const p95 = monteCarloData.percentiles['95'] || monteCarloData.percentiles.p95 || [];

      const len = Math.max(p5.length, p25.length, p50.length, p75.length, p95.length);
      const data = [];
      for (let i = 0; i < len; i++) {
        data.push({
          day: i,
          p5: p5[i] ?? null,
          p25: p25[i] ?? null,
          p50: p50[i] ?? null,
          p75: p75[i] ?? null,
          p95: p95[i] ?? null,
        });
      }
      return data;
    }

    // Fallback: compute percentiles from sample_paths
    if (monteCarloData.sample_paths?.length > 0) {
      const paths = monteCarloData.sample_paths;
      const numDays = paths[0].length;
      const data = [];
      for (let i = 0; i < numDays; i += 5) {
        const vals = paths.map((p) => p[i]).sort((a, b) => a - b);
        const pct = (p) => vals[Math.floor((p / 100) * vals.length)] ?? vals[vals.length - 1];
        data.push({
          day: i,
          p5: pct(5),
          p25: pct(25),
          p50: pct(50),
          p75: pct(75),
          p95: pct(95),
        });
      }
      return data;
    }

    return [];
  }, [monteCarloData]);

  const outcomeCards = React.useMemo(() => {
    if (!monteCarloData) return [];
    const outcomes = monteCarloData.outcomes || monteCarloData.summary || monteCarloData;
    return [
      { label: 'Worst Case', value: outcomes.worst_case ?? outcomes.p5, color: 'text-danger-400', bg: 'bg-danger-500/10' },
      { label: 'Pessimistic', value: outcomes.pessimistic ?? outcomes.p25, color: 'text-orange-400', bg: 'bg-orange-500/10' },
      { label: 'Median', value: outcomes.median ?? outcomes.p50, color: 'text-primary-400', bg: 'bg-primary-500/10' },
      { label: 'Optimistic', value: outcomes.optimistic ?? outcomes.p75, color: 'text-success-400', bg: 'bg-success-500/10' },
      { label: 'Best Case', value: outcomes.best_case ?? outcomes.p95, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];
  }, [monteCarloData]);

  if (!currentPortfolio && !isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Risk Analysis</h1>
        <div className="glass-card p-12 text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Create a portfolio to see risk analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-400" />
            Risk Analysis
          </h1>
          <p className="text-gray-400">Portfolio risk assessment and Monte Carlo simulation</p>
        </div>
        <select
          value={currentPortfolio?.id || ''}
          onChange={handlePortfolioChange}
          className="input-field"
        >
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Risk Score Gauge + Risk Factors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gauge */}
            {riskData && (
              <div className="glass-card p-6 flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 self-start">
                  <Shield className="w-5 h-5 text-primary-400" />
                  Overall Risk Score
                </h2>
                <RiskGauge score={riskData.overall_score ?? riskData.risk_score ?? 0} />
                {(riskData.risk_level || riskData.label) && (
                  <div className="mt-4">
                    <span
                      className="text-lg font-bold px-4 py-2 rounded-full"
                      style={{
                        color: getRiskColor(riskData.overall_score ?? riskData.risk_score ?? 0),
                        backgroundColor: `${getRiskColor(riskData.overall_score ?? riskData.risk_score ?? 0)}20`,
                      }}
                    >
                      {riskData.risk_level || riskData.label || getRiskLabel(riskData.overall_score ?? riskData.risk_score ?? 0)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Risk Factors Breakdown */}
            {riskData?.factors && (
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary-400" />
                  Risk Factors
                </h2>
                <div className="space-y-3">
                  {Object.entries(riskData.factors).map(([key, value]) => {
                    const score = typeof value === 'object' ? value.score ?? value.value ?? 0 : value;
                    const maxScore = typeof value === 'object' ? value.max ?? 100 : 100;
                    const normalizedScore = (score / maxScore) * 100;
                    const label = key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    const Icon = FACTOR_ICONS[key] || Activity;
                    const barColor = getRiskColor(normalizedScore);

                    return (
                      <div key={key} className="glass-card p-4 !bg-dark-300/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: barColor }} />
                            <span className="text-sm font-medium text-gray-200">{label}</span>
                          </div>
                          <span className="text-sm font-bold" style={{ color: barColor }}>
                            {typeof value === 'object' ? `${score} / ${maxScore}` : Math.round(score)}
                          </span>
                        </div>
                        <div className="w-full bg-dark-400 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(normalizedScore, 100)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Monte Carlo Fan Chart */}
          {fanChartData.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                Monte Carlo Simulation
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fanChartData}>
                    <defs>
                      <linearGradient id="colorP5" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorP25" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#eab308" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorP75" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="day"
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                        color: '#fff',
                      }}
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name === 'p5'
                          ? '5th Percentile'
                          : name === 'p25'
                          ? '25th Percentile'
                          : name === 'p50'
                          ? 'Median'
                          : name === 'p75'
                          ? '75th Percentile'
                          : '95th Percentile',
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'p5'
                          ? '5th %ile'
                          : value === 'p25'
                          ? '25th %ile'
                          : value === 'p50'
                          ? 'Median'
                          : value === 'p75'
                          ? '75th %ile'
                          : '95th %ile'
                      }
                      wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="p5"
                      stroke="#ef4444"
                      fill="url(#colorP5)"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p25"
                      stroke="#eab308"
                      fill="url(#colorP25)"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p50"
                      stroke="#22c55e"
                      fill="url(#colorP50)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p75"
                      stroke="#16a34a"
                      fill="url(#colorP75)"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p95"
                      stroke="#065f46"
                      fill="none"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Outcome Summary Cards */}
          {outcomeCards.length > 0 && outcomeCards.some((c) => c.value != null) && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" />
                Projected Outcomes
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {outcomeCards.map((card) => (
                  <div key={card.label} className={`glass-card p-4 ${card.bg}`}>
                    <p className="text-sm text-gray-400 mb-1">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>
                      {card.value != null ? formatCurrency(card.value) : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RiskAnalysis;
