import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Users, Clock, AlertTriangle, Zap, MapPin, Search, X, Bus, Locate, Check, GraduationCap, Building2 } from 'lucide-react';
import { COLLEGE_DESTINATION, KOTTAYAM_POONJAR_BOUNDS } from '../constants/college';
import { bus3dManager } from '../utils/bus3dManager';

/**
 * Custom Leaflet DivIcon for the verified College Destination (College of Engineering Poonjar)
 */
export function createCollegeMarkerIcon() {
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
      z-index: 1000;
    ">
      <div style="
        background-color: #15803d;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 9px;
        border-radius: 8px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        margin-bottom: 4px;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        ${COLLEGE_DESTINATION.shortName}
      </div>
      <div style="
        width: 28px;
        height: 28px;
        background-color: #16a34a;
        border: 3px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html: html,
    className: 'custom-college-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

/**
 * Default color classifier for vehicle/bus status
 */
export function defaultGetMarkerColor(status, _isSelected) {
  if (!status) return '#10b981';
  const s = String(status).toUpperCase();
  if (s.includes('DELAY') || s.includes('LATE')) return '#f59e0b';
  if (s.includes('SOS') || s.includes('EMERGENCY') || s.includes('BREAKDOWN') || s.includes('ALERT')) return '#ef4444';
  if (s.includes('IDLE') || s.includes('STANDBY') || s.includes('MAINTENANCE') || s.includes('OFF')) return '#64748b';
  return '#10b981';
}

/**
 * Helper to calculate geographic bearing between two coordinates
 */
export function calculateBearing(lat1, lng1, lat2, lng2, fallbackBearing = null) {
  if (Math.hypot(lat2 - lat1, lng2 - lng1) < 0.000005) {
    return fallbackBearing !== null ? fallbackBearing : 0;
  }
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const phi1 = lat1 * (Math.PI / 180);
  const phi2 = lat2 * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ((bearing % 360) + 360) % 360;
}

/**
 * Helper to find tangent bearing along a route path
 */
export function findBearingOnRoute(busLoc, routePath) {
  if (!busLoc || !routePath || routePath.length < 2) return 90;
  let minDst = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < routePath.length; i++) {
    const pt = routePath[i];
    const d = Math.hypot(pt.lat - busLoc.lat, pt.lng - busLoc.lng);
    if (d < minDst) {
      minDst = d;
      closestIdx = i;
    }
  }
  // Look ahead ~6 points (~25-35m) along route for stable, non-jittery tangent
  const aheadIdx = Math.min(closestIdx + 6, routePath.length - 1);
  if (aheadIdx === closestIdx && closestIdx > 0) {
    const prevIdx = Math.max(0, closestIdx - 6);
    return calculateBearing(routePath[prevIdx].lat, routePath[prevIdx].lng, routePath[closestIdx].lat, routePath[closestIdx].lng);
  }
  return calculateBearing(routePath[closestIdx].lat, routePath[closestIdx].lng, routePath[aheadIdx].lat, routePath[aheadIdx].lng);
}

/**
 * 3D Bus Leaflet DivIcon generator using the real 3d bus.obj model.
 * The front side of the 3d model (+X in bus.obj) dynamically faces the forward bearing along the route.
 */
