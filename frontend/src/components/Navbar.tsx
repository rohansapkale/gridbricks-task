import React from 'react';
import { Wind, HelpCircle, FileText } from 'lucide-react';

interface NavbarProps {
  onOpenMethodology: () => void;
  onOpenPitchGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMethodology, onOpenPitchGuide }) => {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Wind size={26} />
        </div>
        <div>
          <div className="brand-title">
            GridPulse UK
            <span className="brand-badge">BMRS Stream</span>
          </div>
          <div className="brand-subtitle">
            UK Day-Ahead Renewable Generation Forecast & Procurement Intelligence
          </div>
        </div>
      </div>

      <div className="header-status">
        <div className="status-indicator">
          <div className="pulse-dot" />
          <span>Elexon BMRS: Jan 2026</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn-secondary" 
            onClick={onOpenMethodology}
            title="View UK Day-Ahead Market Rules and Evaluation Formulae"
          >
            <HelpCircle size={16} />
            <span>Market Methodology</span>
          </button>
          <button 
            className="btn-secondary" 
            onClick={onOpenPitchGuide}
            title="View 10-Minute Video Presentation Structure (Client Pitch & Tech Review)"
          >
            <FileText size={16} />
            <span>Demo Pitch Script</span>
          </button>
        </div>
      </div>
    </header>
  );
};
