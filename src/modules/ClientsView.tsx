/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Paperclip,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Phone,
  MapPin,
  Tag,
  CreditCard,
  Calendar,
  X,
  Briefcase,
  Share2,
  Link as LinkIcon,
  UploadCloud,
  AlertCircle
} from 'lucide-react';
import { Client, Attachment } from '../types';

// Image Compression Helper
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
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// File to Base64 Helper
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export const ClientsView: React.FC = () => {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
    payments,
    kits,
    tontines,
    searchQuery
  } = useApp();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterCommune, setFilterCommune] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Formulaire d'édition / création
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Champs de formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [observations, setObservations] = useState('');

  // Extensibilité : gestion des champs personnalisés
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [customFieldsList, setCustomFieldsList] = useState<Record<string, string>>({});

  // Pièces jointes temporaires
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentsList, setAttachmentsList] = useState<Attachment[]>([]);

  // Drag and Drop & Real File Upload States & Refs
  const [dragActivePhoto, setDragActivePhoto] = useState(false);
  const [dragActiveFile, setDragActiveFile] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Custom Confirmation Dialog and Toast States
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    isDanger: false
  });

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleShareRegisterLink = () => {
    const registerUrl = window.location.origin + window.location.pathname + '?register=true';
    navigator.clipboard.writeText(registerUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }).catch(err => {
      console.error(err);
      alert("Lien d'inscription : " + registerUrl);
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez charger un fichier image.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPhotoUrl(compressed);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du traitement de l'image.");
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("La taille maximale autorisée est de 2 Mo.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const newAttachment: Attachment = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        url: base64,
        uploadedAt: new Date().toISOString()
      };
      setAttachmentsList(prev => [...prev, newAttachment]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement du fichier.");
    }
  };

  // Liste des communes uniques pour filtrage
  const communes = Array.from(new Set(clients.map(c => c.commune))).filter(Boolean);

  // Filtrer les clients
  const filteredClients = clients.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const queryMatch = fullName.includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery);
    const communeMatch = filterCommune === 'all' || c.commune === filterCommune;
    const statusMatch = filterStatus === 'all' || c.status === filterStatus;
    return queryMatch && communeMatch && statusMatch;
  });

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setAddress('');
    setCommune('Cocody');
    setQuartier('');
    setPhotoUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
    setStatus('active');
    setObservations('');
    setCustomFieldsList({});
    setAttachmentsList([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setIsEditing(true);
    setEditingId(client.id);
    setFirstName(client.firstName);
    setLastName(client.lastName);
    setPhone(client.phone);
    setAddress(client.address);
    setCommune(client.commune);
    setQuartier(client.quartier);
    setPhotoUrl(client.photoUrl);
    setStatus(client.status);
    setObservations(client.observations);
    setCustomFieldsList(client.customFields || {});
    setAttachmentsList(client.attachments || []);
    setIsModalOpen(true);
  };

  const handleAddCustomField = () => {
    if (!customFieldName || !customFieldValue) return;
    setCustomFieldsList(prev => ({
      ...prev,
      [customFieldName]: customFieldValue
    }));
    setCustomFieldName('');
    setCustomFieldValue('');
  };

  const handleRemoveCustomField = (key: string) => {
    const updated = { ...customFieldsList };
    delete updated[key];
    setCustomFieldsList(updated);
  };

  const handleAddAttachment = () => {
    if (!attachmentName) return;
    const newAttachment: Attachment = {
      id: Math.random().toString(36).substring(7),
      name: attachmentName,
      size: Math.floor(Math.random() * (5000000 - 50000) + 50000), // Taille fictive
      type: attachmentName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
      url: '#',
      uploadedAt: new Date().toISOString()
    };
    setAttachmentsList(prev => [...prev, newAttachment]);
    setAttachmentName('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachmentsList(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      alert("Le numéro de téléphone est obligatoire.");
      return;
    }

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      commune,
      quartier: quartier.trim(),
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      status,
      observations: observations.trim(),
      customFields: customFieldsList,
      attachments: attachmentsList
    };

    try {
      if (isEditing && editingId) {
        await updateClient(editingId, payload);
      } else {
        await addClient(payload);
      }
      setIsModalOpen(false);
      // Actualiser le client sélectionné s'il était ouvert
      if (editingId && selectedClient?.id === editingId) {
        setSelectedClient({ id: editingId, createdAt: selectedClient.createdAt, ...payload });
      }
    } catch (err: any) {
      if (err.message === "L'utilisateur est déjà inscrit.") {
        alert(err.message);
      } else {
        alert("Erreur de sauvegarde : " + err.message);
      }
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer définitivement le client",
      message: "Êtes-vous sûr de vouloir supprimer définitivement ce client ? Cette action est irréversible.",
      confirmText: "Oui, supprimer",
      cancelText: "Annuler",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteClient(id);
          setSelectedClient(null);
          showToast("Client supprimé avec succès !", "success");
        } catch (err: any) {
          showToast("Erreur de suppression : " + err.message, "error");
        }
      }
    });
  };

  // Récupérer l'historique du client sélectionné
  const getClientHistory = (clientId: string) => {
    const clientPayments = payments.filter(p => p.clientId === clientId);
    const clientKits = kits.filter(k => k.clientId === clientId);
    const clientTontines = tontines.filter(t => t.memberIds.includes(clientId));
    return { clientPayments, clientKits, clientTontines };
  };

  const { clientPayments, clientKits, clientTontines } = selectedClient
    ? getClientHistory(selectedClient.id)
    : { clientPayments: [], clientKits: [], clientTontines: [] };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* 1. Sidebar - Liste des clients avec filtres */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-160px)]">
        {/* En-tête liste */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white font-display text-lg">Clients</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShareRegisterLink}
                title="Partager le lien d'inscription public"
                className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-1 transition-all ${
                  copiedLink
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {copiedLink ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span className="sr-only sm:not-sr-only text-[11px] font-semibold">{copiedLink ? "Copié !" : "Partager"}</span>
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm cursor-pointer flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtres de la liste */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Commune</label>
              <select
                value={filterCommune}
                onChange={(e) => setFilterCommune(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
              >
                <option value="all">Toutes</option>
                {communes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Statut</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
              >
                <option value="all">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste défilante */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              Aucun client trouvé.
            </div>
          ) : (
            filteredClients.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-950 flex items-center gap-3 cursor-pointer transition-colors ${
                  selectedClient?.id === c.id ? 'bg-slate-100/70 dark:bg-slate-950' : ''
                }`}
              >
                <img
                  src={c.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {`${c.firstName || ''} ${c.lastName || ''}`.trim() || `Client (${c.phone})`}
                    </h4>
                    <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{c.phone}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    📍 {c.commune} - {c.quartier}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main panel - Fiche détaillée extensible */}
      <div className="lg:col-span-2 space-y-6">
        {selectedClient ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profil Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedClient.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/10"
                  />
                  <div>
                    <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                      {`${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() || `Client (${selectedClient.phone})`}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedClient.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpenEditModal(selectedClient)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(selectedClient.id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Détails de base */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Adresse géographique</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {selectedClient.address || "Non renseignée"}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">
                        Commune : {selectedClient.commune} - Quartier : {selectedClient.quartier || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Observations</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                        {selectedClient.observations || "Aucune observation."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extensibilité: Champs personnalisés affichés ici */}
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <Briefcase className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="w-full">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Informations Complémentaires</p>
                      {Object.keys(selectedClient.customFields || {}).length === 0 ? (
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          Aucun champ personnalisé configuré pour ce client.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {Object.entries(selectedClient.customFields || {}).map(([key, val]) => (
                            <div key={key} className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                              <span className="text-slate-400 uppercase font-bold text-[9px] block">{key}</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pièces jointes */}
                  <div className="flex items-start gap-2.5">
                    <Paperclip className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="w-full">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Pièces jointes</p>
                      {(!selectedClient.attachments || selectedClient.attachments.length === 0) ? (
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                          Aucune pièce jointe (CNI, contrat, etc.).
                        </p>
                      ) : (
                        <div className="space-y-1.5 mt-2">
                          {selectedClient.attachments.map(att => (
                            <div key={att.id} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs">
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</span>
                                <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(0)} KB)</span>
                              </div>
                              {att.url && att.url !== '#' && (
                                <a 
                                  href={att.url} 
                                  download={att.name}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-semibold transition-colors"
                                >
                                  Télécharger
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historique Financier, Tontine & Kits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tontine & Kits */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-1.5 text-sm">
                  <Tag className="w-4 h-4 text-emerald-500" /> Abonnements & Tontines
                </h3>

                <div className="space-y-3.5">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Tontines Actives</h4>
                    {clientTontines.length === 0 ? (
                      <p className="text-xs text-slate-400">Inscrit dans aucune tontine.</p>
                    ) : (
                      clientTontines.map(t => (
                        <div key={t.id} className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-950/60 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-indigo-900 dark:text-indigo-300">{t.name}</span>
                            <p className="text-[10px] text-slate-400">Cotisation : {t.amount} FCFA - {t.cycle}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                            {t.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">Kits Alimentaires</h4>
                    {clientKits.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucun abonnement kit.</p>
                    ) : (
                      clientKits.map(k => (
                        <div key={k.id} className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/40 dark:border-amber-950/60 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-amber-900 dark:text-amber-300">{k.kitType}</span>
                            <p className="text-[10px] text-slate-400">Date prochaine livraison : {k.nextDeliveryDate}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            {k.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Historique des paiements */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white font-display flex items-center gap-1.5 text-sm mb-3">
                  <CreditCard className="w-4 h-4 text-emerald-500" /> Historique Financier
                </h3>

                <div className="flex-1 overflow-y-auto max-h-48 space-y-2 pr-1">
                  {clientPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Aucun paiement enregistré.</p>
                  ) : (
                    clientPayments.map(p => (
                      <div key={p.id} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white capitalize">{p.type}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">via {p.method}</span>
                          <p className="text-[10px] text-slate-400">{p.date}</p>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          +{p.amount.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm text-center text-slate-400 dark:text-slate-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun client sélectionné</p>
            <p className="text-xs mt-1">Sélectionnez un client dans la colonne latérale pour afficher sa fiche complète extensible.</p>
          </div>
        )}
      </div>

      {/* 3. MODAL CRÉATION / MODIFICATION CLIENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">
                {isEditing ? "Modifier la fiche client" : "Nouveau client"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Prénom (Optionnel)</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean-Marc"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom de famille (Optionnel)</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Kouassi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0749123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Photo de profil</label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragActivePhoto(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActivePhoto(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActivePhoto(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handlePhotoUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3 ${
                      dragActivePhoto 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                        : 'border-slate-200 hover:border-emerald-500/50 dark:border-slate-800 dark:hover:border-emerald-800/50'
                    }`}
                  >
                    <input 
                      ref={photoInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handlePhotoUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden" 
                    />
                    {photoUrl ? (
                      <img src={photoUrl} alt="Aperçu" className="w-9 h-9 rounded-full object-cover border border-slate-200/50" />
                    ) : (
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="text-left">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {photoUrl ? "Changer de photo" : "Uploader la photo"}
                      </p>
                      <p className="text-[10px] text-slate-400">Glisser-déposer ou cliquer</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Commune</label>
                  <select
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="Cocody">Cocody</option>
                    <option value="Yopougon">Yopougon</option>
                    <option value="Abobo">Abobo</option>
                    <option value="Marcory">Marcory</option>
                    <option value="Plateau">Plateau</option>
                    <option value="Treichville">Treichville</option>
                    <option value="Koumassi">Koumassi</option>
                    <option value="Adjamé">Adjamé</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Quartier</label>
                  <input
                    type="text"
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    placeholder="Angré 7ème Tranche"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Statut</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Adresse Géographique</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Cité Verte, Villa 45"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Observations</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notes importantes concernant les préférences de paiement ou de livraison..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* SECTION EXTENSION - CHAMPS PERSONNALISÉS */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 font-display">Extensibilité : Propriétés personnalisées</h4>
                <p className="text-xs text-slate-400 mb-3">Ajoutez n'importe quelle information complémentaire (ex: Profession, Parrain, Groupe Sanguin, etc.) sans modifier la base de données.</p>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                    placeholder="Clé (ex: Profession)"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={customFieldValue}
                    onChange={(e) => setCustomFieldValue(e.target.value)}
                    placeholder="Valeur (ex: Médecin)"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Liste des propriétés personnalisées */}
                {Object.keys(customFieldsList).length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    {Object.entries(customFieldsList).map(([key, value]) => (
                      <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                        <strong>{key}:</strong> {value}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(key)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION PIÈCES JOINTES */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 font-display">Pièces jointes</h4>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActiveFile(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActiveFile(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleAttachmentUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 ${
                    dragActiveFile 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                      : 'border-slate-200 hover:border-emerald-500/50 dark:border-slate-800 dark:hover:border-emerald-800/50'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleAttachmentUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                  <UploadCloud className="w-7 h-7 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Déposer un document ou cliquer pour parcourir</p>
                    <p className="text-[10px] text-slate-400">Fichiers autorisés: Images, PDF, Docs (Max 2 Mo)</p>
                  </div>
                </div>

                {attachmentsList.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {attachmentsList.map(att => (
                      <div key={att.id} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{att.name}</span>
                          <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer text-[10px]"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  {isEditing ? "Enregistrer" : "Créer le client"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Global Custom Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden text-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
                  confirmDialog.isDanger 
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-grow">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight font-display">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[10px] cursor-pointer transition-colors"
                >
                  {confirmDialog.cancelText || 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    await confirmDialog.onConfirm();
                  }}
                  className={`px-4 py-2 text-white font-bold rounded-xl text-[10px] cursor-pointer shadow-md transition-colors ${
                    confirmDialog.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/15' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/15'
                  }`}
                >
                  {confirmDialog.confirmText || 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Custom Toast */}
      <AnimatePresence>
        {toast.show && (
          <div className="fixed bottom-6 right-6 z-[110] max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`p-3 rounded-2xl border flex items-center gap-2.5 shadow-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : toast.type === 'error'
                  ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-100 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                  : 'bg-slate-50/95 dark:bg-slate-950/90 border-slate-150 dark:border-slate-850 text-slate-800 dark:text-slate-200'
              }`}
            >
              <CheckCircle className={`w-4 h-4 flex-shrink-0 ${
                toast.type === 'success' 
                  ? 'text-emerald-500' 
                  : toast.type === 'error'
                  ? 'text-rose-500' 
                  : 'text-slate-500'
              }`} />
              <p className="text-[10px] font-bold leading-tight">{toast.message}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
