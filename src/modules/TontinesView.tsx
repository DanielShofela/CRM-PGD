/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  PiggyBank,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  UserPlus
} from 'lucide-react';
import { TontineGroup, TontineContribution, Client } from '../types';

export const TontinesView: React.FC = () => {
  const {
    tontines,
    clients,
    contributions,
    addTontineGroup,
    addContribution,
    searchQuery
  } = useApp();

  const [selectedGroup, setSelectedGroup] = useState<TontineGroup | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  // Formulaire de création de groupe
  const [groupName, setGroupName] = useState('');
  const [groupAmount, setGroupAmount] = useState(5000);
  const [groupCycle, setGroupCycle] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Formulaire d'encaissement de cotisation
  const [collectClient, setCollectClient] = useState('');
  const [collectAmount, setCollectAmount] = useState(5000);
  const [collectStatus, setCollectStatus] = useState<'paid' | 'pending' | 'late'>('paid');

  // Filtrer les groupes de tontine
  const filteredGroups = tontines.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setGroupName('');
    setGroupAmount(5000);
    setGroupCycle('weekly');
    setSelectedMembers([]);
    setIsCreateModalOpen(true);
  };

  const handleToggleMember = (clientId: string) => {
    setSelectedMembers(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || selectedMembers.length === 0) {
      alert("Veuillez renseigner le nom et sélectionner au moins un participant.");
      return;
    }

    // Le classement / ordre de tirage initial est simplement l'ordre de sélection
    const drawOrder = [...selectedMembers];

    const newGroup = {
      name: groupName,
      amount: groupAmount,
      cycle: groupCycle,
      status: 'active' as const,
      memberIds: selectedMembers,
      drawOrder: drawOrder
    };

    try {
      await addTontineGroup(newGroup);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert("Erreur lors de la création du groupe : " + err.message);
    }
  };

  const handleOpenCollectModal = () => {
    if (!selectedGroup) return;
    setCollectClient(selectedGroup.memberIds[0] || '');
    setCollectAmount(selectedGroup.amount);
    setCollectStatus('paid');
    setIsCollectModalOpen(true);
  };

  const handleCollectContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !collectClient) return;

    const newContrib = {
      groupId: selectedGroup.id,
      clientId: collectClient,
      amount: collectAmount,
      date: new Date().toISOString().split('T')[0],
      status: collectStatus
    };

    try {
      await addContribution(newContrib);
      setIsCollectModalOpen(false);
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de la cotisation : " + err.message);
    }
  };

  // Récupérer les contributions du groupe sélectionné
  const groupContributions = selectedGroup
    ? contributions.filter(c => c.groupId === selectedGroup.id)
    : [];

  // Calculer la progression globale de la tontine
  const getProgression = (group: TontineGroup) => {
    const totalCyclesExpected = group.memberIds.length; // Un cycle complet = chaque membre cotise une fois
    const actualCollected = contributions.filter(c => c.groupId === group.id && c.status === 'paid').length;
    const progressPercent = totalCyclesExpected > 0 ? Math.min(100, Math.round((actualCollected / (totalCyclesExpected * totalCyclesExpected)) * 100)) : 0;
    return {
      progressPercent,
      collectedCount: actualCollected,
      expectedCount: totalCyclesExpected * totalCyclesExpected
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* 1. Liste des groupes de Tontine */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col h-[calc(100vh-160px)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 dark:text-white font-display text-lg flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" /> Groupes de Tontine
          </h2>
          <button
            onClick={handleOpenCreateModal}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm cursor-pointer flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              Aucun groupe de tontine.
            </div>
          ) : (
            filteredGroups.map(g => {
              const { progressPercent } = getProgression(g);
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedGroup?.id === g.id
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-950'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{g.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Cycle : {g.cycle === 'weekly' ? 'Hebdomadaire' : g.cycle === 'monthly' ? 'Mensuel' : 'Quotidien'}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      {g.amount.toLocaleString('fr-FR')} F
                    </span>
                  </div>

                  {/* Barre de progression de la tontine */}
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Progression du cycle</span>
                      <span className="font-semibold text-emerald-500">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-3.5">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {g.memberIds.length} participants
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Vue détaillée du groupe sélectionné */}
      <div className="lg:col-span-2 space-y-6">
        {selectedGroup ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header / Actions du groupe */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                  {selectedGroup.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cotisation récurrente de <strong className="text-emerald-500">{selectedGroup.amount.toLocaleString('fr-FR')} FCFA</strong>
                </p>
              </div>
              <button
                onClick={handleOpenCollectModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" /> Encaisser une cotisation
              </button>
            </div>

            {/* Statistiques Progression / Classement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classement / Ordre de Tirage */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 text-sm mb-4">
                  <Award className="w-4 h-4 text-emerald-500" /> Ordre de tirage (Bénéficiaires)
                </h3>
                <div className="space-y-2.5">
                  {selectedGroup.drawOrder.map((memberId, index) => {
                    const client = clients.find(c => c.id === memberId);
                    return (
                      <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {client ? `${client.firstName} ${client.lastName}` : "Chargement..."}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {selectedGroup.cycle === 'weekly' ? `Semaine ${index + 1}` : `Mois ${index + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cotisations récentes du groupe */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 text-sm mb-4">
                  <Clock className="w-4 h-4 text-emerald-500" /> Historique des cotisations
                </h3>
                <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2.5 pr-1">
                  {groupContributions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-12">Aucune cotisation enregistrée pour ce groupe.</p>
                  ) : (
                    groupContributions.map(c => {
                      const client = clients.find(cl => cl.id === c.clientId);
                      return (
                        <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {client ? `${client.firstName} ${client.lastName}` : "Client inconnu"}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">{c.date}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              +{c.amount.toLocaleString('fr-FR')} F
                            </span>
                            <span className={`block text-[9px] uppercase font-bold mt-0.5 ${
                              c.status === 'paid' ? 'text-emerald-500' : c.status === 'late' ? 'text-rose-500' : 'text-amber-500'
                            }`}>
                              {c.status === 'paid' ? 'Payé' : c.status === 'late' ? 'En retard' : 'En attente'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm text-center text-slate-400 dark:text-slate-500">
            <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun groupe de tontine sélectionné</p>
            <p className="text-xs mt-1">Sélectionnez un groupe dans la colonne latérale pour afficher son classement de tirage, ses participants et collecter les cotisations.</p>
          </div>
        )}
      </div>

      {/* 3. MODAL DE CRÉATION DE GROUPE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">Nouveau groupe de Tontine</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom du groupe de Tontine *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Tontine Hebdo Cotonou / Marcory"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Montant par période (FCFA)</label>
                  <input
                    type="number"
                    value={groupAmount}
                    onChange={(e) => setGroupAmount(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Cycle de versement</label>
                  <select
                    value={groupCycle}
                    onChange={(e) => setGroupCycle(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="daily">Quotidien</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Sélectionner les clients participants *
                </label>
                <p className="text-[10px] text-slate-400 mb-2">L'ordre de tirage (classement) sera défini selon l'ordre dans lequel vous sélectionnez les participants ci-dessous.</p>
                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
                  {clients.map(c => (
                    <label key={c.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(c.id)}
                        onChange={() => handleToggleMember(c.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-800 dark:text-slate-200">{c.firstName} {c.lastName} ({c.phone})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Créer le groupe
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. MODAL D'ENCAISSEMENT DE COTISATION */}
      {isCollectModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">Encaisser cotisation - {selectedGroup.name}</h3>
              <button onClick={() => setIsCollectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectContribution} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Sélectionner le participant</label>
                <select
                  value={collectClient}
                  onChange={(e) => setCollectClient(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {selectedGroup.memberIds.map(mId => {
                    const clientObj = clients.find(c => c.id === mId);
                    return (
                      <option key={mId} value={mId}>
                        {clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : "Client"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Montant perçu (FCFA)</label>
                <input
                  type="number"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Statut du paiement</label>
                <select
                  value={collectStatus}
                  onChange={(e) => setCollectStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="paid">Payé</option>
                  <option value="pending">En attente / Promesse</option>
                  <option value="late">En retard</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Confirmer l'encaissement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
