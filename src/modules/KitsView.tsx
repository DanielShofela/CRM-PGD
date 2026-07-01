/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Truck,
  Sparkles,
  CreditCard,
  UserCheck,
  XCircle
} from 'lucide-react';
import { KitPlan } from '../types';

export const KitsView: React.FC = () => {
  const {
    kits,
    clients,
    addKitPlan,
    updateKitPlan,
    addPayment,
    searchQuery
  } = useApp();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<KitPlan | null>(null);

  // Formulaire d'inscription au kit
  const [regClient, setRegClient] = useState('');
  const [regKitType, setRegKitType] = useState('Kit Silver - Complet (25 000 FCFA)');
  const [regPrice, setRegPrice] = useState(25000);
  const [regStartDate, setRegStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [regNextDelivery, setRegNextDelivery] = useState('');

  // Formulaire d'enregistrement de paiement de kit
  const [payAmount, setPayAmount] = useState(5000);
  const [payMethod, setPayMethod] = useState<'orange_money' | 'mtn_money' | 'wave' | 'cash'>('wave');

  const kitOptions = [
    { name: 'Kit Bronze - Essentiel', price: 15000, description: 'Riz 10kg, Huile 1.5L, Sel, Pâtes alimentaires' },
    { name: 'Kit Silver - Complet', price: 25000, description: 'Riz 25kg, Huile 5L, Sucre, Pâtes, Tomate concentrée, Savon' },
    { name: 'Kit Gold - Famille', price: 45000, description: 'Riz 50kg, Huile 10L, Lait concentré, Sucre, Conserves, Pâtes, Épices' }
  ];

  const filteredPlans = kits.filter(k => {
    const clientObj = clients.find(c => c.id === k.clientId);
    if (!clientObj) return false;
    const clientName = `${clientObj.firstName} ${clientObj.lastName}`.toLowerCase();
    return clientName.includes(searchQuery.toLowerCase()) || k.kitType.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenRegisterModal = () => {
    setRegClient(clients[0]?.id || '');
    const defaultKit = kitOptions[1];
    setRegKitType(defaultKit.name);
    setRegPrice(defaultKit.price);
    setRegStartDate(new Date().toISOString().split('T')[0]);

    // Livraison par défaut dans 14 jours
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 14);
    setRegNextDelivery(deliveryDate.toISOString().split('T')[0]);

    setIsRegisterModalOpen(true);
  };

  const handleKitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setRegKitType(selectedName);
    const matched = kitOptions.find(opt => opt.name === selectedName);
    if (matched) {
      setRegPrice(matched.price);
    }
  };

  const handleRegisterPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regClient || !regKitType) return;

    const endDate = new Date(regStartDate);
    endDate.setMonth(endDate.getMonth() + 12); // Abonnement d'un an par défaut

    const newPlan = {
      clientId: regClient,
      kitType: regKitType,
      status: 'active' as const,
      price: regPrice,
      balance: 0, // Payé 0 au départ
      startDate: regStartDate,
      endDate: endDate.toISOString().split('T')[0],
      nextDeliveryDate: regNextDelivery
    };

    try {
      await addKitPlan(newPlan);
      setIsRegisterModalOpen(false);
    } catch (err: any) {
      alert("Erreur lors de l'inscription : " + err.message);
    }
  };

  const handleOpenPaymentModal = (plan: KitPlan) => {
    setSelectedPlan(plan);
    setPayAmount(plan.price - plan.balance); // Proposer de payer le solde restant
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const updatedBalance = selectedPlan.balance + payAmount;
      const isPaidFully = updatedBalance >= selectedPlan.price;

      // 1. Mettre à jour le solde du plan dans Firestore
      await updateKitPlan(selectedPlan.id, {
        balance: updatedBalance
      });

      // 2. Enregistrer un paiement financier
      await addPayment({
        clientId: selectedPlan.clientId,
        amount: payAmount,
        type: 'kit',
        referenceId: selectedPlan.id,
        date: new Date().toISOString().split('T')[0],
        method: payMethod
      });

      setIsPaymentModalOpen(false);
      alert("Paiement de kit enregistré avec succès !");
    } catch (err: any) {
      alert("Erreur lors du paiement : " + err.message);
    }
  };

  const handleToggleStatus = async (plan: KitPlan) => {
    const newStatus = plan.status === 'active' ? 'suspended' : 'active';
    if (window.confirm(`Voulez-vous modifier le statut de l'abonnement en : ${newStatus === 'active' ? 'Actif' : 'Suspendu'} ?`)) {
      await updateKitPlan(plan.id, { status: newStatus });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            Kits Alimentaires
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérer les abonnements de paniers alimentaires et les livraisons récurrentes.
          </p>
        </div>
        <button
          onClick={handleOpenRegisterModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Nouvelle Inscription
        </button>
      </div>

      {/* 2. Affichage des Kits Disponibles au catalogue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kitOptions.map((opt, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className="font-bold text-slate-900 dark:text-white font-display text-sm">{opt.name}</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{opt.description}</p>
            </div>
            <div className="flex items-baseline gap-1.5 border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-3">
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-display">{opt.price.toLocaleString('fr-FR')}</span>
              <span className="text-xs text-slate-400">FCFA / mois</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Tableau de bord des inscriptions actives */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white font-display text-sm">Abonnements de kits enregistrés</h2>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Client</th>
                <th className="p-4">Type de Kit</th>
                <th className="p-4">Dates d'Abonnement</th>
                <th className="p-4">Prochaine Livraison</th>
                <th className="p-4">Solde & Paiement</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Aucun plan de kit trouvé.
                  </td>
                </tr>
              ) : (
                filteredPlans.map(k => {
                  const clientObj = clients.find(c => c.id === k.clientId);
                  const isFullyPaid = k.balance >= k.price;
                  return (
                    <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : "Client Inconnu"}
                        </div>
                        <div className="text-slate-400 mt-0.5">{clientObj?.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{k.kitType}</div>
                        <div className="text-slate-400 mt-0.5">{k.price.toLocaleString('fr-FR')} FCFA</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-500">Début : {k.startDate}</div>
                        <div className="text-slate-400 mt-0.5">Fin : {k.endDate}</div>
                      </td>
                      <td className="p-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                          <Truck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{k.nextDeliveryDate}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {k.balance.toLocaleString('fr-FR')} / {k.price.toLocaleString('fr-FR')} F
                          </span>
                          {isFullyPaid ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (k.balance / k.price) * 100)}%` }}></div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(k)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            k.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                          }`}
                        >
                          {k.status === 'active' ? 'Actif' : 'Suspendu'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenPaymentModal(k)}
                          disabled={isFullyPaid}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Payer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL D'INSCRIPTION AU KIT */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">Abonnement Kit Alimentaire</h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPlan} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Sélectionner le client *</label>
                <select
                  value={regClient}
                  onChange={(e) => setRegClient(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Type de Kit Alimentaire *</label>
                <select
                  value={regKitType}
                  onChange={handleKitTypeChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {kitOptions.map((opt, i) => (
                    <option key={i} value={opt.name}>
                      {opt.name} ({opt.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Date de début</label>
                  <input
                    type="date"
                    value={regStartDate}
                    onChange={(e) => setRegStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Première livraison</label>
                  <input
                    type="date"
                    value={regNextDelivery}
                    onChange={(e) => setRegNextDelivery(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Inscrire
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. MODAL DE PAIEMENT DU KIT */}
      {isPaymentModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">Paiement de Kit Alimentaire</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <p>Plan : <strong>{selectedPlan.kitType}</strong></p>
                <p>Montant total : <strong>{selectedPlan.price.toLocaleString('fr-FR')} FCFA</strong></p>
                <p>Déjà versé : <strong>{selectedPlan.balance.toLocaleString('fr-FR')} FCFA</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Montant à payer (FCFA)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Mode de règlement</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="wave">Wave Mobile Money</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="mtn_money">MTN Mobile Money</option>
                  <option value="cash">Espèces (Direct)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
