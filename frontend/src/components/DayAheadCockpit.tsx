import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Sliders, 
  Layers, 
  Table 
} from 'lucide-react';
import type { DayAheadResponse } from '../types';

interface DayAheadCockpitProps {
  data: DayAheadResponse | null;
  dates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  gateClosureHour: number;
  onGateClosureChange: (hour: number) => void;
  loading: boolean;
}

export const DayAheadCockpit: React.FC<DayAheadCockpitProps> = ({
  data,
  dates,
  selectedDate,
  onDateChange,
  gateClosureHour,
  onGateClosureChange,
  loading,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [showDifference, setShowDifference] = useState<boolean>(true);

  if (loading) {
    return (
      <div className="dashboard-panel" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem auto', width: '16px', height: '16px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Querying Elexon BMRS day-ahead forecast & actual generation streams...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { periods, summary, gateClosureCutoff } = data;

  // Format data for Recharts
  const chartData = periods.map((p) => {
    const hour = Math.floor((p.settlementPeriod - 1) / 2);
    const minute = p.settlementPeriod % 2 === 0 ? '30' : '00';
    return {
      period: `SP ${p.settlementPeriod}`,
      time: `${hour.toString().padStart(2, '0')}:${minute}`,
      actual: p.actualGeneration,
      forecast: p.forecastGeneration,
      error: p.residualError,
      absError: p.absoluteError,
      horizon: p.forecastHorizonHours,
      pubTime: p.forecastPublishTime
    };
  });

  const exportCSV = () => {
    const headers = [
      'Settlement Date',
      'Settlement Period',
      'Start Time (UTC)',
      'Actual Wind (MW)',
      'Usable Forecast (MW)',
      'Forecast Publish Time',
      'Forecast Horizon (Hours)',
      'Residual Error (MW)',
      'Absolute Error (MW)',
      'Percentage Error (%)'
    ];
    const rows = periods.map((p) => [
      p.settlementDate,
      p.settlementPeriod,
      p.startTime,
      p.actualGeneration,
      p.forecastGeneration,
      p.forecastPublishTime,
      p.forecastHorizonHours,
      p.residualError,
      p.absoluteError,
      p.percentageError
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Elexon_DayAhead_${selectedDate}_GC${gateClosureHour}h.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Control Toolbar */}
      <div className="control-bar">
        <div className="control-group">
          <Calendar size={18} style={{ color: 'var(--accent-forecast)' }} />
          <span className="control-label">Delivery Date:</span>
          <select
            className="select-control"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {d} (January 2026)
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <Clock size={18} style={{ color: 'var(--accent-thermal)' }} />
          <span className="control-label">Auction Gate Closure:</span>
          <div className="slider-wrapper">
            <Sliders size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="range"
              min={0}
              max={23}
              step={1}
              value={gateClosureHour}
              onChange={(e) => onGateClosureChange(parseInt(e.target.value, 10))}
              className="range-slider"
            />
            <span className="slider-value">
              D-1 {gateClosureHour.toString().padStart(2, '0')}:00 UTC
            </span>
          </div>
          {gateClosureHour !== 11 && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              onClick={() => onGateClosureChange(11)}
              title="Reset to official UK Day-Ahead Gate Closure (11:00 UTC)"
            >
              Reset to 11:00
            </button>
          )}
        </div>

        <div className="control-group">
          <button
            className={`btn-secondary ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            <Layers size={16} />
            <span>Chart View</span>
          </button>
          <button
            className={`btn-secondary ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <Table size={16} />
            <span>Table View</span>
          </button>
          <button className="btn-primary" onClick={exportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card accent-forecast">
          <div className="metric-header">
            <span className="metric-title">Mean Absolute Error (MAE)</span>
            <TrendingUp size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{summary.mae.toLocaleString()} <span style={{ fontSize: '1rem' }}>MW</span></div>
          <div className="metric-sub">
            Average deviation across 48 settlement periods
          </div>
        </div>

        <div className="metric-card accent-wind">
          <div className="metric-header">
            <span className="metric-title">Weighted Absolute Error (WAPE)</span>
            <CheckCircle2 size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{summary.wape.toFixed(1)} <span style={{ fontSize: '1rem' }}>%</span></div>
          <div className="metric-sub">
            Volume-weighted accuracy against total generation
          </div>
        </div>

        <div className="metric-card accent-thermal">
          <div className="metric-header">
            <span className="metric-title">Mean Directional Bias</span>
            <Zap size={16} className="metric-icon" />
          </div>
          <div className="metric-value" style={{ color: summary.meanBias > 0 ? '#f87171' : '#34d399' }}>
            {summary.meanBias > 0 ? `+${summary.meanBias.toFixed(0)}` : summary.meanBias.toFixed(0)} <span style={{ fontSize: '1rem' }}>MW</span>
          </div>
          <div className="metric-sub">
            {summary.meanBias > 0 
              ? 'Over-forecasting (Shortfall & Imbalance Risk)' 
              : 'Under-forecasting (Over-procurement Risk)'}
          </div>
        </div>

        <div className="metric-card accent-risk">
          <div className="metric-header">
            <span className="metric-title">Root Mean Squared Error (RMSE)</span>
            <AlertTriangle size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{summary.rmse.toLocaleString()} <span style={{ fontSize: '1rem' }}>MW</span></div>
          <div className="metric-sub">
            Peak error penalizer (Max: {summary.maxError.toLocaleString()} MW)
          </div>
        </div>

        <div className="metric-card accent-buffer">
          <div className="metric-header">
            <span className="metric-title">Net Energy Discrepancy</span>
            <Clock size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{summary.netDiscrepancyMWh.toLocaleString()} <span style={{ fontSize: '1rem' }}>MWh</span></div>
          <div className="metric-sub">
            Total wind forecast vs. physical generation
          </div>
        </div>
      </div>

      {/* Main Visualizer Panel */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <Zap size={20} style={{ color: 'var(--accent-wind)' }} />
              <span>Day-Ahead Decision Time Series: Actual vs. Latest Usable Forecast</span>
            </div>
            <div className="panel-description">
              Target Delivery Day: <strong>{selectedDate}</strong> | Filter: WINDFOR published on or before{' '}
              <strong style={{ color: 'var(--accent-forecast)' }}>{gateClosureCutoff}</strong> (UK Gate Closure)
            </div>
          </div>

          <div className="legend-wrapper">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showDifference} 
                onChange={(e) => setShowDifference(e.target.checked)} 
                style={{ accentColor: 'var(--accent-risk)' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Show Residual Error Area</span>
            </label>
            <div className="legend-item">
              <div className="legend-color-box" style={{ background: 'var(--accent-wind)' }} />
              <span>Actual Generation (FUELHH WIND)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color-box" style={{ background: 'var(--accent-forecast)' }} />
              <span>Usable Forecast (WINDFOR at Gate Closure)</span>
            </div>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={3}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k MW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="tooltip-title">{d.period} ({d.time} UTC)</div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--accent-wind)' }}>Actual Wind:</span>
                            <strong>{d.actual?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--accent-forecast)' }}>Decision Forecast:</span>
                            <strong>{d.forecast?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: d.error > 0 ? '#f87171' : '#34d399' }}>
                              Residual (FC - Act):
                            </span>
                            <strong>{d.error > 0 ? `+${d.error?.toLocaleString()}` : d.error?.toLocaleString()} MW</strong>
                          </div>
                          <div className="tooltip-row" style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.3rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Publish Timestamp:</span>
                            <span style={{ fontSize: '0.7rem' }}>{d.pubTime}</span>
                          </div>
                          <div className="tooltip-row">
                            <span style={{ color: 'var(--text-muted)' }}>Decision Horizon:</span>
                            <span>{d.horizon} hrs prior</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#actualGradient)" 
                  name="Actual Wind Generation"
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5} 
                  strokeDasharray="4 4" 
                  dot={false}
                  name="Gate-Closure Usable Forecast"
                />
                {showDifference && (
                  <Area
                    type="monotone"
                    dataKey="absError"
                    stroke="#f43f5e"
                    strokeWidth={1}
                    fillOpacity={1}
                    fill="url(#errorGradient)"
                    name="Absolute Error (MW)"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Settlement Period</th>
                  <th>Target Time (UTC)</th>
                  <th>Actual Wind (MW)</th>
                  <th>Usable Forecast (MW)</th>
                  <th>Forecast Published</th>
                  <th>Horizon (Hrs)</th>
                  <th>Residual Error (MW)</th>
                  <th>Absolute Error (MW)</th>
                  <th>% Error</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const hour = Math.floor((p.settlementPeriod - 1) / 2);
                  const minute = p.settlementPeriod % 2 === 0 ? '30' : '00';
                  const timeFormatted = `${hour.toString().padStart(2, '0')}:${minute}`;
                  const isOver = p.residualError > 0;
                  return (
                    <tr key={p.settlementPeriod}>
                      <td><strong>SP {p.settlementPeriod}</strong></td>
                      <td>{timeFormatted}</td>
                      <td style={{ color: 'var(--accent-wind)', fontWeight: 600 }}>
                        {p.actualGeneration?.toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--accent-forecast)', fontWeight: 600 }}>
                        {p.forecastGeneration?.toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.forecastPublishTime?.replace('T', ' ').replace('Z', '')}
                      </td>
                      <td>
                        {p.forecastHorizonHours !== null && p.forecastHorizonHours !== undefined ? `${p.forecastHorizonHours}h` : 'N/A'}
                      </td>
                      <td style={{ color: isOver ? '#f87171' : '#34d399', fontWeight: 600 }}>
                        {isOver ? `+${p.residualError.toLocaleString()}` : p.residualError.toLocaleString()}
                      </td>
                      <td>{p.absoluteError?.toLocaleString()}</td>
                      <td>{p.percentageError?.toFixed(1)}%</td>
                      <td>
                        <span className={isOver ? 'badge-over' : 'badge-under'}>
                          {isOver ? 'Over-Forecast' : 'Under-Forecast'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
