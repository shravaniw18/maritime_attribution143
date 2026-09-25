import React, { useState } from 'react';
import { FileText, Printer, Download, Search, Calendar, User, Hash, FileCheck } from 'lucide-react';
import { demoReports } from '../data/demoData';
import { ReportItem } from '../types';
import { cn } from '../utils/cn';

const ps: React.CSSProperties = { background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const as_: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '3px' };
const inp: React.CSSProperties = { background: 'var(--c-surface-alt)', border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-primary)', padding: '5px 10px', fontFamily: 'monospace', fontSize: '11px' };

function statusChip(status: string) {
  if (status === 'Final')    return 'chip chip-safe';
  if (status === 'Draft')    return 'chip chip-warn';
  return 'chip chip-muted';
}

export const Reports: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [printReport, setPrintReport] = useState<ReportItem | null>(null);

  const filtered = demoReports.filter((r) => {
    const q = search.toLowerCase();
    const ms = !q || r.id.toLowerCase().includes(q) || r.caseId.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.investigator.toLowerCase().includes(q);
    return ms && (typeFilter === 'ALL' || r.type === typeFilter) && (statusFilter === 'ALL' || r.status === statusFilter);
  });

  const handleDownload = (r: ReportItem) => {
    const text = `POLARIS MARITIME ATTRIBUTION DOSSIER\n${'='.repeat(54)}\nREPORT: ${r.id} | CASE: ${r.caseId}\nTYPE: ${r.type} | STATUS: ${r.status} | DATE: ${r.date}\nCLASSIFICATION: ${r.classification}\nINVESTIGATOR: ${r.investigator}\nSHA-256: ${r.sha256}\n\nSUMMARY:\n${r.summary}\n\nPOLARIS Platform SIH26143`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `${r.id}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handlePrint = (r: ReportItem) => { setPrintReport(r); setTimeout(() => window.print(), 300); };

  return (
    <div className="w-full h-full overflow-y-auto p-5 md:p-8 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>Intelligence Reports</h1>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>Generated evidentiary packages, forensic drift reconstructions, and legal audit briefs.</p>
          </div>
          <div className="chip chip-accent flex items-center gap-1.5"><FileCheck size={11} />SHA-256 SIGNED</div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3" style={as_}>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search size={13} style={{ color: 'var(--c-text-muted)' }} />
            <input placeholder="SEARCH REPORTS..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[11px] tracking-wider uppercase focus:outline-none w-full" style={{ color: 'var(--c-text-primary)' }} />
          </div>
          <div className="flex gap-3 flex-wrap text-[10px]">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="ALL">ALL TYPES</option>
              <option value="Evidentiary Package">Evidentiary</option>
              <option value="Preliminary Assessment">Preliminary</option>
              <option value="Forensic Drift Summary">Drift Summary</option>
              <option value="AIS Attribution Analysis">AIS Analysis</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="ALL">ALL STATUSES</option>
              <option value="Final">FINAL</option>
              <option value="Draft">DRAFT</option>
              <option value="Archived">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rep) => (
            <div key={rep.id} className="p-4 flex flex-col justify-between transition-colors group" style={ps}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-accent)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--c-border)')}>
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black tracking-wide" style={{ color: 'var(--c-accent)' }}>{rep.id}</span>
                    <span className="text-[9px] px-1.5 py-0.5" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)' }}>{rep.caseId}</span>
                  </div>
                  <span className={statusChip(rep.status)}>{rep.status}</span>
                </div>
                <h3 className="text-sm font-bold tracking-wide mb-2 line-clamp-2" style={{ color: 'var(--c-text-primary)' }}>{rep.title}</h3>
                <div className="mb-3">
                  <span className="chip chip-accent" style={{ fontSize: '8px' }}>{rep.type}</span>
                </div>
                <p className="text-[10px] leading-relaxed line-clamp-3 mb-3 font-sans" style={{ color: 'var(--c-text-muted)' }}>{rep.summary}</p>
                <div className="space-y-1 py-2.5 text-[9px]" style={{ borderTop: '1px solid var(--c-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1" style={{ color: 'var(--c-text-muted)' }}><Calendar size={9} /> Date</span>
                    <span style={{ color: 'var(--c-text-primary)' }}>{rep.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1" style={{ color: 'var(--c-text-muted)' }}><User size={9} /> Investigator</span>
                    <span className="truncate max-w-[150px]" style={{ color: 'var(--c-text-primary)' }}>{rep.investigator}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1" style={{ color: 'var(--c-text-muted)' }}><Hash size={9} /> SHA-256</span>
                    <span className="font-mono text-[9px] truncate max-w-[120px]" style={{ color: 'var(--c-text-muted)' }}>{rep.sha256.substring(0, 14)}…</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 flex gap-2" style={{ borderTop: '1px solid var(--c-border)' }}>
                <button onClick={() => handleDownload(rep)}
                  className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                  style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-text-muted)', background: 'var(--c-surface-alt)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background='var(--c-accent)'; e.currentTarget.style.color='var(--c-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background='var(--c-surface-alt)'; e.currentTarget.style.color='var(--c-text-muted)'; }}>
                  <Download size={11} />Download
                </button>
                <button onClick={() => handlePrint(rep)}
                  className="flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                  style={{ border: '1px solid var(--c-border)', borderRadius: '2px', color: 'var(--c-accent)', background: 'var(--c-surface-alt)' }}>
                  <Printer size={11} />Print
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable modal */}
      {printReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto no-print" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded p-8 relative animate-fade-in font-sans">
            <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
              <button onClick={() => window.print()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5"><Printer size={12} />Print</button>
              <button onClick={() => setPrintReport(null)} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-bold">Close</button>
            </div>
            <div className="space-y-6 print-content">
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <div className="text-[9px] tracking-widest font-mono text-slate-500 uppercase">FORENSIC MARITIME RECONSTRUCTION & ATTRIBUTION INTELLIGENCE</div>
                <h1 className="text-xl font-black tracking-wide text-slate-950 uppercase mt-1">OFFICIAL INVESTIGATION BRIEFING</h1>
                <div className="text-xs font-mono text-slate-700 mt-1">POLARIS-SIH26143 · {printReport.classification}</div>
              </div>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <tbody>
                  <tr className="bg-slate-100"><td className="border border-slate-300 p-2 font-bold w-1/4">Report ID:</td><td className="border border-slate-300 p-2 font-mono">{printReport.id}</td><td className="border border-slate-300 p-2 font-bold w-1/4">Case Ref:</td><td className="border border-slate-300 p-2 font-mono">{printReport.caseId}</td></tr>
                  <tr><td className="border border-slate-300 p-2 font-bold">Date:</td><td className="border border-slate-300 p-2 font-mono">{printReport.date}</td><td className="border border-slate-300 p-2 font-bold">Status:</td><td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{printReport.status}</td></tr>
                  <tr className="bg-slate-100"><td className="border border-slate-300 p-2 font-bold">Investigator:</td><td className="border border-slate-300 p-2" colSpan={3}>{printReport.investigator}</td></tr>
                  <tr><td className="border border-slate-300 p-2 font-bold">SHA-256:</td><td className="border border-slate-300 p-2 font-mono text-[10px] break-all" colSpan={3}>{printReport.sha256}</td></tr>
                </tbody>
              </table>
              <div><h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">1. Executive Findings</h3><p className="text-xs text-slate-700 leading-relaxed">{printReport.summary}</p></div>
              <div><h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">2. Drift Modelling</h3>
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 border border-slate-200 rounded">
                  {[['Origin Coords','28°29′42″ N, 89°25′48″ W'],['CI','95% Covariance Zone'],['Duration','-48.0h Backward']].map(([k,v])=><div key={k}><span className="block text-[9px] text-slate-500 font-bold uppercase">{k}</span><span className="font-mono font-bold text-slate-900">{v}</span></div>)}
                </div>
              </div>
              <div><h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">3. Candidate Shortlist</h3>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead><tr className="bg-slate-200">{['Vessel','MMSI / Type','Flag','CPA','Score','Classification'].map(h=><th key={h} className="border border-slate-300 p-2 text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    <tr><td className="border border-slate-300 p-2 font-bold">STELLA MARIS</td><td className="border border-slate-300 p-2 font-mono text-[10px]">219028000 (Crude Tanker)</td><td className="border border-slate-300 p-2">Denmark</td><td className="border border-slate-300 p-2 font-mono">1.4 km</td><td className="border border-slate-300 p-2 font-bold text-red-600">89%</td><td className="border border-slate-300 p-2 font-bold text-red-700">Priority Investigative Candidate</td></tr>
                    <tr className="bg-slate-50"><td className="border border-slate-300 p-2 font-bold">OCEAN VOYAGER</td><td className="border border-slate-300 p-2 font-mono text-[10px]">352898000 (Bulk Carrier)</td><td className="border border-slate-300 p-2">Panama</td><td className="border border-slate-300 p-2 font-mono">5.8 km</td><td className="border border-slate-300 p-2 font-bold text-amber-600">69%</td><td className="border border-slate-300 p-2 font-bold text-amber-700">Priority Investigative Candidate</td></tr>
                    <tr><td className="border border-slate-300 p-2 font-bold">PACIFIC BREEZE</td><td className="border border-slate-300 p-2 font-mono text-[10px]">636014231 (Container)</td><td className="border border-slate-300 p-2">Liberia</td><td className="border border-slate-300 p-2 font-mono">14.2 km</td><td className="border border-slate-300 p-2 font-bold text-green-600">43%</td><td className="border border-slate-300 p-2 font-bold text-green-700">Priority Investigative Candidate</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-100 border border-slate-300 rounded text-[10px] text-slate-700 leading-relaxed">
                <strong className="block text-slate-900 mb-0.5">MANDATORY INVESTIGATIVE NOTICE:</strong>
                This document provides probabilistic decision support for maritime boarding and forensic sampling prioritisation. Scores are heuristic statistical correlations. POLARIS never asserts definitive legal proof of guilt.
              </div>
              <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-xs font-mono">
                <div><div className="w-48 border-b border-slate-400 mb-1" /><span className="text-slate-500 uppercase text-[9px]">Lead Forensic Analyst</span></div>
                <div><div className="w-48 border-b border-slate-400 mb-1" /><span className="text-slate-500 uppercase text-[9px]">Maritime Enforcement Seal</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
