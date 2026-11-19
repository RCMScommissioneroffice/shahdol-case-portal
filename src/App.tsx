import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, clearAuthToken, setUnauthorizedHandler } from './api';
import { AdminDashboard } from './components/AdminDashboard';
import { CourtDashboard } from './components/CourtDashboard';
import { LandingPage } from './components/LandingPage';
import { LoginView } from './components/LoginView';
import { PatwariDashboard } from './components/PatwariDashboard';
import { RegistrationView } from './components/RegistrationView';
import type { AuthUser, NotificationItem, UserRole } from './types';

type ViewMode = 'landing' | 'login' | 'register' | 'dashboard';

export default function App() {
  const [view, setView] = useState<ViewMode>('landing');
  const [loginDefaultRole, setLoginDefaultRole] = useState<UserRole>('COURT');
  const [prefillUserId, setPrefillUserId] = useState('');
  const [registerDefaultType, setRegisterDefaultType] = useState<'COURT' | 'PATWARI' | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bilingual, setBilingual] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiRequest<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications);
      setUnreadCount(res.notifications.filter((n) => n.is_read === 0).length);
    } catch {
      // ignore if logged out
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      setView('login');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    apiRequest<{ user: AuthUser; unreadNotifications: number }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        setUnreadCount(res.unreadNotifications);
        setView('dashboard');
        fetchNotifications();
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setBootstrapping(false));
  }, [fetchNotifications]);

  async function handleLogout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthToken();
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    setView('landing');
  }

  async function handleMarkNotificationRead(id: number) {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await fetchNotifications();
  }

  async function handleMarkAllRead() {
    await apiRequest('/api/notifications/read-all', { method: 'POST' });
    await fetchNotifications();
  }

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading Shahdol Division Portal...
      </div>
    );
  }

  if (view === 'dashboard' && user) {
    if (user.role === 'COURT') {
      return (
        <CourtDashboard
          user={user}
          bilingual={bilingual}
          onToggleBilingual={() => setBilingual((b) => !b)}
          onLogout={handleLogout}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllRead}
          onRefreshNotifications={fetchNotifications}
        />
      );
    }

    if (user.role === 'PATWARI') {
      return (
        <PatwariDashboard
          user={user}
          bilingual={bilingual}
          onToggleBilingual={() => setBilingual((b) => !b)}
          onLogout={handleLogout}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllRead}
          onRefreshNotifications={fetchNotifications}
        />
      );
    }

    return (
      <AdminDashboard
        user={user}
        bilingual={bilingual}
        onToggleBilingual={() => setBilingual((b) => !b)}
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllRead}
      />
    );
  }

  if (view === 'register') {
    return (
      <RegistrationView
        initialType={registerDefaultType}
        onBackHome={() => setView('landing')}
        onProceedToLogin={(role, uid) => {
          setLoginDefaultRole(role);
          setPrefillUserId(uid || '');
          setView('login');
        }}
      />
    );
  }

  if (view === 'login') {
    return (
      <LoginView
        defaultRole={loginDefaultRole}
        prefillUserId={prefillUserId}
        onBackHome={() => setView('landing')}
        onGoRegister={() => {
          setRegisterDefaultType(null);
          setView('register');
        }}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setView('dashboard');
          fetchNotifications();
        }}
      />
    );
  }

  return (
    <LandingPage
      onGoLogin={(role) => {
        setLoginDefaultRole(role || 'COURT');
        setPrefillUserId('');
        setView('login');
      }}
      onGoRegister={(type) => {
        setRegisterDefaultType(type || null);
        setView('register');
      }}
    />
  );
}
