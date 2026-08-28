import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import FleetMap from '../components/FleetMap';
import { Navigation, MapPin, AlertTriangle, QrCode, Bus, Bell, BellOff, Locate, Loader } from 'lucide-react';

// ────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────
const NEARBY_RADIUS_KM = 2;
const ALERT_THRESHOLD_MIN = 10;
const STORAGE_KEY_ALERTS = 'wayfinder_student_alerts';
const STORAGE_KEY_SELECTED = 'wayfinder_student_selected';

// ────────────────────────────────────────────────
// HAVERSINE DISTANCE (km)
// ────────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ────────────────────────────────────────────────
// WEB AUDIO API ALARM SOUND
// ────────────────────────────────────────────────
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Play 3 short beeps
    [0, 0.25, 0.5].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.15);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.15);
    });
    // Close context after sounds finish
    setTimeout(() => ctx.close(), 1500);
  } catch (err) {
    console.warn('Could not play alarm sound:', err);
  }
}

// ────────────────────────────────────────────────
// ETA CALCULATION HELPERS
// ────────────────────────────────────────────────

/** Find index of nearest route path point to a given GPS coordinate */
function findNearestPathPointIndex(lat, lng, routePath) {
  let minDist = Infinity;
  let minIdx = 0;
  routePath.forEach((pt, idx) => {
    const d = haversineDistance(lat, lng, pt.lat, pt.lng);
    if (d < minDist) {
      minDist = d;
      minIdx = idx;
    }
  });
  return { index: minIdx, distance: minDist };
}

/** Sum route path distance between two path indices (in km) */
function routePathDistance(routePath, fromIdx, toIdx) {
  if (fromIdx === toIdx) return 0;
  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  let dist = 0;
  for (let i = start; i < end; i++) {
    dist += haversineDistance(
      routePath[i].lat, routePath[i].lng,
      routePath[i + 1].lat, routePath[i + 1].lng
    );
  }
  return dist;
}

/** Find proportional path index for a given stop index in route.stops */
function getStopPathIndex(route, stopIdx) {
  if (!route || !route.path || route.path.length === 0) return 0;
  const cleanStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
  if (cleanStops.length <= 1) return route.path.length - 1;

  if (Array.isArray(route.stopCoordinates) && route.stopCoordinates[stopIdx]) {
    const coord = route.stopCoordinates[stopIdx];
    return findNearestPathPointIndex(coord.lat, coord.lng, route.path).index;
  }

  const ratio = stopIdx / (cleanStops.length - 1);
  return Math.min(Math.round(ratio * (route.path.length - 1)), route.path.length - 1);
}

/** Calculate ETA in minutes for a bus to reach a stop point index along route */
function calculateETA(bus, route, stopPointIndex) {
  if (!route || !route.path || route.path.length < 2) return null;
  if (!bus.location || typeof bus.location.lat !== 'number') return null;

  const busPointInfo = findNearestPathPointIndex(bus.location.lat, bus.location.lng, route.path);
  const busIdx = busPointInfo.index;

  // If bus is already past the stop, it may be looping — show as approaching
  const dist = routePathDistance(route.path, busIdx, stopPointIndex);
  if (dist < 0.01) return 0; // essentially at the stop

  const speed = typeof bus.speed === 'number' && bus.speed > 0 ? bus.speed : null;
  if (!speed) return null; // can't estimate without speed

  // ETA in minutes = distance (km) / speed (km/h) * 60
  const etaMin = (dist / speed) * 60;
  return Math.round(etaMin);
}

// ────────────────────────────────────────────────
// LOCALSTORAGE HELPERS
// ────────────────────────────────────────────────
function loadAlerts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAlerts(alerts) {
  try {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
  } catch { /* quota exceeded or private mode */ }
}

function loadSelected() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SELECTED);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSelected(sel) {
  try {
    localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(sel));
  } catch { /* ignore */ }
}

