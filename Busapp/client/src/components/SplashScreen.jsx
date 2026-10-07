import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for exactly 1 second, then trigger smooth fade transition
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100dvh',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 40%, #151a36 0%, #090d16 65%, #04060a 100%)',
            color: '#ffffff',
            zIndex: 9999999,
            margin: 0,
            padding: '1.5rem',
            boxSizing: 'border-box',
            overflow: 'hidden',
            pointerEvents: 'none'
          }}
        >
          {/* Ambient Glowing Orbs according to logo palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.25, scale: 1.1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: '380px',
              height: '380px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, rgba(124, 58, 237, 0.2) 45%, transparent 70%)',
              filter: 'blur(50px)',
              pointerEvents: 'none'
            }}
          />

          {/* Logo with pulsing aura */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.4, 0.75, 0.4]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{
                position: 'absolute',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 229, 255, 0.4) 0%, rgba(124, 58, 237, 0.3) 50%, transparent 70%)',
                filter: 'blur(20px)'
              }}
            />
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 280, damping: 22 }}
              src="/logo.png"
              alt="HopSpot Logo"
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 12px 35px rgba(0, 229, 255, 0.35)',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* App Title */}
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              margin: 0,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #00e5ff 0%, #ffffff 50%, #76ff03 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
          >
            HopSpot
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            style={{
              fontSize: '0.82rem',
              color: '#94a3b8',
              margin: '0.5rem 0 1.6rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Smart Campus Transit
          </motion.p>

          {/* Precise 1-Second Progress Indicator Bar */}
          <div style={{
            width: '140px',
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.0, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00e5ff, #76ff03, #7c3aed)',
                borderRadius: '999px',
                boxShadow: '0 0 8px rgba(0, 229, 255, 0.7)'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
