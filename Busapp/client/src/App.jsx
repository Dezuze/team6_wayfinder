import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentView from './views/StudentView';
import DriverView from './views/DriverView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import NotFoundView from './views/NotFoundView';
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
  const [showSplash, setShowSplash] = useState(true);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleOpenLegal = (tab = 'privacy') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
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

  // Check if current route is a 404
  const normalizedPath = currentPath.toLowerCase().replace(/\/+$/, '') || '/';
  const knownPaths = ['/', '/login', '/index.html', '/student', '/driver', '/admin'];
  const is404 = !knownPaths.includes(normalizedPath);

  if (is404) {
    return (
      <div className="app-container">
        <NotFoundView onGoHome={handleGoHome} />
      </div>
    );
  }

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
