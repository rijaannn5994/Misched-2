import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const CookieBanner = () => {
  const { theme } = useTheme();
  const light = theme === 'light';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem('misched-cookies');
    if (!choice) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('misched-cookies', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('misched-cookies', 'declined');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'calc(100% - 2rem)',
            maxWidth: '720px',
            background: light
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(15,15,30,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '1.25rem',
            boxShadow: light
              ? '0 8px 32px rgba(0,0,0,0.12)'
              : '0 8px 32px rgba(0,0,0,0.5)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Cookie icon */}
          <div style={{
            flexShrink: 0,
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(6,182,212,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
          }}>
            🍪
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              fontWeight: '600',
              color: light ? '#0f172a' : '#f1f5f9',
              marginBottom: '0.2rem',
            }}>
              We use cookies
            </p>
            <p style={{
              margin: 0,
              fontSize: '0.8rem',
              color: light ? '#64748b' : '#94a3b8',
              lineHeight: '1.5',
            }}>
              MiSched uses localStorage to keep you signed in, remember your theme preference, and track notification state. No data is shared with third parties.
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
            <button
              onClick={decline}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.6rem',
                border: `1px solid ${light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
                background: 'transparent',
                color: light ? '#64748b' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.15s ease',
              }}
            >
              Decline
            </button>
            <button
              onClick={accept}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              Accept All
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
