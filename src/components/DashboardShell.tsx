import {
  Bell,
  Languages,
  LogOut,
  Menu,
  Search,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { AuthUser, NotificationItem } from '../types';
import { StatusIndicator, formatTimestamp } from './StatusBadge';

export interface NavItem {
  id: string;
  label: string;
  labelHi?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface DashboardShellProps {
  user: AuthUser;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLogout: () => void;
  bilingual: boolean;
  onToggleBilingual: () => void;
  onOpenRequest?: (requestId: string) => void;
  unreadCount: number;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: number) => void;
  onMarkAllRead: () => void;
  children: React.ReactNode;
}

interface SearchResult {
  request_id: string;
  case_number: string;
  status: string;
  district_name: string;
  tehsil_name: string;
  village_name: string;
  court_name: string;
  patwari_name: string;
}

export function DashboardShell({
  user,
  title,
  subtitle,
  navItems,
  activeTab,
  onTabChange,
  onLogout,
  bilingual,
  onToggleBilingual,
  onOpenRequest,
  unreadCount,
  notifications,
  onMarkNotificationRead,
  onMarkAllRead,
  children
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      apiRequest<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          setSearchResults(res.results);
          setShowSearchDropdown(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const roleColor =
    user.role === 'COURT'
      ? 'bg-gradient-to-br from-[#0B1F3A] to-[#163859]'
      : user.role === 'PATWARI'
      ? 'bg-gradient-to-br from-[#064E3B] to-[#047857]'
      : 'bg-gradient-to-br from-[#1E293B] to-[#0F172A]';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="h-1 w-full bg-gradient-to-r from-[#C27803] via-[#0B1F3A] to-[#047857]" />
        <div className={`${roleColor} px-5 py-5 text-white`}>
          <p className="font-display text-sm font-bold tracking-wide">SHAHDOL DIVISION</p>
          <p className="mt-1 font-mono text-xs text-amber-200/90">{user.userId}</p>
          <p className="mt-0.5 truncate text-xs text-white/90">{user.name}</p>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#EEF3F9] text-[#0B1F3A] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {item.label}
                    {bilingual && item.labelHi ? ` / ${item.labelHi}` : ''}
                  </span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-2 rounded bg-rose-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{bilingual ? 'Logout / लॉग आउट' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 rounded p-1.5 text-white/90 hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display truncate text-base font-bold text-[#0F2942] sm:text-lg">
                  {title}
                </h1>
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              </div>
            </div>

            {/* Global Search + Controls */}
            <div className="flex flex-1 items-center justify-end gap-3 sm:max-w-md">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  placeholder="Search Request ID, Case No, Village, Patwari..."
                  className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#0F2942] focus:bg-white focus:outline-none"
                />

                {showSearchDropdown && (
                  <div className="absolute right-0 left-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-[11px] font-medium text-slate-500">
                      <span>{searching ? 'Searching...' : `${searchResults.length} matching records`}</span>
                      <button
                        type="button"
                        onClick={() => setShowSearchDropdown(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                    {searchResults.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-slate-500">
                        No case requests match &ldquo;{searchQuery}&rdquo;.
                      </div>
                    ) : (
                      searchResults.map((item) => (
                        <button
                          key={item.request_id}
                          type="button"
                          onClick={() => {
                            setShowSearchDropdown(false);
                            if (onOpenRequest) onOpenRequest(item.request_id);
                          }}
                          className="flex w-full items-start justify-between gap-2 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-[#0F2942]">
                              {item.request_id} · {item.case_number}
                            </p>
                            <p className="truncate text-xs text-slate-600">
                              {item.village_name}, {item.tehsil_name} ({item.district_name}) · {item.patwari_name}
                            </p>
                          </div>
                          <StatusIndicator status={item.status} />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onToggleBilingual}
                title="Toggle English / Hindi Labels"
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  bilingual
                    ? 'border-[#0F2942] bg-[#0F2942] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                <span>{bilingual ? 'EN + हिं' : 'EN'}</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('notifications')}
                className="relative rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 rounded bg-rose-600 px-1 font-mono text-[10px] font-bold text-white tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Viewport Body */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {activeTab === 'notifications' ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0F2942]">
                    In-System Notifications {bilingual ? '· सूचनाएं' : ''}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time alerts for request dispatches, Patwari report submissions, and correction requests.
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center ${
                        n.is_read ? 'opacity-75' : 'bg-blue-50/40 -mx-2 px-2 rounded'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F2942]">
                          <span>{n.title}</span>
                          {!n.is_read && <span className="font-mono text-[10px] text-blue-700">UNREAD</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{n.message}</p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400">
                          {formatTimestamp(n.created_at)} · Channel: {n.channel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.request_id && onOpenRequest && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!n.is_read) onMarkNotificationRead(n.id);
                              onOpenRequest(n.request_id!);
                            }}
                            className="rounded-md bg-[#0F2942] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163859] cursor-pointer"
                          >
                            Open {n.request_id}
                          </button>
                        )}
                        {!n.is_read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(n.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
