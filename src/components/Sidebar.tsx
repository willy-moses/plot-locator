'use client';
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
  return (
    <aside style={{
      width: 300, background: 'white', borderLeft: '1px solid rgba(30,30,20,0.1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Head */}
      <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(30,30,20,0.1)' }}>
        <h2 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 17, fontWeight: 400, marginBottom: 2 }}>My Plots</h2>
        <div style={{ fontSize: 12, color: '#6b6b64' }}>
          Tap <span style={{ color: '#378ADD', fontWeight: 600 }}>🧭</span> to get directions to a plot
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(30,30,20,0.1)' }}>
        <StatCard label="Total plots" value={String(plots.length)} green />
        <StatCard label="Last added" value={plots.length ? plots[plots.length - 1].name : '—'} small />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
        {plots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: '#6b6b64', fontSize: 13, textAlign: 'center', lineHeight: 1.7, padding: '1.5rem' }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.35 }}>🗺️</div>
            No plots yet.<br />Search a place or enter<br />coordinates above.
          </div>
        ) : (
          plots.map(plot => (
            <PlotItem
              key={plot.id}
              plot={plot}
              isRouting={plot.id === activeRouteId}
              onRoute={() => onRouteRequest(plot.id)}
              onRemove={() => onRemove(plot.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(30,30,20,0.1)', display: 'flex', gap: 8 }}>
        <FootBtn label="Fit all to view" onClick={onFitAll} />
        <FootBtn label="Clear all" onClick={() => { if (plots.length && confirm('Remove all plots?')) onClearAll(); }} danger />
      </div>
    </aside>
  );
}

function StatCard({ label, value, green, small }: { label: string; value: string; green?: boolean; small?: boolean }) {
  return (
    <div style={{ background: '#F7F4EE', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, color: '#6b6b64', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: small ? 12 : 20, fontWeight: 600, fontFamily: small ? 'inherit' : 'var(--font-dm-mono), monospace', color: green ? '#085041' : '#1a1a18', paddingTop: small ? 4 : 0 }}>{value}</div>
    </div>
  );
}

function PlotItem({ plot, isRouting, onRoute, onRemove }: { plot: Plot; isRouting: boolean; onRoute: () => void; onRemove: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 1.25rem', cursor: 'pointer',
      borderBottom: '1px solid rgba(30,30,20,0.08)',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F7F4EE')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: plot.color, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plot.name}</div>
        <div style={{ fontSize: 10, color: '#6b6b64', fontFamily: 'var(--font-dm-mono), monospace', marginTop: 1 }}>
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

function ActionBtn({ onClick, title, children, active, blue, danger }: { onClick: () => void; title: string; children: React.ReactNode; active?: boolean; blue?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        width: 26, height: 26, border: 'none', borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        background: active ? '#E6F1FB' : blue ? 'transparent' : 'transparent',
        color: active ? '#378ADD' : blue ? '#378ADD' : '#6b6b64',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#ffebeb' : blue ? '#E6F1FB' : '#F7F4EE';
        e.currentTarget.style.color = danger ? '#c0392b' : blue ? '#378ADD' : '#1a1a18';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? '#E6F1FB' : 'transparent';
        e.currentTarget.style.color = active ? '#378ADD' : blue ? '#378ADD' : '#6b6b64';
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
        flex: 1, height: 34, borderRadius: 7, border: '1px solid rgba(30,30,20,0.18)',
        background: 'none', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
        color: '#3a3a36', cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#ffebeb' : '#F7F4EE';
        e.currentTarget.style.color = danger ? '#c0392b' : '#1a1a18';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#3a3a36';
      }}
    >
      {label}
    </button>
  );
}
