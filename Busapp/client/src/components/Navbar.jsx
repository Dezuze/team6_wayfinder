import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, Sun, Moon, Laptop, Wifi, WifiOff, LogOut, User, ShieldCheck, FileText, Cookie } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeRole, setActiveRole, onOpenLegal }) {
  const { themeMode, cycleTheme } = useTheme();
  const { isConnected } = useWebSocket();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  const getThemeIcon = () => {
    if (themeMode === 'light') return <Sun size={18} />;
    if (themeMode === 'dark') return <Moon size={18} />;
    return <Laptop size={18} />;
  };

  const handleLegalClick = (tab) => {
    setShowMenu(false);
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      window.dispatchEvent(new CustomEvent('open-legal-modal', { detail: { tab } }));
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <img src="/logo.png" alt="HopSpot Logo" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
        <span style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', fontWeight: 800 }}>HopSpot</span>
      </div>

      <div className="navbar-controls" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
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
            title="User Account & Settings"
          >
            {user ? <User size={18} /> : <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{activeRole[0].toUpperCase()}</div>}
          </button>

          <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
              className="navbar-menu-dropdown" style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: '0',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0, 0, 0, 0.3))',
              padding: '0.5rem',
              minWidth: '200px',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account Settings
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { cycleTheme(); setShowMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.85rem'
                }}
              >
                {getThemeIcon()} Toggle Theme
              </motion.button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
              <div style={{ padding: '0.35rem 0.75rem 0.15rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Legal & Privacy
              </div>

              <button
                type="button"
                onClick={() => handleLegalClick('privacy')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }}
              >
                <ShieldCheck size={15} color="#7c3aed" /> Privacy Policy
              </button>

              <button
                type="button"
                onClick={() => handleLegalClick('terms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }}
              >
                <FileText size={15} color="#7c3aed" /> Terms & Conditions
              </button>

              <button
                type="button"
                onClick={() => handleLegalClick('cookies')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 500
                }}
              >
                <Cookie size={15} color="#7c3aed" /> Cookie Choices
              </button>

              {user && (
                <>
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                  <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(220, 38, 38, 0.1)' }}
                    whileTap={{ scale: 0.95 }}
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
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
