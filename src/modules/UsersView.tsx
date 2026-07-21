/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Phone,
  User,
  ShieldCheck,
  Check,
  X,
  Lock,
  UserCheck,
  UserX
} from 'lucide-react';
import { User as UserType } from '../types';

export const UsersView: React.FC = () => {
  const {
    users,
    roles,
    addUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    searchQuery
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire champs
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('agent');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const filteredUsers = users.filter(u => {
    const nameMatch = u.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = u.phone.includes(searchQuery);
    return nameMatch || phoneMatch;
  });

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setDisplayName('');
    setPhone('');
    setPassword('');
    setRole('agent');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserType) => {
    setIsEditing(true);
    setEditingId(user.id);
    setDisplayName(user.displayName);
    setPhone(user.phone);
    setPassword(''); // On ne remplit pas le mot de passe pour des raisons de sécurité
    setRole(user.role);
    setStatus(user.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !phone) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      if (isEditing && editingId) {
        // Mise à jour des informations
        await updateUser(editingId, {
          displayName,
          phone,
          role,
          status
        });

        // Si l'utilisateur a rentré un nouveau mot de passe, on le met à jour séparément
        if (password) {
          await updateUserPassword(editingId, password);
        }
      } else {
        if (!password) {
          alert("Le mot de passe est obligatoire lors de la création d'un utilisateur.");
          return;
        }
        await addUser({
          displayName,
          phone,
          role,
          status
        }, password);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.message === "L'utilisateur est déjà inscrit.") {
        alert(err.message);
      } else {
        alert("Erreur de sauvegarde : " + err.message);
      }
    }
  };

  const handleToggleStatus = async (user: UserType) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    if (window.confirm(`Voulez-vous modifier le statut de ${user.displayName} en : ${nextStatus === 'active' ? 'Actif' : 'Inactif'} ?`)) {
      await updateUser(user.id, { status: nextStatus });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur de l'équipe ?")) {
      try {
        await deleteUser(id);
      } catch (err: any) {
        alert("Erreur de suppression : " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            Utilisateurs & Équipe
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gérer les accès, les rôles des agents de terrain, des livreurs et des administrateurs.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Ajouter un collaborateur
        </button>
      </div>

      {/* 2. Tableau des collaborateurs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white font-display text-sm">Membres de l'équipe enregistrés</h2>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Nom de profil</th>
                <th className="p-4">Identifiant (Téléphone)</th>
                <th className="p-4">Rôle assigné</th>
                <th className="p-4">Date de création</th>
                <th className="p-4 text-center">Accès</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Aucun membre d'équipe trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const roleObj = roles.find(r => r.id === u.role);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold rounded-lg flex items-center justify-center">
                          {u.displayName.charAt(0)}
                        </div>
                        <span>{u.displayName}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                        {u.phone}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg capitalize font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          {roleObj ? roleObj.displayName : u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-200'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" /> Actif
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" /> Inactif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 3. MODAL DE CRÉATION / MODIFICATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-md">
                {isEditing ? "Modifier Collaborateur" : "Nouveau Collaborateur"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom de profil (Affiché partout) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Fatim Cissé"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Numéro de téléphone (Identifiant unique) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 0505050505"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                  {isEditing ? "Nouveau Mot de passe (Laisser vide pour ne pas modifier)" : "Mot de passe sécurisé *"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required={!isEditing}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Accès initial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs"
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  {isEditing ? "Sauvegarder" : "Créer le collaborateur"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
