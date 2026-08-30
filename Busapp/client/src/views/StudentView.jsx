import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
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
  const { user } = useAuth();
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

  const currentPass = passes.find(p => p.id === user?.id) || passes[0] || {};

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
    <div className="mobile-view-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page Header - Compact for Mobile */}
      <div style={{ padding: '0.75rem 1rem', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.1rem', margin: 0 }}>
          Bus Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
          Real-time updates
        </p>
      </div>

      {/* TAB 1: RADAR */}
      <AnimatePresence mode="wait">
      {activeTab === 'tracker' && (

        <motion.div 
          key="tracker"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          className="flex-col gap-1" 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem 1rem' }}
        >
          {/* Nearby Shuttles Header - Compact */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
              <MapPin size={16} color="var(--primary, #7c3aed)" />
              <span style={{ minWidth: 'auto' }}>Nearby</span>
            </h2>
            {nearbyBuses.length > 0 && (
              <span className="badge" style={{ backgroundColor: 'var(--primary-light, #ede9fe)', color: 'var(--primary, #7c3aed)', fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                {nearbyBuses.length}
              </span>
            )}
          </div>

          {/* Initial GPS Location Loading State - Compact */}
          {geoStatus === 'requesting' && (
            <div className="clean-card" style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', borderRadius: '12px', flex: 1, justifyContent: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={24} color="#7c3aed" className="spin-animation" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                  Getting location...
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
                  Finding nearby buses
                </p>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Loader size={12} className="spin-animation" />
                <span>Loading...</span>
              </div>
            </div>
          )}


          {/* Location Access Error State - Compact */}
          {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
            <div className="clean-card" style={{ textAlign: 'center', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', borderRadius: '12px', flex: 1, justifyContent: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                  Location Required
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0, lineHeight: '1.3' }}>
                  Allow location access to see nearby buses.
                </p>
              </div>
              <button
                type="button"
                onClick={requestLocation}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                  marginTop: '0.25rem'
                }}
              >
                Enable Location
              </button>
            </div>
          )}

          {/* Granted GPS Location: Render Real Map Centered on Student */}
          {geoStatus === 'granted' && studentLocation && (
            <>
              {/* Compact Status Pill */}
              <div className="student-geo-status" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexShrink: 0 }}>
                <Locate size={12} />
                <span>Location active</span>
              </div>

              {/* Always Visible Radar Map - Optimized Height */}
              <div className="student-radar-map-container" style={{ minHeight: '280px', marginBottom: '0.5rem' }}>
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

              {/* Empty State - Compact */}
              {nearbyBuses.length === 0 && (
                <div className="clean-card" style={{ textAlign: 'center', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Bus size={20} color="var(--text-muted)" style={{ marginBottom: '0.4rem' }} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.1rem', margin: 0 }}>No Buses Nearby</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', margin: 0 }}>
                    Buses within {NEARBY_RADIUS_KM} km will appear here
                  </p>
                </div>
              )}

              {/* Nearby Bus Cards - Mobile Optimized */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  cursor: 'pointer',
                  padding: '0.75rem',
                  minHeight: 'auto'
                }}
              >
                {/* SOS Banner - Compact */}
                {isSos && (
                  <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '0.4rem 0.5rem', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    <strong>Emergency SOS</strong>
                  </div>
                )}

                {/* Bus Header - Compact */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0, flex: 1 }}>
                    <Bus size={14} color={route?.color || 'var(--primary)'} style={{ flexShrink: 0 }} />
                    <strong style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bus.number || `BUS #${bus.id}`}</strong>
                    <span className="badge" style={{ backgroundColor: isSos ? 'var(--danger-light)' : 'var(--success-light)', color: isSos ? 'var(--danger)' : 'var(--success)', fontSize: '0.6rem', padding: '0.1rem 0.3rem', flexShrink: 0 }}>
                      {isSos ? 'SOS' : 'Live'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>
                    {bus.distanceKm.toFixed(1)}km
                  </span>
                </div>

                {/* Route Name - Compact */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                  <Navigation size={11} color={route?.color || 'var(--primary)'} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{route?.name || 'Unassigned'}</span>
                </div>

                {/* ETA + Nearest Stop - Compact */}
                <div style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  marginBottom: '0.4rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', minWidth: 0 }}>
                      <MapPin size={11} color="var(--primary, #7c3aed)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayStopName || 'No stop'}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {displayEta !== null && displayEta !== undefined ? (
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: displayEta <= 5 ? 'var(--success, #10b981)' : 'var(--primary, #7c3aed)' }}>
                          {displayEta}m
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          N/A
                        </span>
                      )}
                    </div>
                  </div>
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

                {/* Alert Toggle + Stop Selector - Compact for Mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: isSelected ? '1fr 1fr' : '1fr', gap: '0.3rem' }}>
                  {/* Alert Toggle - Compact */}
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
                      padding: '0.5rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: isAlertTriggered
                        ? 'rgba(245, 158, 11, 0.1)'
                        : isAlertOn
                          ? 'rgba(124, 58, 237, 0.08)'
                          : 'var(--bg-subtle)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      minHeight: '40px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', flex: 1 }}>
                      {isAlertOn ? <Bell size={12} color="var(--primary, #7c3aed)" /> : <BellOff size={12} color="var(--text-muted)" />}
                      <span style={{ fontWeight: 500, color: isAlertTriggered ? '#f59e0b' : isAlertOn ? 'var(--primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isAlertTriggered ? 'Triggered!' : `Alert ${ALERT_THRESHOLD_MIN}m`}
                      </span>
                    </div>
                    {/* Toggle Switch - Compact */}
                    <div
                      className={`student-alert-switch ${isAlertOn ? 'student-alert-switch-on' : ''}`}
                      style={{ marginLeft: '0.3rem', flexShrink: 0 }}
                    >
                      <div className="student-alert-switch-knob" />
                    </div>
                  </div>

                  {/* Stop Selector - Compact */}
                  {isSelected && (
                    <select
                      value={selectedStopIndex ?? -1}
                      onChange={e => setSelectedStopIndex(e.target.value === '-1' ? null : parseInt(e.target.value))}
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding: '0.5rem 0.4rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        minHeight: '40px'
                      }}
                    >
                      <option value={-1}>Track</option>
                      {route?.stops && route.stops.map((stop, idx) => (
                        <option key={idx} value={idx} style={{ fontSize: '0.75rem' }}>
                          S{idx + 1}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Notification permission note - Compact */}
                {isAlertOn && typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                    ⚠ Notifications blocked
                  </div>
                )}
              </div>
            );
          })}
              </div>
          {/* Note about background limitations */}
          {Object.values(alerts).some(a => a.enabled) && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem', marginTop: '0.25rem' }}>
              ℹ Alerts work while this page is active. Background/locked-screen delivery requires browser notification support.
            </div>
          )}
            </>
          )}
        </motion.div>
      )}

      {/* TAB 2: ROUTES */}
      {activeTab === 'routes' && (
        <motion.div 
          key="routes"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          className="flex-col gap-1" 
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '0.75rem 1rem' }}
        >
          {routes.map(route => {
            const cleanStops = Array.from(new Set((route.stops || []).map(s => String(s).trim()).filter(Boolean)));
            return (
              <div key={route.id} className="clean-card" style={{ borderLeft: `3px solid ${route.color || 'var(--primary)'}`, padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div className="flex-between" style={{ marginBottom: '0.4rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{route.name}</h3>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                    {cleanStops.length} stops
                  </span>
                </div>

                <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
                  {cleanStops.map((stop, i) => (
                    <div key={`${route.id}-stop-${i}-${stop}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: i === cleanStops.length - 1 ? 0 : '0.35rem', fontSize: '0.75rem' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: route.color || 'var(--primary)', flexShrink: 0, marginTop: '0.2rem' }} />
                      <span style={{ color: i === 0 || i === cleanStops.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: i === 0 || i === cleanStops.length - 1 ? 500 : 400, lineHeight: '1.3' }}>
                        {stop}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* TAB 3: BUS PASS */}
      {activeTab === 'pass' && (
        <motion.div 
          key="pass"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: '0.75rem 1rem' }}
        >
          {/* Pass details */}
          <div className="clean-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Pass</span>
                <strong style={{ fontSize: '0.85rem' }}>Campus Shuttle</strong>
              </div>
              <span className="badge" style={{ backgroundColor: currentPass.passStatus === 'Active' ? 'var(--success-light)' : 'var(--danger-light)', color: currentPass.passStatus === 'Active' ? 'var(--success)' : 'var(--danger)', fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                {currentPass.passStatus || 'Active'}
              </span>
            </div>

            <div style={{ padding: '0.75rem 1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Student</span>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.05rem', margin: 0 }}>{currentPass.name || 'Alex Mercer'}</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{currentPass.email || 'alex.mercer@student.edu'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Valid Until</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{currentPass.validUntil || '2026-12-31'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Access</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{currentPass.routeEntitlement || 'All Routes'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <QrCode size={72} color="var(--text-primary)" style={{ margin: '0 auto 0.4rem', opacity: currentPass.passStatus === 'Active' ? 1 : 0.3 }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {currentPass.id || 'S1001'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      {/* Bottom Navigation Bar */}
      <div className="bottom-nav-bar">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('tracker')}
          className={`bottom-nav-item ${activeTab === 'tracker' ? 'active' : ''}`}
        >
          <Locate size={20} />
          Radar
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('routes')}
          className={`bottom-nav-item ${activeTab === 'routes' ? 'active' : ''}`}
        >
          <Navigation size={20} />
          Routes
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('pass')}
          className={`bottom-nav-item ${activeTab === 'pass' ? 'active' : ''}`}
        >
          <QrCode size={20} />
          Pass
        </motion.button>
      </div>
    </div>
  );
}
