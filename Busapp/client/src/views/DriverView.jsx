import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Radio, Play, Square, Compass, Gauge, AlertTriangle, RefreshCw, MapPin, CheckCircle, LogOut, ArrowRightLeft } from 'lucide-react';

export default function DriverView({ activeRole, setActiveRole }) {
  const { buses, routes, streamDriverLocation, streamDriverSOS } = useWebSocket();
  const { user, logout } = useAuth();

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
      <div className="mobile-view-wrapper" style={{ padding: '2rem 0', textAlign: 'center', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="clean-card" style={{ padding: '2.5rem 1.5rem', borderRadius: 'var(--radius-xl)', maxWidth: '100%', boxSizing: 'border-box' }}>
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
    <div className="mobile-view-wrapper" style={{ paddingTop: '0.5rem', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div className="clean-card" style={{ marginBottom: '1rem', padding: '1rem 1rem 0.9rem', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start', gap: '0.5rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '2.1rem',
              height: '2.1rem',
              borderRadius: '0.8rem',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Radio size={16} />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Bus #{currentBus.number}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentRoute.name}
              </div>
            </div>
          </div>

          <div
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.7rem',
              borderRadius: '999px',
              backgroundColor: isBroadcasting ? 'var(--success-light)' : 'var(--bg-secondary)',
              color: isBroadcasting ? 'var(--success)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid transparent',
              flexShrink: 0
            }}
          >
            <span
              style={{
                width: '0.45rem',
                height: '0.45rem',
                borderRadius: '50%',
                backgroundColor: isBroadcasting ? 'var(--success)' : 'var(--text-muted)',
                display: 'inline-block'
              }}
            />
            {isBroadcasting ? 'Online' : 'Offline'}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', marginTop: '0.85rem', marginBottom: '0.75rem' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setActiveRole && setActiveRole('student')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              👨‍🎓 Student View
            </button>
            <button
              type="button"
              onClick={() => setActiveRole && setActiveRole('admin')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              🛡️ Admin Ops
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="btn"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderColor: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="clean-card" style={{ marginBottom: '1rem', padding: '0.9rem 1rem', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <MapPin size={16} />
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
            Geofence Active: Tracking will automatically stop at College Campus.
          </span>
        </div>
      </div>

      <div className="clean-card" style={{ marginBottom: '1rem', padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-lg)', maxWidth: '100%', boxSizing: 'border-box' }}>
        <button
          onClick={toggleBroadcast}
          className={`btn ${isBroadcasting ? 'btn-danger' : 'btn-primary'}`}
          style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minHeight: '150px',
            padding: '1.5rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            backgroundColor: isBroadcasting ? 'var(--danger)' : 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}
        >
          {isBroadcasting ? (
            <>
              <Square fill="#ffffff" size={28} />
              <span>STOP TRACKING</span>
            </>
          ) : (
            <>
              <Play fill="#ffffff" size={28} />
              <span>START TRACKING</span>
            </>
          )}
        </button>
      </div>

      <div style={{ marginBottom: '1rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <button
          onClick={() => setShowSosModal(true)}
          className="btn btn-danger"
          style={{
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>SOS / EMERGENCY</span>
          </span>
          <small style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.9, textTransform: 'none', letterSpacing: '0' }}>
            Tap for immediate breakdown or accident alerts
          </small>
        </button>
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
