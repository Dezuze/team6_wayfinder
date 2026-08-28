import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentView from './views/StudentView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState('driver'); // default to driver for our focus

  useEffect(() => {
    if (user?.role) {
      setActiveRole(user.role);
    }
  }, [user]);

  const showNavbar = activeRole !== 'admin' && activeRole !== 'driver';

  return (
    <div className="app-container">
      {showNavbar && <Navbar activeRole={activeRole} setActiveRole={setActiveRole} />}
      
      <main className={activeRole === 'admin' ? "main-content admin-layout-main" : "main-content"}>
        {!user ? (
          <LoginView />
        ) : (
          <>
            {activeRole === 'student' && <StudentView activeRole={activeRole} setActiveRole={setActiveRole} />}
            {activeRole === 'driver' && <DriverView activeRole={activeRole} setActiveRole={setActiveRole} />}
            {activeRole === 'admin' && <AdminView activeRole={activeRole} setActiveRole={setActiveRole} />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <AppContent />
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
