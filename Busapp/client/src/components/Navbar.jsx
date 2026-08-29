import React, { useState } from 'react';
import { Bus, Sun, Moon, Laptop, Wifi, WifiOff, LogOut, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeRole, setActiveRole }) {
  const { themeMode, cycleTheme } = useTheme();
  const { isConnected } = useWebSocket();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const getThemeIcon = () => {
    if (themeMode === 'light') return <Sun size={18} />;
    if (themeMode === 'dark') return <Moon size={18} />;
    return <Laptop size={18} />;
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
        }}>
          <Bus size={18} />
        </div>
        <span style={{ fontSize: '1.25rem', letterSpacing: '-0.03em' }}>CampusBus</span>
      </div>

      <div className="navbar-controls">
        {/* WebSocket Status - Minimal Dot */}
        <div 
          className={isConnected ? 'pulse-indicator' : ''}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)',
            marginRight: '0.25rem'
          }}
          title={isConnected ? 'Live' : 'Offline'}
        />

        {/* Desktop Role Tabs (hidden on mobile, handled by dropdown) */}
        <div className="role-tabs" style={{ display: 'none' /* We'll just rely on the mobile menu for simplicity in this redesign, or we can use CSS media queries. For now, let's keep it simple and put it in the menu */ }}>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
          >
            {user ? <User size={18} /> : <div style={{fontWeight:600, fontSize:'0.8rem'}}>{activeRole[0].toUpperCase()}</div>}
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              padding: '0.5rem',
              minWidth: '180px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Switch Role
              </div>
              {['student', 'driver', 'admin'].map(role => (
                <button
                  key={role}
                  onClick={() => { setActiveRole(role); setShowMenu(false); }}
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: activeRole === role ? 'var(--primary-light)' : 'transparent',
                    color: activeRole === role ? 'var(--primary)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: activeRole === role ? 600 : 500,
                    textTransform: 'capitalize'
                  }}
                >
                  {role}
                </button>
              ))}

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
              
              <button
                onClick={() => { cycleTheme(); setShowMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                  padding: '0.6rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                {getThemeIcon()} Toggle Theme
              </button>

              {user && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'left',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
