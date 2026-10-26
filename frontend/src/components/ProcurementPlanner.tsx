import React, { useState, useEffect } from 'react';
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
  Flame, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  Sliders, 
  Download, 
  TrendingUp 
} from 'lucide-react';
import type { ProcurementPlanResponse } from '../types';

interface ProcurementPlannerProps {
  selectedDate: string;
  gateClosureHour: number;
}

export const ProcurementPlanner: React.FC<ProcurementPlannerProps> = ({
  selectedDate,
  gateClosureHour,
}) => {
  const [demandBaseline, setDemandBaseline] = useState<number>(25000);
  const [riskPercentile, setRiskPercentile] = useState<string>('P90');
  const [thermalCost, setThermalCost] = useState<number>(85.0);
  const imbalanceSpread = 45.0;

  const [plan, setPlan] = useState<ProcurementPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/procurement/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: selectedDate,
          gateClosureHour,
          baselineDemandMW: demandBaseline,
          riskPercentile,
          thermalHeatRateCostGBP: thermalCost,
          imbalancePenaltySpreadGBP: imbalanceSpread
        })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setPlan(data);
    } catch (e: any) {
      setError(e.message || 'Failed to generate procurement plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [selectedDate, gateClosureHour, demandBaseline, riskPercentile, thermalCost, imbalanceSpread]);

  const exportScheduleCSV = () => {
    if (!plan) return;
    const headers = [
      'Settlement Period',
      'Start Time (UTC)',
      'Consumer Demand (MW)',
      'Wind Forecast (MW)',
      'Actual Wind (MW)',
      'Procured Thermal (MW)',
      'Safety Buffer (MW)',
      'Unhedged Exposure (MW)'
    ];
    const rows = plan.schedule.map((s) => [
      s.settlementPeriod,
      s.startTime,
      s.demandMW,
      s.windForecastMW,
      s.actualWindMW ?? 'N/A',
      s.recommendedThermalMW,
      s.safetyBufferMW,
      s.unhedgedExposureMW
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Thermal_Procurement_Schedule_${selectedDate}_${riskPercentile}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = plan?.schedule.map((s) => {
    const hour = Math.floor((s.settlementPeriod - 1) / 2);
    const minute = s.settlementPeriod % 2 === 0 ? '30' : '00';
    return {
      period: `SP ${s.settlementPeriod}`,
      time: `${hour.toString().padStart(2, '0')}:${minute}`,
      demand: s.demandMW,
      windForecast: s.windForecastMW,
      actualWind: s.actualWindMW,
      thermal: s.recommendedThermalMW,
      exposure: s.unhedgedExposureMW
    };
  }) || [];

  return (
    <div>
      {/* Control Bar for Strategy & Risk Settings */}
      <div className="control-bar">
        <div className="control-group">
          <Sliders size={18} style={{ color: 'var(--accent-thermal)' }} />
          <span className="control-label">Baseline Demand:</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={15000}
              max={35000}
              step={1000}
              value={demandBaseline}
              onChange={(e) => setDemandBaseline(parseInt(e.target.value, 10))}
              className="range-slider"
            />
            <span className="slider-value">{(demandBaseline / 1000).toFixed(0)}k MW avg</span>
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Risk Tolerance (Buffer):</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['P50', 'P75', 'P90', 'P95'].map((pct) => (
              <button
                key={pct}
                className={`tab-btn ${riskPercentile === pct ? 'active' : ''}`}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => setRiskPercentile(pct)}
              >
                {pct} {pct === 'P90' && '(Rec.)'}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <span className="control-label">Thermal Cost:</span>
          <select 
            className="select-control"
            value={thermalCost}
            onChange={(e) => setThermalCost(parseFloat(e.target.value))}
            style={{ padding: '0.35rem 0.6rem' }}
          >
            <option value={75}>£75/MWh (Off-peak CCGT)</option>
            <option value={85}>£85/MWh (Standard Base)</option>
            <option value={110}>£110/MWh (Peaker / OCGT)</option>
          </select>
        </div>

        <div className="control-group">
          <button className="btn-primary" onClick={exportScheduleCSV} disabled={!plan}>
            <Download size={15} />
            <span>Export Bidding Schedule</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="dashboard-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Calculating optimal procurement schedule...</div>
        </div>
      )}

      {error && (
        <div className="dashboard-panel" style={{ color: '#f87171' }}>
          Error: {error}
        </div>
      )}

      {plan && !loading && (
        <>
          {/* Procurement Financial & Energy KPI Cards */}
          <div className="metrics-grid">
            <div className="metric-card accent-buffer">
              <div className="metric-header">
                <span className="metric-title">Statistical Safety Buffer</span>
                <ShieldCheck size={16} className="metric-icon" />
              </div>
              <div className="metric-value">+{plan.recommendedBufferMW.toLocaleString()} <span style={{ fontSize: '1rem' }}>MW</span></div>
              <div className="metric-sub">
                Based on historical {riskPercentile} over-forecast distribution
              </div>
            </div>

            <div className="metric-card accent-thermal">
              <div className="metric-header">
                <span className="metric-title">Day-Ahead Thermal Order</span>
                <Flame size={16} className="metric-icon" />
              </div>
              <div className="metric-value">{plan.procuredThermalMWh.toLocaleString()} <span style={{ fontSize: '1rem' }}>MWh</span></div>
              <div className="metric-sub">
                {((plan.procuredThermalMWh / plan.totalDemandMWh) * 100).toFixed(1)}% of total daily demand
              </div>
            </div>

            <div className="metric-card accent-wind">
              <div className="metric-header">
                <span className="metric-title">Forecasted Wind Energy</span>
                <Zap size={16} className="metric-icon" />
              </div>
              <div className="metric-value">{plan.forecastWindMWh.toLocaleString()} <span style={{ fontSize: '1rem' }}>MWh</span></div>
              <div className="metric-sub">
                Clean energy supplying remainder of demand
              </div>
            </div>

            <div className="metric-card accent-forecast">
              <div className="metric-header">
                <span className="metric-title">Est. Procurement Cost</span>
                <DollarSign size={16} className="metric-icon" />
              </div>
              <div className="metric-value">£{(plan.estimatedProcurementCostGBP / 1_000_000).toFixed(2)}M</div>
              <div className="metric-sub">
                At £{thermalCost}/MWh Day-Ahead wholesale benchmark
              </div>
            </div>

            <div className="metric-card accent-risk">
              <div className="metric-header">
                <span className="metric-title">Imbalance Cash-Out Avoided</span>
                <TrendingUp size={16} className="metric-icon" />
              </div>
              <div className="metric-value" style={{ color: '#34d399' }}>
                £{(plan.estimatedRiskSavingsGBP / 1000).toFixed(0)}k
              </div>
              <div className="metric-sub">
                Estimated savings from avoiding emergency System Buy Price (SBP)
              </div>
            </div>
          </div>

          {/* Visualizer: Demand Stack vs. Thermal & Wind */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  <Flame size={20} style={{ color: 'var(--accent-thermal)' }} />
                  <span>Day-Ahead Dispatch & Thermal Procurement Schedule ({selectedDate})</span>
                </div>
                <div className="panel-description">
                  Stack composition: Consumer Demand covered by Day-Ahead Wind Forecast + Buffer-Adjusted Thermal Plant Procurement.
                </div>
              </div>

              <div className="legend-wrapper">
                <div className="legend-item">
                  <div className="legend-color-box" style={{ background: '#38bdf8' }} />
                  <span>Consumer Demand (MW)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color-box" style={{ background: '#10b981' }} />
                  <span>Wind Forecast (MW)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color-box" style={{ background: '#fbbf24' }} />
                  <span>Procured Thermal (MW)</span>
                </div>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="thermalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="windProcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
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
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k MW`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="custom-chart-tooltip">
                            <div className="tooltip-title">{d.period} ({d.time} UTC)</div>
                            <div className="tooltip-row">
                              <span style={{ color: '#38bdf8' }}>Consumer Demand:</span>
                              <strong>{d.demand?.toLocaleString()} MW</strong>
                            </div>
                            <div className="tooltip-row">
                              <span style={{ color: '#10b981' }}>Wind Forecast:</span>
                              <strong>{d.windForecast?.toLocaleString()} MW</strong>
                            </div>
                            <div className="tooltip-row">
                              <span style={{ color: '#fbbf24' }}>Procured Thermal:</span>
                              <strong>{d.thermal?.toLocaleString()} MW</strong>
                            </div>
                            {d.actualWind !== null && (
                              <div className="tooltip-row" style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.3rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Actual Wind Outturn:</span>
                                <span>{d.actualWind?.toLocaleString()} MW</span>
                              </div>
                            )}
                            <div className="tooltip-row">
                              <span style={{ color: d.exposure > 0 ? '#f87171' : '#34d399' }}>
                                Unhedged Shortfall:
                              </span>
                              <strong>{d.exposure > 0 ? `${d.exposure?.toLocaleString()} MW` : '0 MW (Fully Covered)'}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="demand" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5} 
                    dot={false}
                    name="Consumer Demand"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="thermal" 
                    stroke="#fbbf24" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#thermalGradient)" 
                    name="Procured Thermal Plant"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="windForecast" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#windProcGradient)" 
                    name="Usable Wind Forecast"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
