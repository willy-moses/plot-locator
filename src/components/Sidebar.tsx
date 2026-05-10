'use client';
import { useState, useEffect } from 'react';
import type { Plot } from '@/types';

interface Props {
  plots: Plot[];
  activeRouteId: number | null;
  onRouteRequest: (id: number) => void;
  onZoom: (id: number) => void;
  onRemove: (id: number) => void;
  onFitAll: () => void;
  onClearAll: () => void;
}

export default function Sidebar({ plots, activeRouteId, onRouteRequest, onRemove, onFitAll, onClearAll }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wait for client mount so window.innerWidth is available
  useEffect(() => { setMounted(true); }, []);

  const isMobile = mounted && window.innerWidth < 768;

  return (
    <>
      <style>{`
        .sb-drawer {
          transition: transform 0.28s cubic-bezier(0.32,0,0.15,1);
        }
        .sb-tab {
          transition: transform 0.28s cubic-bezier(0.32,0,0.15,1);
        }
        .sb-backdrop {
          transition: opacity 0.25s ease;
        }
      `}</style>

      {/* ── MOBILE: backdrop ── */}
      {mounted && isMobile && (
        <div
          className="sb-backdrop"
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 698,
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
          }}
        />
      )}

      {/* ── SIDEBAR PANEL (desktop = static, mobile = absolute drawer) ── */}
      <aside
        className={isMobile ? 'sb-drawer' : undefined}
        style={{
          // Desktop: normal flow, always visible
          ...(!isMobile ? {
            width: 300,
            flexShrink: 0,
            background: 'white',
            borderLeft: '1px solid rgba(30,30,20,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          } : {}),
          // Mobile: absolute overlay, slides in/out
          ...(isMobile ? {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '82vw',
            maxWidth: 320,
            zIndex: 700,
            transform: open ? 'translateX(0)' : 'translateX(100%)',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
          } : {}),
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: '1px solid rgba(30,30,20,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1a1a18',
          color: 'white',
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: 'white' }}>My Plots</h2>
            <div style={{ fontSize: 11, color: '#9FE1CB' }}>
              Tap 🧭 to get directions
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'none', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}
            >✕</button>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid rgba(30,30,20,0.1)',
        }}>
          <StatCard label="Total plots" value={String(plots.length)} green />
          <StatCard label="Last added" value={plots.length ? plots[plots.length - 1].name : '—'} small />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {plots.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 180, color: '#6b6b64',
              fontSize: 13, textAlign: 'center', lineHeight: 1.7, padding: '1.5rem',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.35 }}>🗺️</div>
              No plots yet.<br />Search a place or enter<br />coordinates above.
            </div>
          ) : (
            plots.map(plot => (
              <PlotItem
                key={plot.id}
                plot={plot}
                isRouting={plot.id === activeRouteId}
                onRoute={() => { onRouteRequest(plot.id); if (isMobile) setOpen(false); }}
                onRemove={() => onRemove(plot.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid rgba(30,30,20,0.1)',
          display: 'flex', gap: 8,
        }}>
          <FootBtn label="Fit all" onClick={onFitAll} />
          <FootBtn
            label="Clear all"
            onClick={() => {
              if (plots.length && confirm('Remove all plots?')) {
                onClearAll();
                if (isMobile) setOpen(false);
              }
            }}
            danger
          />
        </div>
      </aside>

      {/* ── MOBILE: toggle tab, always on top ── */}
      {mounted && isMobile && (
        <button
          className="sb-tab"
          onClick={() => setOpen(v => !v)}
          style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            zIndex: 702,
            transform: open
              ? 'translateY(-50%) translateX(calc(-82vw))'
              : 'translateY(-50%) translateX(0)',
            width: 36,
            height: 72,
            borderRadius: '12px 0 0 12px',
            background: '#1D9E75',
            color: 'white',
            border: 'none',
            boxShadow: '-2px 0 12px rgba(0,0,0,0.3)',
            fontSize: 22,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={open ? 'Close panel' : 'Open My Plots'}
        >
          {open ? '›' : '‹'}
        </button>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, green, small }: { label: string; value: string; green?: boolean; small?: boolean }) {
  return (
    <div style={{ background: '#F7F4EE', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#6b6b64', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: small ? 12 : 20, fontWeight: 600,
        fontFamily: small ? 'inherit' : 'var(--font-dm-mono), monospace',
        color: green ? '#085041' : '#1a1a18',
        paddingTop: small ? 4 : 0,
      }}>{value}</div>
    </div>
  );
}

function PlotItem({ plot, isRouting, onRoute, onRemove }: {
  plot: Plot; isRouting: boolean; onRoute: () => void; onRemove: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 1.25rem',
      borderBottom: '1px solid rgba(30,30,20,0.08)',
    }}>
      <div style={{
        width: 11, height: 11, borderRadius: '50%',
        background: plot.color, flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plot.name}</div>
        <div style={{ fontSize: 10, color: '#6b6b64', fontFamily: 'monospace', marginTop: 1 }}>
          {plot.lat.toFixed(5)}, {plot.lng.toFixed(5)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        <ActionBtn onClick={onRoute} title="Get directions" active={isRouting} blue>🧭</ActionBtn>
        <ActionBtn onClick={onRemove} title="Remove" danger>✕</ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, children, active, blue, danger }: {
  onClick: () => void; title: string; children: React.ReactNode;
  active?: boolean; blue?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        background: active ? '#E6F1FB' : 'transparent',
        color: active ? '#378ADD' : blue ? '#378ADD' : '#6b6b64',
      }}
    >
      {children}
    </button>
  );
}

function FootBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 34, borderRadius: 7,
        border: '1px solid rgba(30,30,20,0.18)',
        background: 'none', fontFamily: 'inherit',
        fontSize: 12, fontWeight: 500,
        color: danger ? '#c0392b' : '#3a3a36', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}