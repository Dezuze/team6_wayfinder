import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, User, ArrowRight } from 'lucide-react';

export default function LoginView() {
  const { login, demoLogin, error, isLoading } = useAuth();
  const [roleTab, setRoleTab] = useState('driver'); // driver, student, admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) return;
    await login(username, password, roleTab);
  };

  const handleRoleChange = (role) => {
    setRoleTab(role);
    setUsername('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      width: '100%'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring', damping: 25, stiffness: 200 }}
        className="clean-card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-xl)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            overflow: 'hidden'
          }}>
            <img src="/logo.png" alt="CampusBus Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Sign in to CampusBus
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Enter your credentials to access your portal
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="role-tabs" style={{ width: '100%', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <button
            type="button"
            onClick={() => handleRoleChange('driver')}
            className={`role-tab ${roleTab === 'driver' ? 'active' : ''}`}
            style={{ textAlign: 'center' }}
          >
            Driver
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('student')}
            className={`role-tab ${roleTab === 'student' ? 'active' : ''}`}
            style={{ textAlign: 'center' }}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`role-tab ${roleTab === 'admin' ? 'active' : ''}`}
            style={{ textAlign: 'center' }}
          >
            Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex-col gap-1">
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              fontSize: '0.825rem',
              fontWeight: 500,
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username or ID</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </motion.button>
        </form>

      </motion.div>
    </div>
  );
}
