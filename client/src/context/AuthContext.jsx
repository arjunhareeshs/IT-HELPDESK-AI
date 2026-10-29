import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USERS } from '../data/mockData';

const AuthContext = createContext(null);

const STORAGE_KEY = 'helpdesk_ai_demo_session';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authProvider, setAuthProvider] = useState(null); // 'direct' | 'google' | 'registered'
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Initialize session from storage (strictly non-sensitive demo session flag and profile)
  useEffect(() => {
    try {
      const localSession = localStorage.getItem(STORAGE_KEY);
      const sessionSession = sessionStorage.getItem(STORAGE_KEY);
      const raw = localSession || sessionSession;

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user) {
          setCurrentUser(parsed.user);
          setAuthProvider(parsed.authProvider || 'direct');
        }
      }
    } catch (err) {
      console.warn('Failed to parse demo session from storage', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  /**
   * Demo Sign-in using email and password
   * NOTE: No real credentials or passwords are saved or validated against a backend.
   */
  const loginWithDemo = async (email, password, rememberMe = false) => {
    // Artificial network delay for realistic Google-like experience
    await new Promise(resolve => setTimeout(resolve, 600));

    // Lookup matching predefined demo profile, or synthesize a demonstration profile
    const matchedUser = DEMO_USERS.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    const userProfile = matchedUser || {
      id: `user_demo_${Date.now()}`,
      role: 'student',
      roleLabel: 'Student',
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Demo User',
      email: email.trim(),
      title: 'Demo HelpDesk Member',
      department: 'Campus User Community',
      avatarBg: '#8E1EA2',
      avatarInitials: email.substring(0, 2).toUpperCase()
    };

    setCurrentUser(userProfile);
    setAuthProvider('direct');

    const sessionPayload = JSON.stringify({
      user: userProfile,
      authProvider: 'direct',
      loginTime: new Date().toISOString()
    });

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, sessionPayload);
    } else {
      sessionStorage.setItem(STORAGE_KEY, sessionPayload);
    }

    showToast(`Signed in successfully as ${userProfile.name} (${userProfile.roleLabel})`, 'success');
    return { success: true, user: userProfile };
  };

  /**
   * Simulated Google Sign-In
   * Transparently informs user that this is a simulated frontend OAuth flow.
   */
  const loginWithGoogle = async (selectedUser = null) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = selectedUser || DEMO_USERS[0]; // Default to Student or chosen profile
    const googleProfile = {
      ...user,
      googleConnected: true
    };

    setCurrentUser(googleProfile);
    setAuthProvider('google');

    const sessionPayload = JSON.stringify({
      user: googleProfile,
      authProvider: 'google',
      loginTime: new Date().toISOString()
    });

    // Default to remember in session
    sessionStorage.setItem(STORAGE_KEY, sessionPayload);

    showToast(`Signed in with Google Workspace: Welcome, ${googleProfile.name}!`, 'success');
    return { success: true, user: googleProfile };
  };

  /**
   * Account Registration
   */
  const registerDemoAccount = async ({ fullName, email, password, role = 'student' }) => {
    await new Promise(resolve => setTimeout(resolve, 700));

    const roleMap = {
      student: 'Student',
      staff: 'Staff',
      technician: 'IT Technician',
      admin: 'Administrator'
    };

    const newProfile = {
      id: `user_reg_${Date.now()}`,
      role,
      roleLabel: roleMap[role] || 'Student',
      name: fullName.trim(),
      email: email.trim(),
      title: `${roleMap[role]} Member`,
      department: 'University Community',
      avatarBg: '#C654C3',
      avatarInitials: fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DU'
    };

    setCurrentUser(newProfile);
    setAuthProvider('registered');

    const sessionPayload = JSON.stringify({
      user: newProfile,
      authProvider: 'registered',
      loginTime: new Date().toISOString()
    });
    sessionStorage.setItem(STORAGE_KEY, sessionPayload);

    showToast(`Account created successfully! Welcome, ${newProfile.name}.`, 'success');
    return { success: true, user: newProfile };
  };

  /**
   * Switch Active Role (Ideal for live demonstration across all 4 roles)
   */
  const switchRole = (roleKey) => {
    const targetUser = DEMO_USERS.find(u => u.role === roleKey);
    if (targetUser) {
      setCurrentUser(targetUser);
      const sessionPayload = JSON.stringify({
        user: targetUser,
        authProvider,
        loginTime: new Date().toISOString()
      });
      if (localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, sessionPayload);
      } else {
        sessionStorage.setItem(STORAGE_KEY, sessionPayload);
      }
      showToast(`Switched active view to ${targetUser.roleLabel} (${targetUser.name})`, 'info');
    }
  };

  /**
   * Sign Out
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setAuthProvider(null);
    showToast('You have been signed out.', 'info');
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    authProvider,
    loading,
    toastMessage,
    showToast,
    loginWithDemo,
    loginWithGoogle,
    registerDemoAccount,
    switchRole,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
