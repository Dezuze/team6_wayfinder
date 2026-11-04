import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hopspot-auth-user') || localStorage.getItem('campusbus-auth-user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed?.token || !isTokenValid(parsed.token)) {
        localStorage.removeItem('hopspot-auth-user');
        localStorage.removeItem('campusbus-auth-user');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hopspot-auth-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hopspot-auth-user');
      localStorage.removeItem('campusbus-auth-user');
    }
  }, [user]);

  const login = async (username, password, role) => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const payload = { username: (username || '').trim(), password: (password || '').trim() };
      if (role) payload.role = role;
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        const authedUser = {
          ...data.user,
          token: data.token || data.user?.token
        };
        setUser(authedUser);
        setIsLoading(false);
        return { success: true, user: authedUser };
      } else {
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error connecting to authentication server');
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
