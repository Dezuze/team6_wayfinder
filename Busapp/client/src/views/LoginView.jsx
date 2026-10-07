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
      {/* Animated Glowing Blur Background (Logo Palette: Cyan #00e5ff & Lime #76ff03 & Indigo #7c3aed) */}
      <motion.div
        animate={{
          x: [-40, 50, -40],
          y: [-30, 40, -30],
          scale: [1, 1.28, 1]
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '12%',
          left: '12%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.32) 0%, rgba(6, 182, 212, 0.18) 45%, transparent 70%)',
          filter: 'blur(85px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      <motion.div
        animate={{
          x: [40, -50, 40],
          y: [30, -40, 30],
          scale: [1.2, 0.95, 1.2]
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '12%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(118, 255, 3, 0.25) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      <motion.div
        animate={{
          scale: [0.95, 1.22, 0.95],
          opacity: [0.35, 0.6, 0.35]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.28) 0%, rgba(79, 70, 229, 0.12) 55%, transparent 70%)',
          filter: 'blur(95px)',
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
          backgroundColor: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), 0 0 45px rgba(0, 229, 255, 0.12)',
          zIndex: 10
        }}
      >
        {/* Header with Transparent Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem'
          }}>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.75, 0.4]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{
                position: 'absolute',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 229, 255, 0.4) 0%, rgba(118, 255, 3, 0.2) 60%, transparent 75%)',
                filter: 'blur(12px)'
              }}
            />
            <img
              src="/logo.png"
              alt="HopSpot Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'relative',
                zIndex: 2,
                filter: 'drop-shadow(0 6px 20px rgba(0, 229, 255, 0.35))'
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              marginTop: '1rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              padding: '0.8rem 1.25rem',
              background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 50%, #76ff03 100%)',
              color: '#06101e',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 25px rgba(0, 229, 255, 0.35)'
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
