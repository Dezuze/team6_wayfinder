import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, ShieldCheck, CheckCircle2, X, MapPin, Radio, BellRing, Volume2, VolumeX } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { playSosEmergencySiren } from '../utils/sosEmergency';

export default function SosAlertBanner({ onNavigateToBus }) {
  const { latestSosAlert, activeSosAlerts, resolveSOS, dismissSosAlert } = useWebSocket();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  if (!latestSosAlert && (!activeSosAlerts || activeSosAlerts.length === 0)) {
    return null;
  }

  const alert = latestSosAlert || activeSosAlerts[activeSosAlerts.length - 1];
  const isAdmin = user?.role === 'admin';
  const isDriver = user?.role === 'driver';

  const handleResolve = async (e) => {
    e.stopPropagation();
    setIsResolving(true);
    try {
      await resolveSOS(alert.busId, alert.id);
    } catch (err) {
      console.error('Failed to resolve SOS alert:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleReplayAlarm = (e) => {
    e.stopPropagation();
    playSosEmergencySiren();
  };

  return (
    <div className="sos-alert-banner-container" style={{
      position: 'fixed',
      top: '0.75rem',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 1.5rem)',
      maxWidth: '680px',
      zIndex: 99999,
      pointerEvents: 'auto'
    }}>
      <motion.div
        initial={{ opacity: 0, y: -25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -25, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          backgroundColor: '#991b1b',
          backgroundImage: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 12px 35px -5px rgba(185, 28, 28, 0.55), 0 0 0 1px rgba(254, 202, 202, 0.25)',
          padding: '0.85rem 1.1rem',
          border: '1px solid rgba(254, 226, 226, 0.35)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          {/* Emergency Pulse Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
            }} className="pulse-sos-icon">
              <AlertTriangle size={20} color="#ffffff" />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px'
                }}>
                  CRITICAL SOS PUSH
                </span>
                <span style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 500 }}>
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active Now'}
                </span>
              </div>

              <div style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                marginTop: '0.15rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {alert.busNumber || 'Campus Emergency'}: {alert.reason || 'Distress signal active'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Siren Replay Button */}
            <button
              onClick={handleReplayAlarm}
              title="Replay Alert Tone"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Volume2 size={16} />
            </button>

            {/* Direct Call 112 */}
            <a
              href="tel:112"
              title="Call Emergency Services (112)"
              style={{
                backgroundColor: '#ffffff',
                color: '#b91c1c',
                textDecoration: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <Phone size={13} />
              <span>Call 112</span>
            </a>

            {/* Admin or Driver: Resolve SOS */}
            {(isAdmin || isDriver) && (
              <button
                onClick={handleResolve}
                disabled={isResolving}
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.9)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isResolving ? 'Resolving...' : 'Resolve'}</span>
              </button>
            )}

            {/* Dismiss local view */}
            <button
              onClick={() => dismissSosAlert(alert.id)}
              title="Acknowledge & Hide Banner"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: '6px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Collapsible Details */}
        {alert.location && (
          <div style={{
            marginTop: '0.6rem',
            paddingTop: '0.55rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            opacity: 0.95
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={13} />
              <span>
                Coordinates: {alert.location.lat?.toFixed(5)}, {alert.location.lng?.toFixed(5)}
                {alert.senderName && ` • Reported by: ${alert.senderName} (${alert.senderRole || 'User'})`}
              </span>
            </div>

            {onNavigateToBus && alert.busId && (
              <button
                onClick={() => onNavigateToBus(alert.busId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Track on Map →
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
