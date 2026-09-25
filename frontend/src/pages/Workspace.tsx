import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import axios from 'axios';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Layers,
  Ship,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { demoCases, getGeometryForCase } from '../data/demoData';
import { MapLayerVisibility, CandidateVessel, CaseItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColours } from '../hooks/useThemeColours';
import { cn } from '../utils/cn';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

/* ── Map Tile Layer Configurations (Keyless OpenStreetMap & Esri URLs) ───── */
function buildMapModes(isDark: boolean) {
  return {
    DARK: {
      name: 'DARK MAP',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    SATELLITE: {
      name: 'ESRI SATELLITE',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    },
    STREET: {
      name: 'STREET MAP',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    TOPO: {
      name: 'ESRI TOPO',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, HERE, Garmin, USGS',
    },
  } as const;
}
type MapModeKey = 'DARK' | 'SATELLITE' | 'STREET' | 'TOPO';

/* ── Leaflet Helper Sub-components ────────────────────────────────────────── */
const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({
  center,
  zoom = 10,
}) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom, map]);
  return null;
};

const CursorTracker: React.FC<{ onMove: (lat: number, lng: number) => void }> = ({ onMove }) => {
  useMapEvents({ mousemove(e) { onMove(e.latlng.lat, e.latlng.lng); } });
  return null;
};

/* ── Corner Bracket Frame Decoration ───────────────────────────────────────── */
const BracketCorners: React.FC = () => (
  <>
    <span className="bracket-bottom-left" />
    <span className="bracket-bottom-right" />
  </>
);

