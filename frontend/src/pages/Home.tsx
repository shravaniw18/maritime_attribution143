import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Satellite, Compass, Ship, ArrowRight, ShieldCheck, Terminal } from 'lucide-react';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);

  const bootMessages = [
    'INITIALIZING SATELLITE UPLINK...',
    'ESTABLISHING SECURE CONNECTION...',
    'DECRYPTING SAR IMAGERY...',
    'ACCESS GRANTED.',
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setBootStep((prev) => {
        if (prev < bootMessages.length - 1) return prev + 1;
        clearInterval(id);
        setTimeout(() => setBooting(false), 300);
        return prev;
      });
    }, 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full overflow-y-auto flex flex-col justify-between p-6 md:p-10 select-none font-mono" style={{ background: 'var(--c-bg)', color: 'var(--c-text-primary)' }}>

      {/* ── BOOT OVERLAY ──────────────────────────────────────────────────── */}
      {booting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ background: 'var(--c-bg)' }}>
          <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-accent)' }} />
            <Satellite size={28} style={{ color: 'var(--c-accent)' }} />
          </div>
          <div className="w-full max-w-md p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' }}>
            <div className="flex items-center gap-2 mb-3 pb-2 text-[10px] uppercase tracking-widest" style={{ borderBottom: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
              <Terminal size={12} style={{ color: 'var(--c-accent)' }} />
              POLARIS BOOT TELEMETRY
            </div>
            <div className="space-y-1.5 text-xs">
              {bootMessages.slice(0, bootStep + 1).map((msg, i) => (
                <div key={i} className="flex items-center gap-2" style={{ color: i === bootStep ? 'var(--c-text-primary)' : 'var(--c-text-muted)' }}>
                  <span style={{ color: 'var(--c-accent)' }}>›</span>
                  <span className="tracking-wider">{msg}</span>
                  {i === bootStep && <span className="inline-block w-2 h-3.5 animate-blink" style={{ background: 'var(--c-accent)' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GRID CANVAS ───────────────────────────────────────────────────── */}
      <div className="grid-canvas" />

      {/* Concentric circle decoration */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{ opacity: 0.06 }}>
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid var(--c-border)' }} />
        <div className="absolute inset-16 rounded-full" style={{ border: '1px solid var(--c-border)' }} />
        <div className="absolute inset-32 rounded-full animate-radar" style={{ border: '1px solid var(--c-accent)', borderStyle: 'dashed' }} />
        <div className="absolute inset-48 rounded-full" style={{ border: '1px solid var(--c-border)' }} />
        <div className="absolute top-1/2 left-0 w-full h-px" style={{ background: 'var(--c-border)' }} />
        <div className="absolute left-1/2 top-0 w-px h-full" style={{ background: 'var(--c-border)' }} />
      </div>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center mt-6 md:mt-10">
        <div className="chip chip-safe flex items-center gap-1.5 mb-6">
          <ShieldCheck size={11} />
          SMART INDIA HACKATHON 2026 · SIH26143 · NTRO
        </div>

        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-[0.2em] uppercase" style={{ color: 'var(--c-text-primary)' }}>
          POLARIS
        </h1>

        <p className="mt-3 text-lg sm:text-xl font-bold tracking-widest uppercase" style={{ color: 'var(--c-accent)' }}>
          Probabilistic Maritime Pollution Attribution Engine
        </p>

        <p className="mt-5 text-sm text-center max-w-2xl leading-relaxed font-sans" style={{ color: 'var(--c-text-muted)' }}>
          Reconstruct marine oil slick trajectories using backward Lagrangian advection,
          satellite SAR deep segmentation (Sentinel-1 / RADARSAT-2), and high-resolution AIS
          kinematic anomaly modelling. Forensic intelligence without false assumptions of static slick geometry.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          <button
            onClick={() => navigate('/workspace')}
            className="px-7 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors flex items-center gap-2"
            style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            START INVESTIGATION
            <ArrowRight size={15} />
          </button>

          <button
            onClick={() => navigate('/simulation')}
            className="px-6 py-2.5 text-sm font-bold tracking-widest uppercase transition-colors underline underline-offset-4"
            style={{ color: 'var(--c-accent)', background: 'transparent', border: 'none' }}
          >
            Explore Demo
          </button>
        </div>
      </div>

      {/* ── CAPABILITY CARDS ──────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-5 my-10">
        {[
          {
            icon: Satellite,
            title: 'SAR Segmentation',
            desc: 'DeepLabv3-ResNet50 with DeCUR SAR backbone. Lee speckle filtering and geodesic GeoJSON extraction from calibrated radar backscatter.',
            sub: 'SENTINEL-1A C-BAND IW',
            link: '/library',
            linkLabel: 'SAR Library',
            accentKey: 'accent',
          },
          {
            icon: Compass,
            title: 'Oceanographic Drift',
            desc: 'Backward advection with stochastic diffusion under CMEMS currents and windage vectors (0.031). 95% origin probability zones.',
            sub: 'OPEN-DRIFT LAGRANGIAN',
            link: '/simulation',
            linkLabel: 'Simulation Studio',
            accentKey: 'accent',
          },
          {
            icon: Ship,
            title: 'Vessel Attribution',
            desc: 'Multi-factor kinematic ranking: AIS gap blackouts, speed drops, course deviations and CPA to reconstructed release epicentre.',
            sub: 'DUCKDB AIS KINEMATICS',
            link: '/workspace',
            linkLabel: 'Workspace',
            accentKey: 'safe',
          },
        ].map(({ icon: Icon, title, desc, sub, link, linkLabel }) => (
          <div
            key={title}
            onClick={() => navigate(link)}
            className="cursor-pointer p-5 flex flex-col justify-between transition-colors group"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-accent)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-border)')}
          >
            <div>
              <div className="relative h-32 w-full mb-4 flex items-center justify-center" style={{ background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px' }}>
                <Icon size={36} style={{ color: 'var(--c-accent)', opacity: 0.7 }} />
                <div className="absolute bottom-2 left-2 text-[9px] tracking-widest uppercase font-mono" style={{ color: 'var(--c-text-muted)' }}>{sub}</div>
              </div>
              <h3 className="text-sm font-bold tracking-wider uppercase mb-1.5" style={{ color: 'var(--c-accent)' }}>{title}</h3>
              <p className="text-[11px] leading-relaxed font-sans" style={{ color: 'var(--c-text-muted)' }}>{desc}</p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-accent)' }}>
              <span>{linkLabel}</span>
              <ArrowRight size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
        <div className="flex items-center gap-3">
          <span className="font-bold" style={{ color: 'var(--c-accent)' }}>POLARIS v2.4-FORENSIC</span>
          <span>·</span><span>NTRO / SIH26143</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold" style={{ color: 'var(--c-safe)' }}>STATUS: OPERATIONAL</span>
          <span>·</span><span>CLEARANCE: LEVEL-3</span>
        </div>
      </footer>
    </div>
  );
};
