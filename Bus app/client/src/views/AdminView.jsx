import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Bus,
  GitFork,
  BarChart2,
  Cloud,
  Search,
  SlidersHorizontal,
  MoreVertical,
  Plus,
  Minus,
  Crosshair,
  Users,
  Clock,
  AlertTriangle,
  Zap,
  Battery,
  Gauge,
  MapPin,
  Sparkles,
  HelpCircle,
  Shield,
  Map,
  XCircle,
  CheckCircle,
  Edit3,
  LogOut,
  User,
  ArrowRightLeft,
  ChevronDown,
  Sun,
  Moon,
  Trash2
} from 'lucide-react';

function FleetMapVisual({ selectedBusId, onSelectBus }) {
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '480px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--bg-subtle, #e0f2fe) 0%, var(--bg-card, #f0f9ff) 50%, var(--bg-primary, #e0e7ff) 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid var(--border-color, #cbd5e1)'
      }}
    >
      {/* Floating Map Zoom Controls (Top Left) */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.25rem',
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.6rem 0.75rem',
            cursor: 'pointer',
            color: 'var(--text-primary, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom In"
        >
          <Plus size={18} />
        </button>

        <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-color, #e2e8f0)' }} />

        <button
          type="button"
          onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.6rem 0.75rem',
            cursor: 'pointer',
            color: 'var(--text-primary, #334155)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Map Content Container (Scalable via zoomLevel) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${zoomLevel})`,
          transition: 'transform 0.3s ease',
          pointerEvents: 'none'
        }}
      >
        {/* Bus Pin: BUS-402 */}
        <div
          onClick={() => onSelectBus && onSelectBus('bus-402')}
          style={{
            position: 'absolute',
            left: '42%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: selectedBusId === 'bus-402' ? '#5b21b6' : '#7c3aed',
            color: '#ffffff',
            padding: '0.4rem 0.75rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            letterSpacing: '0.02em',
            transition: 'transform 0.15s ease'
          }}
        >
          <Bus size={15} />
          <span>BUS-402</span>
        </div>

        {/* Bus Pin: BUS-119 */}
        <div
          onClick={() => onSelectBus && onSelectBus('bus-119')}
          style={{
            position: 'absolute',
            left: '58%',
            top: '58%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: selectedBusId === 'bus-119' ? '#065f46' : '#0f766e',
            color: '#ffffff',
            padding: '0.4rem 0.75rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.35)',
            letterSpacing: '0.02em',
            transition: 'transform 0.15s ease'
          }}
        >
          <Bus size={15} />
          <span>BUS-119</span>
        </div>
      </div>

      {/* Bottom Floating 4 Stat Cards */}
      <div
        style={{
          position: 'relative',
          zIndex: 15,
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.85rem',
          marginTop: 'auto'
        }}
      >
        {/* Card 1: Active Drivers */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#f3e8ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Active Drivers</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>142</div>
          </div>
        </div>

        {/* Card 2: Avg. Delay */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#ccfbf1',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Avg. Delay</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>1.4m</div>
          </div>
        </div>

        {/* Card 3: Alerts */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Alerts</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>03</div>
          </div>
        </div>

        {/* Card 4: Fleet Charge */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#ede9fe',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Fleet Charge</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', lineHeight: 1.2 }}>88%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminView({ activeRole, setActiveRole }) {
  const { buses, routes, passes, refreshData } = useWebSocket();
  const { user, logout } = useAuth();
  const { themeMode, cycleTheme, effectiveTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('buses'); // buses, routes, passes
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteStops, setNewRouteStops] = useState('');
  const [newRouteColor, setNewRouteColor] = useState('#7c3aed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fleetFilter, setFleetFilter] = useState('Active'); // All, Active, Delayed, Idle
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState(null);

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

  // Complete Fleet Dataset matching reference and live data
  const referenceFleetCards = [
    {
      id: 'bus-402',
      number: '402',
      routeName: 'Route 22X',
      driverName: 'Sarah J. Miller',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      status: 'ON TIME',
      category: 'Active',
      battery: '68%',
      speed: '34mph',
      progressPercent: 70,
      isDelayed: false,
      isIdle: false
    },
    {
      id: 'bus-119',
      number: '119',
      routeName: 'Route 5',
      driverName: 'Marcus Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      status: 'DELAYED 4M',
      category: 'Delayed',
      battery: '22%',
      speed: '28mph',
      progressPercent: 20,
      isDelayed: true,
      isIdle: false
    },
    {
      id: 'bus-088',
      number: '088',
      routeName: 'Express 1',
      driverName: 'Elena Rodriguez',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
      status: 'ON TIME',
      category: 'Active',
      battery: '94%',
      speed: '45mph',
      progressPercent: 95,
      isDelayed: false,
      isIdle: false
    },
    {
      id: 'bus-042',
      number: '042',
      routeName: 'Campus Depot',
      driverName: 'David Kim',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      status: 'STANDBY / IDLE',
      category: 'Idle',
      battery: '100%',
      speed: '0mph',
      progressPercent: 0,
      isDelayed: false,
      isIdle: true
    }
  ];

  // Dynamic Filtering Logic
  const filteredFleetCards = referenceFleetCards.filter(card => {
    // Category match
    if (fleetFilter === 'Active' && card.category !== 'Active') return false;
    if (fleetFilter === 'Delayed' && card.category !== 'Delayed') return false;
    if (fleetFilter === 'Idle' && card.category !== 'Idle') return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = card.number.toLowerCase().includes(q);
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
                      setActiveRole && setActiveRole('student');
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
                      setActiveRole && setActiveRole('driver');
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
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', overflow: 'hidden' }}>
            {/* Map Area */}
            <FleetMapVisual selectedBusId={selectedBusId} onSelectBus={setSelectedBusId} />

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
                  Live Status ({filteredFleetCards.length})
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
                  <SlidersHorizontal size={17} style={{ cursor: 'pointer' }} />
                  <MoreVertical size={17} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              {/* Filter Pills with Working Filters */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {['All', 'Active', 'Delayed', 'Idle'].map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFleetFilter(filter)}
                    style={{
                      padding: '0.4rem 0.95rem',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: fleetFilter === filter ? '#7c3aed' : 'var(--bg-subtle)',
                      color: fleetFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
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
                  gap: '0.9rem',
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
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
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
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              backgroundColor: 'var(--bg-subtle)'
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {bus.driverName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              BUS-{bus.number} • {bus.routeName}
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
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em'
                          }}
                        >
                          {bus.status}
                        </span>
                      </div>

                      {/* Metrics Row: Battery & Speed */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '0.5rem',
                          paddingTop: '0.2rem'
                        }}
                      >
                        {/* BATTERY */}
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', letterSpacing: '0.04em' }}>
                            BATTERY
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginTop: '0.15rem' }}>
                            <Battery size={13} color="#10b981" />
                            <span>{bus.battery}</span>
                          </div>
                        </div>

                        {/* SPEED */}
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', letterSpacing: '0.04em' }}>
                            SPEED
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', marginTop: '0.15rem' }}>
                            <Gauge size={13} color="var(--text-secondary, #64748b)" />
                            <span>{bus.speed || '0mph'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '5px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '999px',
                          overflow: 'hidden',
                          marginTop: '0.2rem'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${bus.progressPercent}%`,
                            backgroundColor: bus.isDelayed ? '#ef4444' : bus.isIdle ? '#94a3b8' : '#7c3aed',
                            borderRadius: '999px'
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Action Button */}
              <div style={{ paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => console.log('Dispatch Backup Vehicle')}
                  style={{
                    width: '100%',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '0.85rem 1rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Sparkles size={17} />
                  <span>Dispatch Backup Vehicle</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* SECTION: ROUTES */}
        {activeSection === 'routes' && (
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
              <div className="clean-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary, #1e293b)' }}>Active Transit Routes</h2>
                <div className="flex-col gap-1">
                  {routes.map(route => (
                    <div key={route.id} style={{ padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', borderLeft: `4px solid ${route.color || '#7c3aed'}`, marginBottom: '0.75rem' }}>
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary, #1e293b)' }}>{route.name}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-subtle, #f1f5f9)', color: 'var(--text-secondary, #64748b)' }}>
                            {route.stops.length} Stops
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoute(route.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger, #ef4444)',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'opacity 0.15s ease'
                            }}
                            title="Delete Route"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                        <strong>Stops: </strong> {route.stops.join(' → ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="clean-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary, #1e293b)' }}>
                  <Plus size={18} /> Add New Route
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
                        style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'transparent' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary, #64748b)' }}>{newRouteColor}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Transit Route'}
                  </button>
                </form>
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
}