export function create3DBusMarkerIcon(bus, color, isSelected, isSearchMatch, bearing = 0) {
  const normBearing = ((Math.round(bearing) % 360) + 360) % 360;
  const dataUrl = bus3dManager.getBusIconDataUrl({
    bearing: normBearing,
    color,
    status: bus?.status || 'Active',
    isSelected
  });

  const busNumberText = bus?.number
    ? (bus.number.match(/#\d+/) ? bus.number.match(/#\d+/)[0] : bus.number.split(' ')[1] || bus.number.split(' ')[0])
    : 'BUS';
  const speedText = bus?.speed !== undefined ? `${bus.speed} km/h` : '';

  const selectionRing = isSelected ? `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 2.5px solid ${color};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      pointer-events: none;
      z-index: 1;
    "></div>
  ` : isSearchMatch ? `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 74px;
      height: 74px;
      border-radius: 50%;
      border: 2px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      pointer-events: none;
      z-index: 1;
    "></div>
  ` : '';

  // 3D bus model rendered by Three.js from public/bus.obj
  const content = dataUrl ? `
    <img 
      src="${dataUrl}" 
      alt="${bus?.number || 'Bus'}" 
      style="
        width: 66px; 
        height: 66px; 
        object-fit: contain; 
        display: block; 
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
        transition: transform 0.25s ease-out;
        transform: ${isSelected ? 'scale(1.12)' : 'scale(1)'};
        pointer-events: none;
        position: relative;
        z-index: 2;
      " 
    />
  ` : `
    <div style="
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      transform: rotate(${normBearing}deg);
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    ">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M12 2L19 21L12 17L5 21L12 2Z" fill="#ffffff" fill-opacity="0.9"/></svg>
    </div>
  `;

  const badgeHtml = `
    <div style="
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 999px;
      white-space: nowrap;
      border: 1.5px solid ${color};
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 10;
      letter-spacing: 0.02em;
      pointer-events: none;
    ">
      <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${color};"></span>
      <span>${busNumberText}</span>
      ${speedText ? `<span style="opacity: 0.9; font-weight: 700; font-size: 9px; color: ${bus?.speed > 0 ? '#38bdf8' : '#94a3b8'};">${speedText}</span>` : ''}
    </div>
  `;

  const html = `
    <div style="
      position: relative;
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      ${selectionRing}
      ${content}
      ${badgeHtml}
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-3d-bus-marker',
    iconSize: [68, 68],
    iconAnchor: [34, 34],
    popupAnchor: [0, -34]
  });
}

/**
 * Default Leaflet DivIcon generator
 */
export function defaultCreateMarkerIcon(colorOrBus, isSelected, isSearchMatch, bearingOverride) {
  if (typeof colorOrBus === 'object' && colorOrBus !== null) {
    const bus = colorOrBus;
    const color = defaultGetMarkerColor(bus.status, isSelected);
    return create3DBusMarkerIcon(bus, color, isSelected, isSearchMatch, bearingOverride || bus.bearing || 0);
  }
  const color = colorOrBus || '#10b981';
  return create3DBusMarkerIcon(null, color, isSelected, isSearchMatch, bearingOverride || 0);
}

/**
 * Custom Leaflet DivIcon generator for interactive picked route stops
 */
export function createPickedStopIcon(stopNumber, name) {
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
    ">
      <div style="
        background-color: #0f172a;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        margin-bottom: 4px;
        border: 1px solid rgba(255,255,255,0.4);
        letter-spacing: 0.01em;
      ">
        ${stopNumber}. ${name}
      </div>
      <div style="
        width: 26px;
        height: 26px;
        background-color: #0284c7;
        border: 2px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      ">
        ${stopNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-picked-stop-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

/**
 * Custom Leaflet DivIcon generator for configured route stops
 */
export function createRouteStopIcon(stopName, color = '#0284c7', isHighlighted = false) {
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
    ">
      <div style="
        width: ${isHighlighted ? '14px' : '10px'};
        height: ${isHighlighted ? '14px' : '10px'};
        background-color: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-route-stop-dot',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

/**
 * Custom Leaflet DivIcon for place search result marker
 */
export function createSearchedPlaceIcon(name) {
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    ">
      <div style="
        background-color: #0284c7;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        margin-bottom: 4px;
        border: 1px solid rgba(255,255,255,0.6);
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
        ${name}
      </div>
      <div style="
        width: 14px;
        height: 14px;
        background-color: #0284c7;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-searched-place-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

/**
 * Custom Leaflet DivIcon for student's current GPS location ("YOU" marker)
 */
export function createStudentLocationIcon() {
  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
    ">
      <div style="
        width: 20px;
        height: 20px;
        background-color: #3b82f6;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0,0,0,0.3);
      "></div>
      <div style="
        margin-top: 4px;
        background-color: #1e40af;
        color: #ffffff;
        font-size: 9px;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 4px;
        letter-spacing: 0.05em;
        white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      ">YOU</div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'student-location-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

/**
 * Default Popup Content Renderer
 */
export function DefaultMarkerPopup({ bus }) {
  const isSOS = (bus.status || '').toUpperCase().includes('SOS');
  const isDelayed = (bus.status || '').toUpperCase().includes('DELAY');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem', minWidth: '160px' }}>
      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.2rem' }}>
        {bus.number || `BUS #${bus.id}`}
      </div>
      {bus.driverName && (
        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem' }}>
          <strong>Driver:</strong> {bus.driverName}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            backgroundColor: isSOS ? '#fee2e2' : isDelayed ? '#fef3c7' : '#dcfce7',
            color: isSOS ? '#b91c1c' : isDelayed ? '#b45309' : '#15803d'
          }}
        >
          {bus.status || 'Active'}
        </span>
        {bus.speed !== undefined && (
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            {bus.speed} km/h
          </span>
        )}
      </div>
    </div>
  );
}

// Controller component to manage initial center and smooth re-centering on selection without resetting manual pan/zoom
function MapViewController({ initialCenter, initialZoom = 13, selectedLocation, studentLocation, onMapReady }) {
  const map = useMap();
  const initializedRef = useRef(false);
  const prevStudentLocRef = useRef(null);

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    if (!initializedRef.current && initialCenter && Array.isArray(initialCenter)) {
      map.setView(initialCenter, initialZoom);
      initializedRef.current = true;
    }
  }, [initialCenter, initialZoom, map]);

  useEffect(() => {
    if (selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number') {
      map.setView([selectedLocation.lat, selectedLocation.lng], Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [selectedLocation, map]);

  useEffect(() => {
    // If student location is just acquired, pan to it if no bus is selected
    if (studentLocation && (!prevStudentLocRef.current || 
        prevStudentLocRef.current.lat !== studentLocation.lat || 
        prevStudentLocRef.current.lng !== studentLocation.lng)) {
      if (!selectedLocation) {
        map.setView([studentLocation.lat, studentLocation.lng], Math.max(map.getZoom(), 14), { animate: true });
      }
      prevStudentLocRef.current = studentLocation;
    }
  }, [studentLocation, selectedLocation, map]);

  return null;
}

// Map Click Handler for stop picking mode
function MapClickHandler({ isPickingStops, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isPickingStops && onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

/**
 * Smooth Bus Movement Helpers:
 * Traces route path geometry and smoothly interpolates bus positions & bearings at 60 FPS
 */
function getPathWaypoints(fromPos, toPos, routePath) {
  if (!fromPos || !toPos) {
    return fromPos ? [fromPos] : (toPos ? [toPos] : []);
  }

  const dLat = toPos.lat - fromPos.lat;
  const dLng = toPos.lng - fromPos.lng;
  const moveDist = Math.hypot(dLat, dLng);

  // If stationary, micro-shift (< ~1 meter), or no path, direct forward line
  if (moveDist < 0.00001 || !routePath || !Array.isArray(routePath) || routePath.length < 2) {
    return [fromPos, toPos];
  }

  let idx1 = -1;
  let minDist1 = Infinity;
  let idx2 = -1;
  let minDist2 = Infinity;

  for (let i = 0; i < routePath.length; i++) {
    const pt = routePath[i];
    const d1 = (pt.lat - fromPos.lat) ** 2 + (pt.lng - fromPos.lng) ** 2;
    if (d1 < minDist1) {
      minDist1 = d1;
      idx1 = i;
    }
    const d2 = (pt.lat - toPos.lat) ** 2 + (pt.lng - toPos.lng) ** 2;
    if (d2 < minDist2) {
      minDist2 = d2;
      idx2 = i;
    }
  }

  // If both points are reasonably close to route (~400m) and within a valid index span
  if (minDist1 < 0.0012 && minDist2 < 0.0012 && idx1 !== -1 && idx2 !== -1) {
    const span = Math.abs(idx2 - idx1);
    if (span >= 1 && span <= 30) {
      const step = idx2 > idx1 ? 1 : -1;
      const pts = [fromPos];
      let lastPt = fromPos;

      for (let i = idx1; step > 0 ? i <= idx2 : i >= idx2; i += step) {
        const cand = routePath[i];

        // 1. Must be strictly forward from fromPos along travel vector
        const projStart = (cand.lat - fromPos.lat) * dLat + (cand.lng - fromPos.lng) * dLng;
        // 2. Must be strictly before toPos along travel vector
        const projEnd = (toPos.lat - cand.lat) * dLat + (toPos.lng - cand.lng) * dLng;
        // 3. Must move forward from the last accepted waypoint
        const projFromLast = (cand.lat - lastPt.lat) * dLat + (cand.lng - lastPt.lng) * dLng;
        // 4. Must not be a micro-duplicate (avoid 0-length step jitter)
        const distFromLast = Math.hypot(cand.lat - lastPt.lat, cand.lng - lastPt.lng);
        const distToTarget = Math.hypot(toPos.lat - cand.lat, toPos.lng - cand.lng);

        // Strict forward progression: eliminates any reverse displacement or 180° flip
        if (
          projStart > 1e-9 &&
          projEnd > 1e-9 &&
          projFromLast > 1e-9 &&
          distFromLast >= 0.000025 &&
          distToTarget >= 0.000025
        ) {
          pts.push({ lat: cand.lat, lng: cand.lng });
          lastPt = cand;
        }
      }

      // Ensure final segment to toPos also moves forward
      const finalProj = (toPos.lat - lastPt.lat) * dLat + (toPos.lng - lastPt.lng) * dLng;
      const finalDist = Math.hypot(toPos.lat - lastPt.lat, toPos.lng - lastPt.lng);

      if (finalProj > 0 && finalDist >= 0.00001) {
        pts.push(toPos);
        return pts;
      }
    }
  }

  return [fromPos, toPos];
}

function computeSegmentDistances(waypoints) {
  const distances = [0];
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const p1 = waypoints[i - 1];
    const p2 = waypoints[i];
    const d = Math.hypot(p2.lat - p1.lat, p2.lng - p1.lng);
    total += d;
    distances.push(total);
  }
  return { distances, total };
}

function getPosAtDistance(waypoints, distances, targetD) {
  const d = Math.max(0, Math.min(targetD, distances[distances.length - 1]));
  let segIdx = 0;
  for (let i = 0; i < distances.length - 1; i++) {
    if (d >= distances[i] && d <= distances[i + 1]) {
      segIdx = i;
      break;
    }
  }
  const p1 = waypoints[segIdx];
  const p2 = waypoints[segIdx + 1] || p1;
  const segLen = distances[segIdx + 1] - distances[segIdx];
  const segT = segLen > 0 ? (d - distances[segIdx]) / segLen : 0;
  return {
    lat: p1.lat + (p2.lat - p1.lat) * segT,
    lng: p1.lng + (p2.lng - p1.lng) * segT
  };
}

function interpolateAtDistance(waypoints, distances, totalDist, progress, lookaheadMeters = 40) {
  if (totalDist === 0 || waypoints.length <= 1) {
    return { pos: waypoints[0], bearing: null };
  }
  const d = Math.min(Math.max(progress * totalDist, 0), totalDist);
  const pos = getPosAtDistance(waypoints, distances, d);

  // Overall forward travel bearing for this trajectory segment
  const overallBearing = calculateBearing(
    waypoints[0].lat, waypoints[0].lng,
    waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng
  );

  // Look ahead along path by lookaheadMeters (approx: 1 deg ~ 111000m) to calculate true forward travel direction
  const lookaheadDeg = lookaheadMeters / 111000;
  const aheadPos = getPosAtDistance(waypoints, distances, Math.min(d + lookaheadDeg, totalDist));

  let bearing = null;
  const distToAhead = Math.hypot(aheadPos.lat - pos.lat, aheadPos.lng - pos.lng);
  if (distToAhead > 0.00003) { // > ~3.5 meters
    bearing = calculateBearing(pos.lat, pos.lng, aheadPos.lat, aheadPos.lng, overallBearing);
  } else if (d > 0.00003) {
    const behindPos = getPosAtDistance(waypoints, distances, Math.max(0, d - lookaheadDeg));
    bearing = calculateBearing(behindPos.lat, behindPos.lng, pos.lat, pos.lng, overallBearing);
  } else if (waypoints.length >= 2) {
    bearing = overallBearing;
  }

  // Validate bearing: a forward-moving bus heading cannot diverge > 85° from net travel vector
  if (bearing !== null && waypoints.length >= 2) {
    const diffFromOverall = Math.abs(((bearing - overallBearing + 540) % 360) - 180);
    if (diffFromOverall > 85) {
      bearing = overallBearing;
    }
  } else if (bearing === null && waypoints.length >= 2) {
    bearing = overallBearing;
  }

  return { pos, bearing };
}

/**
 * SmoothBusMarker:
 * Buffers incoming telemetry coordinates and smoothly animates the 3D bus marker along the path
 * at 60 FPS directly via Leaflet setLatLng (preventing React re-render bottlenecks).
 * Features zoom-dependent lookahead and deadband filtering so the bus never twitches or twists when zoomed out.
 */
export function SmoothBusMarker({
  bus,
  route,
  isSelected,
  isSearchMatch,
  getMarkerColor = defaultGetMarkerColor,
  renderMarkerIcon,
  renderMarkerPopup,
  onMarkerClick
}) {
  const markerRef = useRef(null);
  const color = getMarkerColor(bus.status, isSelected);
  const map = useMap();
  const zoomRef = useRef(map ? map.getZoom() : 13);

  useMapEvents({
    zoomend: () => {
      if (map) zoomRef.current = map.getZoom();
    }
  });

  // We store animated mutable state in a ref to allow 60 FPS RAF updates without React re-render lag
  const animStateRef = useRef({
    currentPos: bus?.location ? { lat: bus.location.lat, lng: bus.location.lng } : null,
    currentBearing: bus?.bearing || 0,
    targetBusBearing: bus?.bearing || 0,
    renderedIconBearing: Math.round(((bus?.bearing || 0) % 360) / 4) * 4,
    lastTargetPos: bus?.location ? { lat: bus.location.lat, lng: bus.location.lng } : null,
    lastUpdateTime: performance.now(),
    waypoints: [],
    distances: [],
    totalDist: 0,
    startTime: 0,
    duration: 1000
  });

  const [iconBearing, setIconBearing] = useState(() => Math.round(((bus?.bearing || 0) % 360) / 4) * 4);

  // React to new incoming bus location / bearing from WebSocket or polling
  useEffect(() => {
    if (!bus?.location || typeof bus.location.lat !== 'number' || typeof bus.location.lng !== 'number') return;

    const state = animStateRef.current;
    const newTarget = { lat: bus.location.lat, lng: bus.location.lng };
    const now = performance.now();

    // Initial state
    if (!state.currentPos || !state.lastTargetPos) {
      state.currentPos = { ...newTarget };
      state.lastTargetPos = { ...newTarget };
      state.currentBearing = bus.bearing || 0;
      state.targetBusBearing = bus.bearing || 0;
      state.lastUpdateTime = now;
      if (markerRef.current) {
        markerRef.current.setLatLng([newTarget.lat, newTarget.lng]);
      }
      return;
    }

    const distFromLastTarget = Math.hypot(newTarget.lat - state.lastTargetPos.lat, newTarget.lng - state.lastTargetPos.lng);
    // If stationary, no animation segment needed (stops twisting when parked or dwelling)
    if (distFromLastTarget < 0.000005) {
      state.waypoints = [];
      state.totalDist = 0;
      return;
    }

    const elapsed = Math.max(now - state.lastUpdateTime, 400);
    state.lastUpdateTime = now;

    // Buffer duration by ~8% so motion connects continuously into the next tick
    const duration = Math.min(Math.max(elapsed * 1.08, 850), 2200);

    // Build intermediate route waypoints from currentPos to newTarget along road
    let fromPos = state.currentPos || state.lastTargetPos;
    // Check if fromPos somehow overshot newTarget along the travel line
    const dTargetLat = newTarget.lat - state.lastTargetPos.lat;
    const dTargetLng = newTarget.lng - state.lastTargetPos.lng;
    const dFromLat = fromPos.lat - state.lastTargetPos.lat;
    const dFromLng = fromPos.lng - state.lastTargetPos.lng;
    const targetDistSq = dTargetLat * dTargetLat + dTargetLng * dTargetLng;
    const fromProj = dFromLat * dTargetLat + dFromLng * dTargetLng;

    if (targetDistSq > 1e-12 && fromProj > targetDistSq) {
      fromPos = state.lastTargetPos;
    }

    const waypoints = getPathWaypoints(fromPos, newTarget, route?.path);
    const { distances, total } = computeSegmentDistances(waypoints);

    state.waypoints = waypoints;
    state.distances = distances;
    state.totalDist = total;
    state.startTime = now;
    state.duration = duration;
    state.lastTargetPos = { ...newTarget };
    if (bus.bearing !== undefined && bus.bearing !== null) {
      state.targetBusBearing = bus.bearing;
    }
  }, [bus?.location?.lat, bus?.location?.lng, bus?.bearing, route]);

  // Silky 60 FPS animation loop with zoom-dependent damping
  useEffect(() => {
    let animId;

    function step(now) {
      const state = animStateRef.current;
      if (state.waypoints && state.waypoints.length >= 2 && state.totalDist > 0) {
        const elapsed = now - state.startTime;
        const progress = Math.min(Math.max(elapsed / state.duration, 0), 1.0);

        const zoom = zoomRef.current || 13;
        // Dynamic lookahead and angular filtering based on map zoom:
        // Zoom <= 12 (regional view): 120m lookahead, gentle lerp, wide deadband (no twisting on micro-curves)
        // Zoom 13-14 (suburb view): 75m lookahead, steady turning
        // Zoom >= 15 (street view): 35m lookahead, responsive cornering
        let lookaheadMeters = 35;
        let lerpFactor = 0.08;
        let deadbandDeg = 3.5;
        let quantizeDeg = 2;

        if (zoom <= 12) {
          lookaheadMeters = 120;
          lerpFactor = 0.04;
          deadbandDeg = 8.0;
          quantizeDeg = 6;
        } else if (zoom <= 14) {
          lookaheadMeters = 75;
          lerpFactor = 0.06;
          deadbandDeg = 5.0;
          quantizeDeg = 4;
        }

        const { pos, bearing: pathBearing } = interpolateAtDistance(
          state.waypoints,
          state.distances,
          state.totalDist,
          progress,
          lookaheadMeters
        );

        state.currentPos = pos;

        // Choose target bearing: lookahead path bearing or fallback to server baseline
        const targetHeading = pathBearing !== null ? pathBearing : state.targetBusBearing;
        if (targetHeading !== undefined && targetHeading !== null) {
          const diff = ((targetHeading - state.currentBearing + 540) % 360) - 180;
          // Apply deadband to prevent oscillation and twisting on straight/minor-wiggle roads
          if (Math.abs(diff) >= deadbandDeg) {
            // Clamp maximum angular turn rate to 2.5 deg per frame (~150 deg/sec at 60 FPS)
            // Completely eliminates sudden snap 180° flips and 360° spins
            const maxTurnPerFrame = 2.5;
            const turnStep = Math.sign(diff) * Math.min(Math.abs(diff * lerpFactor), maxTurnPerFrame);
            state.currentBearing = (state.currentBearing + turnStep + 360) % 360;
          }
        }

        // Directly move Leaflet marker at 60 FPS
        if (markerRef.current) {
          markerRef.current.setLatLng([pos.lat, pos.lng]);
        }

        // Quantize bearing and only trigger React state update when threshold is exceeded
        const qBearing = Math.round(state.currentBearing / quantizeDeg) * quantizeDeg;
        if (Math.abs(qBearing - state.renderedIconBearing) >= quantizeDeg) {
          state.renderedIconBearing = qBearing;
          setIconBearing(qBearing);
        }

        // Mark segment finished at 100% progress
        if (progress >= 1.0) {
          state.totalDist = 0;
        }
      }

      animId = requestAnimationFrame(step);
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  const markerIcon = useMemo(() => {
    if (renderMarkerIcon) {
      return renderMarkerIcon(bus, isSelected, isSearchMatch, iconBearing);
    }
    return create3DBusMarkerIcon(bus, color, isSelected, isSearchMatch, iconBearing);
  }, [bus, color, isSelected, isSearchMatch, iconBearing, renderMarkerIcon]);

  if (!bus?.location) return null;

  const [initialPosition] = useState(() => [bus.location.lat, bus.location.lng]);

  return (
    <Marker
      ref={markerRef}
      position={initialPosition}
      icon={markerIcon}
      eventHandlers={{
        click: () => {
          if (onMarkerClick) onMarkerClick(bus.id);
        }
      }}
    >
      <Popup>
        {renderMarkerPopup ? (
          renderMarkerPopup(bus, isSelected)
        ) : (
          <DefaultMarkerPopup bus={bus} />
        )}
      </Popup>
    </Marker>
  );
}

/**
 * StaticRouteLayers:
 * Memoized route polylines and stop dots. Prevents rebuilding hundreds of Leaflet SVG
 * paths on every 1-second bus telemetry update.
 */
const StaticRouteLayers = React.memo(function StaticRouteLayers({
  validRoutes,
  assignedRouteId,
  selectedBusNumber
}) {
  return (
    <>
      {validRoutes.map(route => {
        const isAssigned = assignedRouteId && assignedRouteId === route.id;
        const isDimmed = assignedRouteId && assignedRouteId !== route.id;
        const positions = route.path.map(pt => [pt.lat, pt.lng]);
        const routeColor = route.color || '#0284c7';
        const cleanStops = Array.from(new Set((route.stops || []).map(s => String(s).trim()).filter(Boolean)));

        return (
          <React.Fragment key={route.id}>
            <Polyline
              positions={positions}
              pathOptions={{
                color: routeColor,
                weight: isAssigned ? 7 : 4,
                opacity: isDimmed ? 0.35 : isAssigned ? 1.0 : 0.75,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem' }}>
                  <strong style={{ color: routeColor, fontSize: '0.9rem' }}>{route.name}</strong>
                  {isAssigned && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={12} /> Assigned to {selectedBusNumber || 'Bus'}
                    </div>
                  )}
                  {cleanStops.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {cleanStops.length} stops: {cleanStops.join(' → ')}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>

            {(isAssigned || !assignedRouteId) && (
              Array.isArray(route.stopCoordinates) && route.stopCoordinates.length > 0 ? (
                route.stopCoordinates.map((stop, sIdx) => {
                  const isCollege = sIdx === route.stopCoordinates.length - 1;
                  if (isCollege) return null;
                  return (
                    <Marker
                      key={`route-stop-${route.id}-${sIdx}`}
                      position={[stop.lat, stop.lng]}
                      icon={createRouteStopIcon(stop.name || `Stop ${sIdx + 1}`, routeColor, isAssigned)}
                    >
                      <Popup>
                        <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem' }}>
                          <strong style={{ color: routeColor }}>{route.name}</strong>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>
                            Stop #{sIdx + 1}: {stop.name || `Stop ${sIdx + 1}`}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })
              ) : (
                route.path.length <= 8 ? (
                  route.path.map((pt, ptIdx) => {
                    const stopLabel = cleanStops[ptIdx] || `Point ${ptIdx + 1}`;
                    return (
                      <Marker
                        key={`route-pt-${route.id}-${ptIdx}`}
                        position={[pt.lat, pt.lng]}
                        icon={createRouteStopIcon(stopLabel, routeColor, isAssigned)}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem' }}>
                            <strong style={{ color: routeColor }}>{route.name}</strong>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>
                              Stop: {stopLabel}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })
                ) : null
              )
            )}
          </React.Fragment>
        );
      })}
    </>
  );
});

/**
 * Generic, Reusable FleetMap Component
 */
export default function FleetMap({
  buses = [],
  routes = [],
  center = null,
  initialCenter: customInitialCenter = null,
  zoom = 13,
  initialZoom: customInitialZoom = null,
  selectedMarkerId = null,
  selectedBusId = null, // Backward compatibility alias
  onMarkerClick = null,
  onSelectBus = null, // Backward compatibility alias
  getMarkerColor = defaultGetMarkerColor,
  renderMarkerIcon = null,
  renderMarkerPopup = null,
  isPickingStops = false,
  onMapClick = null,
  onAddCandidateStop = null,
  onCandidateSelect = null,
  pickedStops = [],
  roadGeometry = null,
  previewColor = '#0284c7',
  routeCalcError = null,
  _isCalculatingRoute = false,
  hideStatCards = false,
  renderOverlay = null,
  showSearch = true,
  searchRegion = null, // e.g. 'kottayam'
  studentLocation = null,
  borderRadius = undefined
}) {
  // Resolve backward-compatible prop aliases
  const activeSelectedId = selectedMarkerId !== null ? selectedMarkerId : selectedBusId;
  const activeOnMarkerClick = onMarkerClick || onSelectBus;
  const activeInitialZoom = customInitialZoom || zoom;
  const activeCenterProp = center || customInitialCenter;

  // Leaflet map reference for programmatic flyTo
  const [mapInstance, setMapInstance] = useState(null);

  // Search input, place geocoding and dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [searchedPlaceMarker, setSearchedPlaceMarker] = useState(null);
  const searchContainerRef = useRef(null);

  // Re-render markers as soon as bus.obj finishes loading in Three.js
  const [, setModelLoadedTick] = useState(0);
  useEffect(() => {
    return bus3dManager.subscribe(() => {
      setModelLoadedTick(t => t + 1);
    });
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geocoding Search Suggestions effect (OpenStreetMap Nominatim / Google Places)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setPlaceSuggestions([]);
      setIsSearchingPlaces(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingPlaces(true);
      const lowerQ = q.toLowerCase();
      const isCollegeQuery =
        lowerQ.includes('college') ||
        lowerQ.includes('poonjar') ||
        lowerQ.includes('cep') ||
        lowerQ.includes('engineering') ||
        lowerQ.includes('campus');

      let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
      if (searchRegion === 'kottayam') {
        // Restrict Nominatim search strictly to Kottayam/Poonjar region bounding box
        searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=${KOTTAYAM_POONJAR_BOUNDS.viewbox}&bounded=1&limit=5`;
      }

      fetch(searchUrl)
        .then(res => res.json())
        .then(data => {
          let results = [];
          if (isCollegeQuery) {
            results.push({
              id: 'college-destination-cep',
              displayName: `${COLLEGE_DESTINATION.name}, ${COLLEGE_DESTINATION.address}`,
              shortName: COLLEGE_DESTINATION.name,
              lat: COLLEGE_DESTINATION.lat,
              lng: COLLEGE_DESTINATION.lng,
              isCollege: true
            });
          }

          if (Array.isArray(data)) {
            const mapped = data.map(item => ({
              id: item.place_id,
              displayName: item.display_name,
              shortName: item.display_name.split(',')[0],
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              isCollege: item.display_name.toLowerCase().includes('college of engineering poonjar')
            }));
            results = [...results, ...mapped];
          }

          setPlaceSuggestions(results);
        })
        .catch(err => {
          console.warn('Geocoding search warning:', err);
          if (isCollegeQuery) {
            setPlaceSuggestions([{
              id: 'college-destination-cep',
              displayName: `${COLLEGE_DESTINATION.name}, ${COLLEGE_DESTINATION.address}`,
              shortName: COLLEGE_DESTINATION.name,
              lat: COLLEGE_DESTINATION.lat,
              lng: COLLEGE_DESTINATION.lng,
              isCollege: true
            }]);
          } else {
            setPlaceSuggestions([]);
          }
        })
        .finally(() => setIsSearchingPlaces(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchRegion]);

  // Default fallback center: Kottayam, Kerala
  const defaultCenter = useMemo(() => [9.5916, 76.5222], []);

  // Valid buses with active live coordinates
  const validBuses = useMemo(() => {
    return (buses || []).filter(b => 
      b && 
      b.status !== 'Off Duty' && 
      b.status !== 'Maintenance' && 
      b.status !== 'Inactive' && 
      b.location && 
      typeof b.location.lat === 'number' && 
      typeof b.location.lng === 'number'
    );
  }, [buses]);

  // Selected bus object
  const selectedBus = useMemo(() => {
    if (!activeSelectedId) return null;
    return validBuses.find(b => b.id === activeSelectedId) || null;
  }, [validBuses, activeSelectedId]);

  // Filter matching buses based on search query
  const matchingBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return validBuses.filter(bus => {
      const numMatch = String(bus.number || bus.name || '').toLowerCase().includes(q);
      const driverMatch = String(bus.driverName || bus.driver || '').toLowerCase().includes(q);
      const idMatch = String(bus.id || '').toLowerCase().includes(q);
      const routeMatch = String(bus.routeName || bus.routeId || '').toLowerCase().includes(q);
      return numMatch || driverMatch || idMatch || routeMatch;
    });
  }, [searchQuery, validBuses]);

  // Set of matching bus IDs for highlighting markers on map
  const matchingBusIds = useMemo(() => {
    return new Set(matchingBuses.map(b => b.id));
  }, [matchingBuses]);

  // Valid routes with at least 2 coordinate points
  const validRoutes = useMemo(() => {
    return (routes || []).filter(r => (
      r &&
      Array.isArray(r.path) &&
      r.path.length >= 2 &&
      r.path.every(pt => pt && typeof pt.lat === 'number' && typeof pt.lng === 'number')
    ));
  }, [routes]);

  // Assigned route for currently selected bus
  const assignedRoute = useMemo(() => {
    if (!selectedBus || !selectedBus.routeId) return null;
    return validRoutes.find(r => r.id === selectedBus.routeId) || null;
  }, [selectedBus, validRoutes]);

  // Selected marker location
  const selectedLocation = useMemo(() => {
    if (!activeSelectedId) return null;
    return selectedBus?.location || null;
  }, [selectedBus, activeSelectedId]);

  // When a bus is selected, smoothly fly the map to center on it
  useEffect(() => {
    if (mapInstance && selectedBus?.location?.lat && selectedBus?.location?.lng) {
      mapInstance.flyTo([selectedBus.location.lat, selectedBus.location.lng], Math.max(mapInstance.getZoom(), 15), {
        animate: true,
        duration: 0.8
      });
    }
  }, [activeSelectedId, mapInstance]);

  // Initial center position
  const resolvedCenter = useMemo(() => {
    if (activeCenterProp && Array.isArray(activeCenterProp)) {
      return activeCenterProp;
    }
    if (validBuses.length > 0) {
      const avgLat = validBuses.reduce((sum, b) => sum + b.location.lat, 0) / validBuses.length;
      const avgLng = validBuses.reduce((sum, b) => sum + b.location.lng, 0) / validBuses.length;
      return [avgLat, avgLng];
    }
    if (validRoutes.length > 0 && validRoutes[0].path.length > 0) {
      return [validRoutes[0].path[0].lat, validRoutes[0].path[0].lng];
    }
    return defaultCenter;
  }, [activeCenterProp, validBuses, validRoutes, defaultCenter]);

  // Handle selecting a bus result from search dropdown
  const handleSelectBusFromSearch = (bus) => {
    if (activeOnMarkerClick) {
      activeOnMarkerClick(bus.id);
    }
    if (mapInstance && bus.location?.lat && bus.location?.lng) {
      mapInstance.flyTo([bus.location.lat, bus.location.lng], Math.max(mapInstance.getZoom(), 15), {
        animate: true,
        duration: 0.8
      });
    }
    setIsSearchOpen(false);
    setSearchQuery(bus.number || `BUS #${bus.id}`);
  };

  // Handle selecting a place result from search dropdown (moves map and places candidate marker WITHOUT auto-adding stop)
  const handleSelectPlaceFromSearch = (place) => {
    setSearchedPlaceMarker({
      lat: place.lat,
      lng: place.lng,
      displayName: place.displayName,
      shortName: place.shortName
    });
    if (mapInstance) {
      mapInstance.flyTo([place.lat, place.lng], 15, {
        animate: true,
        duration: 0.8
      });
    }
    setIsSearchOpen(false);
    setSearchQuery(place.shortName);

    if (onCandidateSelect) {
      onCandidateSelect(place);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: borderRadius !== undefined ? borderRadius : '16px',
        overflow: 'hidden',
        border: borderRadius === 0 || borderRadius === '0' || borderRadius === '0px' ? 'none' : '1px solid var(--border-color, #cbd5e1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isPickingStops ? 'crosshair' : 'default'
      }}
    >
      {/* 1. Interactive Search Bar in HTML Overlay */}
      {showSearch && (
        <div
          ref={searchContainerRef}
          style={{
            position: 'absolute',
            top: isPickingStops ? '3.6rem' : '1rem',
            left: '1rem',
            zIndex: 2000,
            width: '320px',
            maxWidth: 'calc(100% - 2rem)',
            fontFamily: "'Inter', system-ui, sans-serif",
            pointerEvents: 'auto'
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onKeyUp={e => e.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '12px',
              padding: '0.5rem 0.8rem',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.16)',
              border: '1px solid var(--border-color, #cbd5e1)',
              gap: '0.5rem',
              pointerEvents: 'auto'
            }}
          >
            <Search size={16} color="var(--text-secondary, #64748b)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search bus, driver, or location..."
              autoComplete="off"
              spellCheck="false"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.84rem',
                color: 'var(--text-primary, #1e293b)',
                pointerEvents: 'auto'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                  setSearchedPlaceMarker(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #94a3b8)',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                border: '1px solid var(--border-color, #cbd5e1)',
                maxHeight: '280px',
                overflowY: 'auto',
                zIndex: 2001,
                padding: '0.35rem 0',
                pointerEvents: 'auto'
              }}
            >
              {/* SECTION: VEHICLES */}
              {matchingBuses.length > 0 && (
                <div>
                  <div style={{ padding: '0.4rem 0.85rem 0.2rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.04em' }}>
                    BUSES & DRIVERS
                  </div>
                  {matchingBuses.map(bus => (
                    <div
                      key={bus.id}
                      onClick={() => handleSelectBusFromSearch(bus)}
                      style={{
                        padding: '0.5rem 0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        transition: 'background 0.15s ease',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        backgroundColor: activeSelectedId === bus.id ? 'var(--bg-subtle, rgba(2, 132, 199, 0.08))' : 'transparent'
                      }}
                      onMouseEnter={e => {
                        if (activeSelectedId !== bus.id) e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)';
                      }}
                      onMouseLeave={e => {
                        if (activeSelectedId !== bus.id) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: 'var(--primary)', flexShrink: 0 }}>
                        <Bus size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                          {bus.number || `BUS #${bus.id}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Driver: {bus.driverName || 'Unassigned'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: (bus.status || '').toUpperCase().includes('SOS')
                            ? '#fee2e2'
                            : (bus.status || '').toUpperCase().includes('DELAY')
                              ? '#fef3c7'
                              : '#dcfce7',
                          color: (bus.status || '').toUpperCase().includes('SOS')
                            ? '#b91c1c'
                            : (bus.status || '').toUpperCase().includes('DELAY')
                              ? '#b45309'
                              : '#15803d'
                        }}
                      >
                        {bus.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: PLACE SUGGESTIONS */}
              <div>
                <div style={{ padding: '0.4rem 0.85rem 0.2rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.04em' }}>
                  LOCATION SUGGESTIONS {isSearchingPlaces && '...'}
                </div>
                {placeSuggestions.length === 0 && !isSearchingPlaces && matchingBuses.length === 0 ? (
                  <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', textAlign: 'center' }}>
                    No bus or location matches found
                  </div>
                ) : (
                  placeSuggestions.map((place, idx) => (
                    <div
                      key={place.id || `place-suggestion-${idx}`}
                      onClick={() => handleSelectPlaceFromSearch(place)}
                      style={{
                        padding: '0.5rem 0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ color: '#0284c7', flexShrink: 0 }}>
                        <MapPin size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.shortName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.displayName}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Banner when in stop picking mode */}
      {isPickingStops && (
        <div
          style={{
            position: 'absolute',
            top: '0.85rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#1e1b4b',
            color: '#ffffff',
            padding: '0.45rem 1.15rem',
            borderRadius: '9999px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: '1px solid rgba(147, 51, 234, 0.4)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <MapPin size={15} color="#a855f7" />
          <span>Click anywhere on map or search locations to add pickup stops</span>
        </div>
      )}

      {/* Routing Service Error Notification Banner */}
      {isPickingStops && routeCalcError && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            fontSize: '0.78rem',
            fontWeight: 700,
            border: '1px solid #f87171',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <AlertTriangle size={14} /> Route preview unavailable
        </div>
      )}

      {/* Focus Button */}
      <button
        type="button"
        onClick={() => {
          if (mapInstance) {
            if (selectedBus && selectedBus.location && selectedBus.location.lat) {
              mapInstance.flyTo([selectedBus.location.lat, selectedBus.location.lng], 16, { animate: true, duration: 1.5 });
            } else if (studentLocation && studentLocation.lat) {
              mapInstance.flyTo([studentLocation.lat, studentLocation.lng], 16, { animate: true, duration: 1.5 });
            }
          }
        }}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 500,
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          color: 'var(--text-primary)'
        }}
        title="Focus on Bus/Location"
      >
        <Locate size={18} />
      </button>

      {/* Real Leaflet Map Container */}
      <MapContainer
        center={resolvedCenter}
        zoom={activeInitialZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          zIndex: 1,
          borderRadius: borderRadius !== undefined ? borderRadius : '16px'
        }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          keepBuffer={8}
          updateInterval={100}
        />

        <MapViewController
          initialCenter={resolvedCenter}
          initialZoom={activeInitialZoom}
          selectedLocation={selectedLocation}
          studentLocation={studentLocation}
          onMapReady={setMapInstance}
        />
        <MapClickHandler isPickingStops={isPickingStops} onMapClick={onMapClick} />

        {/* 1. Render Route Polylines & Stop Indicators (Memoized) */}
        <StaticRouteLayers
          validRoutes={validRoutes}
          assignedRouteId={assignedRoute?.id}
          selectedBusNumber={selectedBus?.number || (selectedBus ? `Bus #${selectedBus.id}` : null)}
        />

        {/* 2. Permanent College Destination Marker (College of Engineering Poonjar) */}
        <Marker
          position={[COLLEGE_DESTINATION.lat, COLLEGE_DESTINATION.lng]}
          icon={createCollegeMarkerIcon()}
          zIndexOffset={950}
        >
          <Popup>
            <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.25rem', textAlign: 'center', minWidth: '190px' }}>
              <div style={{ color: '#15803d', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <GraduationCap size={16} /> {COLLEGE_DESTINATION.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: '0.2rem' }}>
                Fixed Final Destination
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                {COLLEGE_DESTINATION.address}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* 3. Render Real Road-Following Geometry to College of Engineering Poonjar */}
        {roadGeometry && roadGeometry.length >= 2 && (
          <Polyline
            positions={roadGeometry}
            pathOptions={{
              color: previewColor || '#0284c7',
              weight: 5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {pickedStops && pickedStops.map((stop, idx) => (
          <Marker
            key={stop.id || `picked-stop-${idx}-${stop.name}`}
            position={[stop.lat, stop.lng]}
            icon={createPickedStopIcon(stop.number || idx + 1, stop.name)}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem' }}>
                <strong style={{ color: '#0284c7' }}>Stop #{stop.number || idx + 1}</strong>: {stop.name}
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Render Searched Location Place Marker */}
        {searchedPlaceMarker && (
          <Marker
            position={[searchedPlaceMarker.lat, searchedPlaceMarker.lng]}
            icon={searchedPlaceMarker.isCollege ? createCollegeMarkerIcon() : createSearchedPlaceIcon(searchedPlaceMarker.shortName)}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem', maxWidth: '230px' }}>
                {searchedPlaceMarker.isCollege || (searchedPlaceMarker.shortName || '').toLowerCase().includes('college of engineering poonjar') ? (
                  <div>
                    <strong style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <GraduationCap size={15} /> {COLLEGE_DESTINATION.name}
                    </strong>
                    <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, marginTop: '0.2rem' }}>
                      Fixed Final Destination
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      This college is the fixed destination of every route and is automatically appended.
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={15} /> {searchedPlaceMarker.shortName}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', lineHeight: '1.3' }}>
                      {searchedPlaceMarker.displayName}
                    </div>
                    {onAddCandidateStop ? (
                      <button
                        type="button"
                        onClick={() => {
                          onAddCandidateStop(searchedPlaceMarker);
                          setSearchedPlaceMarker(null);
                        }}
                        style={{
                          marginTop: '0.5rem',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          width: '100%',
                          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                        }}
                      >
                        + Add as Pickup Stop
                      </button>
                    ) : onMapClick ? (
                      <button
                        type="button"
                        onClick={() => {
                          onMapClick({ lat: searchedPlaceMarker.lat, lng: searchedPlaceMarker.lng }, searchedPlaceMarker.shortName);
                          setSearchedPlaceMarker(null);
                        }}
                        style={{
                          marginTop: '0.5rem',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        + Add as Pickup Stop
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* 4. Render Student Location Marker */}
        {studentLocation && typeof studentLocation.lat === 'number' && typeof studentLocation.lng === 'number' && (
          <Marker
            position={[studentLocation.lat, studentLocation.lng]}
            icon={createStudentLocationIcon()}
            zIndexOffset={500}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.2rem', textAlign: 'center' }}>
                <strong style={{ color: '#1e40af', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  <MapPin size={15} /> Your Location
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {studentLocation.lat.toFixed(5)}°, {studentLocation.lng.toFixed(5)}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 5. Render Smooth 3D Moving Bus Markers */}
        {validBuses.map(bus => {
          const isSelected = bus.id === activeSelectedId;
          const isSearchMatch = searchQuery.trim().length > 0 && matchingBusIds.has(bus.id);
          const busRoute = routes.find(r => r.id === bus.routeId);

          return (
            <SmoothBusMarker
              key={bus.id}
              bus={bus}
              route={busRoute}
              isSelected={isSelected}
              isSearchMatch={isSearchMatch}
              getMarkerColor={getMarkerColor}
              renderMarkerIcon={renderMarkerIcon}
              renderMarkerPopup={renderMarkerPopup}
              onMarkerClick={activeOnMarkerClick}
            />
          );
        })}
      </MapContainer>

      {/* Custom or Default Stat Cards Overlay */}
      {renderOverlay ? (
        renderOverlay({ buses: validBuses, routes })
      ) : (
        !hideStatCards && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              zIndex: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
              pointerEvents: 'none',
              maxWidth: '360px'
            }}
          >
            {/* Card 1: Active Drivers */}
            <div
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '14px',
                padding: '0.75rem 0.9rem',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
                border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Active Drivers</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>
                  {validBuses.filter(b => b.driverName && b.driverName !== 'Unassigned').length}
                </div>
              </div>
            </div>

            {/* Card 2: Alerts */}
            <div
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '14px',
                padding: '0.75rem 0.9rem',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
                border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Alerts / SOS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>
                  {validBuses.filter(b => (b.status || '').toUpperCase().includes('SOS') || (b.status || '').toUpperCase().includes('EMERGENCY')).length || '0'}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
