import React from 'react';
import { X, BookOpen, Clock, ShieldCheck, Database, Award } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={22} style={{ color: 'var(--accent-forecast)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff' }}>
              Market Methodology & Evaluation Architecture
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} style={{ color: 'var(--accent-thermal)' }} />
              1. UK Day-Ahead Wholesale Electricity Market Mechanics
            </h3>
            <p>
              In Great Britain, wholesale day-ahead power auctions (EPEX SPOT UK and Nord Pool) run daily. 
              Participants must submit final physical bids and offers for all 48 half-hour settlement periods of delivery Day 
              <strong style={{ color: '#fff' }}> D </strong> prior to Gate Closure at 
              <strong style={{ color: 'var(--accent-forecast)' }}> 11:00 UTC on Day D-1</strong>.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Database size={16} style={{ color: 'var(--accent-wind)' }} />
              2. Data Lineage & Look-Ahead Bias Prevention
            </h3>
            <p>
              To accurately evaluate what the trader could have known at decision time, we enforce a strict temporal filter:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
              <li>
                <strong style={{ color: '#fff' }}>Actual Generation:</strong> Sourced from Elexon BMRS <code style={{ color: 'var(--accent-wind)' }}>FUELHH</code> stream filtered strictly for <code style={{ color: 'var(--accent-wind)' }}>fuelType == 'WIND'</code>.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Forecasted Generation:</strong> Sourced from Elexon BMRS <code style={{ color: 'var(--accent-forecast)' }}>WINDFOR</code> stream. For each delivery period $t$ on Day $D$, the active forecast is:
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', margin: '0.4rem 0', color: 'var(--accent-forecast)' }}>
                  max(publishTime) WHERE publishTime &le; GateClosure(D-1 11:00 UTC)
                </div>
                Forecasts generated after 11:00 UTC on Day $D-1$ are ignored, completely eliminating look-ahead bias.
              </li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-buffer)' }} />
              3. Quantitative Accuracy Metrics
            </h3>
            <ul style={{ paddingLeft: '1.25rem' }}>
              <li><strong style={{ color: '#fff' }}>MAE (Mean Absolute Error):</strong> (1/N) &Sigma; |Actual - Forecast| in MW. Measures expected magnitude of volume discrepancy.</li>
              <li><strong style={{ color: '#fff' }}>RMSE (Root Mean Squared Error):</strong> &radic;[ (1/N) &Sigma; (Actual - Forecast)&sup2; ]. Heavily penalizes large unforecasted wind drop-offs.</li>
              <li><strong style={{ color: '#fff' }}>WAPE (Weighted Absolute Percentage Error):</strong> [ &Sigma; |Actual - Forecast| / &Sigma; Actual ] &times; 100%. Unbiased across low and high wind regimes.</li>
              <li><strong style={{ color: '#fff' }}>Directional Bias (Mean Forecast Error):</strong> (1/N) &Sigma; (Forecast - Actual). Indicates systematic over-optimism vs. conservatism.</li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={16} style={{ color: 'var(--accent-thermal)' }} />
              4. Statistical Buffer for Thermal Hedging
            </h3>
            <p>
              When a utility relies on an unadjusted forecast with a positive bias, wind shortfall forces emergency balancing at the volatile 
              <strong style={{ color: 'var(--accent-risk)' }}> System Buy Price (SBP)</strong>. 
              Our platform calculates the empirical distribution of over-forecast errors to recommend a 
              <strong style={{ color: 'var(--accent-buffer)' }}> P90 Safety Buffer</strong>, ensuring 90% statistical confidence that physical consumer demand is covered without penalty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
