import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentView from './views/StudentView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import LegalModal from './components/LegalModal';
import CookieBanner from './components/CookieBanner';
import SplashScreen from './components/SplashScreen';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState('driver'); // default to driver
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('hopspot_splash_viewed');
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem('hopspot_splash_viewed', 'true');
    setShowSplash(false);
  };

  const handleOpenLegal = (tab = 'privacy') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  useEffect(() => {
    if (user?.role) {
      setActiveRole(user.role);
    }
  }, [user]);

  // Global event listener for child components or footer links to open legal center
  useEffect(() => {
    const handleGlobalLegalEvent = (e) => {
      const tab = e?.detail?.tab || 'privacy';
      handleOpenLegal(tab);
    };
    window.addEventListener('open-legal-modal', handleGlobalLegalEvent);
    return () => window.removeEventListener('open-legal-modal', handleGlobalLegalEvent);
  }, []);

  const showNavbar = Boolean(user) && activeRole !== 'admin';

  return (
    <div className="app-container">
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      {showNavbar && (
        <Navbar 
          activeRole={activeRole} 
          setActiveRole={setActiveRole} 
          onOpenLegal={handleOpenLegal} 
        />
      )}
      
      <main className={!user ? "main-content login-layout-main" : activeRole === 'admin' ? "main-content admin-layout-main" : activeRole === 'student' ? "main-content student-layout-main" : "main-content"}>
        {!user ? (
          <LoginView onOpenLegal={handleOpenLegal} />
        ) : (
          <>
            {activeRole === 'student' && <StudentView activeRole={activeRole} setActiveRole={setActiveRole} onOpenLegal={handleOpenLegal} />}
            {activeRole === 'driver' && <DriverView activeRole={activeRole} setActiveRole={setActiveRole} onOpenLegal={handleOpenLegal} />}
            {activeRole === 'admin' && <AdminView activeRole={activeRole} setActiveRole={setActiveRole} onOpenLegal={handleOpenLegal} />}
          </>
        )}
      </main>

      {/* Global GDPR/CCPA Cookie Consent Banner */}
      <CookieBanner onOpenLegal={handleOpenLegal} />

      {/* Global Interactive Legal Modal (Privacy Policy, Terms, Cookies) */}
      <LegalModal 
        isOpen={isLegalModalOpen} 
        onClose={() => setIsLegalModalOpen(false)} 
        initialTab={legalModalTab} 
      />
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
