import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Phone, 
  MapPin, 
  Radio, 
  X, 
  Check, 
  Loader2, 
  HeartPulse, 
  Wrench, 
  Shield, 
  Send,
  Bus as BusIcon,
  CheckCircle2
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { SOS_REASON_PRESETS, EMERGENCY_HOTLINES } from '../utils/sosEmergency';

export default function SosButton({ 
  variant = 'floating', // 'floating' | 'inline' | 'header'
  selectedBusId = null,
  customLabel = 'Emergency SOS',
  style = {}
}) {
  const { triggerSOS, resolveSOS, latestSosAlert, activeSosAlerts, buses } = useWebSocket();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Campus Security / Threat');
  const [customNote, setCustomNote] = useState('');
  const [targetBusId, setTargetBusId] = useState(selectedBusId || '');
  const [userCoords, setUserCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [pushedSuccess, setPushedSuccess] = useState(false);

  // Sync selectedBusId prop if provided
  useEffect(() => {
    if (selectedBusId) setTargetBusId(selectedBusId);
  }, [selectedBusId]);

  // Request browser geolocation when modal opens
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation warning in SOS:', err);
          // Fallback to campus coordinate
          setUserCoords({ lat: 9.67416, lng: 76.82573 });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  const activeAlert = activeSosAlerts?.find(a => 
    (targetBusId && a.busId === targetBusId) || 
    (user?.username && a.senderName === user.username)
  );

  const handlePushSos = async () => {
    setIsBroadcasting(true);
    const finalReason = customNote.trim() ? `${selectedReason}: ${customNote.trim()}` : selectedReason;
    
    try {
      await triggerSOS({
        busId: targetBusId || null,
        reason: finalReason,
        senderName: user?.name || user?.username || 'Student User',
        senderRole: user?.role || 'student',
        location: userCoords || { lat: 9.67416, lng: 76.82573 }
      });
      setPushedSuccess(true);
      setTimeout(() => {
        setPushedSuccess(false);
        setIsOpen(false);
      }, 1600);
    } catch (err) {
      console.error('Error triggering SOS push:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleResolveSos = async () => {
    if (!activeAlert) return;
    setIsBroadcasting(true);
    try {
      await resolveSOS(activeAlert.busId, activeAlert.id);
      setIsOpen(false);
    } catch (err) {
      console.error('Error resolving SOS:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <>
      {/* 1. BUTTON TRIGGER VARIANTS */}
      {variant === 'floating' && (
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(true)}
          className="pulse-sos-btn"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#dc2626',
            backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '50px',
            padding: '0.75rem 1.25rem',
            boxShadow: '0 8px 24px -2px rgba(220, 38, 38, 0.65), 0 0 0 4px rgba(239, 68, 68, 0.25)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 800,
            letterSpacing: '0.02em',
            ...style
          }}
          title="Emergency SOS - Push Distress Alert"
        >
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 8px #ffffff'
          }} className="pulse-sos-dot" />
          <AlertTriangle size={18} />
          <span>SOS</span>
        </motion.button>
      )}

      {variant === 'inline' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.1rem',
            borderRadius: '10px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            ...style
          }}
        >
          <AlertTriangle size={16} />
          <span>{customLabel}</span>
        </motion.button>
      )}

      {variant === 'header' && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            ...style
          }}
          title="Push Emergency SOS"
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ef4444'
          }} className="pulse-sos-dot" />
          <AlertTriangle size={14} />
          <span>SOS</span>
        </motion.button>
      )}

      {/* 2. INTERACTIVE SOS MODAL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e4e4e7)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '92dvh',
                overflowY: 'auto',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                padding: '1.5rem',
                color: 'var(--text-primary, #09090b)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'var(--bg-subtle, #f4f4f5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #71717a)'
                }}
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#dc2626' }}>
                    Emergency SOS Assistance
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                    Instantly broadcast your distress alert to campus control & security.
                  </p>
                </div>
              </div>

              {/* Status Notice */}
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                padding: '0.75rem 0.9rem',
                marginBottom: '1.25rem',
                fontSize: '0.78rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#b91c1c' }}>
                  <Radio size={15} />
                  <span>Push Broadcast Network Ready</span>
                </div>
                <div style={{ color: 'var(--text-secondary, #64748b)' }}>
                  Location: {isLocating ? 'Detecting GPS...' : userCoords ? `${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)} (Campus GPS)` : 'Campus Region'}
                </div>
              </div>

              {/* Select Reason */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #64748b)' }}>
                  SELECT NATURE OF EMERGENCY:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {SOS_REASON_PRESETS.map((preset) => {
                    const isSelected = selectedReason === preset.label;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedReason(preset.label)}
                        style={{
                          textAlign: 'left',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #dc2626' : '1px solid var(--border-color, #e4e4e7)',
                          backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-subtle, #fafafa)',
                          color: isSelected ? '#dc2626' : 'var(--text-primary, #09090b)',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {preset.label}
                        </span>
                        {isSelected && <Check size={14} color="#dc2626" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Associated Bus / Route (Optional) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-secondary, #64748b)' }}>
                  ASSOCIATED BUS / SHUTTLE (OPTIONAL):
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={targetBusId}
                    onChange={(e) => setTargetBusId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color, #e4e4e7)',
                      backgroundColor: 'var(--bg-subtle, #fafafa)',
                      color: 'var(--text-primary, #09090b)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    <option value="">-- No Specific Bus (Campus General SOS) --</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number || `Bus #${b.id}`} {b.driverName ? `• Driver: ${b.driverName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Note Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-secondary, #64748b)' }}>
                  ADDITIONAL DETAILS / LANDMARK:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Science Block stop, student requires assistance..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #e4e4e7)',
                    backgroundColor: 'var(--bg-subtle, #fafafa)',
                    color: 'var(--text-primary, #09090b)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Big PUSH SOS Action Button */}
              {pushedSuccess ? (
                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 800,
                  fontSize: '0.95rem'
                }}>
                  <CheckCircle2 size={20} />
                  <span>SOS ALERT PUSHED & BROADCASTED!</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePushSos}
                    disabled={isBroadcasting}
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      borderRadius: '12px',
                      backgroundColor: '#dc2626',
                      backgroundImage: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 8px 20px -3px rgba(220, 38, 38, 0.5)'
                    }}
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        <span>BROADCASTING SOS SIGNAL...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={18} />
                        <span>PUSH EMERGENCY SOS NOW</span>
                      </>
                    )}
                  </motion.button>

                  {/* If there's an active alert already, provide resolve button */}
                  {activeAlert && (
                    <button
                      type="button"
                      onClick={handleResolveSos}
                      disabled={isBroadcasting}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '10px',
                        border: '1px solid #16a34a',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Safe Now? Click to Resolve Emergency
                    </button>
                  )}
                </div>
              )}

              {/* Direct Emergency Hotlines */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color, #e4e4e7)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginBottom: '0.6rem' }}>
                  DIRECT 1-TAP EMERGENCY CALLS:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {EMERGENCY_HOTLINES.map((hotline, idx) => (
                    <a
                      key={idx}
                      href={hotline.tel}
                      style={{
                        textDecoration: 'none',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: hotline.primary ? 'var(--bg-subtle, #f4f4f5)' : 'transparent',
                        border: '1px solid var(--border-color, #e4e4e7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        color: 'var(--text-primary, #09090b)',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      <Phone size={13} color={hotline.primary ? '#dc2626' : 'var(--text-secondary, #64748b)'} />
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{hotline.label}</div>
                        <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.78rem' }}>{hotline.number}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
