import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  BarChart2, 
  TrendingDown, 
  AlertOctagon, 
  PieChart, 
  ShieldAlert, 
  Activity 
} from 'lucide-react';
import type { AccuracyMetricsResponse } from '../types';

interface AccuracyAnalyticsProps {
  metrics: AccuracyMetricsResponse | null;
  loading: boolean;
}

export const AccuracyAnalytics: React.FC<AccuracyAnalyticsProps> = ({
  metrics,
  loading,
}) => {
  if (loading) {
    return (
      <div className="dashboard-panel" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem auto', width: '16px', height: '16px' }} />
        <div style={{ color: 'var(--text-secondary)' }}>
          Computing full-month statistical distributions and diurnal profiles...
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div>
      {/* Month-to-date Macro Metrics */}
      <div className="metrics-grid">
        <div className="metric-card accent-forecast">
          <div className="metric-header">
            <span className="metric-title">Full Month MAE</span>
            <Activity size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics.mae.toLocaleString()} <span style={{ fontSize: '1rem' }}>MW</span></div>
          <div className="metric-sub">
            Across {metrics.totalPeriodsEvaluated.toLocaleString()} settlement periods
          </div>
        </div>

        <div className="metric-card accent-risk">
          <div className="metric-header">
            <span className="metric-title">Full Month RMSE</span>
            <AlertOctagon size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics.rmse.toLocaleString()} <span style={{ fontSize: '1rem' }}>MW</span></div>
          <div className="metric-sub">
            Volatility penalty: +{(metrics.rmse - metrics.mae).toFixed(0)} MW over MAE
          </div>
        </div>

        <div className="metric-card accent-wind">
          <div className="metric-header">
            <span className="metric-title">Month-Wide WAPE</span>
            <PieChart size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics.wape.toFixed(1)} <span style={{ fontSize: '1rem' }}>%</span></div>
          <div className="metric-sub">
            Weighted on {metrics.totalActualGenerationGWh.toLocaleString()} GWh actuals
          </div>
        </div>

        <div className="metric-card accent-thermal">
          <div className="metric-header">
            <span className="metric-title">Over-Forecast Ratio</span>
            <TrendingDown size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics.overForecastPercentage}%</div>
          <div className="metric-sub" style={{ color: '#f87171' }}>
            Under-delivery risk in {metrics.overForecastPercentage}% of intervals
          </div>
        </div>

        <div className="metric-card accent-buffer">
          <div className="metric-header">
            <span className="metric-title">Mean Month Bias</span>
            <BarChart2 size={16} className="metric-icon" />
          </div>
          <div className="metric-value" style={{ color: metrics.meanBias > 0 ? '#f87171' : '#34d399' }}>
            {metrics.meanBias > 0 ? `+${metrics.meanBias.toFixed(0)}` : metrics.meanBias.toFixed(0)} <span style={{ fontSize: '1rem' }}>MW</span>
          </div>
          <div className="metric-sub">
            {metrics.meanBias > 0 ? 'Systematic over-optimism' : 'Systematic conservatism'}
          </div>
        </div>
      </div>

      {/* Two Column Visualizations */}
      <div className="dashboard-grid-2">
        {/* Diurnal Error Profile */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <Activity size={18} style={{ color: 'var(--accent-forecast)' }} />
                <span>Diurnal Accuracy Profile (SP 1 to 48)</span>
              </div>
              <div className="panel-description">
                Average MAE and directional bias by half-hour of the day throughout January 2026.
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.diurnalProfile} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={4}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k MW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="tooltip-title">SP {d.settlementPeriod} ({d.timeLabel} UTC)</div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--accent-forecast)' }}>Mean Abs Error:</span>
                            <strong>{d.mae?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--accent-risk)' }}>RMSE:</span>
                            <strong>{d.rmse?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: d.bias > 0 ? '#f87171' : '#34d399' }}>Mean Bias:</span>
                            <strong>{d.bias > 0 ? `+${d.bias?.toLocaleString()}` : d.bias?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--text-muted)' }}>Avg Actual Generation:</span>
                            <span>{d.avgActual?.toLocaleString()} MW</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line 
                  type="monotone" 
                  dataKey="mae" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5} 
                  dot={false} 
                  name="Mean Absolute Error (MW)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="rmse" 
                  stroke="#f43f5e" 
                  strokeWidth={2} 
                  strokeDasharray="3 3" 
                  dot={false} 
                  name="RMSE (MW)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="bias" 
                  stroke="#fbbf24" 
                  strokeWidth={1.5} 
                  dot={false} 
                  name="Mean Bias (MW)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Residual Error Histogram */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                <BarChart2 size={18} style={{ color: 'var(--accent-buffer)' }} />
                <span>Forecast Residual Error Distribution</span>
              </div>
              <div className="panel-description">
                Frequency histogram of (Forecast - Actual) across all {metrics.totalPeriodsEvaluated.toLocaleString()} intervals.
              </div>
            </div>
          </div>

          <div className="chart-container" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.residualHistogram} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="binStart" 
                  stroke="#64748b" 
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${val > 0 ? `+${val}` : val}`}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isOver = d.binStart >= 0;
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="tooltip-title">{d.label}</div>
                          <div className="tooltip-row">
                            <span style={{ color: isOver ? '#f87171' : '#34d399' }}>Intervals Count:</span>
                            <strong>{d.count} periods</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--text-muted)' }}>Percentage:</span>
                            <span>{((d.count / metrics.totalPeriodsEvaluated) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                            <span>{isOver ? 'Over-Forecast (Deficit)' : 'Under-Forecast (Surplus)'}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#8b5cf6" 
                  radius={[4, 4, 0, 0]} 
                  name="Number of Intervals" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trading Strategy Callout Card */}
      <div 
        className="dashboard-panel" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
          borderLeft: '4px solid var(--accent-thermal)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.15)', padding: '0.6rem', borderRadius: '10px', color: 'var(--accent-thermal)' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', color: '#fff', marginBottom: '0.35rem' }}>
              Trading Desk Quantitative Risk Assessment
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              In January 2026, the wind forecast exhibited an asymmetric distribution with a positive bias of 
              <strong style={{ color: '#f87171' }}> +{metrics.meanBias.toFixed(0)} MW</strong>, leading to physical under-delivery in 
              <strong style={{ color: '#f87171' }}> {metrics.overForecastPercentage}%</strong> of settlement intervals. 
              Because the UK Balancing Mechanism penalizes physical deficits at the <strong>System Buy Price (SBP)</strong>, 
              relying solely on unadjusted wind forecasts creates severe margin exposure. 
              The procurement desk should dynamically add a <strong>P90 safety buffer</strong> to day-ahead thermal purchases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
