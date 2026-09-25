import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Target, Plus, Search, Calendar, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';
import { demoCases } from '../data/demoData';
import { CaseItem, CaseStatus, CaseSeverity } from '../types';
import { cn } from '../utils/cn';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

const ps: React.CSSProperties = { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const as_: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const inp: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-primary)', padding: '5px 10px', fontFamily: 'monospace', fontSize: '11px', width: '100%' };

function statusChip(status: CaseStatus) {
  switch (status) {
    case 'ACTIVE INVESTIGATION': return 'chip chip-critical';
    case 'RESOLVED & CLOSED':    return 'chip chip-safe';
    case 'PENDING AIS DATA':     return 'chip chip-warn';
    default:                     return 'chip chip-muted';
  }
}
function severityColour(sev: CaseSeverity): string {
  switch (sev) {
    case 'CRITICAL': return 'var(--c-critical)';
    case 'HIGH':     return 'var(--c-warn)';
    case 'MODERATE': return 'var(--c-accent)';
    default:         return 'var(--c-text-muted)';
  }
}

export const Cases: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newSeverity, setNewSeverity] = useState<CaseSeverity>('HIGH');
  const [casesList, setCasesList] = useState<CaseItem[]>(demoCases);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/cases`, { timeout: 2000 })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setBackendOnline(true);
          const fetched: CaseItem[] = res.data.map((c: any) => ({
            id: c.case_id,
            title: c.title,
            date: new Date(c.detection_timestamp).toISOString().split('T')[0],
            status: c.status === 'ANALYZED' ? 'ACTIVE INVESTIGATION' : 'PENDING AIS DATA',
            region: c.region,
            severity: c.spill_area_sqkm > 15 ? 'CRITICAL' : c.spill_area_sqkm > 10 ? 'HIGH' : 'MODERATE',
            center: [28.38, -89.15],
            spillAreaKm2: c.spill_area_sqkm,
            confidence: 0.88,
            satellite: c.satellite_mission,
            sensor: 'C-Band SAR (IW GRD)',
            incidentSummary: `Incident scenario in ${c.region}.`,
          }));
          setCasesList(fetched);
        }
      })
      .catch(() => {
        setBackendOnline(false);
        setCasesList(demoCases);
      });
  }, []);

  const filtered = casesList.filter((c: CaseItem) => {
    const q = search.toLowerCase();
    const ms = !q || c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.region.toLowerCase().includes(q);
    return ms && (statusFilter === 'ALL' || c.status === statusFilter) && (severityFilter === 'ALL' || c.severity === severityFilter);
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const id = `CAS-2026-0${90 + casesList.length - 15}`;
    const newCase: CaseItem = { id, title: newTitle, date: new Date().toISOString().split('T')[0], status: 'ACTIVE INVESTIGATION', region: newRegion || 'International High Seas', severity: newSeverity, center: [28.375, -89.15], spillAreaKm2: 32.4, confidence: 0.89, satellite: 'Sentinel-1A', sensor: 'C-Band SAR (IW GRD)', estimatedVolumeBbl: 1200, incidentSummary: 'Registered manual SAR anomaly detection.' };
    setCasesList([newCase, ...casesList]);
    setIsNewCaseOpen(false); setNewTitle(''); setNewRegion('');
    navigate(`/workspace?case=${id}`);
  };

  const selStyle = { ...inp, cursor: 'pointer' };

  return (
    <div className="w-full h-full overflow-y-auto p-5 md:p-8 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Target size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>Case Management</h1>
              {!backendOnline ? (
                <span className="chip chip-warn text-[9px] flex items-center gap-1">
                  <AlertTriangle size={10} /> DEMO DATA — BACKEND OFFLINE
                </span>
              ) : (
                <span className="chip chip-safe text-[9px]">LIVE BACKEND</span>
              )}
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>Active forensic attribution investigations, closed dossiers, and pending telemetry verifications.</p>
          </div>
          <button onClick={() => setIsNewCaseOpen(true)}
            className="self-start md:self-auto px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-opacity"
            style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
            <Plus size={12} /> + New Case
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 p-3" style={as_}>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search size={13} style={{ color: 'var(--c-text-muted)' }} />
            <input placeholder="SEARCH CASES..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[11px] tracking-wider uppercase focus:outline-none w-full"
              style={{ color: 'var(--c-text-primary)' }} />
          </div>
          <div className="flex gap-3 flex-wrap text-[10px]">
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--c-text-muted)' }}>STATUS:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selStyle}>
                <option value="ALL">ALL</option>
                <option value="ACTIVE INVESTIGATION">ACTIVE</option>
                <option value="RESOLVED & CLOSED">RESOLVED</option>
                <option value="PENDING AIS DATA">PENDING</option>
                <option value="ARCHIVED CASE">ARCHIVED</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--c-text-muted)' }}>SEV:</span>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selStyle}>
                <option value="ALL">ALL</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MODERATE">MODERATE</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: CaseItem) => (
            <div key={c.id} onClick={() => navigate(`/workspace?case=${c.id}`)}
              className="p-4 flex flex-col justify-between cursor-pointer transition-colors group"
              style={ps}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-border)')}>
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-black tracking-wide" style={{ color: 'var(--c-accent)' }}>{c.id}</span>
                  <span className={statusChip(c.status)}>{c.status.replace(' INVESTIGATION','').replace(' & CLOSED','')}</span>
                </div>
                <h3 className="text-sm font-bold tracking-wide mb-1.5" style={{ color: 'var(--c-text-primary)' }}>{c.title}</h3>
                <div className="flex items-center gap-1.5 text-[10px] mb-3" style={{ color: 'var(--c-text-muted)' }}>
                  <MapPin size={10} /><span className="truncate">{c.region}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] py-2" style={{ borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', margin: '4px 0' }}>
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--c-text-muted)' }}><Calendar size={10} /><span>{c.date}</span></div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--c-text-muted)' }}>SEV:</span>
                    <span className="font-bold" style={{ color: severityColour(c.severity) }}>{c.severity}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2.5 text-[9px]">
                  <div className="p-1.5" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
                    <span className="block uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Spill Area</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--c-oil)' }}>{c.spillAreaKm2} km²</span>
                  </div>
                  <div className="p-1.5" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
                    <span className="block uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Confidence</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--c-safe)' }}>{(c.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 flex items-center justify-between text-[9px] uppercase tracking-wider" style={{ borderTop: '1px solid var(--c-border)', color: 'var(--c-accent)' }}>
                <span>Open Investigation</span>
                <ChevronRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Case Modal */}
      {isNewCaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg p-6 animate-fade-in" style={ps}>
            <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
                <Plus size={16} style={{ color: 'var(--c-accent)' }} />Register New Case
              </div>
              <button onClick={() => setIsNewCaseOpen(false)} style={{ color: 'var(--c-text-muted)', fontSize: '18px' }}>×</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div><label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-muted)', marginBottom: '4px' }}>Incident Title</label><input required placeholder="e.g. South Indian Ocean Anomaly" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={inp} /></div>
              <div><label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-muted)', marginBottom: '4px' }}>Maritime Region</label><input placeholder="e.g. Arabian Sea / Gujarat" value={newRegion} onChange={(e) => setNewRegion(e.target.value)} style={inp} /></div>
              <div><label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--c-text-muted)', marginBottom: '4px' }}>Severity</label>
                <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as CaseSeverity)} style={inp}>
                  <option value="CRITICAL">CRITICAL</option><option value="HIGH">HIGH</option><option value="MODERATE">MODERATE</option><option value="LOW">LOW</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                <button type="button" onClick={() => setIsNewCaseOpen(false)} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}>Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-opacity" style={{ background: 'var(--c-accent)', color: 'var(--c-bg)', border: '1px solid var(--c-accent)', borderRadius: '2px' }} onMouseEnter={(e) => (e.currentTarget.style.opacity='0.85')} onMouseLeave={(e) => (e.currentTarget.style.opacity='1')}>Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
