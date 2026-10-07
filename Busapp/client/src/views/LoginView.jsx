import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

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
      padding: '2rem 1.25rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'relative',
          maxWidth: '430px',
          width: '100%',
          padding: '2.5rem 2rem',
          borderRadius: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(255, 255, 255, 0.08)',
          zIndex: 10
        }}
      >
        {/* Header with Transparent Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem'
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
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.4rem',
            color: 'var(--text-primary, #ffffff)',
            fontFamily: "'Outfit', 'Inter', sans-serif"
          }}>
            Sign in to HopSpot
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', margin: 0, lineHeight: 1.45 }}>
            Smart campus transit navigation for students, drivers, and administration
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex-col gap-1">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm, 10px)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                fontSize: '0.825rem',
                fontWeight: 500,
                marginBottom: '0.85rem',
                textAlign: 'center'
              }}
            >
              {error}
            </motion.div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', color: '#cbd5e1' }}>Username or ID</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Student ID, driver or admin"
                className="form-input"
                style={{
                  paddingLeft: '2.5rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff'
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', color: '#cbd5e1' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                style={{
                  paddingLeft: '2.5rem',
                  backgroundColor: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
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
              marginTop: '1rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.8rem 1.25rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in to HopSpot'}
            <ArrowRight size={17} />
          </motion.button>
        </form>

        {/* Footer Legal Links */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.85rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #94a3b8)'
        }}>
          <button
            type="button"
            onClick={() => handleLegalClick('privacy')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('terms')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('cookies')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
          >
            Cookies
          </button>
        </div>
      </motion.div>

      <div style={{
        marginTop: '1.25rem',
        fontSize: '0.74rem',
        color: '#64748b',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        HopSpot Transit System • Secured with End-to-End Encryption
      </div>
    </div>
  );
}
