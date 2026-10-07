import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Radio, Play, Square, Compass, Gauge, AlertTriangle, 
  MapPin, CheckCircle, LogOut, UserCheck, Activity, Wifi, WifiOff, Bus 
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
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxSizing: 'border-box' }}>
      
      {/* 1. Driver Profile & Shift Card */}
      <div className="clean-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserCheck size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.name || user?.username || 'Verified Driver'}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {currentRoute.name || 'Campus Shuttle Service'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                backgroundColor: isBroadcasting ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                color: isBroadcasting ? '#10b981' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: isBroadcasting ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-color)'
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isBroadcasting ? '#10b981' : 'var(--text-muted)',
                display: 'inline-block'
              }} />
              {isBroadcasting ? 'LIVE' : 'OFF DUTY'}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.35rem 0.5rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Vehicle Selection Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.55rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <Bus size={17} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <select
              value={selectedBusId}
              disabled={isBroadcasting}
              onChange={(e) => setSelectedBusId(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                padding: 0
              }}
            >
              {buses.map(b => (
                <option key={b.id} value={b.id} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {b.number} {b.routeId ? `(${routes.find(r => r.id === b.routeId)?.name || b.routeId})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Simplified Telemetry Dashboard (Speed & GPS) */}
      <div className="clean-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
          Real-Time Speed
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.35rem', margin: '0.2rem 0' }}>
          <span style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            {currentSpeed}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            km/h
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={14} color="var(--primary)" />
            <span>GPS: {gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'Connected'}</span>
          </div>
          <span style={{ color: 'var(--border-color)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Activity size={14} color="#10b981" />
            <span>{isBroadcasting ? 'Broadcasting Live' : 'Standby'}</span>
          </div>
        </div>
      </div>

      {/* 3. Hero Toggle Action Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={toggleBroadcast}
        style={{
          width: '100%',
          padding: '1.15rem 1rem',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: isBroadcasting ? 'var(--danger)' : 'var(--primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isBroadcasting 
            ? '0 4px 14px rgba(239, 68, 68, 0.25)' 
            : '0 4px 14px rgba(2, 132, 199, 0.25)',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        {isBroadcasting ? (
          <>
            <Square size={20} fill="#ffffff" />
            <span>Stop Tracking</span>
          </>
        ) : (
          <>
            <Play size={20} fill="#ffffff" />
            <span>Start Tracking</span>
          </>
        )}
      </motion.button>

      {/* 4. SOS Emergency Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowSosModal(true)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <AlertTriangle size={16} />
        <span>Emergency SOS</span>
      </motion.button>

      {/* 5. Minimal footer */}
      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Device GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        {lastTxTime && ` • Synced at ${lastTxTime}`}
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
