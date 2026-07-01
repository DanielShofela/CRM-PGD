/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Phone, Lock, ShieldCheck, HelpCircle, Smartphone, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, error, setError, seedData, loading, platformSettings } = useApp();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setError(null);

    if (!phone || !password) {
      setLocalError("Veuillez remplir tous les champs.");
      return;
    }

    // Validation simple du numéro de téléphone
    if (phone.length < 8) {
      setLocalError("Le numéro de téléphone doit contenir au moins 8 chiffres.");
      return;
    }

    await login(phone, password);
  };

  const handleSeed = async () => {
    if (window.confirm("Voulez-vous initialiser la base de données de Penta GAD ? Cela configurera les accès système et créera l'unique compte d'administrateur suprême.")) {
      await seedData();
      alert("Base de données initialisée avec succès !\n\nVous pouvez maintenant vous connecter en tant qu'Admin Suprême avec :\nTéléphone : 0170561121\nMot de passe : 70561121Daniel 19");
      setPhone('0170561121');
      setPassword('70561121Daniel 19');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-12 left-12 w-96 h-96 bg-emerald-400 rounded-full filter blur-[120px]"></div>
        <div className="absolute bottom-12 right-12 w-96 h-96 bg-blue-500 rounded-full filter blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800/80 p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4 shadow-sm items-center justify-center">
            {platformSettings.siteIconUrl ? (
              <img 
                src={platformSettings.siteIconUrl} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-xl" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <Smartphone className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight">
            {platformSettings.siteName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
            Portail CRM & ERP Intégré
          </p>
        </div>

        {(error || localError) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-sm text-rose-600 dark:text-rose-400"
          >
            {error || localError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Numéro de téléphone
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Phone className="w-5 h-5" />
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 07XXXXXXXX"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>


      </motion.div>
    </div>
  );
};
