/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  Users,
  UserCheck,
  UserX,
  PiggyBank,
  ShoppingBag,
  Truck,
  DollarSign,
  Activity,
  Bell,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const DashboardView: React.FC = () => {
  const {
    clients,
    tontines,
    kits,
    deliveries,
    payments,
    logs,
    notifications,
    markNotificationAsRead,
    setActiveModuleId
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Calculs des métriques
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const inactiveClients = clients.filter(c => c.status === 'inactive').length;

  // Cotisations aujourd'hui
  const cotisationsToday = payments
    .filter(p => p.date === todayStr && p.type === 'tontine')
    .reduce((sum, p) => sum + p.amount, 0);

  // Livraisons du jour
  const deliveriesToday = deliveries.filter(d => d.date === todayStr);
  const deliveriesTodayCount = deliveriesToday.length;

  // Kits actifs
  const activeKitsCount = kits.filter(k => k.status === 'active').length;

  // Tontines actives
  const activeTontinesCount = tontines.filter(t => t.status === 'active').length;

  // Paiements du jour (total)
  const paymentsTodayTotal = payments
    .filter(p => p.date === todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  // 2. Préparation des données pour le graphique des paiements des 7 derniers jours
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

      const amount = payments
        .filter(p => p.date === dateString)
        .reduce((sum, p) => sum + p.amount, 0);

      data.push({ name: label, 'Montant (FCFA)': amount });
    }
    return data;
  };

  const chartData = getLast7DaysData();

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            Vue d'ensemble
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Statistiques en temps réel et performances de PENTA GAD Distribution.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm">
          <Clock className="w-4 h-4 text-emerald-500" />
          Mise à jour : {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Clients */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Clients Totaux</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">{totalClients}</span>
              <span className="text-xs text-emerald-500 font-medium">Portefeuille</span>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <UserCheck className="w-3.5 h-3.5" /> {activeClients} actifs
              </span>
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <UserX className="w-3.5 h-3.5" /> {inactiveClients} inactifs
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Cotisations / Finances */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cotisations Jour</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                {cotisationsToday.toLocaleString('fr-FR')} <span className="text-sm font-medium text-slate-500">FCFA</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Paiements totaux jour : <strong className="text-emerald-500">{paymentsTodayTotal.toLocaleString('fr-FR')} FCFA</strong>
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Livraisons & Kits */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Livraisons Jour</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">{deliveriesTodayCount}</span>
              <span className="text-xs text-blue-500 font-medium">Aujourd'hui</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Kits actifs enregistrés : <strong className="text-emerald-500">{activeKitsCount}</strong>
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Tontines Actives */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tontines Actives</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white font-display">{activeTontinesCount}</span>
              <span className="text-xs text-indigo-500 font-medium">Groupes</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Cotisations récurrentes actives
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Flux de Trésorerie
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Paiements et cotisations perçus les 7 derniers jours</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="Montant (FCFA)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications list */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" /> Notifications récentes
            </h3>
            <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
              {notifications.filter(n => !n.read).length} nouvelles
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.slice(0, 5).map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotificationAsRead(n.id)}
                  className={`p-3.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                    n.read
                      ? 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-900 text-slate-500'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200 font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Today's Deliveries & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Deliveries */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500" /> Livraisons du jour
            </h3>
            <button
              onClick={() => setActiveModuleId('deliveries')}
              className="text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1 cursor-pointer"
            >
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
            {deliveriesToday.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                Aucune livraison de kit programmée pour aujourd'hui.
              </div>
            ) : (
              deliveriesToday.map(d => {
                const clientObj = clients.find(c => c.id === d.clientId);
                return (
                  <div key={d.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : "Client Inconnu"}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">{d.orderItems}</p>
                      <p className="text-slate-400 dark:text-slate-500 mt-0.5">
                        📍 {d.commune}, {d.quartier} - Heure: <strong className="text-slate-600 dark:text-slate-300">{d.time}</strong>
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                        d.status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                        d.status === 'out_for_delivery' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' :
                        d.status === 'cancelled' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' :
                        'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}>
                        {d.status === 'delivered' ? 'Livré' :
                         d.status === 'out_for_delivery' ? 'En cours' :
                         d.status === 'cancelled' ? 'Annulé' : 'En attente'}
                      </span>
                      {d.confirmationCode && (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">
                          Code: {d.confirmationCode}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activities Journal */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Journal d'activités
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Historique des actions
            </span>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-72 pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                Aucun log d'activité récent.
              </div>
            ) : (
              logs.slice(0, 10).map(l => (
                <div key={l.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1"></div>
                    <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 mt-1"></div>
                  </div>
                  <div className="flex-1 pb-3.5 border-b border-slate-100 dark:border-slate-900">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-950 dark:text-slate-100">{l.userName}</span>
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(l.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">{l.details}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded uppercase">
                        {l.action}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
