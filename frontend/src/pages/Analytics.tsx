import React from 'react';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Database,
  BarChart2,
  PieChart as PieIcon,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useThemeColours } from '../hooks/useThemeColours';

const panelStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: '3px',
};
const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--c-border)',
};
const kpiStyle: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: '3px',
};

export const Analytics: React.FC = () => {
  const col = useThemeColours();

  const confidenceTrendData = [
    { date: 'SEP 01', confidence: 82.5 },
    { date: 'SEP 05', confidence: 84.1 },
    { date: 'SEP 10', confidence: 85.8 },
    { date: 'SEP 15', confidence: 86.4 },
    { date: 'SEP 20', confidence: 87.9 },
    { date: 'SEP 24', confidence: 89.2 },
  ];

  const attributionDonutData = [
    { name: 'High Confidence Match', value: 45, color: col.critical },
    { name: 'Probable Match',        value: 30, color: col.warn    },
    { name: 'Unattributed',          value: 25, color: col.accent  },
  ];

  const anomalyData = [
    { type: 'AIS Gap Blackout', count: 184 },
    { type: 'Speed Drop',       count: 142 },
    { type: 'Course Deviation', count: 98  },
    { type: 'Loitering',        count: 76  },
  ];

  const tooltipStyle: React.CSSProperties = {
    backgroundColor: col.surface,
    border: `1px solid ${col.border}`,
    borderRadius: '2px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: col.textPrimary,
  };

  return (
    <div className="w-full h-full overflow-y-auto p-5 font-mono select-none" style={{ background: 'var(--c-bg)' }}>
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={headerStyle}>
          <div>
            <div className="flex items-center gap-2">
              <Activity size={18} style={{ color: 'var(--c-accent)' }} />
              <h1 className="text-base font-bold tracking-widest uppercase" style={{ color: 'var(--c-text-primary)' }}>System Analytics</h1>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--c-text-muted)' }}>
              SAR detection aggregation, attribution yield, and kinematic anomaly frequency.
            </p>
          </div>
          <div className="chip chip-safe flex items-center gap-1.5">
            <CheckCircle size={11} />
            FORENSIC TELEMETRY VERIFIED
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4" style={kpiStyle}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Total Detections</span>
              <Database size={14} style={{ color: 'var(--c-accent)' }} />
            </div>
            <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--c-text-primary)' }}>1,492</div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold" style={{ color: col.safe }}>
              <TrendingUp size={11} /><span>+12% this month</span>
            </div>
          </div>

          <div className="p-4" style={kpiStyle}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Avg Confidence</span>
              <Activity size={14} style={{ color: 'var(--c-accent)' }} />
            </div>
            <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--c-text-primary)' }}>87.4%</div>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold" style={{ color: col.safe }}>
              <TrendingUp size={11} /><span>+2.1% across scenes</span>
            </div>
          </div>

          <div className="p-4" style={{ ...kpiStyle, borderColor: col.critical }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>High Risk Vessels</span>
              <AlertTriangle size={14} style={{ color: col.critical }} />
            </div>
            <div className="text-3xl font-black tabular-nums" style={{ color: col.critical }}>48</div>
            <div className="mt-1.5 text-[10px] font-bold" style={{ color: col.critical }}>+5 this week</div>
          </div>

          <div className="p-4" style={kpiStyle}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Attribution Success</span>
              <CheckCircle size={14} style={{ color: col.safe }} />
            </div>
            <div className="text-3xl font-black tabular-nums" style={{ color: col.safe }}>64.2%</div>
            <div className="mt-1.5 text-[10px]" style={{ color: 'var(--c-text-muted)' }}>Matched to AIS data</div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Area chart */}
          <div className="lg:col-span-7 p-4" style={panelStyle}>
            <div className="flex items-center justify-between pb-2.5 mb-4" style={headerStyle}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
                <BarChart2 size={13} style={{ color: 'var(--c-accent)' }} />
                Detection Confidence Trend
              </div>
              <span className="text-[9px] font-mono" style={{ color: 'var(--c-text-muted)' }}>SEP 01 – SEP 24 2026</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={confidenceTrendData}>
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={col.accent} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={col.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={col.border} />
                  <XAxis dataKey="date" stroke={col.textMuted} fontSize={9} tickLine={false} fontFamily="monospace" />
                  <YAxis stroke={col.textMuted} fontSize={9} domain={[75, 95]} tickLine={false} unit="%" fontFamily="monospace" />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="confidence" name="Avg Confidence" stroke={col.accent} strokeWidth={2} fill="url(#confGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut */}
          <div className="lg:col-span-5 p-4 flex flex-col justify-between" style={panelStyle}>
            <div className="flex items-center justify-between pb-2.5 mb-2" style={headerStyle}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
                <PieIcon size={13} style={{ color: 'var(--c-accent)' }} />
                Attribution Resolution
              </div>
              <span className="text-[9px] font-mono" style={{ color: 'var(--c-text-muted)' }}>1,492 CASES</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attributionDonutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {attributionDonutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Proportion']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--c-border)' }}>
              {attributionDonutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                    <span style={{ color: 'var(--c-text-muted)' }}>{item.name}</span>
                  </div>
                  <span className="font-bold font-mono" style={{ color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Anomaly frequency */}
        <div className="p-4" style={panelStyle}>
          <div className="flex items-center justify-between pb-2.5 mb-4" style={headerStyle}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-primary)' }}>
              <ShieldAlert size={13} style={{ color: col.warn }} />
              Attribution Factor Anomaly Frequency
            </div>
            <span className="text-[9px]" style={{ color: 'var(--c-text-muted)' }}>HISTORICAL AIS TELEMETRY</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {anomalyData.map((a) => (
              <div key={a.type} className="p-3" style={{ border: '1px solid var(--c-border)', borderRadius: '2px', background: 'var(--c-surface-alt)' }}>
                <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: 'var(--c-text-muted)' }}>{a.type}</span>
                <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: col.accent }}>
                  {a.count} <span className="text-[10px] font-normal" style={{ color: 'var(--c-text-muted)' }}>events</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
