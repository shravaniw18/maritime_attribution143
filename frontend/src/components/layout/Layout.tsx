import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Home,
  Crosshair,
  Radio,
  Target,
  Layers,
  Wind,
  BarChart3,
  FileText,
  Settings,
  Wifi,
  Database,
  Search,
  ChevronRight,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import { demoCases } from '../../data/demoData';
import { CaseItem } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const d = now.getUTCDate();
      const mon = monthNames[now.getUTCMonth()];
      const y = now.getUTCFullYear();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${d} ${mon} ${y} ${h}:${m}:${s} UTC`);
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [casesList, setCasesList] = useState<CaseItem[]>(demoCases);

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/cases`, { timeout: 2000 })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
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
          }));
          setCasesList(fetched);
        }
      })
      .catch(() => {
        setCasesList(demoCases);
      });
  }, []);

  const filteredCases = searchQuery.trim()
    ? casesList.filter(
        (c) =>
          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : casesList.slice(0, 6);

  const navItems = [
    { label: 'HOME',          to: '/',           icon: Home     },
    { label: 'INVESTIGATIONS', to: '/workspace', icon: Crosshair },
    { label: 'LIVE MONITOR',  to: '/live',        icon: Radio    },
    { label: 'CASES',         to: '/cases',       icon: Target   },
    { label: 'SAR LIBRARY',   to: '/library',     icon: Layers   },
    { label: 'SIMULATION',    to: '/simulation',  icon: Wind     },
    { label: 'ANALYTICS',     to: '/analytics',   icon: BarChart3},
    { label: 'REPORTS',       to: '/reports',     icon: FileText },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE INVESTIGATION': return 'chip chip-critical';
      case 'RESOLVED & CLOSED':    return 'chip chip-safe';
      case 'PENDING AIS DATA':     return 'chip chip-warn';
      default:                     return 'chip chip-muted';
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden font-mono select-none"
      style={{ background: 'var(--c-bg)', color: 'var(--c-text-primary)' }}
    >
      {/* ── LEFT ICON SIDEBAR ─────────────────────────────────────────── */}
      <aside
        className="w-16 h-full flex flex-col items-center py-3 z-40 shrink-0"
        style={{
          background: 'var(--c-surface-alt)',
          borderRight: '1px solid var(--c-border)',
        }}
      >
        {/* POLARIS "P" LOGO */}
        <NavLink
          to="/"
          title="POLARIS HOME"
          className="relative group w-11 h-11 flex items-center justify-center font-black text-xl tracking-wider mb-5 transition-colors"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-accent)',
            borderRadius: '3px',
            color: 'var(--c-accent)',
          }}
        >
          P
          {/* Tooltip */}
          <div
            className="absolute left-[3.75rem] top-1 hidden group-hover:block z-50 px-2.5 py-1 text-[10px] tracking-widest uppercase whitespace-nowrap pointer-events-none"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-accent)',
              borderRadius: '2px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            POLARIS PLATFORM
          </div>
        </NavLink>

        {/* NAV ITEMS */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <div key={item.to} className="relative group w-full flex justify-center">
                <NavLink
                  to={item.to}
                  className={cn(
                    'w-11 h-11 flex items-center justify-center transition-colors rounded-sm',
                    isActive ? '' : ''
                  )}
                  style={
                    isActive
                      ? {
                          color: 'var(--c-text-primary)',
                          background: 'var(--c-surface)',
                          borderLeft: '2px solid var(--c-safe)',
                          borderRight: '2px solid transparent',
                        }
                      : {
                          color: 'var(--c-text-muted)',
                          borderLeft: '2px solid transparent',
                          borderRight: '2px solid transparent',
                        }
                  }
                >
                  <Icon size={20} className="shrink-0" />
                </NavLink>
                {/* Tooltip */}
                <div
                  className="absolute left-[3.75rem] top-2 hidden group-hover:flex items-center z-50 pointer-events-none"
                >
                  <div
                    className="px-2.5 py-1 text-[10px] tracking-widest uppercase whitespace-nowrap"
                    style={{
                      background: 'var(--c-surface)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-text-muted)',
                      borderRadius: '2px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* SETTINGS (pinned bottom) */}
        <div
          className="mt-auto relative group w-full flex justify-center pt-2"
          style={{ borderTop: '1px solid var(--c-border)' }}
        >
          <NavLink
            to="/settings"
            className="w-11 h-11 flex items-center justify-center transition-colors rounded-sm"
            style={
              location.pathname === '/settings'
                ? {
                    color: 'var(--c-text-primary)',
                    background: 'var(--c-surface)',
                    borderLeft: '2px solid var(--c-safe)',
                    borderRight: '2px solid transparent',
                  }
                : {
                    color: 'var(--c-text-muted)',
                    borderLeft: '2px solid transparent',
                    borderRight: '2px solid transparent',
                  }
            }
          >
            <Settings size={20} />
          </NavLink>
          <div className="absolute left-[3.75rem] top-3 hidden group-hover:flex items-center z-50 pointer-events-none">
            <div
              className="px-2.5 py-1 text-[10px] tracking-widest uppercase whitespace-nowrap"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-muted)',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              SETTINGS
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP HEADER */}
        <header
          className="h-14 flex items-center justify-between px-3 md:px-4 z-30 shrink-0 gap-2"
          style={{
            background: 'var(--c-surface)',
            borderBottom: '1px solid var(--c-border)',
          }}
        >
          {/* LEFT: Wordmark + divider + search */}
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <NavLink to="/" className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <span
                className="text-base md:text-lg font-black tracking-[0.2em] uppercase"
                style={{ color: 'var(--c-text-primary)' }}
              >
                POLARIS
              </span>
              <span
                className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 hidden sm:inline"
                style={{
                  color: 'var(--c-text-muted)',
                  border: '1px solid var(--c-border)',
                  borderRadius: '2px',
                }}
              >
                SIH26143
              </span>
            </NavLink>

            {/* Divider */}
            <div
              className="h-5 w-px shrink-0 hidden sm:block"
              style={{ background: 'var(--c-border)' }}
            />

            {/* Search */}
            <div ref={searchRef} className="relative flex-1 max-w-xs md:max-w-sm">
              <div
                className="flex items-center px-2.5 py-1.5 transition-colors"
                style={{
                  background: 'var(--c-surface-alt)',
                  border: '1px solid var(--c-border)',
                  borderRadius: '2px',
                }}
              >
                <Search size={13} className="mr-2 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type="text"
                  placeholder="SEARCH CASES..."
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  className="bg-transparent text-[11px] tracking-wider uppercase focus:outline-none w-full font-mono"
                  style={{ color: 'var(--c-text-primary)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ color: 'var(--c-text-muted)' }} className="ml-1 text-sm">×</button>
                )}
              </div>

              {/* Dropdown */}
              {isSearchOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden max-h-72 overflow-y-auto panel-dropdown"
                  style={{ minWidth: '300px' }}
                >
                  <div
                    className="px-3 py-1 text-[9px] uppercase tracking-wider flex justify-between"
                    style={{
                      color: 'var(--c-text-muted)',
                      background: 'var(--c-surface-alt)',
                      borderBottom: '1px solid var(--c-border)',
                    }}
                  >
                    <span>INCIDENTS ({filteredCases.length})</span>
                    <span>CLICK TO OPEN</span>
                  </div>
                  {filteredCases.length === 0 ? (
                    <div className="p-3 text-[11px] text-center" style={{ color: 'var(--c-text-muted)' }}>
                      No matches for "{searchQuery}"
                    </div>
                  ) : (
                    filteredCases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); navigate(`/workspace?case=${c.id}`); }}
                        className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors"
                        style={{ borderBottom: '1px solid var(--c-border)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-surface-alt)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--c-accent)' }}>
                              {c.id}
                            </span>
                            <span className="text-[11px] truncate max-w-[180px]" style={{ color: 'var(--c-text-primary)' }}>
                              {c.title}
                            </span>
                          </div>
                          <span className="text-[9px]" style={{ color: 'var(--c-text-muted)' }}>{c.region}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadge(c.status)}>
                            {c.status.replace(' INVESTIGATION', '').replace(' & CLOSED', '')}
                          </span>
                          <ChevronRight size={12} style={{ color: 'var(--c-text-muted)' }} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Status chips + toggle + clock */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* SYSTEM ONLINE */}
            <div className="hidden lg:flex chip chip-safe items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: 'var(--c-safe)' }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ background: 'var(--c-safe)' }}
                />
              </span>
              <Wifi size={11} />
              <span>SYSTEM ONLINE</span>
            </div>

            {/* DATA STATUS OK */}
            <div className="hidden xl:flex chip chip-accent items-center gap-1.5">
              <Database size={11} />
              <span>DATA OK</span>
            </div>

            {/* DARK / LIGHT TOGGLE - ALWAYS FULLY VISIBLE */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-8 h-8 flex items-center justify-center transition-colors shrink-0"
              style={{
                background: 'var(--c-surface-alt)',
                border: '1px solid var(--c-border)',
                borderRadius: '2px',
                color: 'var(--c-text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--c-text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-text-muted)')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* UTC CLOCK */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono tracking-wider shrink-0"
              style={{
                color: 'var(--c-text-muted)',
                border: '1px solid var(--c-border)',
                borderRadius: '2px',
              }}
            >
              <Clock size={11} style={{ color: 'var(--c-accent)' }} />
              <span>{utcTime || 'UTC SYNCING...'}</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 relative overflow-hidden"
          style={{ background: 'var(--c-bg)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
