import React from 'react';
import { Bus, Sun, Moon, Laptop, Wifi, WifiOff, LogOut, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeRole, setActiveRole }) {
  const { themeMode, cycleTheme } = useTheme();
  const { isConnected } = useWebSocket();
  const { user, logout } = useAuth();

  const getThemeIcon = () => {
    if (themeMode === 'light') return <Sun size={16} />;
    if (themeMode === 'dark') return <Moon size={16} />;
    return <Laptop size={16} />;
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}>
          <Bus size={18} />
        </div>
        <span>CampusBus</span>
      </div>

      <div className="navbar-controls">
        {/* Role Switcher Tabs */}
        <div className="role-tabs">
          <button
            onClick={() => setActiveRole('student')}
            className={`role-tab ${activeRole === 'student' ? 'active' : ''}`}
          >
            Student
          </button>
          <button
            onClick={() => setActiveRole('driver')}
            className={`role-tab ${activeRole === 'driver' ? 'active' : ''}`}
          >
            Driver
          </button>
          <button
            onClick={() => setActiveRole('admin')}
            className={`role-tab ${activeRole === 'admin' ? 'active' : ''}`}
          >
            Admin
          </button>
        </div>

        {/* WebSocket Status */}
        <div className="badge" style={{
          backgroundColor: isConnected ? 'var(--success-light)' : 'var(--danger-light)',
          color: isConnected ? 'var(--success)' : 'var(--danger)',
          padding: '0.35rem 0.65rem'
        }}>
          <span className={isConnected ? 'pulse-indicator' : ''} style={{ fontSize: '0.65rem' }}>●</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Logged in User Badge & Logout */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem'
          }}>
            <User size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 500, maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || user.username}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '0.25rem'
              }}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Theme Cycle Button */}
        <button
          onClick={cycleTheme}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
          title={`Theme: ${themeMode}`}
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
