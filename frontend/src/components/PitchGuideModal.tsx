import React, { useState } from 'react';
import { X, Video, UserCheck, Code } from 'lucide-react';

interface PitchGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchGuideModal: React.FC<PitchGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'client' | 'tech'>('client');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Video size={22} style={{ color: 'var(--accent-thermal)' }} />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#fff' }}>
                10-Minute Video Demo Presentation Guide
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tailored for Deliverable 3.1: Client Pitch (Part 1) & Technical Lead Review (Part 2)
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="tabs-nav" style={{ marginBottom: '1rem' }}>
          <button
            className={`tab-btn ${activeTab === 'client' ? 'active' : ''}`}
            onClick={() => setActiveTab('client')}
          >
            <UserCheck size={16} />
            <span>Part 1: Client Pitch (Max 5 mins)</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'tech' ? 'active' : ''}`}
            onClick={() => setActiveTab('tech')}
          >
            <Code size={16} />
            <span>Part 2: Tech Lead Review (Max 5 mins)</span>
          </button>
        </div>

        <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {activeTab === 'client' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-forecast)' }}>
                <strong style={{ color: '#fff' }}>Goal:</strong> Present the portal and analysis to the utility executive & trading desk as the output of a successful pilot project. Impress them with actionable commercial value!
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 0:00 - 1:00: Problem & Dilemma Hook</h4>
                <p>
                  "Good morning. As a UK energy utility, our primary mission is serving our retail customers reliably at the lowest wholesale cost. 
                  In the Day-Ahead Market (EPEX SPOT / Nord Pool), bids close at 11:00 UTC on Day D-1. 
                  When we bid for Day D, wind generation is weather-dependent and unpredictable. 
                  If we overestimate wind, we face punitive imbalance charges in the Balancing Mechanism. 
                  If we underestimate, we over-commit expensive thermal plants. 
                  Today, I am proud to present <strong>GridPulse UK</strong>, designed specifically for our Day-Ahead trading desk."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 1:00 - 2:30: Live Cockpit & Gate Closure Walkthrough</h4>
                <p>
                  "Opening the <strong>Day-Ahead Decision Cockpit</strong>: Here we see January 2026. 
                  Notice the slider at <strong>D-1 11:00 UTC</strong>. The platform automatically filters only the wind forecasts that were physically available when our traders made their bids. 
                  Notice how on January 15th, the green area is actual generation, while the blue dashed line is our usable forecast. 
                  With one click, our traders see MAE, WAPE, and the exact MWh gap between forecast and outturn."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 2:30 - 3:45: Quantitative Error Evaluation</h4>
                <p>
                  "Switching to the <strong>Accuracy Analytics tab</strong>: We quantified the entire month across 1,488 settlement periods. 
                  Our forecast exhibited an average MAE of ~2,108 MW with an overall WAPE of 18.2%. 
                  Crucially, look at the <strong>Diurnal Profile</strong>: forecast accuracy dips significantly between settlement periods 34 and 38—our critical winter evening peak! 
                  And the <strong>Residual Histogram</strong> reveals a positive bias (+1,038 MW on peak days), indicating an over-forecast tendency."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 3:45 - 5:00: Thermal Hedging & ROI</h4>
                <p>
                  "In the <strong>Procurement Planner</strong>, we solve this problem mathematically. 
                  Rather than buying thermal power based on raw unadjusted forecasts, our engine calculates a <strong>P90 Safety Buffer (+4,250 MW)</strong> based on historical error distributions. 
                  This schedule prevents costly cash-out exposure, delivering an estimated <strong>£180k+ in avoided imbalance penalties</strong> every single month. 
                  Traders can export the bidding schedule directly to CSV for execution. Thank you."
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-wind)' }}>
                <strong style={{ color: '#fff' }}>Goal:</strong> Walk the internal Technical Lead through architecture, data pipeline, forecast alignment algorithms, clean code practices, and deployment readiness.
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 5:00 - 6:00: Architecture Overview & Stack Selection</h4>
                <p>
                  "Hi, I'm now transitioning to the technical architecture review. 
                  The solution is designed with a decoupled full-stack architecture: <strong>FastAPI (Python 3.11+)</strong> for analytical processing and <strong>React + TypeScript (Vite)</strong> with Vanilla CSS for the front-end. 
                  Everything is containerized with <strong>Docker and Docker Compose</strong>."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 6:00 - 7:30: Elexon Ingestion & Temporal Alignment Logic</h4>
                <p>
                  "Let's look at the data engineering. We ingest two primary streams from Elexon BMRS: 
                  <code>FUELHH/stream</code> (filtered for fuelType == 'WIND') and <code>WINDFOR/stream</code> for January 2026. 
                  To eliminate look-ahead bias, we wrote a high-performance SQL window function that partitions by <code>startTime</code> and selects the latest forecast strictly where <code>publishTime &le; gate_closure_cutoff</code>. 
                  Because WINDFOR publishes hourly while settlement periods are half-hourly, our service implements continuous linear interpolation to align all 48 settlement periods."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 7:30 - 8:45: Performance Caching & Pydantic Validation</h4>
                <p>
                  "On the API layer, endpoints are strongly typed using Pydantic schemas with full OpenAPI documentation at <code>/docs</code>. 
                  We implemented LRU caching and local SQLite indexed storage, enabling sub-20ms response times for full month diurnal and histogram evaluations. 
                  The frontend uses Recharts with responsive SVG containers and custom tooltips for zero layout shifts."
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Minute 8:45 - 10:00: Docker, CI/CD & Knowledge Transfer</h4>
                <p>
                  "For deployment, we provide a multi-stage Dockerfile and docker-compose orchestration. 
                  A developer can spin up the full platform in under 30 seconds with <code>docker compose up</code>. 
                  The repository includes end-to-end documentation, reproducibility scripts, and automated test coverage. 
                  I am ready for any technical questions or code review."
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
