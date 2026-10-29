import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import Footer from './components/Footer';
import NotificationToast from './components/NotificationToast';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  // Route State: 'login' | 'register' | 'forgot-password' | 'dashboard'
  const [currentRoute, setCurrentRoute] = useState('login');
  const [returnUrl, setReturnUrl] = useState(null);

  // Sync route with URL Hash & Route Guard
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();

      if (hash.startsWith('#/register')) {
        setCurrentRoute('register');
      } else if (hash.startsWith('#/forgot-password')) {
        setCurrentRoute('forgot-password');
      } else if (hash.startsWith('#/dashboard') || hash.startsWith('#/tickets') || hash.startsWith('#/triage') || hash.startsWith('#/analytics') || hash.startsWith('#/knowledge')) {
        // Route Guard check
        if (!isAuthenticated && !loading) {
          // Protected route accessed without demo session -> redirect to login with returnUrl
          setReturnUrl(window.location.hash);
          window.location.hash = '#/login';
          setCurrentRoute('login');
        } else {
          setCurrentRoute('dashboard');
        }
      } else {
        // Default route
        if (isAuthenticated) {
          setCurrentRoute('dashboard');
          if (!window.location.hash || window.location.hash === '#/login') {
            window.location.hash = '#/dashboard';
          }
        } else {
          setCurrentRoute('login');
          if (!window.location.hash) {
            window.location.hash = '#/login';
          }
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, loading]);

  // Navigate helper
  const navigateTo = (routeName) => {
    setCurrentRoute(routeName);
    window.location.hash = `#/${routeName}`;
    if (routeName === 'dashboard') {
      setReturnUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner-large" />
        <p style={{ marginTop: '16px', color: '#8E1EA2', fontWeight: 600 }}>Loading HelpDesk AI...</p>
      </div>
    );
  }

  // Render appropriate view
  return (
    <div className="app-root-container">
      <NotificationToast />

      {currentRoute === 'dashboard' && isAuthenticated ? (
        <DashboardPage />
      ) : (
        <div className="auth-viewport-wrapper">
          {currentRoute === 'login' && (
            <LoginPage onNavigate={navigateTo} returnUrl={returnUrl} />
          )}
          {currentRoute === 'register' && (
            <RegisterPage onNavigate={navigateTo} />
          )}
          {currentRoute === 'forgot-password' && (
            <ForgotPasswordPage onNavigate={navigateTo} />
          )}
        </div>
      )}
    </div>
  );
}
