/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import {
  Settings,
  User,
  Shield,
  LayoutGrid,
  Sun,
  Moon,
  Database,
  Plus,
  Check,
  Smartphone,
  Sparkles,
  Info
} from 'lucide-react';
import { SettingsRepository } from '../repositories/database';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    updateUser,
    updateUserPassword,
    roles,
    modules,
    saveModule,
    theme,
    toggleTheme,
    seedData,
    loading
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'modules' | 'theme'>('profile');

  // Profil Form
  const [dispName, setDispName] = useState(currentUser?.displayName || '');
  const [pPhone, setPPhone] = useState(currentUser?.phone || '');
  const [newPass, setNewPass] = useState('');

  // Rôles Form
  const [roleName, setRoleName] = useState('');
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [rolePerms, setRolePerms] = useState<string[]>(['view_all']);

  // Nouveau Module Form (Extensibilité ERP)
  const [modId, setModId] = useState('');
  const [modName, setModName] = useState('');
  const [modIcon, setModIcon] = useState('LineChart');
  const [modRoles, setModRoles] = useState<string[]>(['super_admin', 'admin']);
  const [modDesc, setModDesc] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await updateUser(currentUser.id, {
        displayName: dispName,
        phone: pPhone
      });

      if (newPass) {
        await updateUserPassword(currentUser.id, newPass);
      }

      // Mettre à jour l'état local de l'utilisateur connecté
      const updatedUser = { ...currentUser, displayName: dispName, phone: pPhone };
      setCurrentUser(updatedUser);
      localStorage.setItem('penta_crm_user', JSON.stringify(updatedUser));

      alert("Profil mis à jour avec succès !");
      setNewPass('');
    } catch (err: any) {
      alert("Erreur de mise à jour : " + err.message);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || !roleDisplayName) return;

    try {
      const newRole = {
        id: roleName.toLowerCase().replace(/\s+/g, '_'),
        name: roleName.toLowerCase().replace(/\s+/g, '_'),
        displayName: roleDisplayName,
        permissions: rolePerms
      };

      await SettingsRepository.addRole(newRole);
      alert(`Nouveau rôle "${roleDisplayName}" enregistré avec succès !`);
      setRoleName('');
      setRoleDisplayName('');
      setRolePerms(['view_all']);
    } catch (err: any) {
      alert("Erreur de création de rôle : " + err.message);
    }
  };

  const handleRegisterNewModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modId || !modName) return;

    try {
      const newModule = {
        id: modId.toLowerCase().replace(/\s+/g, '_'),
        name: modName,
        icon: modIcon,
        enabled: true,
        rolesAllowed: modRoles,
        future: true, // Marquer comme service évolutif planifié
        description: modDesc
      };

      await saveModule(newModule);
      alert(`Service ERP "${modName}" enregistré dans le registre des modules ! Il apparaîtra instantanément dans le menu.`);
      setModId('');
      setModName('');
      setModDesc('');
    } catch (err: any) {
      alert("Erreur d'enregistrement : " + err.message);
    }
  };

  const handleReSeed = async () => {
    if (window.confirm("Voulez-vous ré-initialiser toutes les données de la base de données Firestore ? Cette action est irréversible.")) {
      await seedData();
      alert("La base de données Firestore a été réinitialisée avec succès !");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[calc(100vh-180px)] font-sans text-xs">
      {/* 1. Onglets latéraux de configuration */}
      <div className="w-full md:w-56 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" /> Mon Profil
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-colors cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Gestion des Rôles
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-colors cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Registre des Modules
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold text-left transition-colors cursor-pointer ${
            activeTab === 'theme'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-4 h-4" /> Thème & Base
        </button>
      </div>

      {/* 2. Contenu principal de l'onglet actif */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* ONGLET 1 : PROFIL */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-md">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Profil Personnel</h2>
              <p className="text-slate-500 mt-0.5">Configurez vos identifiants d'accès de PENTA GAD CRM.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom affiché partout *</label>
                <input
                  type="text"
                  required
                  value={dispName}
                  onChange={(e) => setDispName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Identifiant principal (Téléphone) *</label>
                <input
                  type="tel"
                  required
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nouveau mot de passe (Optionnel)</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
              >
                Mettre à jour
              </button>
            </form>
          </div>
        )}

        {/* ONGLET 2 : GESTION DES RÔLES */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Rôles de la plateforme</h2>
              <p className="text-slate-500 mt-0.5">Définissez et configurez des rôles pour sécuriser les fonctionnalités.</p>
            </div>

            {/* Rôles existants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map(r => (
                <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{r.displayName}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {r.name}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {r.permissions.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Formulaire nouveau rôle */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 max-w-md">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm mb-3">Créer un nouveau rôle d'équipe</h3>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">ID Rôle *</label>
                    <input
                      type="text"
                      required
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      placeholder="ex: contrôleur_zone"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom d'affichage *</label>
                    <input
                      type="text"
                      required
                      value={roleDisplayName}
                      onChange={(e) => setRoleDisplayName(e.target.value)}
                      placeholder="ex: Contrôleur de Zone"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Ajouter le rôle
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ONGLET 3 : ENREGISTREMENT DE SERVICE FUTUR (SCALABILITÉ ERP) */}
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Registre ERP & Scalabilité</h2>
              <p className="text-slate-500 mt-0.5">
                Penta GAD est conçu comme un ERP évolutif. Enregistrez des modules futurs ci-dessous pour étendre instantanément l'architecture.
              </p>
            </div>

            {/* Modules du système */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map(m => (
                <div key={m.id} className={`p-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl flex flex-col justify-between ${m.future ? 'border-dashed border-emerald-500/50 bg-emerald-500/2' : 'border-slate-150 dark:border-slate-850'}`}>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{m.name}</span>
                      {m.future ? (
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                          Futur Enregistré
                        </span>
                      ) : (
                        <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Cœur
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{m.description || "Aucune description fournie."}</p>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Icône : {m.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Formulaire d'enregistrement de service futur */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 max-w-lg">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/20 p-4 rounded-xl text-amber-800 dark:text-amber-300 mb-5 flex gap-2.5">
                <Info className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-bold mb-0.5">Architecture Évolutive Décennale</h4>
                  <p className="leading-relaxed">
                    Vous pouvez enregistrer l'un des futurs services programmés (ex: **Comptabilité**, **Stocks**, **SAV**, **RH**). Une fois enregistré, le service s'auto-enregistre dans le CRM de Penta GAD Distribution et s'affiche dynamiquement comme option planifiée dans l'application !
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm mb-3">Enregistrer un nouveau module ERP</h3>
              <form onSubmit={handleRegisterNewModule} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Clé unique du module *</label>
                    <input
                      type="text"
                      required
                      value={modId}
                      onChange={(e) => setModId(e.target.value)}
                      placeholder="ex: comptabilité"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom du service *</label>
                    <input
                      type="text"
                      required
                      value={modName}
                      onChange={(e) => setModName(e.target.value)}
                      placeholder="ex: Comptabilité & Audit"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom d'icône Lucide</label>
                    <select
                      value={modIcon}
                      onChange={(e) => setModIcon(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    >
                      <option value="TrendingUp">TrendingUp (Compta)</option>
                      <option value="Archive">Archive (Stocks)</option>
                      <option value="FileSpreadsheet">FileSpreadsheet (Facturation)</option>
                      <option value="LifeBuoy">LifeBuoy (SAV)</option>
                      <option value="HeartHandshake">HeartHandshake (RH)</option>
                      <option value="Megaphone">Megaphone (Marketing)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Rôles Autorisés</label>
                    <select
                      multiple
                      value={modRoles}
                      onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions).map(option => (option as HTMLOptionElement).value);
                        setModRoles(opts);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                      <option value="livreur">Livreur</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Description du module</label>
                  <textarea
                    value={modDesc}
                    onChange={(e) => setModDesc(e.target.value)}
                    placeholder="ex: Module de facturation comptable et de suivi des dividendes..."
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer et publier le module
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ONGLET 4 : THÈME ET BASE DE DONNÉES */}
        {activeTab === 'theme' && (
          <div className="space-y-6 max-w-md">
            <div>
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">Thème & Base de données</h2>
              <p className="text-slate-500 mt-0.5">Changer l'apparence de l'interface ou gérer l'état initial des données.</p>
            </div>

            <div className="space-y-4">
              {/* Thème */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Mode sombre / clair</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Basculez entre le thème sombre ou clair pour un confort visuel optimal.</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              </div>

              {/* Seeding */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Réinitialiser Firestore</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">Écrase et recharge des jeux de données d'exemple complets (clients, tontines, etc.).</p>
                </div>
                <button
                  onClick={handleReSeed}
                  disabled={loading}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-700/50 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md shadow-rose-500/10 flex items-center gap-1.5 transition-all"
                >
                  <Database className="w-4 h-4" /> Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
