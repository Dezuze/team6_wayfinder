import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusbus-auth-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('campusbus-auth-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('campusbus-auth-user');
    }
  }, [user]);

  const login = async (username, password, role) => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setIsLoading(false);
        return { success: true, user: data.user };
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
