import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import { Radio, Wifi, Satellite, AlertTriangle, Activity, Layers, Clock } from 'lucide-react';
import { demoLiveAnomalies, LiveAnomaly } from '../data/demoData';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColours } from '../hooks/useThemeColours';
import { cn } from '../utils/cn';

const FlyTo: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  React.useEffect(() => { if (target) map.flyTo(target, 7, { duration: 1.5 }); }, [target, map]);
  return null;
};

const ps: React.CSSProperties = { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' };

export const LiveMonitor: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const col = useThemeColours();
  const isDark = theme === 'dark';

  const [selected, setSelected] = useState<LiveAnomaly | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [heatmapActive, setHeatmapActive] = useState(true);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const markerColor = (type: LiveAnomaly['type']) =>
    type === 'SAR Slick'       ? col.oil :
    type === 'AIS Dark Target' ? col.warn :
    col.accent;

  const satPasses = [
    { sat: 'SENTINEL-1A', orbit: 'REV-48912', eta: '12m 40s', region: 'Strait of Malacca' },
    { sat: 'SENTINEL-1B', orbit: 'REV-39104', eta: '44m 10s', region: 'Gulf of Mexico'    },
    { sat: 'RADARSAT-2',  orbit: 'REV-82019', eta: '1h 22m',  region: 'North Sea'         },
    { sat: 'CAPELLA-7',   orbit: 'REV-14205', eta: '2h 05m',  region: 'Persian Gulf'      },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden select-none font-mono">
      {/* Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={[20.0, 10.0]} zoom={3} zoomControl={false} className="w-full h-full">
          <FlyTo target={flyTarget} />
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={18}
            className={isDark ? 'map-dark-tiles' : ''}
          />
          {demoLiveAnomalies.map((anom) => {
            const sel = selected?.id === anom.id;
            const c = markerColor(anom.type);
            return (
              <CircleMarker key={anom.id} center={anom.coordinates} radius={sel ? 11 : 7}
                pathOptions={{ color: 'white', fillColor: c, fillOpacity: 0.9, weight: sel ? 2.5 : 1.5 }}
                eventHandlers={{ click: () => { setSelected(anom); setFlyTarget(anom.coordinates); } }}>
                <Tooltip permanent direction="top" offset={[0, -10]}>
                  <div className="font-mono text-[10px]" style={{ color: 'var(--c-text-primary)', background: 'var(--c-surface)', padding: '3px 6px' }}>
                    <div className="font-bold">{anom.title}</div>
                    <div style={{ color: 'var(--c-text-muted)', fontSize: '9px' }}>Conf {(anom.confidence*100).toFixed(0)}% · {anom.timestamp}</div>
                  </div>
                </Tooltip>
                <Popup>
                  <div className="p-1 font-mono text-xs" style={{ color: 'var(--c-text-primary)' }}>
                    <div className="font-bold uppercase" style={{ color: c }}>{anom.title}</div>
                    <div className="text-[10px] my-1" style={{ color: 'var(--c-text-muted)' }}>{anom.region}</div>
                    <div className="text-[9px]" style={{ color: 'var(--c-text-muted)' }}>Type: {anom.type} · {anom.status}</div>
                    <button onClick={() => navigate('/workspace?case=CAS-2026-089')}
                      className="mt-2 w-full py-1 text-[10px] font-bold uppercase" style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', borderRadius: '2px' }}>
                      Open in Workspace
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Top header */}
      <div className="absolute top-3 left-3 right-3 z-20 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3" style={ps}>
        <div>
          <div className="flex items-center gap-2">
            <Radio size={14} style={{ color: 'var(--c-accent)' }} className="animate-pulse" />
            <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>Live Monitor & Telemetry</h1>
          </div>
          <p className="text-[10px] mt-0.5 font-sans" style={{ color: 'var(--c-text-muted)' }}>Real-time global tracking of SAR satellite passes and AIS anomalies.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="chip chip-safe flex items-center gap-1.5"><Wifi size={11} />SAT LINK: STABLE</div>
          <div className="chip chip-accent flex items-center gap-1.5"><Activity size={11} className="animate-pulse" />AIS FEED: LIVE</div>
          <button onClick={() => setHeatmapActive(!heatmapActive)}
            className={cn('chip', heatmapActive ? 'chip-accent' : 'chip-muted')}
            style={{ cursor: 'pointer' }}>
            <Layers size={11} />Global Heatmap{heatmapActive ? ' Active' : ' Off'}
          </button>
        </div>
      </div>

      {/* Left panel: anomalies */}
      <div className="absolute left-3 top-24 bottom-3 z-20 w-80 flex flex-col overflow-hidden" style={ps}>
        <div className="p-2.5 flex items-center justify-between" style={{ background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
            <AlertTriangle size={12} style={{ color: col.warn }} />
            Real-Time Anomalies ({demoLiveAnomalies.length})
          </div>
          <span className="chip chip-safe animate-pulse">LIVE</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {demoLiveAnomalies.map((anom) => {
            const sel = selected?.id === anom.id;
            return (
              <div key={anom.id} onClick={() => { setSelected(anom); setFlyTarget(anom.coordinates); }}
                className="p-2.5 cursor-pointer transition-colors"
                style={{ border: `1px solid ${sel ? 'var(--c-accent)' : 'var(--c-border)'}`, borderRadius: '2px', background: sel ? 'var(--c-surface-alt)' : 'transparent', borderLeft: `3px solid ${markerColor(anom.type)}` }}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--c-text-primary)' }}>{anom.title}</span>
                  <span className="text-[9px]" style={{ color: 'var(--c-text-muted)' }}>{anom.timestamp}</span>
                </div>
                <div className="text-[9px] font-sans truncate mb-1.5" style={{ color: 'var(--c-text-muted)' }}>{anom.region}</div>
                <div className="flex items-center justify-between text-[9px] pt-1.5" style={{ borderTop: '1px solid var(--c-border)' }}>
                  <span className="font-mono font-bold" style={{ color: markerColor(anom.type) }}>{(anom.confidence*100).toFixed(0)}%</span>
                  <span className="chip chip-muted" style={{ fontSize: '8px' }}>{anom.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel: satellite passes */}
      <div className="absolute right-3 top-24 z-20 w-72 overflow-hidden" style={ps}>
        <div className="p-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
          <Satellite size={12} style={{ color: 'var(--c-accent)' }} />Next SAR Passes
        </div>
        <div className="p-2.5 space-y-2">
          {satPasses.map((p) => (
            <div key={p.sat} className="p-2 flex items-center justify-between text-[10px]" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
              <div>
                <div className="font-bold" style={{ color: 'var(--c-accent)' }}>{p.sat}</div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: '9px' }}>{p.region}</div>
              </div>
              <div className="text-right">
                <div className="font-bold font-mono tabular-nums" style={{ color: col.warn }}>{p.eta}</div>
                <div style={{ color: 'var(--c-text-muted)', fontSize: '8px' }}>{p.orbit}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
