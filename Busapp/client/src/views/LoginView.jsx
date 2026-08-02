import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, User, ArrowRight } from 'lucide-react';

export default function LoginView() {
  const { login, demoLogin, error, isLoading } = useAuth();
  const [roleTab, setRoleTab] = useState('driver'); // driver, student, admin
  const [username, setUsername] = useState('john.driver');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) return;
    await login(username, password, roleTab);
  };

  const handleRoleChange = (role) => {
    setRoleTab(role);
    if (role === 'driver') {
      setUsername('john.driver');
      setPassword('password123');
    } else if (role === 'student') {
      setUsername('S1001');
      setPassword('password');
    } else if (role === 'admin') {
      setUsername('admin');
      setPassword('adminpassword');
    }
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
      <div className="clean-card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-xl)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontWeight: 700
          }}>
            <Bus size={24} />
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

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Test Login Buttons */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
            Quick Demo Access
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => demoLogin('driver')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
            >
              Driver Demo
            </button>
            <button
              type="button"
              onClick={() => demoLogin('student')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
            >
              Student Demo
            </button>
            <button
              type="button"
              onClick={() => demoLogin('admin')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem', fontSize: '0.75rem' }}
            >
              Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
