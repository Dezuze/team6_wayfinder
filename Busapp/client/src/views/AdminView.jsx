import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Shield, Bus, Map, Users, Plus, Edit3, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AdminView() {
  const { buses, routes, passes, refreshData } = useWebSocket();
  const [activeSection, setActiveSection] = useState('buses'); // buses, routes, passes
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteStops, setNewRouteStops] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#2563eb');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update Bus Status
  const handleUpdateBusStatus = async (busId, newStatus) => {
    try {
      await fetch(`/api/buses/${busId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating bus status:', err);
    }
  };

  // Update Student Pass Status
  const handleUpdatePassStatus = async (passId, newStatus) => {
    try {
      await fetch(`/api/passes/${passId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passStatus: newStatus })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating pass status:', err);
    }
  };

  // Create New Route
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRouteName) return;
    setIsSubmitting(true);
    try {
      const stopsArray = newRouteStops ? newRouteStops.split(',').map(s => s.trim()) : ['Campus Gate', 'Central Hub'];
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRouteName, stops: stopsArray, color: newRouteColor })
      });
      setNewRouteName('');
      setNewRouteStops('');
      await refreshData();
    } catch (err) {
      console.error('Error creating route:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Administration Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage shuttle fleet, transit routes, and student pass entitlements
          </p>
        </div>

        {/* Section Switcher */}
        <div className="role-tabs">
          <button
            onClick={() => setActiveSection('buses')}
            className={`role-tab ${activeSection === 'buses' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <Bus size={14} /> Fleet ({buses.length})
          </button>
          <button
            onClick={() => setActiveSection('routes')}
            className={`role-tab ${activeSection === 'routes' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <Map size={14} /> Routes ({routes.length})
          </button>
          <button
            onClick={() => setActiveSection('passes')}
            className={`role-tab ${activeSection === 'passes' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <Users size={14} /> Student Passes ({passes.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: FLEET MONITOR */}
      {activeSection === 'buses' && (
        <div className="clean-card">
          <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Fleet Telemetry & Status</h2>
            <button onClick={refreshData} className="btn btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              Refresh Data
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver Assigned</th>
                  <th>Assigned Route</th>
                  <th>Coordinates</th>
                  <th>Speed</th>
                  <th>Operational Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {buses.map(bus => {
                  const route = routes.find(r => r.id === bus.routeId);
                  const isSos = bus.status === '🚨 EMERGENCY / SOS' || bus.status?.includes('SOS') || bus.status?.includes('EMERGENCY');
                  return (
                    <tr key={bus.id} style={{ backgroundColor: isSos ? 'var(--danger-light)' : undefined }}>
                      <td style={{ fontWeight: 600 }}>
                        {isSos && (
                          <span className="badge badge-danger" style={{ marginBottom: '0.25rem', display: 'inline-block' }}>
                            SOS Alert
                          </span>
                        )}
                        <div>{bus.number}</div>
                      </td>
                      <td>{bus.driverName}</td>
                      <td>
                        <span style={{ color: route?.color || 'inherit', fontWeight: 500 }}>
                          {route?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {bus.location?.lat?.toFixed(4)}°, {bus.location?.lng?.toFixed(4)}°
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                          {bus.speed} km/h
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: isSos ? 'var(--danger)' : bus.status === 'Active' ? 'var(--success-light)' : bus.status === 'Maintenance' ? 'var(--warning-light)' : 'var(--bg-subtle)',
                          color: isSos ? '#ffffff' : bus.status === 'Active' ? 'var(--success)' : bus.status === 'Maintenance' ? 'var(--warning)' : 'var(--text-secondary)'
                        }}>
                          {isSos ? 'Emergency Reported' : bus.status}
                        </span>
                        {isSos && bus.sosReason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 500 }}>
                            {bus.sosReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          value={bus.status}
                          onChange={(e) => handleUpdateBusStatus(bus.id, e.target.value)}
                          className="form-select"
                          style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          <option value="Active">Active</option>
                          <option value="In Traffic">In Traffic</option>
                          <option value="Boarding">Boarding</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Off Duty">Off Duty</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: ROUTES MANAGER */}
      {activeSection === 'routes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          <div className="clean-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Active Transit Routes</h2>
            <div className="flex-col gap-1">
              {routes.map(route => (
                <div key={route.id} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', borderLeft: `3px solid ${route.color || 'var(--primary)'}` }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{route.name}</strong>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                      {route.stops.length} Stops
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>Stops: </strong> {route.stops.join(' → ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="clean-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={16} /> Add New Route
            </h2>
            <form onSubmit={handleCreateRoute} className="flex-col gap-1">
              <div className="form-group">
                <label className="form-label">Route Name</label>
                <input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="e.g. Campus Loop C"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stops (comma separated)</label>
                <input
                  type="text"
                  value={newRouteStops}
                  onChange={(e) => setNewRouteStops(e.target.value)}
                  placeholder="Library, Student Union, Gate 3"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Route Accent Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newRouteColor}
                    onChange={(e) => setNewRouteColor(e.target.value)}
                    style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{newRouteColor}</span>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', fontWeight: 600 }}>
                {isSubmitting ? 'Creating...' : 'Create Transit Route'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 3: STUDENT PASSES */}
      {activeSection === 'passes' && (
        <div className="clean-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Student Transit Entitlements</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Valid Until</th>
                  <th>Route Entitlement</th>
                  <th>Status</th>
                  <th>Verification Action</th>
                </tr>
              </thead>
              <tbody>
                {passes.map(pass => (
                  <tr key={pass.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pass.id}</td>
                    <td style={{ fontWeight: 500 }}>{pass.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{pass.email}</td>
                    <td>{pass.validUntil}</td>
                    <td>{pass.routeEntitlement}</td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: pass.passStatus === 'Active' ? 'var(--success-light)' : pass.passStatus === 'Expired' ? 'var(--danger-light)' : 'var(--warning-light)',
                        color: pass.passStatus === 'Active' ? 'var(--success)' : pass.passStatus === 'Expired' ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {pass.passStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {pass.passStatus !== 'Active' && (
                          <button
                            onClick={() => handleUpdatePassStatus(pass.id, 'Active')}
                            className="btn"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', fontWeight: 600 }}
                          >
                            Approve
                          </button>
                        )}
                        {pass.passStatus !== 'Expired' && (
                          <button
                            onClick={() => handleUpdatePassStatus(pass.id, 'Expired')}
                            className="btn"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
