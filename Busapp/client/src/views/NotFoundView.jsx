import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Home, MapPin, ArrowLeft, Bus } from 'lucide-react';

export default function NotFoundView({ onGoHome }) {
  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      boxSizing: 'border-box',
      background: 'radial-gradient(circle at 50% 30%, #171b38 0%, #090d16 70%, #05070d 100%)',
      color: '#ffffff',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glowing Ambient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [-20, 20, -20],
          y: [-15, 15, -15]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '15%',
          left: '18%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none'
        }}
      />
      <motion.div
        animate={{
          scale: [1.1, 0.9, 1.1],
          x: [20, -20, 20],
          y: [15, -15, 15]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '18%',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(118, 255, 3, 0.16) 0%, transparent 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', damping: 25, stiffness: 220 }}
        style={{
          position: 'relative',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2.25rem',
          borderRadius: '28px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 229, 255, 0.1)',
          zIndex: 10
        }}
      >
        {/* Animated 404 Route Illustration */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '2px dashed rgba(0, 229, 255, 0.35)'
            }}
          />
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(118, 255, 3, 0.2) 100%)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(0, 229, 255, 0.3)'
          }}>
            <Compass size={42} color="#00e5ff" />
          </div>
        </div>

        {/* 404 Large Title */}
        <h1 style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          margin: 0,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          background: 'linear-gradient(135deg, #00e5ff 0%, #ffffff 50%, #76ff03 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          margin: '0.6rem 0 0.5rem',
          color: '#ffffff'
        }}>
          Lost in Transit — Stop Not Found
        </h2>

        <p style={{
          fontSize: '0.9rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: '0 auto 2rem',
          maxWidth: '380px'
        }}>
          The route, page, or campus terminal you're looking for doesn't exist or may have been re-routed.
        </p>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleHome}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '14px',
              fontWeight: 700,
              fontSize: '0.92rem',
              background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
              color: '#04101e',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              boxShadow: '0 8px 25px rgba(0, 229, 255, 0.4)'
            }}
          >
            <Home size={18} />
            Return to HopSpot Live Radar
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
