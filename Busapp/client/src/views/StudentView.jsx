import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Navigation, MapPin, Clock, ShieldCheck, AlertTriangle, QrCode, Bus } from 'lucide-react';

export default function StudentView() {
  const { buses, routes, passes } = useWebSocket();
  const [selectedPassId, setSelectedPassId] = useState('S1001');
  const [activeTab, setActiveTab] = useState('tracker'); // tracker, routes, pass

  const currentPass = passes.find(p => p.id === selectedPassId) || passes[0] || {};
  const activeBuses = buses.filter(b => b.status !== 'Off Duty' && b.status !== 'Maintenance');

  return (
    <div className="mobile-view-wrapper">
      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          Live Bus Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Real-time shuttle location and schedule updates
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="role-tabs" style={{ width: '100%', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`role-tab ${activeTab === 'tracker' ? 'active' : ''}`}
          style={{ textAlign: 'center' }}
        >
          Radar
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`role-tab ${activeTab === 'routes' ? 'active' : ''}`}
          style={{ textAlign: 'center' }}
        >
          Routes ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('pass')}
          className={`role-tab ${activeTab === 'pass' ? 'active' : ''}`}
          style={{ textAlign: 'center' }}
        >
          Bus Pass
        </button>
      </div>

      {/* TAB 1: RADAR */}
      {activeTab === 'tracker' && (
        <div className="flex-col gap-1">
          {activeBuses.length === 0 ? (
            <div className="clean-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Bus size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.25rem' }}>No Active Shuttles</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                There are no vehicles currently broadcasting on this route.
              </p>
            </div>
          ) : (
            activeBuses.map(bus => {
              const route = routes.find(r => r.id === bus.routeId);
              const isSos = bus.status === '🚨 EMERGENCY / SOS' || bus.status?.includes('SOS') || bus.status?.includes('EMERGENCY');
              return (
                <div key={bus.id} className="clean-card" style={{ borderLeft: `3px solid ${isSos ? 'var(--danger)' : route?.color || 'var(--primary)'}` }}>
                  {isSos && (
                    <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600 }}>Emergency SOS Reported</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bus.sosReason || 'Vehicle issue reported by driver.'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge" style={{ backgroundColor: isSos ? 'var(--danger-light)' : 'var(--success-light)', color: isSos ? 'var(--danger)' : 'var(--success)' }}>
                        <span className="pulse-indicator">●</span> {isSos ? 'SOS Alert' : 'In Service'}
                      </span>
                      <strong style={{ fontSize: '0.95rem' }}>{bus.number}</strong>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{bus.speed} km/h</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <Navigation size={14} color={route?.color || 'var(--primary)'} />
                    <span>{route?.name || 'Unassigned Route'}</span>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last updated: {new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{bus.location?.lat?.toFixed(4)}°, {bus.location?.lng?.toFixed(4)}°</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ROUTES */}
      {activeTab === 'routes' && (
        <div className="flex-col gap-1">
          {routes.map(route => (
            <div key={route.id} className="clean-card" style={{ borderLeft: `3px solid ${route.color || 'var(--primary)'}` }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{route.name}</h3>
                <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                  {route.stops.length} Stops
                </span>
              </div>

              <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
                {route.stops.map((stop, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: i === route.stops.length - 1 ? 0 : '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: route.color || 'var(--primary)' }} />
                    <span style={{ color: i === 0 || i === route.stops.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 || i === route.stops.length - 1 ? 500 : 400 }}>
                      {stop}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: BUS PASS */}
      {activeTab === 'pass' && (
        <div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Select Student Profile</label>
            <select
              value={selectedPassId}
              onChange={(e) => setSelectedPassId(e.target.value)}
              className="form-select"
            >
              {passes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="clean-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Digital Transit Pass</span>
                <strong style={{ fontSize: '0.95rem' }}>Campus Shuttle Pass</strong>
              </div>
              <span className="badge" style={{ backgroundColor: currentPass.passStatus === 'Active' ? 'var(--success-light)' : 'var(--danger-light)', color: currentPass.passStatus === 'Active' ? 'var(--success)' : 'var(--danger)' }}>
                {currentPass.passStatus || 'Active'}
              </span>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Student Name</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '0.1rem' }}>{currentPass.name || 'Alex Mercer'}</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentPass.email || 'alex.mercer@student.edu'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Valid Until</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{currentPass.validUntil || '2026-12-31'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Entitlement</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{currentPass.routeEntitlement || 'All Routes'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <QrCode size={96} color="var(--text-primary)" style={{ margin: '0 auto 0.5rem', opacity: currentPass.passStatus === 'Active' ? 1 : 0.3 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {currentPass.id || 'S1001'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
