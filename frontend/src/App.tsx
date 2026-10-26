import { useState, useEffect } from 'react';
import { 
  Zap, 
  BarChart2, 
  Flame, 
  ExternalLink, 
  Cpu 
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DayAheadCockpit } from './components/DayAheadCockpit';
import { AccuracyAnalytics } from './components/AccuracyAnalytics';
import { ProcurementPlanner } from './components/ProcurementPlanner';
import { MethodologyModal } from './components/MethodologyModal';
import { PitchGuideModal } from './components/PitchGuideModal';
import type { DayAheadResponse, AccuracyMetricsResponse } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'analytics' | 'procurement'>('cockpit');
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [gateClosureHour, setGateClosureHour] = useState<number>(11);

  const [cockpitData, setCockpitData] = useState<DayAheadResponse | null>(null);
  const [cockpitLoading, setCockpitLoading] = useState<boolean>(true);

  const [metricsData, setMetricsData] = useState<AccuracyMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);

  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState<boolean>(false);

  // Load available dates on mount
  useEffect(() => {
    fetch('/api/dates')
      .then((res) => res.json())
      .then((data: string[]) => {
        if (data && data.length > 0) {
          setDates(data);
          // Default to middle of month if present
          if (data.includes('2026-01-15')) {
            setSelectedDate('2026-01-15');
          } else {
            setSelectedDate(data[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to fetch dates:', err));
  }, []);

  // Fetch Day-Ahead Cockpit Data whenever selectedDate or gateClosureHour changes
  useEffect(() => {
    if (!selectedDate) return;
    setCockpitLoading(true);
    fetch(`/api/forecasts/day-ahead?deliveryDate=${selectedDate}&gateClosureHour=${gateClosureHour}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: DayAheadResponse) => {
        setCockpitData(data);
        setCockpitLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch cockpit data:', err);
        setCockpitLoading(false);
      });
  }, [selectedDate, gateClosureHour]);

  // Fetch Full Month Analytics when switching to analytics tab or changing gate closure
  useEffect(() => {
    if (activeTab === 'analytics' || !metricsData) {
      setMetricsLoading(true);
      fetch(`/api/analytics/metrics?gateClosureHour=${gateClosureHour}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: AccuracyMetricsResponse) => {
          setMetricsData(data);
          setMetricsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch accuracy metrics:', err);
          setMetricsLoading(false);
        });
    }
  }, [activeTab, gateClosureHour]);

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar 
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenPitchGuide={() => setIsPitchGuideOpen(true)}
      />

      {/* Main Tab Controls */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`}
          onClick={() => setActiveTab('cockpit')}
        >
          <Zap size={17} style={{ color: activeTab === 'cockpit' ? 'var(--accent-wind)' : 'inherit' }} />
          <span>Day-Ahead Decision Cockpit</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={17} style={{ color: activeTab === 'analytics' ? 'var(--accent-forecast)' : 'inherit' }} />
          <span>Quantitative Accuracy Analytics</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'procurement' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement')}
        >
          <Flame size={17} style={{ color: activeTab === 'procurement' ? 'var(--accent-thermal)' : 'inherit' }} />
          <span>Procurement & Thermal Buffer Planner</span>
        </button>
      </nav>

      {/* Main Tab Contents */}
      <main>
        {activeTab === 'cockpit' && (
          <DayAheadCockpit
            data={cockpitData}
            dates={dates}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            gateClosureHour={gateClosureHour}
            onGateClosureChange={setGateClosureHour}
            loading={cockpitLoading}
          />
        )}

        {activeTab === 'analytics' && (
          <AccuracyAnalytics
            metrics={metricsData}
            loading={metricsLoading}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementPlanner
            selectedDate={selectedDate}
            gateClosureHour={gateClosureHour}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Cpu size={16} />
          <span>GridPulse UK v1.0.0 | Python FastAPI & React Vite</span>
          <span>•</span>
          <span>Data: National Elexon BMRS FUELHH (WIND) & WINDFOR (Jan 2026)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="https://bmrs.elexon.co.uk/api-documentation"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <span>Elexon API Specs</span>
            <ExternalLink size={13} />
          </a>
          <button 
            className="btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            onClick={() => setIsPitchGuideOpen(true)}
          >
            Video Pitch Guide
          </button>
        </div>
      </footer>

      {/* Modals */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <PitchGuideModal
        isOpen={isPitchGuideOpen}
        onClose={() => setIsPitchGuideOpen(false)}
      />
    </div>
  );
}

export default App;
