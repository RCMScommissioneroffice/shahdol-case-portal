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
      <div className="min-h-screen bg-gradient-to-br from-white via-[#FAF9F5] to-[#EEF3F9] flex flex-col items-center justify-center p-6 text-center">
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />
        <div className="mb-4 h-16 w-16 rounded-xl border border-amber-200 bg-white p-1.5 shadow-sm">
          <img
            src="/assets/aistudio/images__1__a180929b.jpg"
            alt="Government of Madhya Pradesh Emblem"
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
          Welcome to RCMS Shahdol Division
        </h1>
        <p className="mt-1.5 text-xs font-semibold text-[#9A5B02] sm:text-sm">
          संभाग शहडोल — राजस्व न्यायालय एवं पटवारी ऑनलाइन प्रतिवेदन प्रणाली
        </p>
        <p className="mt-4 text-xs text-slate-500">Verifying portal session...</p>
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
