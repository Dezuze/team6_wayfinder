import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Cookie, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          boxSizing: 'border-box'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-card, #1e293b)',
            color: 'var(--text-primary, #f8fafc)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            width: '100%',
            maxWidth: '720px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #334155)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeTab === 'privacy' && <ShieldCheck size={20} />}
                {activeTab === 'terms' && <FileText size={20} />}
                {activeTab === 'cookies' && <Cookie size={20} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  HopSpot Legal Center
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)' }}>
                  Effective Date: October 2026 • Version 2.4
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close Dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color, #334155)',
            backgroundColor: 'var(--bg-subtle, #0f172a)',
            padding: '0.25rem 1.5rem 0'
          }}>
            <button
              onClick={() => setActiveTab('privacy')}
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'privacy' ? 'var(--primary)' : 'var(--text-secondary, #94a3b8)',
                borderBottom: activeTab === 'privacy' ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <ShieldCheck size={16} /> Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'terms' ? 'var(--primary)' : 'var(--text-secondary, #94a3b8)',
                borderBottom: activeTab === 'terms' ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <FileText size={16} /> Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('cookies')}
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'cookies' ? 'var(--primary)' : 'var(--text-secondary, #94a3b8)',
                borderBottom: activeTab === 'cookies' ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Cookie size={16} /> Cookie Policy
            </button>
          </div>

          {/* Content Body (Scrollable) */}
          <div style={{
            padding: '1.5rem',
            overflowY: 'auto',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: 'var(--text-primary, #cbd5e1)',
            flex: 1
          }}>
            {activeTab === 'privacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: 0, marginBottom: '0.5rem' }}>
                    1. Information We Collect
                  </h3>
                  <p style={{ margin: 0 }}>
                    HopSpot collects and processes transit data to provide real-time bus tracking and passenger services:
                  </p>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                    <li><strong>Live Geolocation:</strong> Real-time GPS coordinates are captured from active driver devices solely during scheduled shuttle routes. Passenger location is accessed only with explicit browser permission to compute distance and arrival alerts.</li>
                    <li><strong>Account & Pass Data:</strong> Student IDs, registered names, transit entitlements, pass validity periods, and cryptographic QR token strings.</li>
                    <li><strong>Technical Telemetry:</strong> Device platform, connection timestamps, and anonymous performance logs to ensure WebSocket reliability.</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    2. How We Use Information
                  </h3>
                  <p style={{ margin: 0 }}>
                    Information is used strictly to power campus transportation:
                  </p>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                    <li>Calculating accurate bus ETAs and route progress along pre-mapped road corridors.</li>
                    <li>Authorizing passenger bus passes via offline-verifiable QR code scanning.</li>
                    <li>Triggering passenger proximity alerts (e.g. notify when shuttle is within 10 minutes).</li>
                    <li>Enabling transit dispatchers and fleet administrators to maintain route coverage.</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    3. Data Protection & Student Rights (FERPA & GDPR)
                  </h3>
                  <p style={{ margin: 0 }}>
                    HopSpot strictly complies with student privacy standards. We <strong>never sell, rent, or monetize</strong> student transit records or telemetry. Passenger GPS coordinates are processed transiently in volatile memory and are not stored permanently.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    4. Security & Encryption
                  </h3>
                  <p style={{ margin: 0 }}>
                    All communication between client devices and HopSpot servers is encrypted using modern TLS (HTTPS/WSS). Persistent route definitions and pass records are stored with access controls restricted to authorized institution staff.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: 0, marginBottom: '0.5rem' }}>
                    1. Agreement to Terms
                  </h3>
                  <p style={{ margin: 0 }}>
                    By accessing or using the HopSpot transit application, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, you must discontinue using the application.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    2. Campus Bus Pass Regulations
                  </h3>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                    <li>HopSpot digital QR transit passes are individual, non-transferable privileges issued solely to authorized students and staff.</li>
                    <li>Sharing, duplicating, or forging QR passes is strictly prohibited and subject to immediate pass revocation and institutional disciplinary action.</li>
                    <li>Drivers reserve the right to verify photo identification alongside digital QR validation.</li>
                  </ul>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    3. Driver & Fleet Operational Conduct
                  </h3>
                  <p style={{ margin: 0 }}>
                    Authorized drivers agree to broadcast truthful GPS coordinates only while in active operation of the assigned vehicle. Drivers must adhere to campus safety guidelines, speed limits, and designated passenger pickup waypoints.
                  </p>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    4. Service Disclaimers & Availability
                  </h3>
                  <p style={{ margin: 0 }}>
                    While HopSpot strives for high precision, real-time traffic, weather, road closures, and GPS satellite propagation delays may affect ETA estimations. HopSpot is provided on an "as-is" and "as-available" basis without warranties of uninterrupted transit operation.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'cookies' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginTop: 0, marginBottom: '0.5rem' }}>
                    1. What Cookies & Local Storage We Use
                  </h3>
                  <p style={{ margin: 0 }}>
                    HopSpot uses minimal, privacy-first client storage (HTML5 LocalStorage and essential session tokens) solely to power core application features:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: 'var(--bg-subtle, #0f172a)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)'
                  }}>
                    <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <CheckCircle2 size={16} /> Essential Transit Cookies (Strictly Necessary)
                    </strong>
                    <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--text-secondary, #94a3b8)' }}>
                      Used for authentication tokens, active login state, student pass QR caching, and user interface theme preferences (dark/light mode). Cannot be disabled as the app cannot function without them.
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--bg-subtle, #0f172a)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #334155)'
                  }}>
                    <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <CheckCircle2 size={16} /> Functional & Geometry Cache
                    </strong>
                    <p style={{ fontSize: '0.78rem', margin: 0, color: 'var(--text-secondary, #94a3b8)' }}>
                      Caches road polyline geometry and stops locally to reduce redundant cellular bandwidth consumption on mobile networks and ensure rapid map rendering.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.5rem' }}>
                    2. Managing Preferences
                  </h3>
                  <p style={{ margin: 0 }}>
                    You can clear your local cache anytime through your browser's application settings or by signing out of the HopSpot portal.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color, #334155)',
            backgroundColor: 'var(--bg-subtle, #0f172a)'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
              © 2026 HopSpot Transit Technologies. All rights reserved.
            </span>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                cursor: 'pointer'
              }}
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
