import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 1.2s then fade out smoothly
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            width: '100%',
            height: '100vh',
            height: '100dvh',
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 38%, #1e1b4b 0%, #090d16 65%, #05070d 100%)',
            color: '#ffffff',
            zIndex: 9999999,
            margin: 0,
            padding: '1.5rem',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          {/* Logo with pulsing aura */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.65, 0.35]
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{
                position: 'absolute',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)',
                filter: 'blur(16px)'
              }}
            />
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
              src="/logo.png"
              alt="HopSpot Logo"
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 12px 35px rgba(124, 58, 237, 0.5)',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* App Title */}
          <motion.h1
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              margin: 0,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #c4b5fd 0%, #ffffff 60%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Outfit', 'Inter', sans-serif"
            }}
          >
            HopSpot
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            style={{
              fontSize: '0.85rem',
              color: '#a5b4fc',
              margin: '0.6rem 0 1.5rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Smart Campus Transit
          </motion.p>

          {/* Loading Dots Indicator */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[0, 0.2, 0.4].map((delay, idx) => (
              <motion.div
                key={idx}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.35, 1, 0.35]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay
                }}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: idx === 0 ? '#8b5cf6' : idx === 1 ? '#a78bfa' : '#c4b5fd'
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
