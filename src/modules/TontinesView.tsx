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
  UserPlus,
  Trash2,
  Gift,
  AlertCircle,
  Percent,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X
} from 'lucide-react';
import { TontineGroup, TontineContribution, Client, TontineMember } from '../types';

export const TontinesView: React.FC = () => {
  const {
    tontines,
    clients,
    contributions,
    addTontineGroup,
    updateTontineGroup,
    deleteTontineGroup,
    addContribution,
    searchQuery,
    currentUser
  } = useApp();

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [selectedGroup, setSelectedGroup] = useState<TontineGroup | null>(null);
  const activeGroup = selectedGroup ? (tontines.find(g => g.id === selectedGroup.id) || selectedGroup) : null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);

  // Édition de l'ordre de tirage
  const [isEditDrawOrderModalOpen, setIsEditDrawOrderModalOpen] = useState(false);
  const [editingDrawOrder, setEditingDrawOrder] = useState<string[]>([]);
  const [savingDrawOrder, setSavingDrawOrder] = useState(false);

  const handleOpenEditDrawOrder = (group: TontineGroup) => {
    const currentDrawOrder = group.drawOrder && group.drawOrder.length > 0 ? group.drawOrder : group.memberIds;
    const missing = group.memberIds.filter(id => !currentDrawOrder.includes(id));
    setEditingDrawOrder([...currentDrawOrder, ...missing]);
    setIsEditDrawOrderModalOpen(true);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setEditingDrawOrder(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= editingDrawOrder.length - 1) return;
    setEditingDrawOrder(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleQuickSwapInline = async (group: TontineGroup, index1: number, index2: number) => {
    const currentOrder = group.drawOrder && group.drawOrder.length > 0 ? group.drawOrder : group.memberIds;
    if (index1 < 0 || index2 < 0 || index1 >= currentOrder.length || index2 >= currentOrder.length) return;
    const newOrder = [...currentOrder];
    const temp = newOrder[index1];
    newOrder[index1] = newOrder[index2];
    newOrder[index2] = temp;

    try {
      await updateTontineGroup(group.id, { drawOrder: newOrder });
    } catch (err: any) {
      alert("Erreur lors de la modification de l'ordre : " + err.message);
    }
  };

  const handleSaveDrawOrder = async () => {
    if (!activeGroup) return;
    setSavingDrawOrder(true);
    try {
      await updateTontineGroup(activeGroup.id, { drawOrder: editingDrawOrder });
      setIsEditDrawOrderModalOpen(false);
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de l'ordre de tirage : " + err.message);
    } finally {
      setSavingDrawOrder(false);
    }
  };

  // Confirmation de suppression d'un groupe
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  }>({
    isOpen: false,
    groupId: '',
    groupName: ''
  });

  // Formulaire de création de groupe
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [membersConfig, setMembersConfig] = useState<Record<string, {
    articleName: string;
    totalAmount: number;
    durationInDays: number;
    frequency: 'weekly' | 'monthly' | 'bi_monthly' | 'custom';
    customDays?: number;
  }>>({});

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
    setSelectedMembers([]);
    setMembersConfig({});
    setIsCreateModalOpen(true);
  };

  const handleToggleMember = (clientId: string) => {
    setSelectedMembers(prev => {
      const exists = prev.includes(clientId);
      if (exists) {
        return prev.filter(id => id !== clientId);
      } else {
        if (!membersConfig[clientId]) {
          setMembersConfig(old => ({
            ...old,
            [clientId]: {
              articleName: 'Kit Silver - Alimentaire',
              totalAmount: 25000,
              durationInDays: 250,
              frequency: 'weekly',
              customDays: 15
            }
          }));
        }
        return [...prev, clientId];
      }
    });
  };

  const updateMemberConfig = (clientId: string, updates: Partial<{
    articleName: string;
    totalAmount: number;
    durationInDays: number;
    frequency: 'weekly' | 'monthly' | 'bi_monthly' | 'custom';
    customDays?: number;
  }>) => {
    setMembersConfig(prev => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] || {
          articleName: 'Kit Silver - Alimentaire',
          totalAmount: 25000,
          durationInDays: 250,
          frequency: 'weekly',
          customDays: 15
        }),
        ...updates
      }
    }));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || selectedMembers.length === 0) {
      alert("Veuillez renseigner le nom et sélectionner au moins un participant.");
      return;
    }

    const tontineMembers = selectedMembers.map(clientId => {
      const config = membersConfig[clientId] || {
        articleName: 'Kit Silver - Alimentaire',
        totalAmount: 25000,
        durationInDays: 250,
        frequency: 'weekly',
        customDays: 15
      };
      const dailyAmount = Math.round(config.totalAmount / config.durationInDays);
      let multiplier = 7;
      if (config.frequency === 'monthly') multiplier = 30;
      else if (config.frequency === 'bi_monthly') multiplier = 15;
      else if (config.frequency === 'custom') multiplier = config.customDays || 15;
      const frequencyAmount = dailyAmount * multiplier;

      return {
        clientId,
        articleName: config.articleName,
        totalAmount: config.totalAmount,
        durationInDays: config.durationInDays,
        dailyAmount,
        frequency: config.frequency,
        customDays: config.customDays,
        frequencyAmount
      };
    });

    const drawOrder = [...selectedMembers];
    const totalGroupAmount = tontineMembers.reduce((sum, m) => sum + m.frequencyAmount, 0);

    const newGroup = {
      name: groupName,
      amount: totalGroupAmount,
      cycle: 'custom' as const,
      status: 'active' as const,
      memberIds: selectedMembers,
      drawOrder: drawOrder,
      members: tontineMembers
    };

    try {
      await addTontineGroup(newGroup);
      setIsCreateModalOpen(false);
      setGroupName('');
      setSelectedMembers([]);
      setMembersConfig({});
      alert("Le groupe de cotisation \"" + groupName + "\" a été créé avec succès !");
    } catch (err: any) {
      alert("Erreur lors de la création du groupe : " + err.message);
    }
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    setDeleteConfirm({
      isOpen: true,
      groupId: selectedGroup.id,
      groupName: selectedGroup.name
    });
  };

  const handleDeleteGroupById = (groupId: string, groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      groupId: groupId,
      groupName: groupName
    });
  };

  const executeDeleteGroup = async () => {
    try {
      await deleteTontineGroup(deleteConfirm.groupId);
      if (selectedGroup?.id === deleteConfirm.groupId) {
        setSelectedGroup(null);
      }
      const name = deleteConfirm.groupName;
      setDeleteConfirm({ isOpen: false, groupId: '', groupName: '' });
      alert("Le groupe de cotisation \"" + name + "\" a été supprimé avec succès !");
    } catch (err: any) {
      alert("Erreur lors de la suppression du groupe : " + err.message);
    }
  };

  const handleOpenCollectModal = (clientId?: string) => {
    if (!selectedGroup) return;
    const targetClient = clientId || selectedGroup.memberIds[0] || '';
    setCollectClient(targetClient);

    const members = getNormalizedMembers(selectedGroup);
    const mConfig = members.find(m => m.clientId === targetClient);
    setCollectAmount(mConfig ? mConfig.frequencyAmount : selectedGroup.amount);

    setCollectStatus('paid');
    setIsCollectModalOpen(true);
  };

  const handleCollectClientChange = (clientId: string) => {
    setCollectClient(clientId);
    if (!selectedGroup) return;
    const members = getNormalizedMembers(selectedGroup);
    const mConfig = members.find(m => m.clientId === clientId);
    if (mConfig) {
      setCollectAmount(mConfig.frequencyAmount);
    }
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
      alert("Cotisation de " + collectAmount.toLocaleString('fr-FR') + " FCFA enregistrée avec succès !");
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de la cotisation : " + err.message);
    }
  };

  const getNormalizedMembers = (group: TontineGroup): TontineMember[] => {
    if (group.members && Array.isArray(group.members) && group.members.length > 0) {
      return group.members;
    }
    return group.memberIds.map(clientId => {
      const dailyAmount = Math.round(group.amount / (group.cycle === 'weekly' ? 7 : group.cycle === 'monthly' ? 30 : 1)) || 100;
      return {
        clientId,
        articleName: "Article Général",
        totalAmount: group.amount * 5,
        durationInDays: 250,
        dailyAmount: dailyAmount,
        frequency: (group.cycle === 'weekly' ? 'weekly' : group.cycle === 'monthly' ? 'monthly' : 'weekly') as any,
        frequencyAmount: group.amount
      };
    });
  };

  const getMemberProgress = (group: TontineGroup, clientId: string) => {
    const memberContribs = contributions.filter(c => c.groupId === group.id && c.clientId === clientId && c.status === 'paid');
    const contributedAmount = memberContribs.reduce((sum, c) => sum + c.amount, 0);

    const members = getNormalizedMembers(group);
    const mConfig = members.find(m => m.clientId === clientId);

    const totalTarget = mConfig ? mConfig.totalAmount : group.amount;
    const percent = totalTarget > 0 ? Math.min(100, Math.round((contributedAmount / totalTarget) * 100)) : 0;

    return {
      contributedAmount,
      totalTarget,
      percent,
      articleName: mConfig?.articleName || "Article Général",
      dailyAmount: mConfig?.dailyAmount || 100,
      frequency: mConfig?.frequency || 'weekly',
      frequencyAmount: mConfig?.frequencyAmount || group.amount,
      customDays: mConfig?.customDays
    };
  };

  // Récupérer les contributions du groupe sélectionné
  const groupContributions = selectedGroup
    ? contributions.filter(c => c.groupId === selectedGroup.id)
    : [];

  // Calculer la progression globale de la tontine en somme monétaire
  const getProgression = (group: TontineGroup) => {
    const members = getNormalizedMembers(group);
    const totalTargetSum = members.reduce((sum, m) => sum + m.totalAmount, 0);
    const actualCollected = contributions
      .filter(c => c.groupId === group.id && c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);

    const progressPercent = totalTargetSum > 0 ? Math.min(100, Math.round((actualCollected / totalTargetSum) * 100)) : 0;
    return {
      progressPercent,
      collectedAmount: actualCollected,
      targetAmount: totalTargetSum
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* 1. Liste des groupes de Tontine */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col h-[calc(100vh-160px)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 dark:text-white font-display text-lg flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-500" /> Groupes de Cotisation
          </h2>
          <button
            onClick={handleOpenCreateModal}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm cursor-pointer flex items-center justify-center transition-all"
            title="Créer un nouveau groupe"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              Aucun groupe de cotisation enregistré.
            </div>
          ) : (
            filteredGroups.map(g => {
              const { progressPercent, collectedAmount, targetAmount } = getProgression(g);
              const members = getNormalizedMembers(g);
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedGroup?.id === g.id
                      ? 'border-emerald-500 bg-emerald-50/25 dark:bg-emerald-950/20'
                      : 'border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 w-full">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight pr-4">{g.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold tracking-wider">
                        Groupe à articles multiples
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteGroupById(g.id, g.name, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                      title="Supprimer définitivement ce groupe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Barre de progression globale du groupe */}
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Progression globale</span>
                      <span className="font-semibold text-emerald-500">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 pt-0.5">
                      <span>{collectedAmount.toLocaleString('fr-FR')} F perçus</span>
                      <span>Total visé : {targetAmount.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> {members.length} participants
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
        {activeGroup ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header / Actions du groupe */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                  {activeGroup.name}
                </h2>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                    Articles multiples
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                    Objectif global : {getProgression(activeGroup).targetAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenCollectModal()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <DollarSign className="w-4 h-4" /> Encaisser
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/40 dark:border-rose-900/40 font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
                  title="Supprimer ce groupe"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer le groupe
                </button>
              </div>
            </div>

            {/* Suivi individuel des participants */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 text-sm mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Percent className="w-4.5 h-4.5 text-emerald-500" /> Suivi Individuel des Cotisations & Progression
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getNormalizedMembers(activeGroup).map(member => {
                  const client = clients.find(c => c.id === member.clientId);
                  const progress = getMemberProgress(activeGroup, member.clientId);
                  const freqLabel = member.frequency === 'weekly' ? 'hebdomadaire' : member.frequency === 'monthly' ? 'mensuelle' : member.frequency === 'bi_monthly' ? 'bi-mensuelle' : `${member.customDays} jours`;

                  return (
                    <div
                      key={member.clientId}
                      className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/60 rounded-xl space-y-3 relative group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-850 dark:text-slate-150 text-xs">
                            {client ? `${client.firstName} ${client.lastName}` : "Chargement..."}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{client?.phone || "Pas de téléphone"}</p>
                        </div>
                        <button
                          onClick={() => handleOpenCollectModal(member.clientId)}
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <DollarSign className="w-3 h-3" /> Encaisser
                        </button>
                      </div>

                      {/* Info article */}
                      <div className="flex items-center gap-1.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <Gift className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                          {progress.articleName}
                        </span>
                      </div>

                      {/* Barre de progression individuelle */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">Progression</span>
                          <span className="font-bold text-emerald-500">{progress.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                          <span>{progress.contributedAmount.toLocaleString('fr-FR')} F</span>
                          <span>Cible : {progress.totalTarget.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>

                      {/* Plan de cotisation */}
                      <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 block uppercase tracking-wide text-[8px] font-bold">Base journalière</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{progress.dailyAmount.toLocaleString('fr-FR')} F / jour</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block uppercase tracking-wide text-[8px] font-bold">Cotisation ({freqLabel})</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress.frequencyAmount.toLocaleString('fr-FR')} F</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statistiques Progression / Classement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classement / Ordre de Tirage */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-emerald-500" /> Ordre de tirage (Bénéficiaires)
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEditDrawOrder(activeGroup)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Modifier l'ordre de passage des bénéficiaires"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" /> Modifier
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {(activeGroup.drawOrder && activeGroup.drawOrder.length > 0 ? activeGroup.drawOrder : activeGroup.memberIds).map((memberId, index, array) => {
                    const client = clients.find(c => c.id === memberId);
                    const memberConfig = getNormalizedMembers(activeGroup).find(m => m.clientId === memberId);
                    const labelCycle = memberConfig?.frequency === 'weekly' ? `Semaine ${index + 1}` : memberConfig?.frequency === 'monthly' ? `Mois ${index + 1}` : `Période ${index + 1}`;
                    return (
                      <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl text-xs">
                        <div className="flex items-center gap-2.5 pr-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[160px]">
                            {client ? `${client.firstName} ${client.lastName}` : "Chargement..."}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {labelCycle}
                          </span>
                          {isAdmin && (
                            <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-1.5">
                              <button
                                disabled={index === 0}
                                onClick={() => handleQuickSwapInline(activeGroup, index, index - 1)}
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Monter dans le tirage"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={index === array.length - 1}
                                onClick={() => handleQuickSwapInline(activeGroup, index, index + 1)}
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Descendre dans le tirage"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
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
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun groupe de cotisation sélectionné</p>
            <p className="text-xs mt-1">Sélectionnez un groupe dans la colonne latérale pour afficher les articles de chaque participant, suivre les barres de progression individuelles et encaisser les cotisations.</p>
          </div>
        )}
      </div>

      {/* 3. MODAL DE CRÉATION DE GROUPE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">Nouveau groupe à articles personnalisés</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom du groupe de donation *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Groupe Cadeaux de Fin d'Année Marcory"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Sélectionner les clients participants *
                </label>
                <p className="text-[10px] text-slate-400 mb-2">Sélectionnez les participants pour pouvoir ensuite définir leurs articles, montants et fréquences.</p>
                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 divide-y divide-slate-100 dark:divide-slate-800 space-y-1 bg-slate-50 dark:bg-slate-950">
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

              {/* Configurations spécifiques par membre */}
              {selectedMembers.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider pb-1 flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-pink-500" /> Paramètres d'articles & cotisations individuels
                  </h4>
                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
                    {selectedMembers.map(clientId => {
                      const client = clients.find(c => c.id === clientId);
                      if (!client) return null;
                      const config = membersConfig[clientId] || {
                        articleName: 'Kit Silver - Alimentaire',
                        totalAmount: 25000,
                        durationInDays: 250,
                        frequency: 'weekly',
                        customDays: 15
                      };

                      const dailyAmount = Math.round(config.totalAmount / config.durationInDays) || 100;
                      let multiplier = 7;
                      if (config.frequency === 'monthly') multiplier = 30;
                      else if (config.frequency === 'bi_monthly') multiplier = 15;
                      else if (config.frequency === 'custom') multiplier = config.customDays || 15;
                      const frequencyAmount = dailyAmount * multiplier;

                      return (
                        <div key={clientId} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{client.firstName} {client.lastName}</span>
                            <span className="text-[10px] text-slate-400">{client.phone}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Article / Produit</label>
                              <input
                                type="text"
                                required
                                value={config.articleName}
                                onChange={(e) => updateMemberConfig(clientId, { articleName: e.target.value })}
                                placeholder="Ex: Sac de Riz 50kg, Congélateur..."
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Montant Total Fixe (FCFA)</label>
                              <input
                                type="number"
                                required
                                value={config.totalAmount}
                                onChange={(e) => updateMemberConfig(clientId, { totalAmount: parseInt(e.target.value) || 0 })}
                                placeholder="Ex: 25000"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Durée (jours)</label>
                              <input
                                type="number"
                                required
                                value={config.durationInDays}
                                onChange={(e) => updateMemberConfig(clientId, { durationInDays: parseInt(e.target.value) || 250 })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fréquence de versement</label>
                              <select
                                value={config.frequency}
                                onChange={(e) => updateMemberConfig(clientId, { frequency: e.target.value as any })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none"
                              >
                                <option value="weekly">Hebdomadaire (7 jours)</option>
                                <option value="monthly">Mensuel (30 jours)</option>
                                <option value="bi_monthly">Bi-mensuel (15 jours)</option>
                                <option value="custom">Personnalisé (X jours)</option>
                              </select>
                            </div>

                            {config.frequency === 'custom' && (
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre de jours personnalisés</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={config.customDays || 15}
                                  onChange={(e) => updateMemberConfig(clientId, { customDays: parseInt(e.target.value) || 1 })}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                                />
                              </div>
                            )}
                          </div>

                          {/* Affichage des calculs automatiques */}
                          <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-xl flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Calcul base journalière</span>
                              <strong className="text-xs font-semibold">{dailyAmount.toLocaleString('fr-FR')} F / jour</strong>
                            </div>
                            <div className="text-right">
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Versement automatique calculé</span>
                              <strong className="text-xs font-bold">{frequencyAmount.toLocaleString('fr-FR')} F ({config.frequency === 'weekly' ? 'Hebdo' : config.frequency === 'monthly' ? 'Mensuel' : config.frequency === 'bi_monthly' ? 'Bi-mensuel' : `${config.customDays} jours`})</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer transition-all"
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
                  onChange={(e) => handleCollectClientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
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
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Montant perçu (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Statut du versement</label>
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Confirmer l'encaissement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. MODAL DE MODIFICATION DE L'ORDRE DE TIRAGE */}
      {isEditDrawOrderModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-emerald-500" />
                  Modifier l'Ordre de Tirage
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Groupe : <strong className="text-slate-700 dark:text-slate-200">{activeGroup.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDrawOrderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              Ajustez l'ordre de passage des participants avec les flèches haut/bas. L'ordre défini ci-dessous sera utilisé pour l'attribution des bénéfices.
            </p>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {editingDrawOrder.map((memberId, idx) => {
                const client = clients.find(c => c.id === memberId);
                const memberConfig = getNormalizedMembers(activeGroup).find(m => m.clientId === memberId);
                const labelCycle = memberConfig?.frequency === 'weekly' ? `Semaine ${idx + 1}` : memberConfig?.frequency === 'monthly' ? `Mois ${idx + 1}` : `Période ${idx + 1}`;

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {client ? `${client.firstName} ${client.lastName}` : "Client inconnu"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {client?.phone || 'Sans numéro'} • {labelCycle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                        title="Monter"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === editingDrawOrder.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                        title="Descendre"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsEditDrawOrderModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingDrawOrder}
                onClick={handleSaveDrawOrder}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {savingDrawOrder ? "Enregistrement..." : "Sauvegarder l'ordre"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. MODAL DE CONFIRMATION DE SUPPRESSION */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in duration-200"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeDeleteGroup();
              }}
              className="p-6 text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-display text-base">
                  Confirmer la suppression
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Êtes-vous sûr de vouloir supprimer définitivement le groupe de cotisation <strong className="text-slate-800 dark:text-slate-200">"{deleteConfirm.groupName}"</strong> ? Tous les paramétrages associés seront perdus de manière irréversible.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: false, groupId: '', groupName: '' })}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Supprimer définitivement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
