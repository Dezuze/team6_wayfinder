import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Radio, Play, Square, Compass, Gauge, AlertTriangle, 
  MapPin, CheckCircle, LogOut, UserCheck, Activity, Wifi, WifiOff 
} from 'lucide-react';

export default function DriverView({ activeRole, setActiveRole }) {
  const { buses, routes, streamDriverLocation, streamDriverSOS } = useWebSocket();
  const { user, logout } = useAuth();

  const defaultBusId = user?.assignedBusId || (buses[0] ? buses[0].id : 'bus-101');
  const [selectedBusId, setSelectedBusId] = useState(defaultBusId);
  const [gpsPermission, setGpsPermission] = useState('prompt');

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [driverStatus, setDriverStatus] = useState('Active');
  const [coords, setCoords] = useState({ lat: 9.67416, lng: 76.82573 });
  const [lastTxTime, setLastTxTime] = useState(null);

  const [showSosModal, setShowSosModal] = useState(false);
  const [sosReason, setSosReason] = useState('Mechanical Breakdown');
  const [sosTriggered, setSosTriggered] = useState(false);

  const geoWatchRef = useRef(null);
  const lastPosRef = useRef(null);

  const currentBus = buses.find(b => b.id === selectedBusId) || buses[0] || {};
  const currentRoute = routes.find(r => r.id === currentBus.routeId) || routes[0] || {};

  useEffect(() => {
    const savedPerm = localStorage.getItem('hopspot-gps-perm') || localStorage.getItem('campusbus-gps-perm');
    if (savedPerm === 'granted') {
      setGpsPermission('granted');
    }
  }, []);

  useEffect(() => {
    if (user?.assignedBusId) {
      setSelectedBusId(user.assignedBusId);
    }
  }, [user]);

  const handleRequestPermission = () => {
    if (!navigator.geolocation) {
      setGpsPermission('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPermission('granted');
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.accuracy) setGpsAccuracy(Math.round(pos.coords.accuracy));
        localStorage.setItem('hopspot-gps-perm', 'granted');
      },
      (err) => {
        console.warn('GPS Permission denied:', err);
        setGpsPermission('denied');
        localStorage.removeItem('hopspot-gps-perm');
        localStorage.removeItem('campusbus-gps-perm');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Gracefully stop broadcasting and inform backend that bus is now stationary/Off Duty
  const stopBroadcasting = useCallback(() => {
    if (geoWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
    setIsBroadcasting(false);
    setCurrentSpeed(0);

    // Send real Off Duty signal so students/admin see vehicle as stationary
    streamDriverLocation(
      selectedBusId, 
      coords.lat, 
      coords.lng, 
      0, 
      'Off Duty', 
      user?.name || user?.username
    );
  }, [selectedBusId, coords, streamDriverLocation, user]);

  const handleLogout = () => {
    if (isBroadcasting) {
      stopBroadcasting();
    }
    logout();
  };

  useEffect(() => {
    if (!isBroadcasting) {
      if (geoWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      return;
    }

    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, heading, accuracy } = position.coords;
          
          let calcSpeed = 0;
          if (speed != null && !isNaN(speed) && speed > 0) {
            calcSpeed = Math.round(speed * 3.6);
          } else if (lastPosRef.current && lastPosRef.current.timestamp) {
            const timeDeltaSec = (position.timestamp - lastPosRef.current.timestamp) / 1000;
            if (timeDeltaSec > 0.5 && timeDeltaSec < 15) {
              const R = 6371000;
              const dLat = (latitude - lastPosRef.current.lat) * (Math.PI / 180);
              const dLng = (longitude - lastPosRef.current.lng) * (Math.PI / 180);
              const a = Math.sin(dLat / 2) ** 2 + 
                        Math.cos(lastPosRef.current.lat * (Math.PI / 180)) * 
                        Math.cos(latitude * (Math.PI / 180)) * 
                        Math.sin(dLng / 2) ** 2;
              const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              calcSpeed = Math.round((distM / timeDeltaSec) * 3.6);
            }
          }

          const validBearing = (heading != null && !isNaN(heading)) ? Math.round(heading) : undefined;
          lastPosRef.current = { lat: latitude, lng: longitude, timestamp: position.timestamp };

          setCoords({ lat: latitude, lng: longitude });
          setCurrentSpeed(calcSpeed);
          if (accuracy) setGpsAccuracy(Math.round(accuracy));
          setLastTxTime(new Date().toLocaleTimeString());

          // Broadcast real location to server
          streamDriverLocation(
            selectedBusId, 
            latitude, 
            longitude, 
            calcSpeed, 
            driverStatus,
            user?.name || user?.username,
            validBearing
          );
        },
        (error) => {
          console.error("Real GPS Watch Error:", error);
          alert("Real GPS signal lost: " + (error.message || 'Position unavailable'));
          setIsBroadcasting(false);
          setCurrentSpeed(0);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    } else {
      alert('Geolocation hardware is not supported by your browser.');
      setIsBroadcasting(false);
    }

    return () => {
      if (geoWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [isBroadcasting, selectedBusId, driverStatus, streamDriverLocation, user]);

  const toggleBroadcast = () => {
    if (isBroadcasting) {
      stopBroadcasting();
    } else {
      setIsBroadcasting(true);
    }
    if (sosTriggered) setSosTriggered(false);
  };

  const handleConfirmSOS = () => {
    streamDriverSOS(selectedBusId, sosReason);
    setSosTriggered(true);
    setShowSosModal(false);
    setDriverStatus('EMERGENCY SOS');
  };

  // Permission Request Screen (Only Real GPS)
  if (gpsPermission !== 'granted') {
    return (
      <div className="mobile-view-wrapper" style={{ padding: '2rem 0', textAlign: 'center', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="clean-card" style={{ padding: '2.5rem 1.5rem', borderRadius: 'var(--radius-xl)', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: gpsPermission === 'denied' ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-light)',
            color: gpsPermission === 'denied' ? 'var(--danger)' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            {gpsPermission === 'denied' ? <AlertTriangle size={32} /> : <MapPin size={32} />}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {gpsPermission === 'denied' ? 'Location Permission Denied' : 'Enable Real GPS Services'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            {gpsPermission === 'denied'
              ? 'Real hardware GPS access was denied or unavailable. Please enable device location in your browser settings to broadcast your bus route.'
              : 'To broadcast live real-time coordinates to passengers and administrators, HopSpot requires access to your physical device GPS while on duty.'}
          </p>

          <div className="flex-col gap-2">
            <button
              onClick={handleRequestPermission}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
            >
              {gpsPermission === 'denied' ? 'Retry GPS Permission' : 'Connect Real Device GPS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-view-wrapper" style={{ paddingTop: '0.5rem', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden', paddingBottom: '1rem' }}>
      
      {/* Driver Account & Vehicle Card */}
      <div className="clean-card" style={{ marginBottom: '1rem', padding: '1.1rem', maxWidth: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        
        {/* Top Header Row */}
        <div className="flex-between" style={{ alignItems: 'center', gap: '0.5rem', minWidth: 0, marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div style={{
              width: '2.2rem',
              height: '2.2rem',
              borderRadius: '0.65rem',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserCheck size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.name || user?.username || 'Verified Driver'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Account: @{user?.username || 'driver'} • Real GPS Broadcasting
              </div>
            </div>
          </div>

          <div
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: isBroadcasting ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
              color: isBroadcasting ? '#059669' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: isBroadcasting ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
              flexShrink: 0
            }}
          >
            {isBroadcasting ? (
              <>
                <Wifi size={13} className="spin-animation" style={{ animationDuration: '3s' }} />
                <span>Broadcasting Live</span>
              </>
            ) : (
              <>
                <WifiOff size={13} />
                <span>Stationary</span>
              </>
            )}
          </div>
        </div>

        {/* Vehicle Selection */}
        <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Assigned Vehicle for this Shift
          </label>
          <select
            value={selectedBusId}
            disabled={isBroadcasting}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="form-select"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: isBroadcasting ? '#f1f5f9' : '#ffffff',
              cursor: isBroadcasting ? 'not-allowed' : 'pointer',
              border: '1px solid var(--border-color)'
            }}
          >
            {buses.map(b => (
              <option key={b.id} value={b.id}>
                {b.number} {b.routeId ? `(${routes.find(r => r.id === b.routeId)?.name || b.routeId})` : '(No Route Assigned)'}
              </option>
            ))}
          </select>
          {isBroadcasting && (
            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.35rem', fontWeight: 600 }}>
              ● Real hardware GPS coordinates are being streamed live for {currentBus.number}
            </div>
          )}
        </div>

        {/* Driver Sign Out Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="btn"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
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

      {/* Real-time Hardware Telemetry Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
        <div className="clean-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <Gauge size={14} color="#7c3aed" />
            <span>Real Speed</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {currentSpeed} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>km/h</span>
          </div>
        </div>

        <div className="clean-card" style={{ padding: '0.85rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <MapPin size={14} color="#10b981" />
            <span>GPS Accuracy</span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {gpsAccuracy !== null ? `±${gpsAccuracy}` : '–'} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>m</span>
          </div>
        </div>
      </div>

      {/* Current Real Location Coordinates Card */}
      <div className="clean-card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Device Coordinates:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
        </div>
        {lastTxTime && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            <span>Last Transmission:</span>
            <span>{lastTxTime}</span>
          </div>
        )}
      </div>

      {/* Big Broadcast Toggle Button */}
      <div className="clean-card" style={{ flex: 1, marginBottom: '1rem', padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-lg)', maxWidth: '100%', boxSizing: 'border-box', display: 'flex' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleBroadcast}
          className={`btn ${isBroadcasting ? 'btn-danger' : 'btn-primary'}`}
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
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
          <AnimatePresence mode="wait">
          {isBroadcasting ? (
            <motion.div key="stop" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <Square fill="#ffffff" size={28} />
              <span>STOP TRACKING</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'none', opacity: 0.9 }}>
                Tap to stop streaming real GPS for {currentBus.number || selectedBusId}
              </span>
            </motion.div>
          ) : (
            <motion.div key="start" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <Play fill="#ffffff" size={28} />
              <span>START TRACKING</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'none', opacity: 0.9 }}>
                Broadcast real hardware GPS for {currentBus.number || selectedBusId}
              </span>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div style={{ marginBottom: '0', width: '100%', maxWidth: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
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
        </motion.button>
      </div>

      {/* SOS Modal */}
      <AnimatePresence>
      {showSosModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 999
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="clean-card" style={{
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
