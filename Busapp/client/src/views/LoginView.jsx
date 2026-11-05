import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, User, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';

export default function LoginView({ onOpenLegal }) {
  const { login, error, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await login(username, password);
  };

  const handleLegalClick = (tab) => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      window.dispatchEvent(new CustomEvent('open-legal-modal', { detail: { tab } }));
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: '100dvh',
      height: '100%',
      margin: 0,
      padding: '0.75rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Subtle Ambient Background (Uniform HopSpot Palette) */}
      <motion.div
        animate={{
          x: [-30, 35, -30],
          y: [-20, 25, -20],
          scale: [1, 1.15, 1]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '15%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.12) 0%, rgba(2, 132, 199, 0.03) 50%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      <motion.div
        animate={{
          x: [30, -35, 30],
          y: [20, -25, 20],
          scale: [1.12, 0.98, 1.12]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          bottom: '12%',
          right: '15%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 50%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Main Glassmorphic Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, type: 'spring', damping: 25, stiffness: 220 }}
        style={{
          position: 'relative',
          maxWidth: '345px',
          width: '100%',
          padding: '1.35rem 1.25rem',
          borderRadius: '18px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(255, 255, 255, 0.08)',
          zIndex: 10
        }}
      >
        {/* Compact Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.5rem'
          }}>
            <img
              src="/logo.png"
              alt="HopSpot Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '0.2rem',
            color: 'var(--text-primary, #ffffff)',
            fontFamily: "'Outfit', 'Inter', sans-serif"
          }}>
            Sign in to HopSpot
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.75rem', margin: 0, lineHeight: 1.35 }}>
            Campus transit portal for students, drivers &amp; staff
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '0.76rem',
                fontWeight: 500,
                textAlign: 'center'
              }}
            >
              {error}
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="login-username" style={{ fontWeight: 600, fontSize: '0.75rem', color: '#cbd5e1' }}>
              Username or ID
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="login-username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Student ID, driver, staff, or admin"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="next"
                className="form-input"
                style={{
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  fontSize: '0.82rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff'
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="login-password" style={{ fontWeight: 600, fontSize: '0.75rem', color: '#cbd5e1' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                enterKeyHint="done"
                className="form-input"
                style={{
                  padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                  fontSize: '0.82rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff'
                }}
                required
              />
            </div>
          </div>

          <motion.button
            id="login-submit-btn"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              marginTop: '0.25rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '0.62rem 1rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            <ArrowRight size={15} />
          </motion.button>
        </form>

        {/* Quick Demo Access / Hardware Driver Quick Login */}
        <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem', textAlign: 'center' }}>
            Quick Sign In
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.35rem' }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setUsername('driver.rahul');
                setPassword('password123');
                login('driver.rahul', 'password123');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.7rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(2, 132, 199, 0.35)',
                color: '#38bdf8',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bus size={14} />
                <span>Driver (Rahul • Bus NO-2)</span>
              </div>
              <span style={{ fontSize: '0.64rem', padding: '0.1rem 0.38rem', backgroundColor: 'rgba(2, 132, 199, 0.3)', borderRadius: '5px', fontWeight: 700 }}>STM32</span>
            </motion.button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setUsername('3468/24');
                  setPassword('student123');
                  login('3468/24', 'student123');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  padding: '0.42rem 0.4rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                <User size={12} /> Student
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setUsername('staff');
                  setPassword('password123');
                  login('staff', 'password123', 'staff');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  padding: '0.42rem 0.4rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                <QrCode size={12} /> Staff
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setUsername('admin');
                  setPassword('password123');
                  login('admin', 'password123');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  padding: '0.42rem 0.4rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                <ShieldCheck size={12} /> Admin
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer Legal Links */}
        <div style={{
          marginTop: '0.85rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          fontSize: '0.7rem',
          color: 'var(--text-secondary, #94a3b8)',
          whiteSpace: 'nowrap'
        }}>
          <button
            type="button"
            onClick={() => handleLegalClick('privacy')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
          >
            Privacy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('terms')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
          >
            Terms
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('cookies')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
          >
            Cookies
          </button>
        </div>
      </motion.div>

      <div style={{
        marginTop: '0.65rem',
        fontSize: '0.68rem',
        color: '#64748b',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        HopSpot Transit System • End-to-End Encrypted
      </div>
    </div>
  );
}
