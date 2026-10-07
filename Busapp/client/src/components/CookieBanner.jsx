import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, Check, Info } from 'lucide-react';

export default function CookieBanner({ onOpenLegal }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('hopspot_cookie_consent');
      if (!consent) {
        // Small delay so page loads smoothly first
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      setVisible(false);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('hopspot_cookie_consent', JSON.stringify({ choice: 'all', timestamp: Date.now() }));
    } catch { /* ignore */ }
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('hopspot_cookie_consent', JSON.stringify({ choice: 'essential', timestamp: Date.now() }));
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.96 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 25 }}
        style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 2rem)',
          maxWidth: '560px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          color: '#f8fafc',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '16px',
          padding: '1.15rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          zIndex: 99990,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Cookie size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <strong style={{ fontSize: '0.92rem', letterSpacing: '-0.01em', color: '#ffffff' }}>
                Cookie & Privacy Choices
              </strong>
              <button
                type="button"
                onClick={() => onOpenLegal && onOpenLegal('cookies')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Learn More
              </button>
            </div>

            <p style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 0.85rem' }}>
              HopSpot uses essential local storage to keep you securely signed in and cache real-time road maps for low mobile bandwidth. We never track your personal browsing or sell transit data.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAcceptAll}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Check size={14} /> Accept All
              </button>

              <button
                type="button"
                onClick={handleEssentialOnly}
                style={{
                  backgroundColor: 'rgba(51, 65, 85, 0.75)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Essential Only
              </button>

              <button
                type="button"
                onClick={() => onOpenLegal && onOpenLegal('privacy')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Privacy Notice
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