// ────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────
export default function StudentView() {
  const { buses, routes, passes } = useWebSocket();
  const [selectedPassId, setSelectedPassId] = useState('S1001');
  const [activeTab, setActiveTab] = useState('tracker'); // tracker, routes, pass

  // ── Geolocation state ──
  const [studentLocation, setStudentLocation] = useState(null);
  const [geoStatus, setGeoStatus] = useState('requesting'); // requesting | granted | denied | unavailable
  const watchIdRef = useRef(null);

  // ── Selection state (restored from localStorage) ──
  const savedSelection = useMemo(() => loadSelected(), []);
  const [selectedBusId, setSelectedBusId] = useState(savedSelection.busId || null);
  const [selectedStopIndex, setSelectedStopIndex] = useState(
    typeof savedSelection.stopIndex === 'number' ? savedSelection.stopIndex : null
  );

  // ── Alerts state (restored from localStorage) ──
  const [alerts, setAlerts] = useState(() => loadAlerts());
  const alertTriggeredRef = useRef({}); // keyed by alertKey, prevents duplicate triggers
  const notificationPermissionRef = useRef(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const currentPass = passes.find(p => p.id === selectedPassId) || passes[0] || {};

  // ── Geolocation request callback ──
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    setGeoStatus('requesting');

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStudentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');

        // Keep updating position live
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            setStudentLocation({ lat: watchPos.coords.latitude, lng: watchPos.coords.longitude });
            setGeoStatus('granted');
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGeoStatus('denied');
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied');
        } else {
          setGeoStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, []);

  // ── Geolocation initialization effect ──
  useEffect(() => {
    requestLocation();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLocation]);

  // ── Active live buses (not off duty / maintenance) ──
  const activeBuses = useMemo(() => {
    return buses.filter(b =>
      b.status !== 'Off Duty' &&
      b.status !== 'Maintenance' &&
      b.location &&
      typeof b.location.lat === 'number' &&
      typeof b.location.lng === 'number'
    );
  }, [buses]);

  // ── Nearby buses with enriched ETA data ──
  const nearbyBuses = useMemo(() => {
    if (!studentLocation) return [];

    return activeBuses
      .map(bus => {
        const distKm = haversineDistance(
          studentLocation.lat, studentLocation.lng,
          bus.location.lat, bus.location.lng
        );

        const route = routes.find(r => r.id === bus.routeId);
        let nearestStopName = null;
        let nearestStopIndex = null;
        let nearestStopDistance = null;
        let etaMinutes = null;

        if (route && route.path && route.path.length >= 2) {
          // Find nearest route path point to student
          const studentNearest = findNearestPathPointIndex(
            studentLocation.lat, studentLocation.lng, route.path
          );
          nearestStopIndex = studentNearest.index;
          nearestStopDistance = studentNearest.distance;

          // Get stop name from route.stops array
          const cleanStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
          nearestStopName = cleanStops[nearestStopIndex] || `Stop ${nearestStopIndex + 1}`;

          // Calculate ETA
          etaMinutes = calculateETA(bus, route, nearestStopIndex);
        }

        return {
          ...bus,
          distanceKm: distKm,
          route,
          nearestStopName,
          nearestStopIndex,
          nearestStopDistance,
          etaMinutes
        };
      })
      .filter(b => b.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distanceKm - b.distanceKm));
  }, [activeBuses, studentLocation, routes]);

  // ── Persist selection ──
  useEffect(() => {
    saveSelected({ busId: selectedBusId, stopIndex: selectedStopIndex });
  }, [selectedBusId, selectedStopIndex]);

  // ── Persist alerts ──
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  // ── Handle bus selection ──
  const handleSelectBus = useCallback((busId) => {
    setSelectedBusId(busId);
    // Auto-select nearest stop when bus is selected
    const busData = nearbyBuses.find(b => b.id === busId);
    if (busData && busData.nearestStopIndex !== null) {
      setSelectedStopIndex(busData.nearestStopIndex);
    } else {
      setSelectedStopIndex(null);
    }
  }, [nearbyBuses]);

  // ── Alert key helper ──
  const getAlertKey = (busId, stopName) => `${busId}-${stopName || 'unknown'}`;

  // ── Toggle alert ──
  const toggleAlert = useCallback((busId, stopName) => {
    const key = getAlertKey(busId, stopName);
    setAlerts(prev => {
      const current = prev[key];
      if (current && current.enabled) {
        // Turn off
        const next = { ...prev };
        next[key] = { ...current, enabled: false };
        // Clear triggered state so it can re-trigger if re-enabled
        delete alertTriggeredRef.current[key];
        return next;
      } else {
        // Turn on — request notification permission if first time
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission().then(perm => {
            notificationPermissionRef.current = perm;
          });
        }
        const next = { ...prev };
        next[key] = {
          busId,
          stopName,
          enabled: true,
          triggered: false
        };
        return next;
      }
    });
  }, []);

  // ── ETA monitoring + alert triggering ──
  useEffect(() => {
    const alertEntries = Object.entries(alerts).filter(([, v]) => v.enabled && !v.triggered);
    if (alertEntries.length === 0) return;

    alertEntries.forEach(([key, alertData]) => {
      // Already triggered this session?
      if (alertTriggeredRef.current[key]) return;

      const bus = nearbyBuses.find(b => b.id === alertData.busId);
      if (!bus || bus.etaMinutes === null) return;

      if (bus.etaMinutes <= ALERT_THRESHOLD_MIN) {
        // TRIGGER!
        alertTriggeredRef.current[key] = true;

        // 1. Play sound
        playAlarmSound();

        // 2. Browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('🚌 Bus Arriving Soon!', {
              body: `${bus.number || 'Bus'} is ~${bus.etaMinutes} min from ${alertData.stopName}`,
              icon: '/favicon.svg',
              tag: key // prevent duplicate notifications
            });
          } catch (err) {
            console.warn('Notification failed:', err);
          }
        }

        // 3. Mark as triggered in state
        setAlerts(prev => ({
          ...prev,
          [key]: { ...prev[key], triggered: true }
        }));
      }
    });
  }, [alerts, nearbyBuses]);

  // ── Visibility change handler — re-evaluate alerts when tab regains focus ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Reset triggered refs for alerts that have been un-triggered
        // This allows re-evaluation on refocus
        Object.entries(alerts).forEach(([key, v]) => {
          if (v.enabled && !v.triggered) {
            delete alertTriggeredRef.current[key];
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [alerts]);

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
          {/* Initial GPS Location Loading State */}
          {geoStatus === 'requesting' && (
            <div className="clean-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={28} color="#7c3aed" className="spin-animation" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                  Getting your location...
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '320px' }}>
                  We're finding your current location to show nearby buses.
                </p>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Loader size={14} className="spin-animation" />
                <span>Loading...</span>
              </div>
            </div>
          )}

          {/* Location Access Error State (Permission Denied or Unavailable) */}
          {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
            <div className="clean-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderRadius: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={28} color="#ef4444" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
                  Location Required
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '340px', lineHeight: '1.4' }}>
                  We need your current location to show nearby buses and calculate pickup ETAs. Please allow location access.
                </p>
              </div>
              <button
                type="button"
                onClick={requestLocation}
                style={{
                  padding: '0.75rem 1.75rem',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Granted GPS Location: Render Real Map Centered on Student */}
          {geoStatus === 'granted' && studentLocation && (
            <>
              {/* Nearby Shuttles Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={18} color="var(--primary, #7c3aed)" />
                  Nearby Shuttles
                </h2>
                {nearbyBuses.length > 0 && (
                  <span className="badge" style={{ backgroundColor: 'var(--primary-light, #ede9fe)', color: 'var(--primary, #7c3aed)' }}>
                    {nearbyBuses.length} nearby
                  </span>
                )}
              </div>

              {/* Location Active Status Pill */}
              <div className="student-geo-status" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
                <Locate size={14} />
                <span>Location active — showing shuttles within {NEARBY_RADIUS_KM} km</span>
              </div>

              {/* Always Visible Radar Map */}
              <div className="student-radar-map-container">
                <FleetMap
                  buses={nearbyBuses.length > 0 ? nearbyBuses : activeBuses}
                  routes={routes}
                  selectedBusId={selectedBusId}
                  onSelectBus={handleSelectBus}
                  hideStatCards={true}
                  showSearch={false}
                  studentLocation={studentLocation}
                  center={[studentLocation.lat, studentLocation.lng]}
                  initialZoom={15}
                />
              </div>

              {/* Empty State */}
              {nearbyBuses.length === 0 && (
                <div className="clean-card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <Bus size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Active Shuttles Nearby</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                    Live college buses will appear here when they start broadcasting within {NEARBY_RADIUS_KM} km of your location.
                    {activeBuses.length > 0 && ` (${activeBuses.length} active bus${activeBuses.length > 1 ? 'es' : ''} outside your radius)`}
                  </p>
                </div>
              )}

              {/* Nearby Bus Cards */}
              {nearbyBuses.map(bus => {
            const route = bus.route;
            const isSos = bus.status === '🚨 EMERGENCY / SOS' || (bus.status || '').includes('SOS') || (bus.status || '').includes('EMERGENCY');
            const isSelected = bus.id === selectedBusId;
            const alertKey = getAlertKey(bus.id, bus.nearestStopName);
            const alertState = alerts[alertKey];
            const isAlertOn = alertState && alertState.enabled;
            const isAlertTriggered = alertState && alertState.triggered;

            // If this bus is selected and student picked a specific stop, calculate ETA towards that stop
            let displayStopName = bus.nearestStopName;
            let displayEta = bus.etaMinutes;
            if (isSelected && selectedStopIndex !== null && route) {
              const cleanStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
              displayStopName = cleanStops[selectedStopIndex] || `Stop ${selectedStopIndex + 1}`;
              const targetPathIdx = getStopPathIndex(route, selectedStopIndex);
              displayEta = calculateETA(bus, route, targetPathIdx);
            }

            return (
              <div
                key={bus.id}
                className={`clean-card student-bus-card ${isSelected ? 'student-bus-card-selected' : ''}`}
                onClick={() => handleSelectBus(bus.id)}
                style={{
                  borderLeft: `3px solid ${isSos ? 'var(--danger)' : route?.color || 'var(--primary)'}`,
                  cursor: 'pointer'
                }}
              >
                {/* SOS Banner */}
                {isSos && (
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <strong>Emergency SOS Reported</strong>
                  </div>
                )}

                {/* Bus Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bus size={16} color={route?.color || 'var(--primary)'} />
                    <strong style={{ fontSize: '0.95rem' }}>{bus.number || `BUS #${bus.id}`}</strong>
                    <span className="badge" style={{ backgroundColor: isSos ? 'var(--danger-light)' : 'var(--success-light)', color: isSos ? 'var(--danger)' : 'var(--success)', fontSize: '0.7rem' }}>
                      <span className="pulse-indicator">●</span> {isSos ? 'SOS' : 'Live'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {bus.distanceKm.toFixed(1)} km
                  </span>
                </div>

                {/* Route Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.83rem', marginBottom: '0.6rem' }}>
                  <Navigation size={13} color={route?.color || 'var(--primary)'} />
                  <span>{route?.name || 'Unassigned Route'}</span>
                </div>

                {/* ETA + Nearest Stop */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.7rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '0.6rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                      <MapPin size={13} color="var(--primary, #7c3aed)" />
                      <span style={{ fontWeight: 500 }}>{displayStopName || 'No stop data'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {displayEta !== null && displayEta !== undefined ? (
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: displayEta <= 5 ? 'var(--success, #10b981)' : 'var(--primary, #7c3aed)' }}>
                          {displayEta} min
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          ETA unavailable
                        </span>
                      )}
                    </div>
                  </div>
                  {displayEta !== null && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {bus.speed > 0 ? `${bus.speed} km/h` : 'Stationary'} · Updated {new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Stop selector (when selected) */}
                {isSelected && route && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Select Pickup Stop for ETA
                    </label>
                    <select
                      className="form-select"
                      value={selectedStopIndex ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        setSelectedStopIndex(val);
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.5rem' }}
                    >
                      <option value="">— Nearest stop ({bus.nearestStopName || 'Auto'}) —</option>
                      {(() => {
                        const cleanStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
                        return cleanStops.map((stopName, idx) => (
                          <option key={idx} value={idx}>
                            {idx + 1}. {stopName}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                )}

                {/* Alert Toggle */}
                <div
                  className="student-alert-toggle-row"
                  onClick={e => {
                    e.stopPropagation();
                    toggleAlert(bus.id, displayStopName);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isAlertTriggered
                      ? 'rgba(245, 158, 11, 0.1)'
                      : isAlertOn
                        ? 'rgba(124, 58, 237, 0.08)'
                        : 'var(--bg-subtle)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    {isAlertOn ? <Bell size={14} color="var(--primary, #7c3aed)" /> : <BellOff size={14} color="var(--text-muted)" />}
                    <span style={{ fontWeight: 500, color: isAlertTriggered ? '#f59e0b' : isAlertOn ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {isAlertTriggered
                        ? '🔔 Alert triggered!'
                        : `Alert me ${ALERT_THRESHOLD_MIN} min before`}
                    </span>
                  </div>
                  {/* Toggle Switch */}
                  <div
                    className={`student-alert-switch ${isAlertOn ? 'student-alert-switch-on' : ''}`}
                  >
                    <div className="student-alert-switch-knob" />
                  </div>
                </div>

                {/* Notification permission note */}
                {isAlertOn && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    ⚠ Browser notifications blocked. In-app alert & sound will still work while the page is active.
                  </div>
                )}
              </div>
            );
          })}

          {/* Note about background limitations */}
          {Object.values(alerts).some(a => a.enabled) && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem', marginTop: '0.25rem' }}>
              ℹ Alerts work while this page is active. Background/locked-screen delivery requires browser notification support.
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: ROUTES */}
      {activeTab === 'routes' && (
        <div className="flex-col gap-1">
          {routes.map(route => {
            const cleanStops = Array.from(new Set((route.stops || []).map(s => String(s).trim()).filter(Boolean)));
            return (
              <div key={route.id} className="clean-card" style={{ borderLeft: `3px solid ${route.color || 'var(--primary)'}` }}>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{route.name}</h3>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                    {cleanStops.length} Stops
                  </span>
                </div>

                <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
                  {cleanStops.map((stop, i) => (
                    <div key={`${route.id}-stop-${i}-${stop}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: i === cleanStops.length - 1 ? 0 : '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: route.color || 'var(--primary)' }} />
                      <span style={{ color: i === 0 || i === cleanStops.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 || i === cleanStops.length - 1 ? 500 : 400 }}>
                        {stop}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
