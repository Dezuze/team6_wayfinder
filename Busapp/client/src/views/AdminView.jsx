import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FleetMap from '../components/FleetMap';
import { COLLEGE_DESTINATION } from '../constants/college';
import { fetchRoadRoute } from '../utils/routing';
import {
  Bus,
  GitFork,
  Cloud,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Gauge,
  MapPin,
  Shield,
  LogOut,
  Sun,
  Moon,
  Trash2,
  ArrowDown,
  Loader
} from 'lucide-react';

export default function AdminView({ activeRole: _activeRole, setActiveRole }) {
  const { buses, routes, passes, refreshData, createRoute } = useWebSocket();
  const { user, logout } = useAuth();
  const { themeMode, cycleTheme, effectiveTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('buses'); // buses, routes, passes
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#7c3aed');
  
  // New Pass State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentRoute, setNewStudentRoute] = useState('All Routes');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fleetFilter, setFleetFilter] = useState('Active'); // All, Active, Delayed, Idle
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [pickedStops, setPickedStops] = useState([]);
  const [candidatePlace, setCandidatePlace] = useState(null);
  const [driversDirectory, setDriversDirectory] = useState([]);

  // ── Professional Add Pickup Stop Modal State ──
  const [isAddStopModalOpen, setIsAddStopModalOpen] = useState(false);
  const [modalStopData, setModalStopData] = useState({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    isSearch: false
  });
  const [stopNameInput, setStopNameInput] = useState('');

  // ── Real Road Routing Geometry & Metrics ──
  const [roadGeometry, setRoadGeometry] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState({ distanceKm: 0, durationMin: 0 });
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeCalcError, setRouteCalcError] = useState(null);
  const [routeSuccessMsg, setRouteSuccessMsg] = useState(null);

  // Fetch Drivers Directory from server on mount
  useEffect(() => {
    fetch('/api/drivers')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.drivers) {
          setDriversDirectory(data.drivers);
        }
      })
      .catch(err => console.error('Error loading drivers directory:', err));
  }, []);

  // Recalculate real road-following route whenever pickedStops change
  useEffect(() => {
    if (!pickedStops || pickedStops.length === 0) {
      setRoadGeometry([]);
      setRouteMetrics({ distanceKm: 0, durationMin: 0 });
      setRouteCalcError(null);
      return;
    }

    // Preserve exact authoritative waypoint order: [Pickup 1, Pickup 2, ..., Pickup N, College]
    const waypoints = [
      ...pickedStops.map(s => ({ lat: s.lat, lng: s.lng })),
      { lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng }
    ];

    let isMounted = true;
    setIsCalculatingRoute(true);
    setRouteCalcError(null);

    fetchRoadRoute(waypoints)
      .then(result => {
        if (isMounted) {
          setRoadGeometry(result.path);
          setRouteMetrics({ distanceKm: result.distanceKm, durationMin: result.durationMin });
          setRouteCalcError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.warn('Road routing failed:', err);
          setRoadGeometry([]);
          setRouteCalcError('Route preview unavailable (routing service error or offline)');
        }
      })
      .finally(() => {
        if (isMounted) setIsCalculatingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [pickedStops]);

  // Update Bus Status
  const _handleUpdateBusStatus = async (busId, newStatus) => {
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

  // Update Bus Route Assignment
  const handleUpdateBusRoute = async (busId, newRouteId) => {
    try {
      await fetch(`/api/buses/${busId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: newRouteId || null })
      });
      await refreshData();
    } catch (err) {
      console.error('Error updating bus route:', err);
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

<<<<<<< HEAD
  // Create New Student Pass
  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!newStudentName || !newStudentEmail) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newStudentName.trim(), 
          email: newStudentEmail.trim(), 
          routeEntitlement: newStudentRoute 
        })
      });
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentRoute('All Routes');
      await refreshData();
    } catch (err) {
      console.error('Error creating pass:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Route with deduplicated stops
  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (!newRouteName) return;
    setIsSubmitting(true);
    try {
      const rawStops = newRouteStops ? newRouteStops.split(',').map(s => s.trim()).filter(Boolean) : ['Campus Gate', 'Central Hub'];
      const cleanStops = Array.from(new Set(rawStops));
      await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRouteName.trim(), stops: cleanStops, color: newRouteColor })
      });
      setNewRouteName('');
      setNewRouteStops('');
      setPickedStops([]);
      setIsPickingStops(false);
      await refreshData();
    } catch (err) {
      console.error('Error creating route:', err);
    } finally {
      setIsSubmitting(false);
=======
  // Trigger professional modal when a search suggestion is selected
  const handleCandidateSelectFromSearch = (place) => {
    if (!place) return;
    const isCollege = place.isCollege || (place.shortName || '').toLowerCase().includes('college of engineering poonjar');
    setCandidatePlace(place);

    if (isCollege) {
      // College is the fixed destination and cannot be added as an intermediate pickup stop
      return;
>>>>>>> 8bbe12cc86e45a1b5fe042172545025e65392d1c
    }

    setModalStopData({
      name: place.shortName || place.name || '',
      address: place.displayName || '',
      lat: place.lat,
      lng: place.lng,
      isSearch: true
    });
    setStopNameInput(place.shortName || place.name || '');
    setIsAddStopModalOpen(true);
  };

  // Trigger professional modal when map is clicked directly
  const handleMapClick = (latlng) => {
    setModalStopData({
      name: '',
      address: `${latlng.lat.toFixed(5)}°, ${latlng.lng.toFixed(5)}°`,
      lat: latlng.lat,
      lng: latlng.lng,
      isSearch: false
    });
    setStopNameInput('');
    setIsAddStopModalOpen(true);
  };

  // Confirm Stop Modal - adds stop to sequence in authoritative order
  const handleConfirmAddStop = (e) => {
    if (e) e.preventDefault();
    const trimmed = stopNameInput.trim();
    if (!trimmed) {
      alert('Please enter a stop name.');
      return;
    }
    if (trimmed.toLowerCase().includes('college of engineering poonjar')) {
      alert(`${COLLEGE_DESTINATION.name} is the fixed final destination of every route and is automatically appended.`);
      setIsAddStopModalOpen(false);
      return;
    }

    setPickedStops(prev => {
      if (prev.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `stop-${Date.now()}-${prev.length}`,
          name: trimmed,
          lat: modalStopData.lat,
          lng: modalStopData.lng,
          number: prev.length + 1
        }
      ];
    });

    setIsAddStopModalOpen(false);
    setCandidatePlace(null);
  };

  // Remove a stop by index and automatically renumber remaining stops
  const handleRemoveStop = (index) => {
    setPickedStops(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.map((stop, idx) => ({ ...stop, number: idx + 1 }));
    });
  };

  // Create New Route with verified ordered pickup stops ending at College of Engineering Poonjar
  const handleCreateRoute = async (e) => {
    if (e) e.preventDefault();
    if (!newRouteName.trim()) {
      alert('Please enter a route name.');
      return;
    }
    if (pickedStops.length === 0) {
      alert('Please add at least one pickup stop before creating the route.');
      return;
    }

    setIsSubmitting(true);
    setRouteSuccessMsg(null);
    try {
      const cleanStops = pickedStops.map(s => s.name.trim()).filter(Boolean);
      const routeStopsWithCollege = [...cleanStops, COLLEGE_DESTINATION.name];

      // Format road geometry and stop coordinates for rich frontend persistence
      const customPath = roadGeometry.length >= 2
        ? roadGeometry.map(([lat, lng]) => ({ lat, lng }))
        : [
            ...pickedStops.map(s => ({ lat: s.lat, lng: s.lng })),
            { lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng }
          ];

      const stopCoords = [
        ...pickedStops.map((s, idx) => ({ name: s.name, lat: s.lat, lng: s.lng, number: idx + 1 })),
        { name: COLLEGE_DESTINATION.name, lat: COLLEGE_DESTINATION.lat, lng: COLLEGE_DESTINATION.lng, number: pickedStops.length + 1 }
      ];

      const payload = {
        name: newRouteName.trim(),
        stops: routeStopsWithCollege,
        color: newRouteColor
      };

      const result = await createRoute(payload, customPath, stopCoords, routeMetrics);

      if (result && result.success) {
        setRouteSuccessMsg(`✓ Route "${newRouteName.trim()}" created successfully with ${pickedStops.length} pickup stop(s) ending at ${COLLEGE_DESTINATION.shortName}!`);
        setNewRouteName('');
        setPickedStops([]);
        setCandidatePlace(null);
        setRoadGeometry([]);
        setRouteMetrics({ distanceKm: 0, durationMin: 0 });

        // Clear success message after 6 seconds
        setTimeout(() => setRouteSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error('Error creating route:', err);
      alert('Error creating route: ' + (err.message || 'Please check server connection.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Route
  const handleDeleteRoute = async (routeId) => {
    try {
      await fetch(`/api/routes/${routeId}`, {
        method: 'DELETE'
      });
      await refreshData();
    } catch (err) {
      console.error('Error deleting route:', err);
    }
  };

  // Dynamic Fleet Cards mapping real live WebSocket buses
  const fleetCards = (buses || []).map(bus => {
    const assignedRoute = routes.find(r => r.id === bus.routeId);
    const isDelayed = (bus.status || '').toUpperCase().includes('DELAY');
    const isIdle = bus.status === 'Off Duty' || bus.status === 'Maintenance' || (bus.status || '').toUpperCase().includes('STANDBY') || (bus.status || '').toUpperCase().includes('IDLE');
    const isSos = (bus.status || '').toUpperCase().includes('SOS') || (bus.status || '').toUpperCase().includes('EMERGENCY');

    return {
      id: bus.id,
      rawBus: bus,
      number: bus.number?.replace(/^BUS\s*#\d+\s*\((.*)\)$/i, '$1') || bus.number || bus.id,
      displayTitle: bus.number || `BUS #${bus.id}`,
      routeName: assignedRoute ? assignedRoute.name : 'Unassigned Route',
      routeId: bus.routeId,
      driverName: bus.driverName || 'Unassigned Driver',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
      status: isSos ? '🚨 SOS ALERT' : isDelayed ? 'DELAYED' : isIdle ? 'OFF DUTY' : (bus.status || 'ON TIME'),
      category: isSos || isDelayed ? 'Delayed' : isIdle ? 'Idle' : 'Active',
      battery: '88%',
      speed: `${bus.speed || 0} km/h`,
      progressPercent: bus.speed ? Math.min(100, Math.max(15, bus.speed * 2)) : 0,
      isDelayed,
      isIdle,
      isSos
    };
  });

  // Dynamic Filtering Logic
  const filteredFleetCards = fleetCards.filter(card => {
    // Category match
    if (fleetFilter === 'Active' && card.category !== 'Active') return false;
    if (fleetFilter === 'Delayed' && card.category !== 'Delayed') return false;
    if (fleetFilter === 'Idle' && card.category !== 'Idle') return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = card.displayTitle.toLowerCase().includes(q);
      const matchDriver = card.driverName.toLowerCase().includes(q);
      const matchRoute = card.routeName.toLowerCase().includes(q);
      if (!matchNumber && !matchDriver && !matchRoute) return false;
    }

    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif"
      }}
      onClick={() => {
        if (showProfileDropdown) setShowProfileDropdown(false);
      }}
    >
      {/* 1. LEFT SIDEBAR */}
      <aside
        style={{
          width: '235px',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem 1.15rem',
          flexShrink: 0,
          zIndex: 20
        }}
      >
        <div>
          {/* Brand Logo */}
          <div style={{ marginBottom: '2rem', paddingLeft: '0.4rem' }}>
            <span
              style={{
                color: '#7c3aed',
                fontSize: '1.15rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                fontFamily: "'Outfit', 'Inter', sans-serif"
              }}
            >
              WAYFINDER
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setActiveSection('buses')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'buses' ? '#7c3aed' : 'transparent',
                color: activeSection === 'buses' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'buses' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'buses' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Bus size={18} />
              <span>Fleet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('routes')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'routes' ? '#7c3aed' : 'transparent',
                color: activeSection === 'routes' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'routes' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'routes' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <GitFork size={18} />
              <span>Routes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('passes')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeSection === 'passes' ? '#7c3aed' : 'transparent',
                color: activeSection === 'passes' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                fontWeight: activeSection === 'passes' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: activeSection === 'passes' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
            >
              <Shield size={18} />
              <span>Passes</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar: System Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-hover, #e2e8f0)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary, #475569)', letterSpacing: '0.06em' }}>
                SYSTEM HEALTH
              </span>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
              <Cloud size={15} color="var(--text-secondary, #475569)" />
              <span>All Nodes Syncing</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. RIGHT MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOP BAR */}
        <header
          style={{
            height: '68px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.75rem',
            flexShrink: 0,
            zIndex: 10
          }}
        >
          {/* Left Title */}
          <div style={{ color: 'var(--primary, #7c3aed)', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Fleet Ops Center
          </div>

          {/* Center Search Bar */}
          <div style={{ position: 'relative', width: '420px' }}>
            <Search
              size={16}
              color="var(--text-muted, #94a3b8)"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, driver, or route ID..."
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.5rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
            />
          </div>

          {/* Right User & Profile Block with Dropdown & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={cycleTheme}
              style={{
                background: 'none',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '10px',
                padding: '0.45rem 0.65rem',
                cursor: 'pointer',
                color: 'var(--text-secondary, #475569)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title={`Theme: ${themeMode}`}
            >
              {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileDropdown(!showProfileDropdown);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                cursor: 'pointer',
                padding: '0.35rem 0.5rem',
                borderRadius: '12px',
                transition: 'background-color 0.15s'
              }}
            >
              <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.name || 'Alex Rivera'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fleet Manager</div>
              </div>

              {/* Help / Diamond Icon */}
              <div
                style={{
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="System Help"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 12l10 10 10-10L12 2z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              {/* Profile Avatar AR */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  letterSpacing: '0.02em',
                  flexShrink: 0
                }}
              >
                AR
              </div>
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '14px',
                  boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.15))',
                  border: '1px solid var(--border-color)',
                  width: '220px',
                  padding: '0.5rem',
                  zIndex: 100
                }}
              >
                <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{user?.name || 'Alex Rivera'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Administrator Account</div>
                </div>

                <div style={{ padding: '0.35rem 0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (setActiveRole) setActiveRole('student');
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <span>👨‍🎓</span> Switch to Student Portal
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (setActiveRole) setActiveRole('driver');
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <span>🚌</span> Switch to Driver Portal
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.55rem 0.75rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: '8px',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 3. CENTER VIEWPORT + RIGHT LIVE STATUS */}
        {activeSection === 'buses' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', overflow: 'hidden' }}>
            {/* Map Area */}
            <FleetMap
              buses={buses}
              routes={routes}
              selectedMarkerId={selectedBusId}
              onMarkerClick={setSelectedBusId}
            />

            {/* Right Live Status Sidebar */}
            <aside
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderLeft: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                padding: '1.25rem',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Live Fleet ({filteredFleetCards.length})
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
                  <SlidersHorizontal size={17} style={{ cursor: 'pointer' }} />
                  <MoreVertical size={17} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              {/* Selected Driver / Vehicle Detail Panel (when a driver/bus is clicked) */}
              {(() => {
                const selectedCard = fleetCards.find(c => c.id === selectedBusId);
                if (!selectedCard) return null;
                const matchedDriver = driversDirectory.find(d => d.assignedBusId === selectedCard.id || d.name === selectedCard.driverName);

                return (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--primary)',
                      borderRadius: '14px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.12)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                        SELECTED DRIVER DETAILS
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedBusId(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <img
                        src={selectedCard.avatarUrl}
                        alt={selectedCard.driverName}
                        style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {selectedCard.driverName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          ID: {matchedDriver?.id || matchedDriver?.username || 'N/A'} · Bus: {selectedCard.displayTitle}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: selectedCard.isSos ? '#fee2e2' : selectedCard.isDelayed ? '#fef3c7' : '#dcfce7',
                          color: selectedCard.isSos ? '#b91c1c' : selectedCard.isDelayed ? '#b45309' : '#15803d'
                        }}
                      >
                        {selectedCard.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem', backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.75rem', borderRadius: '10px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Contact Phone</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{matchedDriver?.phone || 'Not configured'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Assigned Route</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedCard.routeName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Live GPS Location</span>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {selectedCard.rawBus?.location ? `${selectedCard.rawBus.location.lat.toFixed(4)}°, ${selectedCard.rawBus.location.lng.toFixed(4)}°` : 'No GPS'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Live Speed</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{selectedCard.speed}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Filter Pills with Working Filters */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {['All', 'Active', 'Delayed', 'Idle'].map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFleetFilter(filter)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: fleetFilter === filter ? '#7c3aed' : 'var(--bg-subtle)',
                      color: fleetFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Driver / Bus Cards (Scrollable) */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  paddingRight: '0.2rem'
                }}
              >
                {filteredFleetCards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <Bus size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>No Vehicles Found</div>
                    <div style={{ fontSize: '0.8rem' }}>No buses match filter: "{fleetFilter}"</div>
                  </div>
                ) : (
                  filteredFleetCards.map(bus => (
                    <div
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: selectedBusId === bus.id ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                        borderLeft: bus.isDelayed
                          ? '4px solid #ef4444'
                          : bus.isIdle
                            ? '4px solid #94a3b8'
                            : '4px solid #10b981',
                        borderRadius: '14px',
                        padding: '0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                        boxShadow: selectedBusId === bus.id ? '0 4px 12px rgba(124, 58, 237, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Top Row: Driver info & Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={bus.avatarUrl}
                            alt={bus.driverName}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              backgroundColor: 'var(--bg-subtle)'
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {bus.driverName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                              <span>{bus.displayTitle}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            backgroundColor: bus.isDelayed
                              ? '#fee2e2'
                              : bus.isIdle
                                ? '#f1f5f9'
                                : '#dcfce7',
                            color: bus.isDelayed
                              ? '#b91c1c'
                              : bus.isIdle
                                ? '#475569'
                                : '#15803d',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em'
                          }}
                        >
                          {bus.status}
                        </span>
                      </div>

                      {/* Route Assignment Select Control */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          backgroundColor: 'var(--bg-subtle, #f8fafc)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #e2e8f0)'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                          Assigned Route:
                        </span>
                        <select
                          value={bus.routeId || ''}
                          onChange={(e) => handleUpdateBusRoute(bus.id, e.target.value)}
                          className="form-select"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            width: 'auto',
                            maxWidth: '180px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #cbd5e1)'
                          }}
                        >
                          <option value="">-- Unassigned --</option>
                          {routes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Metrics: Speed and Live Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Gauge size={13} color="#7c3aed" />
                          <span>Speed: <strong>{bus.speed || '0 km/h'}</strong></span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Click card for details
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}

        {/* SECTION: ROUTES (STUDIO & ACTIVE TRANSIT ROUTES) */}
        {activeSection === 'routes' && (
          <div style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* 1. ROUTE CREATION STUDIO WITH EMBEDDED MAP */}
            <div className="clean-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <GitFork size={20} color="#7c3aed" />
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Transit Route Creator
                  </h2>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
                  Build ordered pickup routes terminating at <strong>{COLLEGE_DESTINATION.name}</strong>. Search Kottayam/Poonjar locations or click on the map to add stops in sequence.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem', alignItems: 'stretch' }}>
                {/* Left: Embedded Kottayam/Poonjar Map for Route Construction */}
                <div style={{ height: '560px', minHeight: '560px', position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <FleetMap
                    buses={buses}
                    routes={routes}
                    isPickingStops={true}
                    searchRegion="kottayam"
                    center={[COLLEGE_DESTINATION.lat, COLLEGE_DESTINATION.lng]}
                    zoom={12}
                    pickedStops={pickedStops}
                    roadGeometry={roadGeometry}
                    previewColor={newRouteColor}
                    routeCalcError={routeCalcError}
                    isCalculatingRoute={isCalculatingRoute}
                    onAddCandidateStop={handleCandidateSelectFromSearch}
                    onCandidateSelect={handleCandidateSelectFromSearch}
                    onMapClick={handleMapClick}
                    hideStatCards={true}
                  />
                </div>

                {/* Right: Route Configuration and Ordered Stops Form */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', backgroundColor: 'var(--bg-subtle)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    {/* Route Creation Success Feedback Banner */}
                    {routeSuccessMsg && (
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          lineHeight: '1.4'
                        }}
                      >
                        {routeSuccessMsg}
                      </div>
                    )}

                    {/* Route Name Input */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Route Name</label>
                      <input
                        type="text"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        placeholder="e.g. Pala - Poonjar Campus Route"
                        className="form-input"
                        required
                      />
                    </div>

                    {/* Road Routing Live Status / Metrics */}
                    {isCalculatingRoute && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#7c3aed', padding: '0.2rem 0' }}>
                        <Loader size={13} className="spin-animation" />
                        <span>Calculating real road geometry...</span>
                      </div>
                    )}

                    {routeMetrics.distanceKm > 0 && !isCalculatingRoute && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#15803d', backgroundColor: '#f0fdf4', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <span>🛣️ Road Route: <strong>{routeMetrics.distanceKm} km</strong></span>
                        <span>⏱️ ~<strong>{routeMetrics.durationMin} min</strong> to Campus</span>
                      </div>
                    )}

                    {routeCalcError && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                        ⚠️ {routeCalcError}
                      </div>
                    )}

                    {/* Candidate Searched Location Banner (if selected from map search) */}
                    {candidatePlace && (
                      <div
                        style={{
                          padding: '0.75rem',
                          backgroundColor: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '#f0fdf4' : '#f5f3ff',
                          borderRadius: '10px',
                          border: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '1px solid #16a34a' : '1px solid #7c3aed',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? '#15803d' : '#7c3aed', letterSpacing: '0.04em' }}>
                            {candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? 'COLLEGE DESTINATION' : 'SELECTED LOCATION'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCandidatePlace(null)}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            ✕
                          </button>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                          📍 {candidatePlace.shortName || candidatePlace.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {candidatePlace.displayName}
                        </div>

                        {candidatePlace.isCollege || (candidatePlace.shortName || '').toLowerCase().includes('college of engineering poonjar') ? (
                          <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: '0.2rem' }}>
                            🏫 Fixed final destination of all routes. It will automatically be appended as the destination.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCandidateSelectFromSearch(candidatePlace)}
                            style={{
                              marginTop: '0.2rem',
                              padding: '0.45rem 0.75rem',
                              backgroundColor: '#7c3aed',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)'
                            }}
                          >
                            + Add as Pickup Stop #{pickedStops.length + 1}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ordered Pickup Stops Sequence Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 0 }}>
                          Ordered Route Sequence ({pickedStops.length} pickup{pickedStops.length === 1 ? '' : 's'})
                        </label>
                        {pickedStops.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPickedStops([])}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger, #ef4444)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          padding: '0.75rem',
                          maxHeight: '210px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        {pickedStops.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <MapPin size={20} color="#94a3b8" style={{ margin: '0 auto 0.35rem' }} />
                            <div>No pickup stops added yet.</div>
                            <div style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                              Search Kottayam/Poonjar places above or click on the map to add pickup stops in order.
                            </div>
                          </div>
                        ) : (
                          pickedStops.map((stop, idx) => (
                            <React.Fragment key={stop.id || `stop-${idx}`}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.45rem 0.65rem',
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                  <span
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      backgroundColor: '#7c3aed',
                                      color: '#ffffff',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {stop.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(idx)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger, #ef4444)',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Remove Stop"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Down arrow indicator between stops */}
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '0.05rem 0' }}>
                                <ArrowDown size={12} color="#94a3b8" />
                              </div>
                            </React.Fragment>
                          ))
                        )}

                        {/* Fixed Final Destination: College of Engineering Poonjar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            backgroundColor: 'var(--success-light, #f0fdf4)',
                            borderRadius: '8px',
                            border: '1px dashed var(--success, #16a34a)'
                          }}
                        >
                          <span style={{ fontSize: '1rem' }}>🏫</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--success, #15803d)' }}>
                              {COLLEGE_DESTINATION.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Fixed Final Destination
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Route Accent Color */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 0 }}>Route Accent Color</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={newRouteColor}
                          onChange={(e) => setNewRouteColor(e.target.value)}
                          style={{ width: '32px', height: '30px', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent' }}
                        />
                        <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{newRouteColor}</span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || pickedStops.length === 0}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: pickedStops.length === 0 ? 'var(--border-color, #cbd5e1)' : '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: pickedStops.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: pickedStops.length === 0 ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSubmitting ? 'Creating Route...' : `Create Route (${pickedStops.length} Pickup${pickedStops.length === 1 ? '' : 's'} → ${COLLEGE_DESTINATION.shortName})`}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* 2. REGISTERED ACTIVE TRANSIT ROUTES */}
            <div className="clean-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Registered Active Routes ({routes.length})
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    All routes terminate at <strong>{COLLEGE_DESTINATION.name}</strong> and are live on the Student Radar & Driver Navigation
                  </div>
                </div>
              </div>

              {routes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <GitFork size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No routes registered</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Use the Route Creator above to create your first pickup route.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                  {routes.map(route => {
                    const rawStops = (route.stops || []).map(s => String(s).trim()).filter(Boolean);
                    const isCollegeLast = rawStops.length > 0 && rawStops[rawStops.length - 1].toLowerCase().includes('college of engineering poonjar');
                    const pickupStops = isCollegeLast ? rawStops.slice(0, -1) : rawStops;
                    const assignedBuses = buses.filter(b => b.routeId === route.id);

                    return (
                      <div
                        key={route.id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          borderLeft: `4px solid ${route.color || '#7c3aed'}`,
                          backgroundColor: 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.85rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>{route.name}</strong>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoute(route.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger, #ef4444)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete Route"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Ordered Stops Flow */}
                          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>
                              ORDERED PICKUP SEQUENCE
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {pickupStops.map((stop, sIdx) => (
                                <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: route.color || '#7c3aed' }}>{sIdx + 1}.</span>
                                  <span>{stop}</span>
                                </div>
                              ))}
                              {/* Destination Indicator */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success, #16a34a)', fontWeight: 700, marginTop: '0.15rem' }}>
                                <span>🏁</span>
                                <span>{COLLEGE_DESTINATION.name}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Route Footer: Assigned Bus Info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                          <span>
                            {assignedBuses.length > 0
                              ? `Assigned to: ${assignedBuses.map(b => b.number || b.id).join(', ')}`
                              : 'No buses assigned'}
                          </span>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                            {pickupStops.length} Pickups
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: PASSES */}
        {activeSection === 'passes' && (
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            <div className="clean-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', margin: 0 }}>
                    Student Transit Passes ({passes.length})
                  </h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.2rem' }}>
                    Manage student bus pass access and status entitlements
                  </div>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Pass ID</th>
                      <th>Route Entitlement</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passes.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #64748b)' }}>
                          No student passes registered
                        </td>
                      </tr>
                    ) : (
                      passes.map(pass => (
                        <tr key={pass.id}>
                          <td style={{ fontWeight: 600 }}>{pass.name || pass.studentName || 'Student Pass'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>{pass.id}</td>
                          <td>{pass.routeEntitlement || 'All Routes'}</td>
                          <td>{pass.validUntil || '2026-12-31'}</td>
                          <td>
                            <span
                              className={`badge ${
                                pass.passStatus === 'Active' ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              {pass.passStatus || 'Active'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={pass.passStatus || 'Active'}
                              onChange={(e) => handleUpdatePassStatus(pass.id, e.target.value)}
                              className="form-select"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                            >
                              <option value="Active">Active</option>
                              <option value="Suspended">Suspended</option>
                              <option value="Expired">Expired</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create New Student Pass Form */}
            <div className="clean-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary, #1e293b)' }}>
                <Users size={18} /> Register Student Pass
              </h2>
              <form onSubmit={handleCreatePass} className="flex-col gap-1">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Student Name</label>
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Email / Username</label>
                    <input
                      type="text"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      placeholder="john@student.edu"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Route Entitlement</label>
                  <select
                    value={newStudentRoute}
                    onChange={(e) => setNewStudentRoute(e.target.value)}
                    className="form-select"
                  >
                    <option value="All Routes">All Routes</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Registering...' : 'Issue Bus Pass'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── PROFESSIONAL ADD PICKUP STOP IN-APP MODAL (NO WINDOW.PROMPT) ── */}
      {isAddStopModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsAddStopModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                  Add Pickup Stop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStopModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #64748b)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.2rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Selected Location / Coordinates Details */}
            <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {modalStopData.isSearch ? 'Selected Location' : 'Selected Coordinates'}
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #1e293b)', marginTop: '0.2rem' }}>
                📍 {modalStopData.name || modalStopData.address}
              </div>
              {modalStopData.isSearch && modalStopData.address && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.2rem', lineHeight: '1.3' }}>
                  {modalStopData.address}
                </div>
              )}
            </div>

            {/* Stop Name Form */}
            <form onSubmit={handleConfirmAddStop} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                  Stop Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={stopNameInput}
                  onChange={e => setStopNameInput(e.target.value)}
                  placeholder="Enter pickup location name"
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  required
                />
                <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600, marginTop: '0.4rem' }}>
                  ✓ This will become <strong>Pickup Stop #{pickedStops.length + 1}</strong> in the route sequence
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddStopModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #64748b)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)'
                  }}
                >
                  Add Pickup Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
