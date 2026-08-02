import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Radio, Play, Square, Compass, Gauge, AlertTriangle, RefreshCw, MapPin, CheckCircle } from 'lucide-react';

export default function DriverView() {
  const { buses, routes, streamDriverLocation, streamDriverSOS } = useWebSocket();
  const { user } = useAuth();

  const defaultBusId = user?.assignedBusId || 'bus-101';
  const [selectedBusId, setSelectedBusId] = useState(defaultBusId);
  const [gpsPermission, setGpsPermission] = useState('prompt');
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [driverStatus, setDriverStatus] = useState('Active');
  const [coords, setCoords] = useState({ lat: 9.9312, lng: 76.2673 });
  
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosReason, setSosReason] = useState('Mechanical Breakdown');
  const [sosTriggered, setSosTriggered] = useState(false);

  const simulationTimerRef = useRef(null);
  const geoWatchRef = useRef(null);
  const pathIndexRef = useRef(0);

  const currentBus = buses.find(b => b.id === selectedBusId) || buses[0] || {};
  const currentRoute = routes.find(r => r.id === currentBus.routeId) || routes[0] || {};

  useEffect(() => {
    const savedPerm = localStorage.getItem('campusbus-gps-perm');
    if (savedPerm) {
      setGpsPermission(savedPerm);
      if (savedPerm === 'simulated') setIsSimulating(true);
    }
  }, []);

  useEffect(() => {
    if (user?.assignedBusId) {
      setSelectedBusId(user.assignedBusId);
    }
  }, [user]);

  const handleRequestPermission = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Switching to simulation mode.');
      setGpsPermission('simulated');
      setIsSimulating(true);
      localStorage.setItem('campusbus-gps-perm', 'simulated');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPermission('granted');
        setIsSimulating(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        localStorage.setItem('campusbus-gps-perm', 'granted');
      },
      (err) => {
        console.warn('GPS Permission denied:', err);
        alert('Could not access hardware GPS. Enabling Simulation Mode for desktop testing.');
        setGpsPermission('simulated');
        setIsSimulating(true);
        localStorage.setItem('campusbus-gps-perm', 'simulated');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleEnableSimulation = () => {
    setGpsPermission('simulated');
    setIsSimulating(true);
    localStorage.setItem('campusbus-gps-perm', 'simulated');
  };

  useEffect(() => {
    if (!isBroadcasting) {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (geoWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
      return;
    }

    if (isSimulating && currentRoute.path && currentRoute.path.length > 0) {
      simulationTimerRef.current = setInterval(() => {
        pathIndexRef.current = (pathIndexRef.current + 1) % currentRoute.path.length;
        const nextCoord = currentRoute.path[pathIndexRef.current];
        
        const jitterLat = nextCoord.lat + (Math.random() - 0.5) * 0.0005;
        const jitterLng = nextCoord.lng + (Math.random() - 0.5) * 0.0005;
        const simulatedSpeed = Math.floor(25 + Math.random() * 15);

        setCoords({ lat: jitterLat, lng: jitterLng });
        setCurrentSpeed(simulatedSpeed);

        streamDriverLocation(selectedBusId, jitterLat, jitterLng, simulatedSpeed, driverStatus);
      }, 2000);
    } else if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          const calcSpeed = speed ? Math.round(speed * 3.6) : Math.floor(20 + Math.random() * 10);
          
          setCoords({ lat: latitude, lng: longitude });
          setCurrentSpeed(calcSpeed);

          streamDriverLocation(selectedBusId, latitude, longitude, calcSpeed, driverStatus);
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("GPS signal lost. Falling back to simulation loop.");
          setIsSimulating(true);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      if (geoWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, [isBroadcasting, isSimulating, selectedBusId, currentRoute, driverStatus, streamDriverLocation]);

  const toggleBroadcast = () => {
    setIsBroadcasting(!isBroadcasting);
    if (sosTriggered) setSosTriggered(false);
  };

  const handleConfirmSOS = () => {
    streamDriverSOS(selectedBusId, sosReason);
    setSosTriggered(true);
    setShowSosModal(false);
    setDriverStatus('EMERGENCY SOS');
  };

  // Permission Request Screen
  if (gpsPermission === 'prompt') {
    return (
      <div className="mobile-view-wrapper" style={{ padding: '2rem 0', textAlign: 'center' }}>
        <div className="clean-card" style={{ padding: '2.5rem 1.5rem', borderRadius: 'var(--radius-xl)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <MapPin size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enable Location Services</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            To broadcast live coordinates to campus administrators and passengers, CampusBus requires access to device geolocation while on duty.
          </p>

          <div className="flex-col gap-2">
            <button
              onClick={handleRequestPermission}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
            >
              Grant Location Permission
            </button>

            <button
              onClick={handleEnableSimulation}
              className="btn btn-secondary"
              style={{ width: '100%', borderRadius: 'var(--radius-md)' }}
            >
              Use Simulation Mode (Desktop)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-view-wrapper">
      {/* Driver Identity Card */}
      <div className="clean-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <div className="flex-between">
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver Console</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '0.15rem' }}>{user?.name || currentBus.driverName || 'John Doe'}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Vehicle</span>
            <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{currentBus.number}</strong>
          </div>
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Route Assignment</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{currentRoute.name}</span>
          </div>
          <select
            value={driverStatus}
            onChange={(e) => setDriverStatus(e.target.value)}
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem', fontWeight: 500 }}
            disabled={isBroadcasting || sosTriggered}
          >
            <option value="Active">Active</option>
            <option value="In Traffic">In Traffic</option>
            <option value="Boarding">Boarding</option>
            <option value="Off Duty">Off Duty</option>
          </select>
        </div>
      </div>

      {/* Broadcast Control Button */}
      <div className="clean-card" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: '1rem' }}>
        <button
          onClick={toggleBroadcast}
          className={`btn ${isBroadcasting ? 'btn-danger' : 'btn-primary'}`}
          style={{
            width: '100%',
            minHeight: '96px',
            fontSize: '1.15rem',
            fontWeight: 600,
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
        >
          {isBroadcasting ? (
            <>
              <Square fill="#ffffff" size={24} />
              <span>Stop Broadcasting</span>
            </>
          ) : (
            <>
              <Play fill="#ffffff" size={24} />
              <span>Start Broadcasting</span>
            </>
          )}
        </button>

        <div style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: isBroadcasting ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500 }}>
          {isBroadcasting ? '● Streaming real-time coordinates' : '○ Standby mode'}
        </div>
      </div>

      {/* Emergency SOS Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setShowSosModal(true)}
          className="btn"
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: sosTriggered ? 'var(--danger)' : 'var(--bg-card)',
            color: sosTriggered ? '#ffffff' : 'var(--danger)',
            border: '1px solid var(--danger)',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}
        >
          <AlertTriangle size={18} />
          <span>{sosTriggered ? 'Emergency SOS Active (Tap to manage)' : 'Trigger Emergency SOS Alert'}</span>
        </button>
      </div>

      {/* Telemetry Metrics */}
      <div className="clean-card" style={{ marginBottom: '1rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Telemetry</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {gpsPermission === 'simulated' ? 'Simulated Sensor' : 'Hardware GPS'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Latitude</span>
            <span style={{ fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 600 }}>
              {coords.lat?.toFixed(5)}°
            </span>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Longitude</span>
            <span style={{ fontSize: '0.95rem', fontFamily: 'monospace', fontWeight: 600 }}>
              {coords.lng?.toFixed(5)}°
            </span>
          </div>
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Current Speed</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: isBroadcasting ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {isBroadcasting ? currentSpeed : 0} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>km/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* Simulation Mode Switch */}
      <div className="clean-card" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex-between">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Simulate vehicle movement</span>
          <input
            type="checkbox"
            checked={isSimulating}
            onChange={(e) => setIsSimulating(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
          />
        </div>
      </div>

      {/* SOS Modal */}
      {showSosModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 999
        }}>
          <div className="clean-card" style={{
            maxWidth: '400px',
            width: '100%',
            padding: '1.75rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {sosTriggered ? 'SOS Emergency Active' : 'Trigger Emergency SOS?'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              This broadcasts an immediate high-priority alert to campus administrators and passengers on this route.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
              <label className="form-label">Emergency Type</label>
              <select
                value={sosReason}
                onChange={(e) => setSosReason(e.target.value)}
                className="form-select"
              >
                <option value="Mechanical Breakdown">Mechanical Breakdown / Engine Failure</option>
                <option value="Road Accident">Road Accident / Collision</option>
                <option value="Medical Emergency">Medical Emergency</option>
                <option value="Severe Weather">Severe Weather Hazard</option>
              </select>
            </div>

            <div className="flex-col gap-1">
              <button
                onClick={handleConfirmSOS}
                className="btn btn-danger"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
              >
                Confirm & Broadcast SOS
              </button>
              <button
                onClick={() => setShowSosModal(false)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
