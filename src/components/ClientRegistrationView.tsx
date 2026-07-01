/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { ClientRepository, ActivityRepository, NotificationRepository } from '../repositories/database';
import { motion } from 'motion/react';
import { 
  Phone, 
  User, 
  MapPin, 
  Camera, 
  UploadCloud, 
  FileText, 
  Paperclip, 
  CheckCircle, 
  ArrowLeft,
  X,
  Sparkles
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

export const ClientRegistrationView: React.FC = () => {
  // Champs
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [commune, setCommune] = useState('Cocody');
  const [quartier, setQuartier] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  
  // Photo & Pièces Jointes
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);
  const [dragActiveFile, setDragActiveFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPhotoDataUrl(compressed);
    } catch (err) {
      console.error(err);
      alert("Erreur de traitement de l'image.");
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert("La taille du fichier ne doit pas dépasser 2 Mo.");
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
      setAttachments(prev => [...prev, newAttachment]);
    } catch (err) {
      console.error(err);
      alert("Erreur de traitement de la pièce jointe.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Seul le numéro de téléphone est obligatoire
    if (!phone.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      return;
    }

    setLoading(true);

    try {
      const payload: Omit<Client, 'id' | 'createdAt'> = {
        phone: phone.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        commune,
        quartier: quartier.trim(),
        address: address.trim(),
        photoUrl: photoDataUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        status: 'active',
        observations: observations.trim() || 'Auto-inscrit via le lien public.',
        customFields: { modeInscription: 'Lien public de partage' },
        attachments: attachments
      };

      await ClientRepository.create(payload);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError("Une erreur est survenue lors de l'enregistrement : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Inscription Réussie !</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Vos coordonnées ont été transmises avec succès à l'équipe de **Penta GAD Distribution**.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Récapitulatif de votre profil :</p>
            <div className="grid grid-cols-2 gap-2 text-slate-500">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Téléphone</span>
                <strong>{phone}</strong>
              </div>
              {firstName || lastName ? (
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Nom</span>
                  <strong>{firstName} {lastName}</strong>
                </div>
              ) : null}
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Commune / Quartier</span>
                <strong>{commune} {quartier ? `- ${quartier}` : ''}</strong>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            Vous pouvez fermer cette page. Notre équipe prendra contact avec vous prochainement.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center py-10 px-4 font-sans">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-1.5 max-w-md">
        <div className="inline-flex p-3 bg-emerald-600 text-white rounded-2xl shadow-md mb-2">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">Penta GAD Distribution</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider font-semibold">
          Fiche d'auto-inscription client
        </p>
      </div>

      <motion.div 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40">
          <h2 className="font-bold text-slate-800 dark:text-white text-base">Remplissez vos informations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Veuillez renseigner vos coordonnées pour simplifier vos tontines et vos livraisons.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Téléphone (Obligatoire) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Numéro de téléphone <span className="text-rose-500">* obligatoire</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 0749123456"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 focus:border-emerald-500 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Prénom & Nom de famille (Optionnels) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Prénom (Optionnel)</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Jean-Marc"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Nom (Optionnel)</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Kouassi"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Commune & Quartier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Quartier (Optionnel)</label>
              <input
                type="text"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ex: Angré 7ème Tranche"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Adresse Géographique */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Adresse Géographique (Optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Cité Verte, Villa 45, face à la pharmacie"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Photo de profil (UPLOADER REEL) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" /> Photo de Profil (Optionnel)
            </label>
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragActivePhoto(true); }}
              onDragLeave={() => setDragActivePhoto(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActivePhoto(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handlePhotoUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => photoInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-1.5 ${
                dragActivePhoto 
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <input 
                type="file" 
                ref={photoInputRef}
                onChange={(e) => e.target.files && handlePhotoUpload(e.target.files[0])}
                accept="image/*" 
                className="hidden" 
              />
              {photoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img src={photoDataUrl} alt="Aperçu" className="w-12 h-12 rounded-full object-cover border border-emerald-500/30" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Photo chargée avec succès</p>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setPhotoDataUrl(''); }}
                      className="text-[10px] text-rose-500 font-semibold hover:underline mt-0.5"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Glissez une photo ici, ou cliquez pour parcourir</p>
                  <p className="text-[10px] text-slate-400">Format d'image standard (PNG, JPG)</p>
                </>
              )}
            </div>
          </div>

          {/* Pièces jointes (UPLOADER REEL) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Pièce jointe (ex: Copie CNI, Contrat) - Optionnel
            </label>
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragActiveFile(true); }}
              onDragLeave={() => setDragActiveFile(false)}
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
                  : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleAttachmentUpload(e.target.files[0])}
                className="hidden" 
              />
              <UploadCloud className="w-7 h-7 text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">Glissez un document ou cliquez pour parcourir</p>
              <p className="text-[10px] text-slate-400">Taille max : 2 Mo. PDF, Word ou image</p>
            </div>

            {/* Liste des pièces jointes */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {attachments.map(att => (
                  <div key={att.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{att.name}</span>
                      <span className="text-[10px] text-slate-400">({(att.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter(a => a.id !== att.id)); }}
                      className="text-rose-500 hover:text-rose-600 font-bold"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Commentaires / Demandes particulières (Optionnel)</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Je souhaite m'inscrire à la tontine hebdomadaire de 5 000 F..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/60 text-white font-bold rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-emerald-500/10"
            >
              {loading ? "Transmission en cours..." : "S'enregistrer maintenant"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