/* ── Main Workspace Component ─────────────────────────────────────────────── */
export const Workspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const col = useThemeColours();
  const isDark = theme === 'dark';

  const MAP_MODES = useMemo(() => buildMapModes(isDark), [isDark]);

  const caseIdParam = searchParams.get('case') || 'case_01_gulf_mexico';

  // Backend vs Demo state
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [encoderInit, setEncoderInit] = useState<string>('UNKNOWN');
  const [driftMode, setDriftMode] = useState<string>('fallback');

  // Active case data
  const [caseSummary, setCaseSummary] = useState<CaseItem | null>(null);
  const [spillPolygon, setSpillPolygon] = useState<[number, number][]>([]);
  const [originPolygon, setOriginPolygon] = useState<[number, number][]>([]);
  const [originCenter, setOriginCenter] = useState<[number, number]>([28.38, -89.15]);
  const [isoRings, setIsoRings] = useState<Array<{ probability: number; label: string; points: [number, number][] }>>([]);
  const [particles, setParticles] = useState<Array<{ id: number; positions: Array<{ timeH: number; lat: number; lng: number }> }>>([]);
  const [candidates, setCandidates] = useState<CandidateVessel[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.38, -89.15]);

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateVessel | null>(null);
  const [mapMode, setMapMode] = useState<MapModeKey>('DARK');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [layers, setLayers] = useState<MapLayerVisibility>({
    spill: true, heatmap: true, bathymetry: true, oceanCurrents: true,
    uncertaintyEllipses: true, isoRings: true, particles: true, aisTracks: true, geoLabels: true,
  });
  const [cursorPos, setCursorPos] = useState({ lat: 28.4133, lng: -90.1263 });
  const simulatedDepth = useMemo(() => {
    const v = Math.abs(Math.sin(cursorPos.lat * 12) * Math.cos(cursorPos.lng * 8)) * 1400 + 450;
    return Math.round(v);
  }, [cursorPos.lat, cursorPos.lng]);

  // Timeline controls
  const [currentTimeH, setCurrentTimeH] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  /* ── Fetch Real Backend Data (with fallback to demoData.ts) ───────────── */
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    const loadData = async () => {
      try {
        // Parallel backend requests for case details, detection, drift, and candidates
        const [sumRes, detRes, driftRes, candRes] = await Promise.all([
          axios.get(`${API_BASE}/api/cases/${caseIdParam}`, { timeout: 3000 }),
          axios.get(`${API_BASE}/api/detection/${caseIdParam}`, { timeout: 3000 }),
          axios.get(`${API_BASE}/api/drift/${caseIdParam}`, { timeout: 3000 }),
          axios.get(`${API_BASE}/api/attribution/${caseIdParam}`, { timeout: 3000 }),
        ]);

        if (!isSubscribed) return;

        setBackendOnline(true);
        const sum = sumRes.data;
        const det = detRes.data;
        const drift = driftRes.data;
        const cands = candRes.data;

        if (det?.encoder_init) setEncoderInit(det.encoder_init.toUpperCase());
        if (det?.drift_mode) setDriftMode(det.drift_mode.toUpperCase());

        const centerPt: [number, number] = [det.centroid_lat ?? 28.38, det.centroid_lon ?? -89.15];
        setMapCenter(centerPt);

        // Case Summary item
        const caseItem: CaseItem = {
          id: sum.case_id,
          title: sum.title,
          date: new Date(sum.detection_timestamp).toISOString().split('T')[0],
          status: sum.status === 'ANALYZED' ? 'ACTIVE INVESTIGATION' : 'PENDING AIS DATA',
          region: sum.region,
          severity: sum.spill_area_sqkm > 15 ? 'CRITICAL' : sum.spill_area_sqkm > 10 ? 'HIGH' : 'MODERATE',
          center: centerPt,
          spillAreaKm2: det.surface_area_sqkm ?? sum.spill_area_sqkm,
          confidence: det.detection_confidence ?? 0.88,
          satellite: sum.satellite_mission,
          sensor: 'C-Band SAR (IW GRD)',
          estimatedVolumeBbl: Math.round((det.surface_area_sqkm ?? 12.0) * 110),
          dischargeType: sum.incident_type,
          incidentSummary: `Real-time SAR analysis and reverse drift hindcast for ${sum.title}.`,
        };
        setCaseSummary(caseItem);

        // Parse GeoJSON spill polygon
        if (det.polygon_geojson && det.polygon_geojson.coordinates && det.polygon_geojson.coordinates[0]) {
          const rawCoords = det.polygon_geojson.coordinates[0];
          const leafletCoords: [number, number][] = rawCoords.map((c: [number, number]) => [c[1], c[0]]);
          setSpillPolygon(leafletCoords);
        } else {
          // Fallback circle approximation
          const [clat, clon] = centerPt;
          const poly: [number, number][] = Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return [clat + 0.04 * Math.cos(angle), clon + 0.06 * Math.sin(angle)];
          });
          setSpillPolygon(poly);
        }

        // Origin details
        const origLat = drift.most_probable_origin_lat ?? centerPt[0];
        const origLon = drift.most_probable_origin_lon ?? centerPt[1];
        setOriginCenter([origLat, origLon]);

        // Probability rings
        if (drift.probability_rings && drift.probability_rings.length > 0) {
          const parsedRings = drift.probability_rings.map((r: any) => ({
            probability: (r.confidence_percent ?? 90) / 100,
            label: `${r.confidence_percent ?? 90}% Confidence Ring`,
            points: (r.coordinates || []).map((pt: [number, number]) => [pt[0], pt[1]] as [number, number]),
          }));
          setIsoRings(parsedRings);
          const outerRing = parsedRings.find((r: any) => r.probability >= 0.9) || parsedRings[0];
          if (outerRing && outerRing.points.length > 0) {
            setOriginPolygon(outerRing.points);
          }
        } else {
          // Generate estimated origin polygon from spatial uncertainty
          const rKm = drift.spatial_uncertainty_km ?? 10.0;
          const dLat = rKm / 111.32;
          const dLon = rKm / (111.32 * Math.cos((origLat * Math.PI) / 180));
          const origPoly: [number, number][] = Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return [origLat + dLat * Math.cos(angle), origLon + dLon * Math.sin(angle)];
          });
          setOriginPolygon(origPoly);
        }

        // Drift Particles
        if (drift.sample_trajectories && drift.sample_trajectories.length > 0) {
          const parsedParticles = drift.sample_trajectories.map((traj: any, idx: number) => {
            const steps = (traj.steps || []).map((st: any) => ({
              timeH: st.time_offset_hours ?? 0,
              lat: st.lat,
              lng: st.lon,
            }));
            return { id: traj.particle_id ?? idx, positions: steps };
          });
          setParticles(parsedParticles);
        }

        // Candidate Vessels
        if (Array.isArray(cands)) {
          const tObs = new Date(det.acquisition_time || Date.now()).getTime();
          const parsedCandidates: CandidateVessel[] = cands.map((c: any) => {
            const trackPoints = (c.waypoints || []).map((wp: any) => {
              const wpTime = new Date(wp.timestamp).getTime();
              const deltaH = (wpTime - tObs) / 3600000.0;
              return {
                timeH: parseFloat(deltaH.toFixed(1)),
                lat: wp.lat,
                lng: wp.lon,
                speedKnots: wp.sog_knots ?? 12.0,
                heading: wp.heading ?? wp.cog_degrees ?? 0,
              };
            });

            const anomaliesList: string[] = Array.isArray(c.anomaly_flags)
              ? c.anomaly_flags.map((a: any) => (typeof a === 'string' ? a : `${a.flag_type}: ${a.description}`))
              : [];

            return {
              id: c.mmsi,
              name: c.vessel_name,
              mmsi: c.mmsi,
              type: c.vessel_type,
              flag: c.flag_country || 'Commercial Flag',
              flagCode: (c.flag_country || '').slice(-3, -1) || 'UN',
              lastPort: c.lastPort || 'LAST COMMERCIAL PORT',
              destination: c.destination_port || 'DESTINATION PORT',
              spatialScore: c.sub_scores?.spatial_compatibility ?? 0.85,
              temporalScore: c.sub_scores?.temporal_compatibility ?? 0.80,
              behaviorScore: c.sub_scores?.behavioral_anomaly ?? 0.50,
              overallScore: c.overall_score ?? 0.75,
              priority: (c.priority_tier === 'HIGH' ? 'HIGH' : c.priority_tier === 'MEDIUM' ? 'MEDIUM' : 'LOW') as any,
              wordingLabel: 'Priority Investigative Candidate',
              imo: c.imo ?? 'IMO 9000000',
              callSign: c.callsign ?? 'CALLSIGN',
              cpaToOriginKm: c.closest_approach_km,
              timeToOriginDeltaH: c.temporal_overlap_hours,
              anomalies: anomaliesList,
              track: trackPoints,
            };
          });
          setCandidates(parsedCandidates);
        }

        setLoading(false);
      } catch (err) {
        if (!isSubscribed) return;
        // Fallback to hardcoded demoData.ts when backend is offline
        setBackendOnline(false);
        setEncoderInit('DEMO DATA');
        setDriftMode('FALLBACK');

        const fallbackCase = demoCases.find((c) => c.id === caseIdParam) || demoCases[0];
        setCaseSummary(fallbackCase);
        setMapCenter(fallbackCase.center);

        const geo = getGeometryForCase(fallbackCase.id);
        setSpillPolygon(geo.spillPolygon);
        setOriginPolygon(geo.originPolygon);
        setOriginCenter(geo.originCenter);
        setIsoRings(geo.isoRings);
        setParticles(geo.particles);
        setCandidates(geo.candidates as any);
        setLoading(false);
      }
    };

    loadData();

    return () => { isSubscribed = false; };
  }, [caseIdParam]);

  // Animation timeline loop
  useEffect(() => {
    if (!isPlaying) { if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setCurrentTimeH((prev) => {
        const next = prev + delta * 3 * playbackSpeed;
        if (next >= 0) { setIsPlaying(false); return 0; }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, playbackSpeed]);

  const activeCase = caseSummary || demoCases[0];

  const interpolatedVessels = useMemo(() => {
    return candidates.map((cand) => {
      const track = cand.track;
      if (!track || !track.length) return { ...cand, currentPos: mapCenter as [number, number], heading: 0, speed: 0 };
      let p1 = track[0], p2 = track[track.length - 1];
      for (let i = 0; i < track.length - 1; i++) {
        if (currentTimeH >= track[i].timeH && currentTimeH <= track[i + 1].timeH) {
          p1 = track[i]; p2 = track[i + 1]; break;
        }
      }
      if (currentTimeH <= track[0].timeH) return { ...cand, currentPos: [track[0].lat, track[0].lng] as [number, number], heading: track[0].heading, speed: track[0].speedKnots };
      if (currentTimeH >= track[track.length - 1].timeH) { const l = track[track.length - 1]; return { ...cand, currentPos: [l.lat, l.lng] as [number, number], heading: l.heading, speed: l.speedKnots }; }
      const frac = p2.timeH === p1.timeH ? 0 : (currentTimeH - p1.timeH) / (p2.timeH - p1.timeH);
      return { ...cand, currentPos: [p1.lat + (p2.lat - p1.lat) * frac, p1.lng + (p2.lng - p1.lng) * frac] as [number, number], heading: p1.heading + (p2.heading - p1.heading) * frac, speed: p1.speedKnots + (p2.speedKnots - p1.speedKnots) * frac };
    });
  }, [candidates, currentTimeH, mapCenter]);

  const interpolatedParticles = useMemo(() => {
    return particles.map((p) => {
      const sorted = [...p.positions].sort((a, b) => a.timeH - b.timeH);
      if (!sorted.length) return { id: p.id, lat: mapCenter[0], lng: mapCenter[1] };
      let s1 = sorted[0], s2 = sorted[sorted.length - 1];
      for (let i = 0; i < sorted.length - 1; i++) {
        if (currentTimeH >= sorted[i].timeH && currentTimeH <= sorted[i + 1].timeH) { s1 = sorted[i]; s2 = sorted[i + 1]; break; }
      }
      const frac = s2.timeH === s1.timeH ? 0 : (currentTimeH - s1.timeH) / (s2.timeH - s1.timeH);
      return { id: p.id, lat: s1.lat + (s2.lat - s1.lat) * frac, lng: s1.lng + (s2.lng - s1.lng) * frac };
    });
  }, [particles, currentTimeH, mapCenter]);

  const priorityColour = (p: 'HIGH' | 'MEDIUM' | 'LOW') =>
    p === 'HIGH' ? col.critical : p === 'MEDIUM' ? col.warn : col.safe;

  const priorityChipClass = (p: 'HIGH' | 'MEDIUM' | 'LOW') =>
    p === 'HIGH' ? 'chip chip-critical' : p === 'MEDIUM' ? 'chip chip-warn' : 'chip chip-safe';

  const toggleAllLayers = (v: boolean) => setLayers({ spill: v, heatmap: v, bathymetry: v, oceanCurrents: v, uncertaintyEllipses: v, isoRings: v, particles: v, aisTracks: v, geoLabels: v });

  const panelStyle: React.CSSProperties = {
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    borderRadius: '3px',
  };
  const headerStyle: React.CSSProperties = {
    background: 'var(--c-surface-alt)',
    borderBottom: '1px solid var(--c-border)',
  };
  const subHeaderStyle: React.CSSProperties = {
    background: 'var(--c-surface-alt)',
    borderBottom: '1px solid var(--c-border)',
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex select-none">
      {/* ── MAP CANVAS ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} zoom={10} zoomControl={false} className="w-full h-full">
          <MapController center={mapCenter} zoom={10} />
          <CursorTracker onMove={(lat, lng) => setCursorPos({ lat, lng })} />
          <TileLayer
            url={MAP_MODES[mapMode].url}
            attribution={MAP_MODES[mapMode].attribution}
            maxZoom={18}
            className={mapMode === 'DARK' && isDark ? 'map-dark-tiles' : ''}
          />

          {layers.spill && spillPolygon.length > 0 && (
            <Polygon positions={spillPolygon} pathOptions={{ color: col.oil, fillColor: col.oil, fillOpacity: 0.3, weight: 2, dashArray: '4,4' }}>
              <Popup>
                <div className="p-1 font-mono text-xs" style={{ color: 'var(--c-text-primary)' }}>
                  <div className="font-bold uppercase" style={{ color: col.oil }}>Observed Spill</div>
                  <div>Area: {activeCase.spillAreaKm2} km²</div>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: '10px' }}>Confidence: {(activeCase.confidence * 100).toFixed(1)}%</div>
                </div>
              </Popup>
            </Polygon>
          )}

          {layers.uncertaintyEllipses && originPolygon.length > 0 && (
            <Polygon positions={originPolygon} pathOptions={{ color: col.warn, fillColor: col.critical, fillOpacity: 0.18, weight: 2 }}>
              <Popup>
                <div className="p-1 font-mono text-xs" style={{ color: 'var(--c-text-primary)' }}>
                  <div className="font-bold uppercase" style={{ color: col.warn }}>Estimated Origin Zone (95% CI)</div>
                  <div style={{ fontSize: '10px', color: 'var(--c-text-muted)' }}>Release Window: T -24h to T -18h</div>
                </div>
              </Popup>
            </Polygon>
          )}

          {layers.heatmap && (
            <CircleMarker center={originCenter} radius={36} pathOptions={{ color: col.warn, fillColor: col.warn, fillOpacity: 0.18, weight: 1.5 }}>
              <Tooltip permanent direction="center" className="bg-transparent border-0 shadow-none text-[9px] font-mono">
                ORIGIN PEAK
              </Tooltip>
            </CircleMarker>
          )}

          {layers.isoRings && isoRings.map((ring, i) => (
            <Polygon key={i} positions={ring.points} pathOptions={{ color: col.accent, fillOpacity: 0.04, weight: 1.5, dashArray: '4,4' }} />
          ))}

          {layers.particles && interpolatedParticles.map((pt) => (
            <CircleMarker key={pt.id} center={[pt.lat, pt.lng]} radius={2} pathOptions={{ color: col.accent, fillColor: col.accent, fillOpacity: 0.8, weight: 0 }} />
          ))}

          {layers.aisTracks && candidates.map((cand) => (
  cand.track && cand.track.length > 0 && (
    <Polyline
      key={cand.id}
      positions={cand.track.map((p) => [p.lat, p.lng] as [number, number])}
      pathOptions={{
        color: priorityColour(cand.priority),
        weight: selectedCandidate?.id === cand.id ? 3 : 1.5,
        opacity: selectedCandidate?.id === cand.id ? 1 : 0.6,
        dashArray: cand.priority === 'HIGH' ? '6,3' : undefined,
      }}
    />
  )
))}

          {layers.aisTracks && interpolatedVessels.map((v) => (
            <CircleMarker
              key={v.id}
              center={v.currentPos}
              radius={selectedCandidate?.id === v.id ? 8 : 6}
              pathOptions={{
                color: 'white',
                fillColor: priorityColour(v.priority),
                fillOpacity: 1,
                weight: selectedCandidate?.id === v.id ? 2 : 1,
              }}
              eventHandlers={{ click: () => setSelectedCandidate(v) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="font-mono text-[10px]" style={{ color: 'var(--c-text-primary)', background: 'var(--c-surface)', padding: '4px 6px' }}>
                  <div className="font-bold">{v.name}</div>
                  <div style={{ color: 'var(--c-text-muted)', fontSize: '9px' }}>Score {(v.overallScore * 100).toFixed(0)}% · {v.speed?.toFixed(1)} kn</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* ── BASEMAP SELECTOR ─────────────────────────────────────────────── */}
      <div className="absolute top-3 left-20 z-20 flex items-center gap-1 p-1" style={panelStyle}>
        {(Object.keys(MAP_MODES) as MapModeKey[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase transition-colors"
            style={mapMode === mode
              ? { background: 'var(--c-accent)', color: 'var(--c-bg)', borderRadius: '2px' }
              : { color: 'var(--c-text-muted)', borderRadius: '2px' }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* ── LEFT CONTROL PANEL ───────────────────────────────────────────── */}
      <div className={cn('absolute left-3 top-14 bottom-20 z-20 w-96 flex flex-col transition-all duration-300', isLeftPanelOpen ? 'translate-x-0' : '-translate-x-[105%]')}>
        <div className="h-full flex flex-col bracket-frame overflow-hidden" style={panelStyle}>
          <BracketCorners />

          {/* Header */}
          <div className="p-2.5 flex items-center justify-between" style={headerStyle}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black tracking-wider" style={{ color: 'var(--c-accent)' }}>{activeCase.id}</span>
              {!backendOnline ? (
                <span className="chip chip-warn text-[9px] flex items-center gap-1" title="Backend API unreachable — showing static fallback dataset">
                  <AlertTriangle size={10} /> DEMO DATA — BACKEND OFFLINE
                </span>
              ) : (
                <span className="chip chip-safe text-[9px]">LIVE BACKEND</span>
              )}
              <span className="chip chip-muted" style={{ fontSize: '9px' }}>ENCODER: {encoderInit}</span>
              <span className="chip chip-muted" style={{ fontSize: '9px' }}>DRIFT: {driftMode}</span>
            </div>
            <button onClick={() => setIsLeftPanelOpen(false)} style={{ color: 'var(--c-text-muted)' }} className="p-1 transition-colors hover:opacity-70">
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Case Title Banner */}
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wide border-b border-navy-700/50" style={{ background: 'var(--c-surface-alt)', color: 'var(--c-text-primary)' }}>
            {activeCase.title}
          </div>

          {/* Spill Stats */}
          <div className="p-2.5 grid grid-cols-3 gap-2 text-center text-xs" style={subHeaderStyle}>
            {[
              { label: 'SPILL AREA', value: `${activeCase.spillAreaKm2}`, unit: 'km²', col: col.oil },
              { label: 'CONFIDENCE', value: `${(activeCase.confidence * 100).toFixed(0)}%`, unit: '', col: col.safe },
              { label: 'DISCHARGE', value: `${activeCase.estimatedVolumeBbl ?? '—'}`, unit: 'bbl', col: col.warn },
            ].map(({ label, value, unit, col: c }) => (
              <div key={label} className="p-1.5" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
                <span className="text-[8px] uppercase tracking-wider block mb-0.5" style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                <span className="font-bold text-sm" style={{ color: c }}>{value} <span className="text-[9px]">{unit}</span></span>
              </div>
            ))}
          </div>

          {/* Candidates header */}
          <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={subHeaderStyle}>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--c-text-muted)' }}>
              <Ship size={13} style={{ color: 'var(--c-accent)' }} />
              <span>Priority Investigative Candidates</span>
            </div>
            <span className="chip chip-accent">{candidates.length} IDENTIFIED</span>
          </div>

          {/* Candidate cards */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loading ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--c-text-muted)' }}>
                Fetching real backend telemetry & drift simulation...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--c-text-muted)' }}>
                No candidate vessels identified for this origin zone.
              </div>
            ) : (
              candidates.map((cand, idx) => {
                const sel = selectedCandidate?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className="p-2.5 cursor-pointer transition-colors"
                    style={{
                      border: `1px solid ${sel ? 'var(--c-accent)' : 'var(--c-border)'}`,
                      borderRadius: '3px',
                      background: sel ? 'var(--c-surface-alt)' : 'var(--c-surface)',
                      borderLeft: `3px solid ${priorityColour(cand.priority)}`,
                    }}
                  >
                    {/* Name row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold" style={{ color: 'var(--c-text-muted)' }}>#{idx + 1}</span>
                          <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--c-text-primary)' }}>{cand.name}</span>
                        </div>
                        <span className="text-[9px] block mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                          MMSI {cand.mmsi} · {cand.type} · {cand.flag}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={priorityChipClass(cand.priority)}>{cand.priority}</span>
                        <span className="text-[10px] font-bold font-mono" style={{ color: priorityColour(cand.priority) }}>
                          {(cand.overallScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-1.5 text-[9px] px-1.5 py-1 mb-2" style={{ background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)' }}>
                      <Navigation size={9} style={{ color: 'var(--c-accent)' }} />
                      <span className="truncate">{cand.lastPort}</span>
                      <span>→</span>
                      <span className="truncate">{cand.destination}</span>
                    </div>

                    {/* Score bars */}
                    <div className="space-y-1.5">
                      {[
                        { label: 'Spatial (CPA)', v: cand.spatialScore, c: col.accent },
                        { label: 'Temporal', v: cand.temporalScore, c: col.safe },
                        { label: 'Kinematic', v: cand.behaviorScore, c: col.warn },
                      ].map(({ label, v, c }) => (
                        <div key={label}>
                          <div className="flex justify-between text-[9px] mb-0.5" style={{ color: 'var(--c-text-muted)' }}>
                            <span>{label}</span>
                            <span className="font-mono font-bold" style={{ color: 'var(--c-text-primary)' }}>{(v * 100).toFixed(0)}%</span>
                          </div>
                          <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${v * 100}%`, background: c }} /></div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 pt-1.5 flex justify-between text-[8px] uppercase tracking-wider" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
                      <span>{cand.wordingLabel}</span>
                      <span style={{ color: 'var(--c-accent)' }}>View Audit</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Collapsed Left Panel Toggle */}
      {!isLeftPanelOpen && (
        <button onClick={() => setIsLeftPanelOpen(true)} className="absolute left-3 top-14 z-20 w-8 h-8 flex items-center justify-center transition-colors" style={panelStyle}>
          <ChevronRight size={14} style={{ color: 'var(--c-accent)' }} />
        </button>
      )}

      {/* ── RIGHT GIS LAYER CONTROL PANEL ─────────────────────────────────── */}
      <div className={cn('absolute right-3 top-3 bottom-20 z-20 w-72 flex flex-col transition-all duration-300', isRightPanelOpen ? 'translate-x-0' : 'translate-x-[105%]')}>
        <div className="h-full flex flex-col bracket-frame overflow-hidden" style={panelStyle}>
          <BracketCorners />

          <div className="p-2.5 flex items-center justify-between" style={headerStyle}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
              <Layers size={13} style={{ color: 'var(--c-accent)' }} />
              <span>GIS Layer Control</span>
            </div>
            <button onClick={() => setIsRightPanelOpen(false)} style={{ color: 'var(--c-text-muted)' }} className="p-1 transition-colors hover:opacity-70">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-3 text-xs">
            {/* Show/Hide All Buttons */}
            <div className="flex gap-2">
              {['Show All', 'Hide All'].map((label) => (
                <button
                  key={label}
                  onClick={() => toggleAllLayers(label === 'Show All')}
                  className="flex-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                  style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Layer Toggles */}
            <div className="space-y-px" style={{ border: '1px solid var(--c-border)', borderRadius: '2px' }}>
              {([
                ['spill',              'Observed Spill Polygon'],
                ['heatmap',            'Origin Heatmap (KDE)'],
                ['uncertaintyEllipses','Uncertainty Ellipses'],
                ['isoRings',           'Iso-Probability Rings'],
                ['particles',          'Drift Particles'],
                ['aisTracks',          'Candidate AIS Tracks'],
                ['bathymetry',         'Bathymetry Contours'],
                ['oceanCurrents',      'Ocean Currents'],
                ['geoLabels',          'Geo Labels'],
              ] as [keyof MapLayerVisibility, string][]).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--c-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-surface-alt)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                >
                  <span className="text-[10px] tracking-wide" style={{ color: 'var(--c-text-primary)' }}>{label}</span>
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={() => setLayers((p) => ({ ...p, [key]: !p[key] }))}
                    className="h-3 w-3 cursor-pointer"
                    style={{ accentColor: 'var(--c-accent)' }}
                  />
                </label>
              ))}
            </div>

            {/* Visual Legend */}
            <div style={{ border: '1px solid var(--c-border)', borderRadius: '2px' }}>
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--c-border)' }}>
                Visual Legend
              </div>
              <div className="p-2.5 space-y-1.5 text-[10px]">
                {[
                  { label: 'Observed Spill', c: col.oil },
                  { label: 'Origin Zone (95%)', c: col.warn },
                  { label: 'Origin Heatmap', c: col.warn },
                  { label: 'HIGH Priority Vessel', c: col.critical },
                  { label: 'MEDIUM Priority Vessel', c: col.warn },
                  { label: 'LOW Priority Vessel', c: col.safe },
                ].map(({ label, c }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: c, opacity: 0.8 }} />
                    <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Sources */}
            <div style={{ border: '1px solid var(--c-border)', borderRadius: '2px' }}>
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)', borderBottom: '1px solid var(--c-border)' }}>
                Data Sources
              </div>
              <div className="p-2.5 space-y-1 text-[9px]" style={{ color: 'var(--c-text-muted)' }}>
                {((activeCase as any).data_sources || ['Sentinel-1 SAR', 'Lagrangian RK4', 'AIS Telemetry']).map((s: string) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-safe)' }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed Left Panel Toggle */}
      {!isLeftPanelOpen && (
        <button
          onClick={() => setIsLeftPanelOpen(true)}
          className="absolute left-3 top-14 z-20 w-8 h-8 flex items-center justify-center transition-colors"
          style={panelStyle}
          title="Open Investigation Panel"
        >
          <ChevronRight size={14} style={{ color: 'var(--c-accent)' }} />
        </button>
      )}

      {/* Collapsed Right Panel Toggle */}
      {!isRightPanelOpen && (
        <button onClick={() => setIsRightPanelOpen(true)} className="absolute right-3 top-3 z-20 w-8 h-8 flex items-center justify-center transition-colors" style={panelStyle} title="Open Candidate Details Panel">
          <ChevronLeft size={14} style={{ color: 'var(--c-accent)' }} />
        </button>
      )}

      {/* ── BOTTOM HINDCAST TIMELINE SCRUBBER ───────────────────────────── */}
      <div className="absolute bottom-2 left-3 right-3 z-20 bracket-frame" style={panelStyle}>
        <BracketCorners />
        <div className="px-4 py-2.5 flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setCurrentTimeH(-48); setIsPlaying(false); }}
              className="w-7 h-7 flex items-center justify-center transition-colors"
              style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}
            >
              <RotateCcw size={12} />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-7 h-7 flex items-center justify-center transition-colors"
              style={{ border: `1px solid var(--c-accent)`, borderRadius: '2px', color: 'var(--c-accent)', background: 'var(--c-surface-alt)' }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
            <button
              onClick={() => setPlaybackSpeed((s) => s === 1 ? 2 : s === 2 ? 5 : 1)}
              className="px-1.5 h-7 flex items-center gap-1 transition-colors text-[10px] font-bold"
              style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}
            >
              <FastForward size={10} />{playbackSpeed}×
            </button>
          </div>

          <div className="text-[9px] font-mono shrink-0" style={{ color: 'var(--c-text-muted)' }}>-48.0h</div>

          {/* Timeline Range Input */}
          <div className="flex-1 relative flex items-center">
            <div className="w-full h-px" style={{ background: 'var(--c-border)' }} />
            <input
              type="range"
              min={-48}
              max={0}
              step={0.1}
              value={currentTimeH}
              onChange={(e) => { setCurrentTimeH(parseFloat(e.target.value)); setIsPlaying(false); }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-none"
              style={{ left: `${((currentTimeH + 48) / 48) * 100}%`, transform: 'translate(-50%, -50%)', background: 'var(--c-accent)', borderColor: 'var(--c-surface)' }}
            />
          </div>

          <div className="text-[9px] font-mono shrink-0" style={{ color: 'var(--c-text-muted)' }}>T 0.0h</div>
          <div className="text-[10px] font-mono font-bold shrink-0" style={{ color: 'var(--c-accent)' }}>
            T {currentTimeH.toFixed(1)}h
          </div>

          {/* Cursor Coordinates Readout */}
          <div className="shrink-0 text-[9px] font-mono pl-3" style={{ borderLeft: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--c-text-primary)' }}>
              {cursorPos.lat.toFixed(4)}° {cursorPos.lng.toFixed(4)}°
            </span>
            {' '}· ~{simulatedDepth} m
          </div>
        </div>
      </div>
    </div>
  );
};
