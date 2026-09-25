import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  Monitor,
} from 'lucide-react';
import { useTheme, PalettePreset } from '../contexts/ThemeContext';
import { cn } from '../utils/cn';

const panelStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: '3px',
};
const altPanelStyle: React.CSSProperties = {
  background: 'var(--c-surface-alt)',
  border: '1px solid var(--c-border)',
  borderRadius: '3px',
};
const hdrStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--c-border)',
};
const inputStyle: React.CSSProperties = {
  background: 'var(--c-surface-alt)',
  border: '1px solid var(--c-border)',
  borderRadius: '2px',
  color: 'var(--c-text-primary)',
  padding: '6px 10px',
  width: '100%',
  fontFamily: 'monospace',
  fontSize: '12px',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--c-text-muted)',
  marginBottom: '4px',
};

export const Settings: React.FC = () => {
  const { theme, palette, toggleTheme, setPalette } = useTheme();

  const [weights, setWeights] = useState({
    spatial: 0.35, temporal: 0.25, trajectory: 0.15, anomaly: 0.15, vesselType: 0.1, gapPenalty: 0.2,
  });
  const [driftConfig, setDriftConfig] = useState({
    integrator: 'Runge-Kutta 4th Order', windageFactor: 0.031, diffusivity: 1.0, defaultParticles: 1200,
  });
  const [aisConfig, setAisConfig] = useState({
    spireApiKey: 'spire_live_sec_8492048102', enableTerrestrialBackfill: true, cacheDuckDb: true,
  });
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };
  const handleReset = () => {
    setWeights({ spatial: 0.35, temporal: 0.25, trajectory: 0.15, anomaly: 0.15, vesselType: 0.1, gapPenalty: 0.2 });
    setDriftConfig({ integrator: 'Runge-Kutta 4th Order', windageFactor: 0.031, diffusivity: 1.0, defaultParticles: 1200 });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const sliderGroups = [
    { key: 'spatial' as const,   label: 'Spatial Weight (w1 — CPA to Origin)',           max: 0.6,  accentVar: '--c-accent'  },
    { key: 'temporal' as const,  label: 'Temporal Weight (w2 — Release Window)',          max: 0.6,  accentVar: '--c-accent'  },
    { key: 'trajectory' as const,label: 'Trajectory Weight (w3 — Direction Alignment)',   max: 0.5,  accentVar: '--c-safe'    },
    { key: 'anomaly' as const,   label: 'Anomaly Weight (w4 — Speed/Course/Loitering)',   max: 0.5,  accentVar: '--c-warn'    },
    { key: 'vesselType' as const,label: 'Vessel Type Factor (w5 — Cargo/Sludge Hazard)', max: 0.3,  accentVar: '--c-safe'    },
    { key: 'gapPenalty' as const,label: 'AIS Gap Blackout Penalty (p)',                  max: 0.5,  accentVar: '--c-critical'},
  ];

  const paletteOptions: { id: PalettePreset; label: string; bg: string; surface: string; accent: string; critical: string }[] = [
    { id: 'control-room', label: 'Control Room', bg: '#0F1117', surface: '#1F2430', accent: '#60A5FA', critical: '#EF4444' },
    { id: 'marine-sage',  label: 'Marine Sage',  bg: '#0E1412', surface: '#18221F', accent: '#2DD4BF', critical: '#F97316' },
    { id: 'thermal-mono', label: 'Thermal Mono', bg: '#090A0F', surface: '#18181B', accent: '#8B5CF6', critical: '#F43F5E' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto p-5 md:p-8 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={hdrStyle}>
          <div>
            <div className="flex items-center gap-2">
              <SettingsIcon size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>System Settings</h1>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>
              Heuristic weighting, drift configuration, AIS feeds, and display preferences.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedNotice && (
              <div className="chip chip-safe flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 size={11} />
                Configuration Saved
              </div>
            )}
            <button onClick={handleReset}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}>
              <RotateCcw size={12} />Reset
            </button>
            <button onClick={handleSave}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-opacity"
              style={{ border: '1px solid var(--c-accent)', borderRadius: '2px', color: 'var(--c-bg)', background: 'var(--c-accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
              <Save size={12} />Save Changes
            </button>
          </div>
        </div>

        {/* Section 1: Attribution Weights */}
        <div className="p-5" style={panelStyle}>
          <div className="flex items-center justify-between pb-3 mb-4" style={hdrStyle}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
              <SlidersHorizontal size={14} style={{ color: 'var(--c-accent)' }} />
              Attribution Scoring Weights — Score = Σ wᵢ · Sᵢ − p · Pgap
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {sliderGroups.map(({ key, label, max, accentVar }) => (
              <div key={key}>
                <div className="flex justify-between mb-1.5 text-[10px]">
                  <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                  <span className="font-bold font-mono tabular-nums" style={{ color: `var(${accentVar})` }}>
                    {key === 'gapPenalty' ? `-${weights[key].toFixed(2)}` : weights[key].toFixed(2)}
                  </span>
                </div>
                <input type="range" min={0} max={max} step={0.05} value={weights[key]}
                  onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 cursor-pointer appearance-none"
                  style={{ accentColor: `var(${accentVar})`, background: 'var(--c-border)', borderRadius: '2px' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Drift */}
        <div className="p-5" style={altPanelStyle}>
          <div className="flex items-center gap-2 pb-3 mb-4 text-[10px] font-bold uppercase tracking-wider" style={{ ...hdrStyle, color: 'var(--c-text-primary)' }}>
            <Cpu size={14} style={{ color: 'var(--c-accent)' }} />
            OpenDrift Lagrangian Simulation
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label style={labelStyle}>Numerical Integrator</label>
              <select value={driftConfig.integrator} onChange={(e) => setDriftConfig({ ...driftConfig, integrator: e.target.value })} style={inputStyle}>
                <option value="Runge-Kutta 4th Order">Runge-Kutta 4th Order (RK4)</option>
                <option value="Euler Forward">Euler Forward</option>
                <option value="Runge-Kutta 2nd Order">Runge-Kutta 2nd Order</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Windage Factor (k_wind)</label>
              <input type="number" step="0.001" value={driftConfig.windageFactor}
                onChange={(e) => setDriftConfig({ ...driftConfig, windageFactor: parseFloat(e.target.value) })}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Default Particle Count</label>
              <input type="number" step="100" value={driftConfig.defaultParticles}
                onChange={(e) => setDriftConfig({ ...driftConfig, defaultParticles: parseInt(e.target.value) })}
                style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Section 3: AIS */}
        <div className="p-5" style={altPanelStyle}>
          <div className="flex items-center gap-2 pb-3 mb-4 text-[10px] font-bold uppercase tracking-wider" style={{ ...hdrStyle, color: 'var(--c-text-primary)' }}>
            <Database size={14} style={{ color: 'var(--c-safe)' }} />
            AIS Telemetry & DuckDB Storage
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <label style={labelStyle}>Spire Maritime API Key</label>
              <input type="password" value={aisConfig.spireApiKey}
                onChange={(e) => setAisConfig({ ...aisConfig, spireApiKey: e.target.value })}
                style={inputStyle} />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {[
                { key: 'enableTerrestrialBackfill' as const, label: 'Enable Terrestrial Receiver Backfill' },
                { key: 'cacheDuckDb' as const,               label: 'Persist Queries in Local DuckDB' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                  <input type="checkbox" checked={aisConfig[key]}
                    onChange={(e) => setAisConfig({ ...aisConfig, [key]: e.target.checked })}
                    className="h-3.5 w-3.5" style={{ accentColor: 'var(--c-accent)' }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Display & Theme */}
        <div className="p-5" style={panelStyle}>
          <div className="flex items-center gap-2 pb-3 mb-4 text-[10px] font-bold uppercase tracking-wider" style={{ ...hdrStyle, color: 'var(--c-text-primary)' }}>
            <Monitor size={14} style={{ color: 'var(--c-accent)' }} />
            Display & Theme
          </div>

          {/* Light/Dark toggle */}
          <div className="mb-5">
            <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-muted)' }}>Mode</div>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((m) => (
                <button key={m} onClick={() => { if (theme !== m) toggleTheme(); }}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={theme === m
                    ? { background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }
                    : { background: 'var(--c-surface-alt)', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)', borderRadius: '2px' }}>
                  {m === 'dark' ? '🌙 Dark' : '☀ Light'}
                </button>
              ))}
            </div>
          </div>

          {/* Palette selector */}
          <div>
            <div className="text-[9px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-muted)' }}>Colour Palette</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {paletteOptions.map((opt) => {
                const isActive = palette === opt.id;
                return (
                  <button key={opt.id} onClick={() => setPalette(opt.id)}
                    className="p-3 text-left transition-colors"
                    style={{
                      border: `1px solid ${isActive ? 'var(--c-safe)' : 'var(--c-border)'}`,
                      borderRadius: '3px',
                      background: isActive ? 'var(--c-surface-alt)' : 'var(--c-surface)',
                      outline: 'none',
                    }}>
                    {/* Swatch preview */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-12 h-5 flex rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="w-1/4 h-full" style={{ background: opt.bg }} />
                        <div className="w-1/4 h-full" style={{ background: opt.surface }} />
                        <div className="w-1/4 h-full" style={{ background: opt.accent }} />
                        <div className="w-1/4 h-full" style={{ background: opt.critical }} />
                      </div>
                      {isActive && <span className="chip chip-safe" style={{ fontSize: '8px' }}>ACTIVE</span>}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isActive ? 'var(--c-text-primary)' : 'var(--c-text-muted)' }}>
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
