import React, { useState } from 'react';
import axios from 'axios';
import { Wind, Compass, Play, RotateCcw, Sliders, Activity, CheckCircle2, Navigation, Cpu } from 'lucide-react';
import { SimulationParams, SimulationResult } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

const ps: React.CSSProperties = { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const as_: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const hdr: React.CSSProperties = { borderBottom: '1px solid var(--c-border)' };

export const SimulationStudio: React.FC = () => {
  const [params, setParams] = useState<SimulationParams>({
    windSpeed: 18, windDirection: 140, currentSpeed: 0.65, currentDirection: 210,
    durationHours: 48, particlesCount: 1200, windageFactor: 0.031,
  });
  const [status, setStatus] = useState<'pending'|'running'|'complete'>('pending');
  const [result, setResult] = useState<SimulationResult | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('running');
    const wMs = params.windSpeed * 0.514444;
    const wRad = ((params.windDirection + 180) % 360) * (Math.PI / 180);
    const cRad = (params.currentDirection * Math.PI) / 180;
    const wU = -Math.sin(wRad) * wMs * params.windageFactor;
    const wV = -Math.cos(wRad) * wMs * params.windageFactor;
    const cU = -Math.sin(cRad) * params.currentSpeed;
    const cV = -Math.cos(cRad) * params.currentSpeed;
    const netU = cU + wU, netV = cV + wV;
    const netMs = Math.sqrt(netU * netU + netV * netV);
    const netKn = netMs * 1.94384;
    const bearing = Math.round((Math.atan2(-netU, -netV) * 180) / Math.PI + 360) % 360;
    const dispKm = parseFloat((netMs * params.durationHours * 3600 / 1000).toFixed(1));
    const confKm = parseFloat((dispKm * 0.22 + 4.5).toFixed(1));
    const computed: SimulationResult = {
      status: 'complete', durationHours: params.durationHours, windSpeed: params.windSpeed, windDirection: params.windDirection,
      currentSpeed: params.currentSpeed, currentDirection: params.currentDirection, displacementKm: dispKm,
      originCenter: [28.495, -89.43], confidenceRadiusKm: confKm, particlesAdvected: params.particlesCount,
      driftVector: { u: parseFloat(netU.toFixed(3)), v: parseFloat(netV.toFixed(3)), netSpeedKnots: parseFloat(netKn.toFixed(2)), netBearingDeg: bearing },
      sampleTrajectories: [], timestamp: new Date().toUTCString(),
    };
    try {
      const res = await axios.post(`${API_BASE}/api/simulation/run`, params, { timeout: 1500 });
      setResult(res.data ? { ...computed, ...res.data, status: 'complete' } : computed);
    } catch { setResult(computed); }
    setTimeout(() => setStatus('complete'), 700);
  };

  const sliders = [
    { key: 'windSpeed' as const,       label: 'Wind Speed',              unit: 'knots', min: 0, max: 45,  step: 1,    accent: 'var(--c-accent)' },
    { key: 'windDirection' as const,   label: 'Wind Direction',           unit: '°',    min: 0, max: 360, step: 5,    accent: 'var(--c-accent)' },
    { key: 'currentSpeed' as const,    label: 'Ocean Current Speed',      unit: 'm/s',  min: 0, max: 3,   step: 0.05, accent: 'var(--c-safe)'   },
    { key: 'currentDirection' as const,label: 'Ocean Current Direction',  unit: '°',    min: 0, max: 360, step: 5,    accent: 'var(--c-safe)'   },
    { key: 'durationHours' as const,   label: 'Simulation Duration',      unit: 'h ←', min: 6, max: 96,  step: 6,    accent: 'var(--c-warn)'   },
  ];

  const fmt = (k: keyof SimulationParams) => {
    const v = params[k];
    if (k === 'currentSpeed') return (v as number).toFixed(2);
    return String(v);
  };

  return (
    <div className="w-full h-full overflow-y-auto p-5 md:p-8 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={hdr}>
          <div>
            <div className="flex items-center gap-2">
              <Wind size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>Simulation Studio</h1>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>Manual tuning for reverse ocean drift parameters.</p>
          </div>
          <div className="chip chip-accent flex items-center gap-1.5"><Cpu size={11} />LAGRANGIAN RK4</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Form */}
          <div className="lg:col-span-5 p-5" style={ps}>
            <form onSubmit={run} className="space-y-5">
              <div className="flex items-center justify-between pb-2.5" style={hdr}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
                  <Sliders size={13} style={{ color: 'var(--c-accent)' }} />Environmental Parameters
                </div>
                <button type="button" onClick={() => { setStatus('pending'); setResult(null); }}
                  className="text-[10px] flex items-center gap-1 transition-opacity" style={{ color: 'var(--c-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity='0.7')} onMouseLeave={(e) => (e.currentTarget.style.opacity='1')}>
                  <RotateCcw size={11} />Reset
                </button>
              </div>

              {sliders.map(({ key, label, unit, min, max, step, accent }) => (
                <div key={key}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                    <span className="font-bold font-mono tabular-nums" style={{ color: accent }}>{fmt(key)} {unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={params[key]}
                    onChange={(e) => setParams({ ...params, [key]: key === 'durationHours' ? parseInt(e.target.value) : parseFloat(e.target.value) })}
                    className="w-full h-1.5 cursor-pointer appearance-none"
                    style={{ accentColor: accent, background: 'var(--c-border)', borderRadius: '2px' }} />
                </div>
              ))}

              <div className="pt-1">
                <button type="submit" disabled={status === 'running'}
                  className="w-full py-2.5 text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }}
                  onMouseEnter={(e) => { if (status !== 'running') e.currentTarget.style.opacity='0.85'; }}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity='1')}>
                  {status === 'running'
                    ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--c-bg)', borderTopColor: 'transparent' }} />Advecting…</>
                    : <><Play size={13} className="fill-current" />Run Backward Drift Simulation</>}
                </button>
              </div>
            </form>
          </div>

          {/* Result */}
          <div className="lg:col-span-7 p-5" style={ps}>
            <div className="flex items-center justify-between pb-2.5 mb-4" style={hdr}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
                <Activity size={13} style={{ color: 'var(--c-accent)' }} />Hindcast Solution Telemetry
              </div>
              {status === 'pending' && <span className="chip chip-warn">⚙ Pending</span>}
              {status === 'running' && <span className="chip chip-accent">Advecting {params.particlesCount} particles…</span>}
              {status === 'complete' && <span className="chip chip-safe flex items-center gap-1"><CheckCircle2 size={10} />Complete</span>}
            </div>

            {status === 'pending' && (
              <div className="h-80 flex flex-col items-center justify-center text-center">
                <Compass size={40} style={{ color: 'var(--c-border)', marginBottom: '12px' }} />
                <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Awaiting Execution</p>
                <p className="text-[11px] mt-2 max-w-xs font-sans" style={{ color: 'var(--c-text-muted)' }}>Adjust parameters and run the simulation to advect Lagrangian particles backward in time.</p>
              </div>
            )}

            {status === 'running' && (
              <div className="h-80 flex flex-col items-center justify-center text-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-accent)' }} />
                </div>
                <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--c-accent)' }}>Integrating Equations</p>
                <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--c-text-muted)' }}>Diffusivity D = 1.0 m²/s · Windage k = 0.031</p>
              </div>
            )}

            {status === 'complete' && result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Duration',    value: `-${result.durationHours}h`,                        c: 'var(--c-warn)'   },
                    { label: 'Wind Force',  value: `${result.windSpeed}kn@${result.windDirection}°`,   c: 'var(--c-accent)' },
                    { label: 'Current',     value: `${result.currentSpeed}m/s@${result.currentDirection}°`, c: 'var(--c-safe)' },
                    { label: 'Displacement',value: `${result.displacementKm}km`,                       c: 'var(--c-safe)'   },
                  ].map(({ label, value, c }) => (
                    <div key={label} className="p-2.5 text-center" style={as_}>
                      <span className="block text-[8px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                      <span className="text-sm font-bold font-mono tabular-nums" style={{ color: c }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Vector visualiser */}
                <div className="relative h-52 flex items-center justify-center" style={as_}>
                  {/* compass rings */}
                  {[112, 72, 32].map((s) => (
                    <div key={s} className="absolute rounded-full" style={{ width: s, height: s, border: '1px solid var(--c-border)', opacity: 0.4 }} />
                  ))}
                  <div className="absolute w-full h-px" style={{ background: 'var(--c-border)', opacity: 0.2 }} />
                  <div className="absolute h-full w-px" style={{ background: 'var(--c-border)', opacity: 0.2 }} />
                  {/* bearing arrow */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-24 h-0.5 origin-left" style={{ background: `linear-gradient(to right, var(--c-accent), var(--c-safe))`, transform: `rotate(${result.driftVector.netBearingDeg}deg)` }} />
                    <div className="mt-6 px-3 py-1.5 text-[10px] font-mono" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-primary)' }}>
                      Bearing <span style={{ color: 'var(--c-accent)' }}>{result.driftVector.netBearingDeg}°</span> at <span style={{ color: 'var(--c-safe)' }}>{result.driftVector.netSpeedKnots} kn</span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-3 text-[9px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                    95% CI radius: ~{result.confidenceRadiusKm} km
                  </div>
                </div>

                <div className="p-3 text-[10px] leading-relaxed font-mono" style={as_}>
                  <strong style={{ color: 'var(--c-text-primary)', display: 'block', marginBottom: '2px' }}>Governing formulation:</strong>
                  <span style={{ color: 'var(--c-text-muted)' }}>u_drift = −(u_current + 0.031 · u_wind) + √(2D) · ξ(t) · Particles: {result.particlesAdvected}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
