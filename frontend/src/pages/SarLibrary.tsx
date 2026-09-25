import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Satellite, Search, MapPin, ArrowRight } from 'lucide-react';
import { demoSarImages } from '../data/demoData';
import { SarImage } from '../types';
import { cn } from '../utils/cn';

const ps: React.CSSProperties = { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const as_: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const inp: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-primary)', padding: '5px 10px', fontFamily: 'monospace', fontSize: '11px' };

export const SarLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [selectedImage, setSelectedImage] = useState<SarImage | null>(null);

  const filtered = demoSarImages.filter((img) => {
    const q = search.toLowerCase();
    const ms = !q || img.id.toLowerCase().includes(q) || img.location.toLowerCase().includes(q) || img.platform.toLowerCase().includes(q);
    return ms && (platformFilter === 'ALL' || img.platform.includes(platformFilter)) && (modeFilter === 'ALL' || img.mode === modeFilter);
  });

  return (
    <div className="w-full h-full overflow-y-auto p-5 md:p-8 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <Layers size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>SAR Image Library</h1>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>Satellite radar acquisitions, calibrated backscatter scenes, and segmentation telemetry.</p>
          </div>
          <div className="chip chip-accent">{demoSarImages.length} ACQUISITIONS</div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3" style={as_}>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search size={13} style={{ color: 'var(--c-text-muted)' }} />
            <input placeholder="SEARCH BY ID, LOCATION, SATELLITE..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[11px] tracking-wider uppercase focus:outline-none w-full" style={{ color: 'var(--c-text-primary)' }} />
          </div>
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--c-text-muted)' }}>PLATFORM:</span>
              <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="ALL">ALL</option>
                <option value="Sentinel-1">SENTINEL-1</option>
                <option value="RADARSAT-2">RADARSAT-2</option>
                <option value="Capella">CAPELLA</option>
                <option value="Iceye">ICEYE</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--c-text-muted)' }}>MODE:</span>
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="ALL">ALL</option>
                <option value="IW GRD">IW GRD</option>
                <option value="EW GRD">EW GRD</option>
                <option value="ScanSAR">ScanSAR</option>
                <option value="Stripmap">Stripmap</option>
                <option value="Spotlight">Spotlight</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <div key={img.id} onClick={() => setSelectedImage(img)}
              className="p-4 flex flex-col justify-between cursor-pointer transition-colors group"
              style={ps}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-border)')}>
              {/* Thumbnail */}
              <div className="relative h-32 w-full mb-3 flex items-center justify-center" style={{ background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px' }}>
                <div className="absolute inset-0 opacity-[0.06]"
                  style={{ backgroundImage: `radial-gradient(circle, var(--c-border) 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />
                <div className="relative z-10 px-4 py-3 text-[9px] tracking-widest uppercase font-bold text-center" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)' }}>
                  σ° SLICK MASK
                </div>
                <div className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)' }}>{img.platform}</div>
                <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-accent)', borderRadius: '2px', color: 'var(--c-accent)' }}>{img.mode}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--c-accent)' }}>{img.id}</span>
                  <span className="text-[9px]" style={{ color: 'var(--c-text-muted)' }}>{img.size}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold mb-2 truncate" style={{ color: 'var(--c-text-primary)' }}>
                  <MapPin size={10} style={{ color: 'var(--c-text-muted)' }} />
                  <span className="truncate">{img.location}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] py-2" style={{ borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
                  <div><span className="block uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Acquired</span><span style={{ color: 'var(--c-text-primary)' }}>{img.acquiredDate}</span></div>
                  <div><span className="block uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Polarization</span><span style={{ color: 'var(--c-text-primary)' }}>{img.polarization}</span></div>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span style={{ color: 'var(--c-text-muted)' }}>Oil Probability</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--c-oil)' }}>{(img.oilProbability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${img.oilProbability * 100}%`, background: 'var(--c-oil)' }} /></div>
                </div>
              </div>

              <div className="mt-3 pt-2 flex items-center justify-between text-[9px] uppercase tracking-wider" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-accent)' }}>
                <span>Inspect Telemetry</span>
                <ArrowRight size={11} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Telemetry modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl animate-fade-in" style={ps}>
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2">
                <Satellite size={16} style={{ color: 'var(--c-accent)' }} />
                <div>
                  <div className="text-sm font-bold tracking-wide" style={{ color: 'var(--c-text-primary)' }}>{selectedImage.id} — Telemetry Inspector</div>
                  <div className="text-[10px]" style={{ color: 'var(--c-text-muted)' }}>{selectedImage.platform} · {selectedImage.mode} · {selectedImage.resolution}</div>
                </div>
              </div>
              <button onClick={() => setSelectedImage(null)} style={{ color: 'var(--c-text-muted)', fontSize: '18px' }}>×</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                {[['Orbit Pass', selectedImage.orbitPass],['Polarization', selectedImage.polarization],['File Size', selectedImage.size],['Resolution', selectedImage.resolution]].map(([k, v]) => (
                  <div key={k} className="p-2.5" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
                    <span className="block text-[8px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>{k}</span>
                    <span className="font-bold" style={{ color: 'var(--c-text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 flex items-center justify-between text-[10px]" style={{ border: '1px solid var(--c-border)', borderRadius: '2px' }}>
                <span style={{ color: 'var(--c-text-muted)' }}>Scene Centre:</span>
                <span className="font-bold font-mono" style={{ color: 'var(--c-accent)' }}>{selectedImage.sceneCenter}</span>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--c-surface-alt)', borderTop: '1px solid var(--c-border)' }}>
              <button onClick={() => { setSelectedImage(null); navigate('/workspace?case=CAS-2026-089'); }}
                className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-opacity"
                style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity='0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity='1')}>
                Load in Workspace <ArrowRight size={12} />
              </button>
              <button onClick={() => setSelectedImage(null)} className="px-4 py-1.5 text-[10px] uppercase tracking-wider" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
