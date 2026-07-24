/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  LayoutDashboard,
  User as UserIcon,
  CreditCard,
  PiggyBank,
  Truck,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  MapPin,
  Phone,
  ChevronRight,
  Send,
  Sparkles,
  Camera,
  Edit3,
  Check,
  X,
  Save,
  UploadCloud,
  ShoppingBag,
  DollarSign,
  Plus,
  Smartphone,
  QrCode,
  RefreshCw,
  Printer,
  Lock,
  ArrowLeft,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Client, TontineGroup, KitPlan, Delivery, Payment, Notification } from '../types';
import { ClientRegistrationView } from '../components/ClientRegistrationView';
import { requestPushPermission, isPushPermissionGranted, playNotificationSound } from '../utils/notifications';

// Image Compression Helper pour la photo de profil client
function compressImage(file: File, maxWidth = 300, maxHeight = 300, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export const ClientPortalView: React.FC<{ overrideClient?: Client }> = ({ overrideClient }) => {
  const {
    currentUser,
    clients,
    tontines,
    contributions,
    kits,
    deliveries,
    payments,
    notifications,
    updateClient,
    addPayment,
    updateKitPlan,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    addPlanMessage,
    subscriptions,
    addSubscriptionMessage
  } = useApp();

  // Identifier le client connecté ou passé en paramètre d'aperçu
  const activeClient: Client | null = overrideClient || (
    currentUser?.role === 'client' && currentUser.clientId
      ? clients.find(c => c.id === currentUser.clientId) || null
      : clients.find(c => c.phone === currentUser?.phone) || null
  );

  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'kits' | 'messages' | 'tontines' | 'deliveries' | 'notifications'>('dashboard');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [directMessageInput, setDirectMessageInput] = useState<string>('');

  // Modal d'accès à l'Espace d'Inscription aux Kits
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Modal de paiement pour un kit spécifique via Agrégateur Mobile Money
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedKitForPayment, setSelectedKitForPayment] = useState<KitPlan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'mtn_money' | 'wave' | 'moov_money'>('orange_money');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState<string>('');
  const [paymentStep, setPaymentStep] = useState<'form' | 'connecting' | 'ussd_pending' | 'success'>('form');
  const [aggregatorTxnRef, setAggregatorTxnRef] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');

  // Gestion de la modification de l'adresse résidentielle
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(activeClient?.address || '');
  const [communeInput, setCommuneInput] = useState(activeClient?.commune || 'Cocody');
  const [quartierInput, setQuartierInput] = useState(activeClient?.quartier || '');
  const [addressSuccess, setAddressSuccess] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Gestion de l'upload de photo de profil
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState('');

  // Message de support / discussion dans kit
  const [messageText, setMessageText] = useState('');
  const [activeKitIdForMsg, setActiveKitIdForMsg] = useState<string | null>(null);

  // Initialisation du processus de versement via Agrégateur
  const handleStartMobileMoneyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || !selectedKitForPayment) return;
    const amount = parseInt(paymentAmount, 10);
    if (!amount || amount <= 0) {
      alert('Veuillez saisir un montant de versement valide.');
      return;
    }
    if (!mobileMoneyPhone.trim()) {
      alert('Veuillez renseigner le numéro Mobile Money.');
      return;
    }

    const generatedRef = `MM-CI-${Math.floor(100000 + Math.random() * 900000)}`;
    setAggregatorTxnRef(generatedRef);
    setPaymentStep('connecting');

    setTimeout(() => {
      setPaymentStep('ussd_pending');
    }, 1500);
  };

  // Confirmation finale du versement USSD / Mobile Money
  const handleConfirmMobileMoneyPayment = async () => {
    if (!activeClient || !selectedKitForPayment) return;
    const amount = parseInt(paymentAmount, 10);
    if (!amount || amount <= 0) return;

    setIsSubmittingPayment(true);
    try {
      const operatorName = paymentMethod === 'orange_money' ? 'Orange Money CI'
        : paymentMethod === 'mtn_money' ? 'MTN MoMo CI'
        : paymentMethod === 'wave' ? 'Wave CI'
        : 'Moov Money CI';

      await addPayment({
        clientId: activeClient.id,
        amount,
        type: 'kit',
        referenceId: selectedKitForPayment.id,
        date: new Date().toISOString(),
        method: paymentMethod,
        notes: `Paiement Agrégateur Mobile Money | Réf: ${aggregatorTxnRef} | Opérateur: ${operatorName} | N°: ${mobileMoneyPhone}`
      });

      // Mettre à jour le solde restant sur le plan du kit
      const newBalance = Math.max(0, selectedKitForPayment.balance - amount);
      await updateKitPlan(selectedKitForPayment.id, { balance: newBalance });

      setPaymentStep('success');
      setPaymentSuccess(`Versement de ${amount.toLocaleString()} FCFA validé avec succès par ${operatorName} !`);
    } catch (err: any) {
      console.error("Erreur lors du versement :", err);
      alert("Erreur lors du versement : " + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (!activeClient) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm max-w-lg mx-auto space-y-4">
        <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">Fiche client introuvable</h2>
        <p className="text-xs text-slate-500">
          Votre compte utilisateur n'est pas encore lié à une fiche client dans le CRM. Veuillez contacter votre administrateur Penta GAD.
        </p>
      </div>
    );
  }

  // FILTRAGE DES DONNÉES DU CLIENT CONNECTÉ (ZERO-TRUST COMPLIANCE)
  const clientPayments = payments.filter(p => p.clientId === activeClient.id);
  const clientKits = kits.filter(k => k.clientId === activeClient.id);
  const clientSubscriptions = subscriptions.filter(s => 
    s.clientId === activeClient.id || 
    s.phone === activeClient.phone ||
    (activeClient.phone && s.phone && s.phone.endsWith(activeClient.phone.slice(-8)))
  );
  const clientTontines = tontines.filter(t => 
    (t.memberIds && t.memberIds.includes(activeClient.id)) ||
    (t.members && t.members.some(m => m.clientId === activeClient.id))
  );
  const clientContributions = contributions.filter(c => c.clientId === activeClient.id);
  const clientDeliveries = deliveries.filter(d => d.clientId === activeClient.id);

  const clientMessagingThreads = [
    ...clientKits.map(k => ({
      id: k.id,
      title: `Kit ${k.kitType}`,
      subTitle: `Dossier #${k.id.substring(0, 6)} • Statut: ${k.status}`,
      type: 'kit' as const,
      conversations: k.conversations || []
    })),
    ...clientSubscriptions.map(s => ({
      id: s.id,
      title: `Demande ${s.kitName}`,
      subTitle: `Réf #${s.id.substring(0, 6)} • Statut: ${s.status}`,
      type: 'lead' as const,
      conversations: s.conversations || []
    }))
  ];

  const totalClientMessagesCount = clientMessagingThreads.reduce((acc, t) => acc + t.conversations.length, 0);

  // NOTIFICATIONS EXCLUSIVES CLIENTS : Uniquement celles ciblées spécifiquement à ce client ou avec le rôle 'client'
  const clientNotifications = notifications.filter(n => 
    n.userId === activeClient.id || 
    n.userId === currentUser?.id ||
    (n as any).targetRole === 'client'
  );

  // CALCUL DES INDICATEURS CLÉS DU TABLEAU DE BORD
  const totalPaidKits = clientKits.reduce((acc, k) => acc + (k.price - k.balance), 0);
  const totalPaidTontines = clientContributions.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.amount, 0);
  const totalPaidOverall = totalPaidKits + totalPaidTontines;

  const totalDueKits = clientKits.reduce((acc, k) => acc + k.price, 0);
  const totalDueTontines = clientTontines.reduce((acc, t) => acc + t.amount, 0);
  const totalDueOverall = totalDueKits + totalDueTontines;

  const totalRemainingOverall = Math.max(0, totalDueOverall - totalPaidOverall);
  const globalProgress = totalDueOverall > 0 ? Math.min(100, Math.round((totalPaidOverall / totalDueOverall) * 100)) : 100;

  const activeDossiersCount = clientKits.filter(k => k.status === 'active').length + clientTontines.filter(t => t.status === 'active').length;
  const totalPaymentsCount = clientPayments.length + clientContributions.filter(c => c.status === 'paid').length;

  // TRAITEMENT UPLOAD PHOTO DE PROFIL
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier au format image validé (JPG, PNG, WebP...).');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoSuccess('');
    try {
      const compressedDataUrl = await compressImage(file, 300, 300, 0.75);
      await updateClient(activeClient.id, { photoUrl: compressedDataUrl });
      setPhotoSuccess('Photo de profil mise à jour !');
      setTimeout(() => setPhotoSuccess(''), 3000);
    } catch (err) {
      console.error("Erreur lors de l'upload de la photo :", err);
      alert("Une erreur s'est produite lors de la mise à jour de la photo.");
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // ENREGISTREMENT ADRESSE RÉSIDENTIELLE
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    setAddressSuccess('');
    try {
      await updateClient(activeClient.id, {
        address: addressInput.trim(),
        commune: communeInput.trim(),
        quartier: quartierInput.trim()
      });
      setAddressSuccess('Adresse résidentielle mise à jour avec succès !');
      setIsEditingAddress(false);
      setTimeout(() => setAddressSuccess(''), 3000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'adresse :", err);
      alert("Erreur lors de la mise à jour de votre adresse.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // SOUMISSION MESSAGE DANS UN PLAN KIT
  const handleSendMessage = async (kitId: string) => {
    if (!messageText.trim()) return;
    try {
      const clientName = activeClient ? `${activeClient.firstName} ${activeClient.lastName}` : (currentUser?.displayName || 'Client');
      await addPlanMessage(kitId, messageText.trim(), {
        senderName: clientName,
        senderRole: 'client'
      });
      setMessageText('');
    } catch (err: any) {
      console.error(err);
    }
  };

  // SOUMISSION MESSAGE DIRECT DANS LE TCHAT DU PORTAIL CLIENT
  const handleSendDirectMessage = async (threadId: string, threadType: 'kit' | 'lead') => {
    if (!directMessageInput.trim()) return;
    try {
      const clientName = activeClient ? `${activeClient.firstName} ${activeClient.lastName}` : (currentUser?.displayName || 'Client');
      if (threadType === 'kit') {
        await addPlanMessage(threadId, directMessageInput.trim(), {
          senderName: clientName,
          senderRole: 'client'
        });
      } else {
        await addSubscriptionMessage(threadId, directMessageInput.trim(), {
          senderName: clientName,
          senderRole: 'client'
        });
      }
      setDirectMessageInput('');
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* INPUT MASQUÉ POUR L'UPLOAD DE PHOTO DE PROFIL */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* 1. EN-TÊTE DU PORTAIL CLIENT */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* AVATAR DE PROFIL AVEC ACTION DE CHANGEMENT D'IMAGE */}
            <div className="relative group w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 shrink-0 shadow-md">
              <img
                src={activeClient.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                alt={`${activeClient.firstName} ${activeClient.lastName}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                title="Changer ma photo de profil"
                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>{isUploadingPhoto ? 'Chargement...' : 'Changer'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Espace Client Sécurisé
                </span>
                {photoSuccess && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-slate-900 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> {photoSuccess}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight mt-1 text-white">
                Bonjour, {activeClient.firstName} {activeClient.lastName}
              </h1>
              <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5">
                Consultez vos dossiers, cotisations de tontine et livraisons en temps réel.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              <span>Espace Inscription Kits</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-200" />
              <span>Changer ma photo</span>
            </button>
          </div>
        </div>

        {/* BARRE DE NAVIGATION INTERNE DU PORTAIL CLIENT */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
            { id: 'profile', label: 'Mon Profil & Adresse', icon: UserIcon },
            { id: 'kits', label: 'Paiements & Kits', icon: CreditCard, count: clientKits.length },
            { id: 'messages', label: 'Messagerie Live', icon: MessageSquare, count: totalClientMessagesCount },
            { id: 'tontines', label: 'Mes Tontines', icon: PiggyBank, count: clientTontines.length },
            { id: 'deliveries', label: 'Livraisons', icon: Truck, count: clientDeliveries.length },
            { id: 'notifications', label: 'Notifications', icon: Bell, count: clientNotifications.filter(n => !n.read).length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-900 shadow-md font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-emerald-100 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-200'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/30 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CONTENU DE L'ONGLET SÉLECTIONNÉ */}

      {/* ONGLET 1 : TABLEAU DE BORD CLIENT */}
      {activeTab === 'dashboard' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Cartes d'indicateurs de synthèse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Progression globale</span>
                <span className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mt-2">
                {globalProgress}%
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Cotisations et paiements validés</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Montant total payé</span>
                <span className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mt-2">
                {totalPaidOverall.toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">{totalPaymentsCount} versement(s) confirmé(s)</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Montant restant</span>
                <span className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mt-2">
                {totalRemainingOverall.toLocaleString()} <span className="text-xs font-normal text-slate-500">FCFA</span>
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-medium">Solde à régler sur vos dossiers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dossiers actifs</span>
                <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
                  <PiggyBank className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mt-2">
                {activeDossiersCount}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">{clientKits.length} kit(s) & {clientTontines.length} tontine(s)</p>
            </div>
          </div>

          {/* Deux colonnes : Activités récentes & Livraisons imminentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historique des derniers versements */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Derniers versements confirmés</span>
                </h3>
                <button
                  onClick={() => setActiveTab('kits')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Tout voir <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {clientPayments.length === 0 && clientContributions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Aucun paiement enregistré pour le moment.</p>
              ) : (
                <div className="space-y-2.5">
                  {[...clientPayments, ...clientContributions.map(c => ({
                    id: c.id,
                    amount: c.amount,
                    date: c.date,
                    type: 'tontine' as const,
                    method: 'cash' as const,
                    referenceId: c.groupId
                  }))]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {p.type === 'tontine' ? 'Cotisation Tontine' : p.type === 'kit' ? 'Acompte Kit Alimentaire' : 'Paiement'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(p.date).toLocaleDateString('fr-FR')} • Mode: {p.method.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        +{p.amount.toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suivi des Livraisons */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Statut des livraisons</span>
                </h3>
                <button
                  onClick={() => setActiveTab('deliveries')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Tout voir <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {clientDeliveries.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Aucune livraison programmée ou enregistrée.</p>
              ) : (
                <div className="space-y-2.5">
                  {clientDeliveries.slice(0, 4).map(d => (
                    <div key={d.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.orderItems}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                          d.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        }`}>
                          {d.status === 'delivered' ? 'Livré' : d.status === 'out_for_delivery' ? 'En cours de livraison' : 'En attente'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {d.commune} - {d.quartier} ({d.address})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ONGLET 2 : MON PROFIL PERSONNEL & ADRESSE */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Fiche de profil & Adresse</h2>
              <p className="text-xs text-slate-500">Vos informations personnelles et adresse de livraison</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full text-xs font-bold">
              Compte Actif
            </span>
          </div>

          {addressSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{addressSuccess}</span>
            </div>
          )}

          {/* PHOTO DE PROFIL & INFOS GLOBALES */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                <img
                  src={activeClient.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                  alt={`${activeClient.firstName} ${activeClient.lastName}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Changer</span>
                </button>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{activeClient.firstName} {activeClient.lastName}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> {activeClient.phone}
                </p>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" /> Importer une nouvelle photo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
            <div className="space-y-4">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Nom & Prénoms</span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {activeClient.lastName} {activeClient.firstName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Numéro de Téléphone (Identifiant fixe)</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> {activeClient.phone}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Date d'inscription au CRM</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {activeClient.createdAt ? new Date(activeClient.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : "Inconnue"}
                </span>
              </div>
            </div>

            {/* FORMULAIRE / AFFICHAGE DE L'ADRESSE RÉSIDENTIELLE (EDITABLE) */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <span className="text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Adresse de livraison / Résidence
                </span>
                {!isEditingAddress && (
                  <button
                    onClick={() => {
                      setAddressInput(activeClient.address || '');
                      setCommuneInput(activeClient.commune || 'Cocody');
                      setQuartierInput(activeClient.quartier || '');
                      setIsEditingAddress(true);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier mon adresse
                  </button>
                )}
              </div>

              {!isEditingAddress ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Commune</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeClient.commune || "Non renseignée"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Quartier</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeClient.quartier || "Non renseigné"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Adresse détaillée / Repères</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{activeClient.address || "Aucune précision d'adresse"}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Commune de résidence</label>
                    <select
                      value={communeInput}
                      onChange={(e) => setCommuneInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      {['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Autre Ville / Hors Abidjan'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Quartier</label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Angré 8ème Tranche, Niangon, Remblay..."
                      value={quartierInput}
                      onChange={(e) => setQuartierInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Adresse exacte / Indications</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="ex: Rue 12, Rue des Jardins, en face de la pharmacie..."
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingAddress ? 'Enregistrement...' : 'Enregistrer'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ONGLET 3 : PAIEMENTS ÉCHELONNÉS & KITS ALIMENTAIRES */}
      {activeTab === 'kits' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* BANNIÈRE ACTION KITS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 dark:text-white">
                Vos Abonnements Kits Alimentaires & Équipements
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez vos dossiers, effectuez vos versements en ligne et accédez au catalogue d'inscription.
              </p>
            </div>
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>S'inscrire à un nouveau Kit</span>
            </button>
          </div>

          {clientKits.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 text-center space-y-4">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucun kit ou dossier échelonné actif</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Vous n'avez pas encore d'abonnement actif à un kit. Cliquez ci-dessous pour choisir votre kit et souscrire immédiatement.
                </p>
              </div>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Accéder à l'Espace d'Inscription des Kits</span>
              </button>
            </div>
          ) : (
            clientKits.map(kit => {
              const paidAmount = kit.price - kit.balance;
              const progressPct = kit.price > 0 ? Math.min(100, Math.round((paidAmount / kit.price) * 100)) : 100;
              const paymentsForKit = clientPayments.filter(p => p.referenceId === kit.id || p.type === 'kit');

              return (
                <div key={kit.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          {kit.kitType.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-bold uppercase">
                          Dossier #{kit.id.substring(0, 6)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mt-1">
                        Formule {kit.kitType}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Début : {new Date(kit.startDate).toLocaleDateString('fr-FR')} • Fin prévue : {new Date(kit.endDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 block">Solde restant</span>
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-display">
                          {kit.balance.toLocaleString()} FCFA
                        </span>
                        <span className="text-[10px] text-slate-400 block">sur un total de {kit.price.toLocaleString()} FCFA</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedKitForPayment(kit);
                          setPaymentAmount(kit.balance > 0 ? Math.min(5000, kit.balance).toString() : '5000');
                          setMobileMoneyPhone(activeClient.phone || '');
                          setPaymentStep('form');
                          setIsPaymentModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Payer ce kit / Versement Mobile Money</span>
                      </button>
                    </div>
                  </div>

                  {/* Barre de progression du paiement */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-600 dark:text-slate-400">Progression du versement</span>
                      <span className="text-emerald-600 font-bold">{progressPct}% réglé</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Détails du plan */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Montant payé</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{paidAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Nombre de versements</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{paymentsForKit.length} versement(s)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Prochaine livraison</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(kit.nextDeliveryDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Statut du dossier</span>
                      <span className="font-bold text-emerald-600 uppercase">{kit.status}</span>
                    </div>
                  </div>

                  {/* Historique des paiements sur ce kit */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Historique des versements
                    </h4>
                    {paymentsForKit.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Aucun versement n'a encore été enregistré pour ce kit.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {paymentsForKit.map(p => (
                          <div key={p.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Reçu versement #{p.id.substring(0, 6)}</span>
                                <span className="text-[10px] text-slate-400 block">{new Date(p.date).toLocaleDateString('fr-FR')} via {p.method.toUpperCase()}</span>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">+{p.amount.toLocaleString()} FCFA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Espace de message / Support direct avec le CRM */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Messagerie & Assistance sur ce dossier
                    </h4>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                      {(!kit.conversations || kit.conversations.length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">Posez une question ou laissez un message concernant votre livraison.</p>
                      ) : (
                        kit.conversations.map(msg => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-xl text-xs max-w-[80%] ${
                              msg.senderRole === 'client' || msg.senderRole === 'prospect'
                                ? 'bg-emerald-600 text-white ml-auto'
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800'
                            }`}
                          >
                            <p className="font-semibold text-[10px] opacity-80 mb-0.5">{msg.senderName} ({msg.senderRole})</p>
                            <p>{msg.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Écrire un message à votre conseiller..."
                        value={activeKitIdForMsg === kit.id ? messageText : ''}
                        onChange={(e) => {
                          setActiveKitIdForMsg(kit.id);
                          setMessageText(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage(kit.id);
                        }}
                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleSendMessage(kit.id)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ONGLET MESSAGERIE LIVE & SUPPORT EN TEMPS RÉEL */}
      {activeTab === 'messages' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Sync Temps Réel
                </span>
              </div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white mt-1">
                Centre de Messagerie & Support Direct
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Échangez en direct avec la Direction et vos conseillers Penta GAD. Messages synchronisés instantanément avec la base de données.
              </p>
            </div>
          </div>

          {clientMessagingThreads.length === 0 ? (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Aucune discussion ouverte</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Vous n'avez pas encore de dossier actif ni de demande de souscription. Dès que vous souscrivez à un kit, un canal de discussion direct sera automatiquement disponible ici.
                </p>
              </div>
              <button
                onClick={() => setShowRegistrationModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Souscrire à un Kit Alimentaire</span>
              </button>
            </div>
          ) : (
            (() => {
              const activeThread = clientMessagingThreads.find(t => t.id === selectedThreadId) || clientMessagingThreads[0];
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-4 sm:p-6 overflow-hidden">
                  {/* Liste des canaux de discussion sur la gauche */}
                  <div className="space-y-3 lg:border-r border-slate-100 dark:border-slate-800 lg:pr-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                      Vos Canaux de Discussion ({clientMessagingThreads.length})
                    </h3>
                    <div className="space-y-2 max-h-[450px] overflow-y-auto no-scrollbar">
                      {clientMessagingThreads.map(thread => {
                        const isSelected = activeThread.id === thread.id;
                        const lastMsg = thread.conversations[thread.conversations.length - 1];
                        return (
                          <div
                            key={thread.id}
                            onClick={() => setSelectedThreadId(thread.id)}
                            className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                                : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {thread.title}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                {thread.conversations.length} msg
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mb-1.5">{thread.subTitle}</p>
                            {lastMsg ? (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 italic bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <strong className="not-italic text-slate-800 dark:text-slate-200">{lastMsg.senderName}: </strong>
                                {lastMsg.text}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Aucun message pour l'instant.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fenêtre de tchat en temps réel à droite */}
                  <div className="lg:col-span-2 flex flex-col justify-between h-[480px] bg-slate-50/60 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    {/* En-tête de la discussion active */}
                    <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>{activeThread.title}</span>
                        </h4>
                        <p className="text-xs text-slate-500">{activeThread.subTitle}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                        En direct
                      </span>
                    </div>

                    {/* Zone de messages avec défilement */}
                    <div className="flex-1 my-3 overflow-y-auto space-y-3 pr-1">
                      {activeThread.conversations.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="text-xs italic">Posez votre question ou laissez un message concernant votre livraison.</p>
                          <p className="text-[10px] text-slate-400">Les conseillers de Penta GAD vous répondront en temps réel.</p>
                        </div>
                      ) : (
                        activeThread.conversations.map((msg: any) => {
                          const isClientMsg = msg.senderRole === 'client' || msg.senderRole === 'prospect';
                          return (
                            <div
                              key={msg.id || Math.random().toString()}
                              className={`flex flex-col ${isClientMsg ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                                  isClientMsg
                                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-none shadow-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 pb-0.5 border-b border-white/10 dark:border-slate-800">
                                  <span className="font-bold">{msg.senderName} ({msg.senderRole})</span>
                                  <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                </div>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Zone d'envoi de message */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex gap-2">
                      <input
                        type="text"
                        placeholder="Écrivez votre message à l'équipe Penta GAD..."
                        value={directMessageInput}
                        onChange={(e) => setDirectMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendDirectMessage(activeThread.id, activeThread.type);
                        }}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                      <button
                        onClick={() => handleSendDirectMessage(activeThread.id, activeThread.type)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Envoyer</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </motion.div>
      )}

      {/* ONGLET 4 : MES TONTINES (AVEC ANONYMISATION STRICTE ET ORDRE DE PASSAGE) */}
      {activeTab === 'tontines' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {clientTontines.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
              <PiggyBank className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Aucun groupe de tontine associé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Vous ne participez actuellement à aucun groupe de tontine. Demandez votre intégration à l'administrateur.
              </p>
            </div>
          ) : (
            clientTontines.map(tontine => {
              // Récupération de l'ordre de passage du groupe
              const drawOrder = tontine.drawOrder && tontine.drawOrder.length > 0 ? tontine.drawOrder : (tontine.memberIds || []);
              const myPositionIndex = drawOrder.indexOf(activeClient.id);
              const myPositionNum = myPositionIndex !== -1 ? myPositionIndex + 1 : 'Non attribuée';

              const myContribs = clientContributions.filter(c => c.groupId === tontine.id && c.status === 'paid');

              return (
                <div key={tontine.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* En-tête Tontine */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                        Cycle {tontine.cycle}
                      </span>
                      <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mt-1">
                        {tontine.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cotisation périodique : <strong className="text-slate-800 dark:text-slate-200">{tontine.amount.toLocaleString()} FCFA</strong>
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-left sm:text-right">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">Votre Position au Tirage</span>
                      <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 font-display">
                        Position #{myPositionNum} sur {drawOrder.length}
                      </span>
                    </div>
                  </div>

                  {/* Section Ordre de passage dynamique */}
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Ordre de Passage & Bénéficiaire Actuel</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Bénéficiaire Actuel (Tour #1)</span>
                        <p className="font-extrabold text-emerald-600 mt-0.5">
                          {drawOrder[0] === activeClient.id ? "Vous (Participant 01)" : "Participant 01"}
                        </p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Prochain Bénéficiaire (Tour #2)</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {drawOrder.length > 1 ? (drawOrder[1] === activeClient.id ? "Vous (Participant 02)" : "Participant 02") : "A venir"}
                        </p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Votre Rang Personnel</span>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Position #{myPositionNum}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* VISIBILITÉ DU GROUPE (ANONYMISÉE STRICTEMENT SELON LE CAHIER DES CHARGES) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Membres du Groupe (Noms masqués pour la confidentialité)
                      </h4>
                      <span className="text-[10px] text-slate-400 italic">
                        {drawOrder.length} participant(s) anonymisés
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {drawOrder.map((memId, idx) => {
                        const isMe = memId === activeClient.id;
                        const label = isMe ? `Participant 0${idx + 1} (Vous)` : `Participant 0${idx + 1}`;

                        return (
                          <div
                            key={memId}
                            className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                              isMe
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 font-bold'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                                #{idx + 1}
                              </span>
                              <span>{label}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                            }`}>
                              {idx === 0 ? 'Servi' : 'En attente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Historique des cotisations personnelles du client sur cette tontine */}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Vos cotisations versées sur ce groupe
                    </h4>
                    {myContribs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Aucune cotisation enregistrée pour l'instant.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {myContribs.map(c => (
                          <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Cotisation du {new Date(c.date).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="font-bold text-emerald-600">+{c.amount.toLocaleString()} FCFA (Validé)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ONGLET 5 : LIVRAISONS */}
      {activeTab === 'deliveries' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Suivi de vos livraisons</h2>
            <p className="text-xs text-slate-500">Consultez l'état et l'historique de vos colis distribués par Penta GAD</p>
          </div>

          {clientDeliveries.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Aucune livraison enregistrée pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {clientDeliveries.map(d => (
                <div key={d.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{d.orderItems}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                      d.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                      d.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                    }`}>
                      {d.status === 'delivered' ? 'Livré avec succès' : d.status === 'out_for_delivery' ? "En cours d'acheminement" : 'Attribution en cours'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-500 pt-2 border-t border-slate-200/40 dark:border-slate-800">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{d.address}, Commune {d.commune} ({d.quartier})</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Programmé le : {d.date} à {d.time}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ONGLET 6 : NOTIFICATIONS CLIENT (STRICTEMENT FILTRÉES POUR LES CLIENTS) */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Vos Notifications Personnelles</h2>
              <p className="text-xs text-slate-500">Alertes, rappels d'échéances et confirmations de vos paiements</p>
            </div>
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              Tout marquer comme lu
            </button>
          </div>

          {/* Bannière activation Push Notification Style WhatsApp */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">Notifications Push instantanées (Style WhatsApp)</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Recevez un signal sonore et une alerte navigateur à chaque message ou paiement.</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await requestPushPermission();
                if (res === 'granted') {
                  playNotificationSound();
                  alert("Notifications Push activées avec succès ! Vous recevrez des alertes en temps réel.");
                } else {
                  alert("Veuillez autoriser les notifications dans la barre d'adresse de votre navigateur.");
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
            >
              Activer Push
            </button>
          </div>

          {clientNotifications.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Aucune notification client pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {clientNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotificationAsRead(n.id)}
                  className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                    n.read
                      ? 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-600'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-slate-900 font-semibold'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* OVERLAY / MODAL : ESPACE D'INSCRIPTION AUX KITS (INTEGRÉ DIRECTEMENT AU PORTAIL) */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="sticky top-0 z-50 bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white">Espace d'Inscription & Catalogue des Kits</h2>
                <p className="text-[11px] text-emerald-400 font-medium">Compte connecté : {activeClient.firstName} {activeClient.lastName} ({activeClient.phone})</p>
              </div>
            </div>
            <button
              onClick={() => setShowRegistrationModal(false)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <X className="w-4 h-4" />
              <span>Fermer & Retour au Portail</span>
            </button>
          </div>
          <ClientRegistrationView />
        </div>
      )}

      {/* MODAL : PASSERELLE & AGRÉGATEUR DE PAIEMENT MOBILE MONEY */}
      {isPaymentModalOpen && selectedKitForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 overflow-hidden"
          >
            {/* Header du Guichet Agrégateur */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wide">
                      Guichet Agrégateur CI
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> SSL 256-bit
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                    Versement Mobile Money - {selectedKitForPayment.kitType}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ÉTAPE 1 : FORMULAIRE DE SELECTION OPERATEUR & MONTANT */}
            {paymentStep === 'form' && (
              <form onSubmit={handleStartMobileMoneyPayment} className="space-y-4 text-xs">
                {/* Information Kit */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Abonnement Kit Cible</span>
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">Formule {selectedKitForPayment.kitType}</span>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold text-[10px]">
                      Solde : {selectedKitForPayment.balance.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>

                {/* Choix de l'opérateur Mobile Money */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                    Sélectionnez votre Opérateur Mobile Money
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'orange_money', name: 'Orange Money CI', code: '#144*82#', badgeBg: 'bg-orange-500 text-white', border: 'border-orange-500/40' },
                      { id: 'mtn_money', name: 'MTN MoMo CI', code: '*133#', badgeBg: 'bg-amber-400 text-slate-950 font-bold', border: 'border-amber-400/40' },
                      { id: 'wave', name: 'Wave CI', code: 'Direct QR / App', badgeBg: 'bg-sky-500 text-white', border: 'border-sky-500/40' },
                      { id: 'moov_money', name: 'Moov Money CI', code: '*155#', badgeBg: 'bg-blue-600 text-white', border: 'border-blue-600/40' },
                    ].map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setPaymentMethod(op.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          paymentMethod === op.id
                            ? `${op.border} bg-slate-100/80 dark:bg-slate-800/80 ring-2 ring-emerald-500`
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${op.badgeBg}`}>
                            {op.name}
                          </span>
                          {paymentMethod === op.id && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">USSD: {op.code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Saisie Numéro de téléphone Mobile Money */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Numéro de Téléphone Mobile Money à débiter
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={mobileMoneyPhone}
                      onChange={(e) => setMobileMoneyPhone(e.target.value)}
                      placeholder="Ex: 0757335370"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Saisie Montant */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Montant du Versement (FCFA)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={500}
                      step={500}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Résumé Prévisionnel */}
                {parseInt(paymentAmount, 10) > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex justify-between font-semibold">
                    <span>Nouveau solde restant après versement :</span>
                    <strong className="font-extrabold">
                      {Math.max(0, selectedKitForPayment.balance - parseInt(paymentAmount, 10)).toLocaleString()} FCFA
                    </strong>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="w-1/3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Payer via Agrégateur</span>
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 2 : CONNEXION EN COURS A L'AGREGATEUR */}
            {paymentStep === 'connecting' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Connexion au Guichet Agrégateur Mobile Money...
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Négociation de la session de paiement sécurisée pour le numéro <strong>{mobileMoneyPhone}</strong>
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-xs mx-auto">
                  <div className="bg-emerald-500 h-full w-2/3 animate-pulse"></div>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : PUSH USSD / APPROBATION MOBILE MONEY */}
            {paymentStep === 'ussd_pending' && (
              <div className="space-y-5 text-xs">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-2 text-center">
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase">
                    Réf Transaction : {aggregatorTxnRef}
                  </span>
                  <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                    {paymentMethod === 'wave'
                      ? 'Approbation Directe Wave CI'
                      : `Notification USSD envoyée au ${mobileMoneyPhone}`}
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {paymentMethod === 'wave'
                      ? `Scannez le QR Code Wave ci-dessous ou acceptez la demande de transfert de ${parseInt(paymentAmount, 10).toLocaleString()} FCFA dans l'application Wave.`
                      : `Un menu Pop-Up USSD est apparu sur votre téléphone. Saisissez votre code secret Mobile Money pour autoriser le paiement de ${parseInt(paymentAmount, 10).toLocaleString()} FCFA.`}
                  </p>
                </div>

                {paymentMethod === 'wave' ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
                    <QrCode className="w-24 h-24 text-sky-600 mx-auto" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Code QR de Paiement Sécurisé Wave CI
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-center text-xs space-y-1 shadow-inner border border-slate-800">
                    <p className="font-bold text-white">[{paymentMethod.toUpperCase()} USSD PROMPT]</p>
                    <p>Confirmer le transfert de {parseInt(paymentAmount, 10).toLocaleString()} FCFA à Penta GAD Distribution ?</p>
                    <p className="text-amber-400 font-bold">1: Entrer Code Secret</p>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isSubmittingPayment}
                    onClick={handleConfirmMobileMoneyPayment}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isSubmittingPayment ? 'Validation en cours...' : 'Simuler la confirmation USSD du Client'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStep('form')}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer text-xs"
                  >
                    Retour aux paramètres
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : REÇU ELECTRONIQUE DE VERSEMENT SUCCÈS */}
            {paymentStep === 'success' && (
              <div className="space-y-5 text-xs text-center py-2">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="font-extrabold text-base text-emerald-900 dark:text-emerald-200">
                    Versement Confirmé par l'Agrégateur !
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    {paymentSuccess}
                  </p>
                </div>

                {/* Fiche Reçu */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Référence Transaction</span>
                    <strong className="font-mono text-slate-900 dark:text-white font-extrabold">{aggregatorTxnRef}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Client</span>
                    <strong className="text-slate-900 dark:text-white font-extrabold">{activeClient.firstName} {activeClient.lastName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Montant Versé</span>
                    <strong className="text-emerald-600 font-black text-sm">{parseInt(paymentAmount, 10).toLocaleString()} FCFA</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Date & Heure</span>
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{new Date().toLocaleString('fr-FR')}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer le Reçu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setSelectedKitForPayment(null);
                      setPaymentAmount('');
                      setPaymentStep('form');
                    }}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold cursor-pointer shadow-md transition-all"
                  >
                    Fermer & Retour
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
