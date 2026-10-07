import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(5, 8, 16, 0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--bg-secondary, #111827)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              color: 'var(--text-primary, #f9fafb)',
              zIndex: 10
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onCancel}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #9ca3af)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {/* Icon Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                  {title}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(239, 68, 68, 0.9)', fontWeight: 500 }}>
                  Irreversible Action
                </p>
              </div>
            </div>

            {/* Message Body */}
            <p style={{
              fontSize: '0.9rem',
              lineHeight: 1.55,
              color: 'var(--text-secondary, #cbd5e1)',
              margin: '0 0 1.75rem'
            }}>
              {message}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
                }}
              >
                <Trash2 size={16} />
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
