import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from './Icons';

const Navbar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { isAuthenticated, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => { logout(); navigate('/'); };

  const portalPath = role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : role === 'student' ? '/student' : '/login';
  const isActive   = (path) => location.pathname === path;
  const onPortal   = ['/admin', '/staff', '/student'].includes(location.pathname);
  const light      = theme === 'light';

  const linkColor  = (active) => active ? (light ? '#0f172a' : '#fff') : (light ? '#475569' : '#94a3b8');
  const linkBg     = (active) => active ? (light ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.15)') : 'transparent';

  return (
    <nav
      className="misched-navbar"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        paddingTop: 'env(safe-area-inset-top)',
        background: light ? 'rgba(240,244,255,0.85)' : 'rgba(10,10,20,0.8)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.75rem', padding: '0 1rem' }}>

        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <img
            src="/images/logo.png"
            alt="MiSched logo"
            style={{ height: '2.25rem', width: 'auto', display: 'block' }}
          />
          <span style={{ fontSize: '1.2rem', fontWeight: '800', background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MiSched</span>
        </Link>

        {/* Nav links + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {/* Hide text nav links on mobile — portal pages have their own nav */}
          <Link to="/" className="hidden sm:inline-flex" style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: linkColor(isActive('/')), background: linkBg(isActive('/')), transition: 'all 0.2s ease' }}>
            Home
          </Link>
          <Link to={isAuthenticated ? portalPath : '/login'} className="hidden sm:inline-flex" style={{ textDecoration: 'none', padding: '0.45rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: linkColor(onPortal), background: linkBg(onPortal), transition: 'all 0.2s ease' }}>
            Portal
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={light ? 'Switch to dark mode' : 'Switch to light mode'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '2.25rem', height: '2.25rem',
              borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
              background: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)',
              color: light ? '#475569' : '#94a3b8',
              transition: 'all 0.2s ease',
            }}
          >
            {light ? <MoonIcon size={17} /> : <SunIcon size={17} />}
          </button>

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              style={{ padding: '0.45rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}
            >Logout</button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
