/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/LoginView';
import { ClientRegistrationView } from './components/ClientRegistrationView';
import { Layout } from './components/Layout';
import { DashboardView } from './modules/DashboardView';
import { ClientsView } from './modules/ClientsView';
import { TontinesView } from './modules/TontinesView';
import { KitsView } from './modules/KitsView';
import { DeliveriesView } from './modules/DeliveriesView';
import { UsersView } from './modules/UsersView';
import { SettingsView } from './modules/SettingsView';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, ShieldAlert, Settings } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, activeModuleId, modules, loading } = useApp();

  const isRegisterRoute = window.location.search.includes('register=true') || window.location.hash === '#register';

  if (isRegisterRoute) {
    return <ClientRegistrationView />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-4 font-semibold uppercase tracking-wider">Connexion sécurisée en cours...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  // Router Switchboard
  const renderActiveModule = () => {
    switch (activeModuleId) {
      case 'dashboard':
        return <DashboardView />;
      case 'clients':
        return <ClientsView />;
      case 'tontine':
        return <TontinesView />;
      case 'kits':
        return <KitsView />;
      case 'deliveries':
        return <DeliveriesView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        // Pour les modules futurs enregistrés dynamiquement dans le registre (ex: Comptabilité, Stocks, SAV)
        const customModule = modules.find(m => m.id === activeModuleId);
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm text-center max-w-xl mx-auto space-y-4 font-sans text-xs"
          >
            <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-2">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
              Service ERP : {customModule ? customModule.name : "Nouveau Service"}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full font-semibold">
              <CheckBadgeIcon className="w-4 h-4" /> Intégré et pré-enregistré
            </div>
            <p className="text-slate-500 leading-relaxed px-4">
              Le service **{customModule ? customModule.name : "Nouveau"}** est enregistré avec succès dans l'architecture ERP modulaire de Penta GAD Distribution. 
              {customModule?.description && <span className="block mt-2 italic">"{customModule.description}"</span>}
            </p>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-left space-y-2">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Spécifications techniques du module :</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">ID Module</span>
                  <strong className="font-mono">{activeModuleId}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Icône Lucide</span>
                  <strong className="font-mono">{customModule?.icon || "Default"}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 col-span-2">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Rôles autorisés dans Firestore</span>
                  <strong>{customModule?.rolesAllowed.join(', ') || "Tous"}</strong>
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModuleId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="no-transition"
        >
          {renderActiveModule()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

// Simple visual helper
const CheckBadgeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
  </svg>
);

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
