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
      const res = await fetch('/api/login', {
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

  const demoLogin = (role) => {
    if (role === 'driver') {
      setUser({
        id: "driver-1",
        username: "john.driver",
        name: "John Doe",
        role: "driver",
        assignedBusId: "bus-101",
        phone: "+1-555-0101"
      });
    } else if (role === 'admin') {
      setUser({
        id: "admin-1",
        username: "admin",
        name: "Head Campus Administrator",
        role: "admin"
      });
    } else {
      setUser({
        id: "S1001",
        username: "S1001",
        name: "Alex Mercer",
        role: "student",
        email: "alex.mercer@student.edu"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, demoLogin, error, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
