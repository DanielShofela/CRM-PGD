/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  Truck,
  Plus,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  TrendingUp,
  KeyRound,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Delivery } from '../types';

export const DeliveriesView: React.FC = () => {
  const {
    deliveries,
    clients,
    users, // charger les utilisateurs pour trouver les livreurs
    addDelivery,
    updateDelivery,
    searchQuery
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Formulaire de création de livraison
  const [devClient, setDevClient] = useState('');
  const [devItems, setDevItems] = useState('Kit Silver - Riz 25kg, Huile 5L, Sucre');
  const [devLivreur, setDevLivreur] = useState('');
  const [devAddress, setDevAddress] = useState('');
  const [devCommune, setDevCommune] = useState('Cocody');
  const [devQuartier, setDevQuartier] = useState('');
  const [devDate, setDevDate] = useState(new Date().toISOString().split('T')[0]);
  const [devTime, setDevTime] = useState('12:00');

  // Code de confirmation d'achèvement de livraison
  const [inputConfirmCode, setInputConfirmCode] = useState('');

  // Filtrer les utilisateurs ayant le rôle 'livreur'
  const livreursList = users.filter(u => u.role === 'livreur' || u.role === 'super_admin');

  const filteredDeliveries = deliveries.filter(d => {
    const clientObj = clients.find(c => c.id === d.clientId);
    if (!clientObj) return false;
    const clientName = `${clientObj.firstName} ${clientObj.lastName}`.toLowerCase();
    const driverObj = users.find(u => u.id === d.livreurId);
    const driverName = driverObj ? driverObj.displayName.toLowerCase() : '';
    const query = searchQuery.toLowerCase();
    return (
      clientName.includes(query) ||
      d.commune.toLowerCase().includes(query) ||
      driverName.includes(query)
    );
  });

  const handleOpenCreateModal = () => {
    setDevClient(clients[0]?.id || '');
    setDevItems('Kit Silver - Riz 25kg, Huile 5L, Sucre');
    setDevLivreur(livreursList[0]?.id || '');
    setDevAddress('');
    setDevCommune('Cocody');
    setDevQuartier('');
    setDevDate(new Date().toISOString().split('T')[0]);
    setDevTime('12:00');
    setIsCreateModalOpen(true);
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devClient || !devItems || !devLivreur) {
      alert("Veuillez renseigner toutes les informations obligatoires.");
      return;
    }

    const newDelivery = {
      clientId: devClient,
      orderItems: devItems,
      livreurId: devLivreur,
      address: devAddress,
      commune: devCommune,
      quartier: devQuartier,
      status: 'pending' as const,
      date: devDate,
      time: devTime
    };

    try {
      await addDelivery(newDelivery);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert("Erreur lors de la création de la livraison : " + err.message);
    }
  };

  const handleOpenVerifyModal = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setInputConfirmCode('');
    setIsVerifyModalOpen(true);
  };

  const handleVerifyAndDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery) return;

    if (inputConfirmCode === selectedDelivery.confirmationCode) {
      try {
        await updateDelivery(selectedDelivery.id, {
          status: 'delivered'
        });
        setIsVerifyModalOpen(false);
        alert("Livraison validée avec succès !");
      } catch (err: any) {
        alert("Erreur de validation : " + err.message);
      }
    } else {
      alert("Code de confirmation incorrect. Veuillez demander le code à 4 chiffres envoyé au client.");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: Delivery['status']) => {
    if (newStatus === 'delivered') {
      const deliveryObj = deliveries.find(d => d.id === id);
      if (deliveryObj) {
        handleOpenVerifyModal(deliveryObj);
      }
    } else {
      if (window.confirm(`Voulez-vous marquer cette livraison comme : ${newStatus === 'out_for_delivery' ? 'En cours de livraison' : 'Annulée'} ?`)) {
        await updateDelivery(id, { status: newStatus });
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Create Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            Livraisons
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Suivi des courses, attribution des livreurs et confirmation sécurisée par code secret.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Programmer une livraison
        </button>
      </div>

      {/* 2. Grid de cartes de livraison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {filteredDeliveries.length === 0 ? (
          <div className="md:col-span-3 text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune livraison enregistrée.</p>
          </div>
        ) : (
          filteredDeliveries.map(d => {
            const clientObj = clients.find(c => c.id === d.clientId);
            const driverObj = users.find(u => u.id === d.livreurId);

            return (
              <div key={d.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
                {/* Visual Accent bar depending on status */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  d.status === 'delivered' ? 'bg-emerald-500' :
                  d.status === 'out_for_delivery' ? 'bg-blue-500' :
                  d.status === 'cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                }`}></div>

                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Livraison ID</span>
                      <h4 className="font-mono text-slate-600 dark:text-slate-300">#{d.id.substring(0, 8)}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      d.status === 'delivered' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                      d.status === 'out_for_delivery' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' :
                      d.status === 'cancelled' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' :
                      'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    }`}>
                      {d.status === 'delivered' ? 'Livré' :
                       d.status === 'out_for_delivery' ? 'En cours' :
                       d.status === 'cancelled' ? 'Annulé' : 'En attente'}
                    </span>
                  </div>

                  {/* Client Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : "Client Inconnu"}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{clientObj?.phone}</p>
                      </div>
                    </div>

                    {/* Address & Items */}
                    <div className="flex items-start gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-300">📍 {d.commune}, {d.quartier}</p>
                        <p className="text-[10px] mt-0.5">{d.address}</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="font-bold text-[9px] uppercase tracking-wider text-slate-400 mb-1">Détails de la commande</p>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">{d.orderItems}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Driver, Code & Controls */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-4 space-y-3.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {d.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {d.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Livreur assigné :</span>
                    <strong className="text-slate-700 dark:text-slate-300">{driverObj ? driverObj.displayName : "Aucun"}</strong>
                  </div>

                  {/* Boutons d'actions logistiques */}
                  <div className="flex gap-2 pt-1">
                    {d.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'out_for_delivery')}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-sm shadow-blue-500/5 transition-all text-center"
                        >
                          Démarrer course
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'cancelled')}
                          className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-xl cursor-pointer"
                        >
                          Annuler
                        </button>
                      </>
                    )}

                    {d.status === 'out_for_delivery' && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'delivered')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-sm shadow-emerald-500/5 transition-all flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Valider avec Code Secret
                      </button>
                    )}

                    {d.status === 'delivered' && (
                      <div className="w-full p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-950/60 rounded-xl flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] uppercase tracking-wider">
                        <CheckCircle className="w-4 h-4" /> Livré et confirmé
                      </div>
                    )}

                    {d.status === 'cancelled' && (
                      <div className="w-full p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-950/60 rounded-xl flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-[10px] uppercase tracking-wider">
                        <XCircle className="w-4 h-4" /> Livraison Annulée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. MODAL DE CRÉATION DE LIVRAISON */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">Programmer Livraison</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Client Destinataire *</label>
                <select
                  value={devClient}
                  onChange={(e) => setDevClient(e.target.value)}
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
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Commande / Kit Alimentaire *</label>
                <input
                  type="text"
                  required
                  value={devItems}
                  onChange={(e) => setDevItems(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Livreur en charge *</label>
                <select
                  value={devLivreur}
                  onChange={(e) => setDevLivreur(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {livreursList.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Commune</label>
                  <select
                    value={devCommune}
                    onChange={(e) => setDevCommune(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="Cocody">Cocody</option>
                    <option value="Yopougon">Yopougon</option>
                    <option value="Abobo">Abobo</option>
                    <option value="Marcory">Marcory</option>
                    <option value="Plateau">Plateau</option>
                    <option value="Koumassi">Koumassi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Quartier</label>
                  <input
                    type="text"
                    value={devQuartier}
                    onChange={(e) => setDevQuartier(e.target.value)}
                    placeholder="Ex: Sogefiha"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Adresse complète</label>
                <input
                  type="text"
                  value={devAddress}
                  onChange={(e) => setDevAddress(e.target.value)}
                  placeholder="Rue, Villa, Repères"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Date programmée</label>
                  <input
                    type="date"
                    value={devDate}
                    onChange={(e) => setDevDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Heure de passage</label>
                  <input
                    type="time"
                    value={devTime}
                    onChange={(e) => setDevTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
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
                  Programmer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 4. MODAL DE CONFIRMATION PAR CODE SECRET */}
      {isVerifyModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">Confirmation Sécurisée</h3>
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyAndDeliver} className="p-6 space-y-4 text-sm text-center">
              <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-2">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                Pour finaliser et valider la livraison, veuillez saisir le code de confirmation secret à 4 chiffres fourni par le client.
              </p>

              <div>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={inputConfirmCode}
                  onChange={(e) => setInputConfirmCode(e.target.value)}
                  placeholder="Saisir code à 4 chiffres"
                  className="w-full text-center tracking-widest text-lg font-bold px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Petit rappel pour la démo */}
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-xl text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Rappel de démo : Le code pour cette livraison est <strong>{selectedDelivery.confirmationCode}</strong></span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Valider
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
