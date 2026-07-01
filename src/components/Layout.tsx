/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Bell,
  Sun,
  Moon,
  Smartphone,
  Check,
  Download,
  Monitor
} from 'lucide-react';

// Dynamic Icon Component
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle className={className} />;
  return <IconComponent className={className} />;
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    activeModuleId,
    setActiveModuleId,
    theme,
    toggleTheme,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    searchQuery,
    setSearchQuery,
    logout,
    modules,
    notifications,
    markNotificationAsRead,
    platformSettings,
    deferredPrompt,
    installApp
  } = useApp();

  const [notifMenuOpen, setNotifMenuOpen] = React.useState(false);

  // Filtrer les modules autorisés pour le rôle de l'utilisateur connecté
  const userRole = currentUser?.role || 'client';
  const allowedModules = modules.filter(m =>
    m.enabled && (m.rolesAllowed.includes(userRole) || m.rolesAllowed.includes('all'))
  );

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-800 dark:text-slate-200">
      {/* 1. SIDEBAR (NAVIGATION LATÉRALE REPLIABLE) */}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800/80 shrink-0 z-40 hidden md:flex flex-col justify-between transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex flex-col flex-1">
          {/* Logo Section */}
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2.5 min-w-0"
              >
                <div className="p-1.5 bg-emerald-600 text-white rounded-xl shrink-0 w-8 h-8 flex items-center justify-center">
                  {platformSettings.siteIconUrl ? (
                    <img 
                      src={platformSettings.siteIconUrl} 
                      alt="Logo" 
                      className="w-5 h-5 object-contain rounded" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <span className="font-extrabold font-display text-slate-900 dark:text-white tracking-tight text-sm truncate max-w-[110px] uppercase">
                  {platformSettings.siteName}
                </span>
              </motion.div>
            )}

            {sidebarCollapsed && (
              <div className="p-1.5 bg-emerald-600 text-white rounded-xl mx-auto w-8 h-8 flex items-center justify-center">
                {platformSettings.siteIconUrl ? (
                  <img 
                    src={platformSettings.siteIconUrl} 
                    alt="Logo" 
                    className="w-5 h-5 object-contain rounded" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Smartphone className="w-5 h-5" />
                )}
              </div>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {allowedModules.map(m => {
              const isActive = activeModuleId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModuleId(m.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all font-semibold text-xs cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <DynamicIcon name={m.icon} className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate flex items-center justify-between w-full">
                      <span>{m.name}</span>
                      {m.future && (
                        <span className="text-[8px] uppercase font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded-full">
                          +
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / LogOut */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser?.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Bonjour,</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.displayName}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors border border-rose-100/50 dark:border-rose-950/20"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer flex items-center justify-center mx-auto transition-colors border border-rose-100/50 dark:border-rose-950/20"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. MOBILE HEADER & MOBILE MENU */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between px-4 md:px-6 relative z-30">
          <div className="flex items-center gap-3 w-full max-w-md">
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Instant Search Bar (Recherche instantanée) */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher client, commune, agent..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200/60 dark:border-slate-850 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 md:gap-4 ml-4">
            {/* PWA Install Button */}
            <button
              id="pwa-install-header-btn"
              onClick={installApp}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                deferredPrompt 
                  ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 animate-pulse'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Installer l'application CRM sur cet appareil"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installer l'application</span>
              {deferredPrompt && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                </span>
              )}
            </button>

            {/* theme toggle quick access */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notification drop menu */}
            <div className="relative">
              <button
                onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
                )}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white">Alertes Logistiques</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">{unreadNotifsCount} non lues</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-slate-400">Aucun message.</p>
                    ) : (
                      notifications.slice(0, 4).map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            setNotifMenuOpen(false);
                          }}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                            n.read
                              ? 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-850/40 text-slate-400'
                              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200 font-medium'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>}
                          </div>
                          <p className="line-clamp-2 leading-relaxed text-[11px]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User display badge for MD screen */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs uppercase border border-emerald-200/20">
                {currentUser?.displayName.charAt(0)}
              </div>
              <div className="min-w-0 max-w-[120px]">
                <p className="text-[10px] text-slate-400 font-medium">Bonjour,</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.displayName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              className="relative w-64 max-w-xs bg-white dark:bg-slate-900 h-full flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 p-4"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold font-display text-emerald-600 dark:text-emerald-400">PENTA GAD</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {allowedModules.map(m => {
                    const isActive = activeModuleId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setActiveModuleId(m.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all font-semibold text-xs cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <DynamicIcon name={m.icon} className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser?.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Bonjour,</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser?.displayName}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-2 border border-rose-100/50"
                >
                  <LogOut className="w-4 h-4" /> Se déconnecter
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. CORE VIEWS SWITCHBOARD CONTAINER */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
