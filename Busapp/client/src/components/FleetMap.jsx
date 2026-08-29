import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
<<<<<<< HEAD
import { Users, Clock, AlertTriangle, Zap, MapPin, Search, X, Bus, Locate } from 'lucide-react';
=======
import { Users, AlertTriangle, MapPin, Search, X, Bus } from 'lucide-react';
import { COLLEGE_DESTINATION, KOTTAYAM_POONJAR_BOUNDS } from '../constants/college';

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
        box-shadow: 0 4px 14px rgba(21, 128, 61, 0.45);
        margin-bottom: 4px;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        🏫 ${COLLEGE_DESTINATION.shortName}
      </div>
      <div style="
        width: 28px;
        height: 28px;
        background-color: #16a34a;
        border: 3px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
        font-weight: 800;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.5);
      ">
        🎓
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
>>>>>>> 8bbe12cc86e45a1b5fe042172545025e65392d1c

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
 * Default Leaflet DivIcon generator
 */
export function defaultCreateMarkerIcon(color, isSelected, isSearchMatch) {
  const borderStyle = isSelected ? '3px solid #ffffff' : isSearchMatch ? '3px solid #fbbf24' : '2px solid #ffffff';
  const scale = isSelected ? 'scale(1.2)' : isSearchMatch ? 'scale(1.15)' : 'scale(1)';
  const zIndex = isSelected ? 1000 : isSearchMatch ? 900 : 1;
  const shadow = isSearchMatch ? '0 0 16px rgba(251, 191, 36, 0.8)' : '0 4px 14px rgba(0,0,0,0.35)';

  const html = `
    <div style="
      position: relative;
      width: 38px;
      height: 38px;
      background-color: ${color};
      border: ${borderStyle};
      border-radius: 50%;
      box-shadow: ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      transform: ${scale};
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: ${zIndex};
    ">
      <span style="font-size: 20px; line-height: 1;">🚌</span>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-bus-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20]
  });
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
        background-color: #7c3aed;
        border: 2px solid #ffffff;
        border-radius: 50%;
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(124, 58, 237, 0.6);
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
export function createRouteStopIcon(stopName, color = '#7c3aed', isHighlighted = false) {
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
      ">
        📍 ${name}
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
  previewColor = '#7c3aed',
  routeCalcError = null,
  _isCalculatingRoute = false,
  hideStatCards = false,
  renderOverlay = null,
  showSearch = true,
  searchRegion = null, // e.g. 'kottayam'
  studentLocation = null
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

  // Valid buses with lat/lng
  const validBuses = useMemo(() => {
    return (buses || []).filter(b => b && b.location && typeof b.location.lat === 'number' && typeof b.location.lng === 'number');
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
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-color, #cbd5e1)',
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
                        backgroundColor: activeSelectedId === bus.id ? 'var(--bg-subtle, #ede9fe)' : 'transparent'
                      }}
                      onMouseEnter={e => {
                        if (activeSelectedId !== bus.id) e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)';
                      }}
                      onMouseLeave={e => {
                        if (activeSelectedId !== bus.id) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: '#7c3aed', flexShrink: 0 }}>
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
            whiteSpace: 'nowrap'
          }}
        >
          ⚠️ Route preview unavailable
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
          zIndex: 1000,
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
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          zIndex: 1,
          borderRadius: '16px'
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController
          initialCenter={resolvedCenter}
          initialZoom={activeInitialZoom}
          selectedLocation={selectedLocation}
          studentLocation={studentLocation}
          onMapReady={setMapInstance}
        />
        <MapClickHandler isPickingStops={isPickingStops} onMapClick={onMapClick} />

        {/* 1. Render Route Polylines & Stop Indicators */}
        {validRoutes.map(route => {
          const isAssigned = assignedRoute && assignedRoute.id === route.id;
          const isDimmed = assignedRoute && assignedRoute.id !== route.id;
          const positions = route.path.map(pt => [pt.lat, pt.lng]);
          const routeColor = route.color || '#7c3aed';

          // Clean, deduplicated list of configured stop names
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
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.15rem' }}>
                        ✓ Assigned to {selectedBus?.number || `Bus #${selectedBus?.id}`}
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

              {/* Render Stop Dots on Route Points for Assigned or Focused Route */}
<<<<<<< HEAD
              {(isAssigned || !assignedRoute) && (route.waypoints || route.path).map((pt, ptIdx) => {
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
              })}
=======
              {(isAssigned || !assignedRoute) && (
                Array.isArray(route.stopCoordinates) && route.stopCoordinates.length > 0 ? (
                  route.stopCoordinates.map((stop, sIdx) => {
                    const isCollege = sIdx === route.stopCoordinates.length - 1;
                    if (isCollege) return null; // College has dedicated permanent marker
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
>>>>>>> 8bbe12cc86e45a1b5fe042172545025e65392d1c
            </React.Fragment>
          );
        })}

        {/* 2. Permanent College Destination Marker (College of Engineering Poonjar) */}
        <Marker
          position={[COLLEGE_DESTINATION.lat, COLLEGE_DESTINATION.lng]}
          icon={createCollegeMarkerIcon()}
          zIndexOffset={950}
        >
          <Popup>
            <div style={{ fontFamily: 'system-ui, sans-serif', padding: '0.25rem', textAlign: 'center', minWidth: '190px' }}>
              <div style={{ color: '#15803d', fontWeight: 800, fontSize: '0.92rem' }}>
                🏫 {COLLEGE_DESTINATION.name}
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
              color: previewColor || '#7c3aed',
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
                <strong style={{ color: '#7c3aed' }}>Stop #{stop.number || idx + 1}</strong>: {stop.name}
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
                    <strong style={{ color: '#15803d' }}>🏫 {COLLEGE_DESTINATION.name}</strong>
                    <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, marginTop: '0.2rem' }}>
                      Fixed Final Destination
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                      This college is the fixed destination of every route and is automatically appended.
                    </div>
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: '#0284c7' }}>📍 {searchedPlaceMarker.shortName}</strong>
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
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          width: '100%',
                          boxShadow: '0 2px 6px rgba(124, 58, 237, 0.4)'
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
                          backgroundColor: '#7c3aed',
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
                <strong style={{ color: '#1e40af', fontSize: '0.9rem' }}>📍 Your Location</strong>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {studentLocation.lat.toFixed(5)}°, {studentLocation.lng.toFixed(5)}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 5. Render Generic Bus/Vehicle Markers */}
        {validBuses.map(bus => {
          const isSelected = bus.id === activeSelectedId;
          const isSearchMatch = searchQuery.trim().length > 0 && matchingBusIds.has(bus.id);
          const markerColor = getMarkerColor(bus.status, isSelected);
          const markerIcon = renderMarkerIcon
            ? renderMarkerIcon(bus, isSelected, isSearchMatch)
            : defaultCreateMarkerIcon(markerColor, isSelected, isSearchMatch);

          return (
            <Marker
              key={bus.id}
              position={[bus.location.lat, bus.location.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  if (activeOnMarkerClick) activeOnMarkerClick(bus.id);
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
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
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
                  {validBuses.filter(b => b.driverName && b.driverName !== 'Unassigned').length || 14}
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
