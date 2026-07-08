/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
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
  Sparkles,
  ShoppingBag,
  Grid,
  Filter,
  Info,
  Calendar,
  DollarSign,
  Tag,
  Check,
  Zap,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Client, Attachment, Kit, Subscription } from '../types';

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
            width = maxHeight;
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

// Default fallback kits when Firestore is empty
const DEFAULT_KITS: Kit[] = [
  {
    id: 'default_bronze',
    name: 'Kit Bronze - Essentiel',
    categoryId: 'alimentaire',
    dailyAmount: '100 FCFA',
    totalValue: '15 000 FCFA',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80'],
    benefits: ['Économique', 'Idéal pour célibataire', 'Produits de première nécessité'],
    products: ['Riz parfumé 10kg', 'Huile de table 1.5L', 'Sel fin iodé 1kg', 'Pâtes alimentaires (4 paquets)'],
    deliveryInfo: 'Livraison à domicile sous 48h après validation du premier acompte.'
  },
  {
    id: 'default_silver',
    name: 'Kit Silver - Complet',
    categoryId: 'alimentaire',
    dailyAmount: '150 FCFA',
    totalValue: '25 000 FCFA',
    images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&q=80'],
    benefits: ['Rapport qualité-prix imbattable', 'Idéal pour couple', 'Produits de base complets'],
    products: ['Riz brisé 25kg', 'Huile de table 5L', 'Sucre en poudre 2kg', 'Tomate concentrée (3 boîtes)', 'Savon de ménage (lot de 4)', 'Pâtes alimentaires (6 paquets)'],
    deliveryInfo: 'Livraison gratuite en commune chaque samedi.'
  },
  {
    id: 'default_gold',
    name: 'Kit Gold - Famille',
    categoryId: 'alimentaire',
    dailyAmount: '300 FCFA',
    totalValue: '45 000 FCFA',
    images: ['https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&q=80'],
    benefits: ['Stock mensuel complet', 'Idéal pour grande famille', 'Livraison prioritaire'],
    products: ['Riz de luxe 50kg', 'Huile de table 10L', 'Sucre de canne 5kg', 'Lait concentré sucré (6 boîtes)', 'Conserves de sardines (10 boîtes)', 'Pâtes alimentaires (1 carton)', 'Épices variées de cuisine'],
    deliveryInfo: 'Livraison à domicile garantie sous 24h avec suivi d\'itinéraire.'
  },
  {
    id: 'default_cuisine',
    name: 'Pack Cuisine Facile',
    categoryId: 'electromenager',
    dailyAmount: '500 FCFA',
    totalValue: '60 000 FCFA',
    images: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80'],
    benefits: ['Marques certifiées', 'Garantie 12 mois', 'Paiement ultra-flexible'],
    products: ['Robot Mixeur Multifonction', 'Cuiseur à riz automatique 1.8L', 'Four à micro-ondes 20L'],
    deliveryInfo: 'Livré avec certificat de garantie et manuel d\'utilisation.'
  },
  {
    id: 'default_confort',
    name: 'Pack Confort Maison',
    categoryId: 'electromenager',
    dailyAmount: '250 FCFA',
    totalValue: '35 000 FCFA',
    images: ['https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=600&q=80'],
    benefits: ['Faible consommation', 'Autonomie renforcée', 'Idéal pour les coupures'],
    products: ['Ventilateur Rechargeable Haute Puissance', 'Fer à repasser vapeur', 'Bouilloire électrique en inox 1.7L'],
    deliveryInfo: 'Livraison gratuite à domicile. Service après-vente inclus.'
  }
];

interface ProductType {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  image: string;
}

interface KitImageCarouselProps {
  kit: Kit;
  products: ProductType[];
}

const KitImageCarousel: React.FC<KitImageCarouselProps> = ({ kit, products }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides: {
    src: string;
    title: string;
    subtitle?: string;
    isProduct: boolean;
    quantity?: number;
  }[] = [];

  // Add kit images
  const kitImages = kit.images && kit.images.length > 0 ? kit.images : ["https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80"];
  kitImages.forEach((img) => {
    slides.push({
      src: img,
      title: kit.name,
      subtitle: "Image principale",
      isProduct: false
    });
  });

  // Add associated products
  const productCounts: Record<string, number> = {};
  if (kit.products && Array.isArray(kit.products)) {
    kit.products.forEach(p => {
      productCounts[p] = (productCounts[p] || 0) + 1;
    });
  }

  Object.entries(productCounts).forEach(([prodName, qty]) => {
    const matched = products.find(p => p.name.toLowerCase() === prodName.toLowerCase());
    if (matched) {
      slides.push({
        src: matched.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80",
        title: prodName,
        subtitle: matched.subcategory || "Article inclus",
        isProduct: true,
        quantity: qty
      });
    } else {
      // Even if no matched product in database, show with clean fallback
      const isAlimentary = kit.categoryId === 'alimentaire';
      const fallbackUrl = isAlimentary 
        ? "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80"
        : "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&q=80";
      slides.push({
        src: fallbackUrl,
        title: prodName,
        subtitle: "Article inclus",
        isProduct: true,
        quantity: qty
      });
    }
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    if (width > 0) {
      const index = Math.round(scrollLeft / width);
      setActiveIndex(index);
    }
  };

  const scrollToSlide = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: index * 287,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  const nextSlide = () => {
    const nextIndex = (activeIndex + 1) % slides.length;
    scrollToSlide(nextIndex);
  };

  const prevSlide = () => {
    const prevIndex = (activeIndex - 1 + slides.length) % slides.length;
    scrollToSlide(prevIndex);
  };

  return (
    <div className="relative w-[287px] h-[210px] mx-auto rounded-none overflow-hidden bg-slate-100 dark:bg-slate-950 flex-shrink-0 group mt-4">
      {/* Scrollable track */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none select-none scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-[287px] h-[210px] flex-shrink-0 snap-start snap-always relative flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 rounded-none">
            <img
              src={slide.src}
              alt={slide.title}
              className="w-full h-full object-contain pointer-events-none rounded-none"
              referrerPolicy="no-referrer"
            />

            {/* Bottom Glassmorphic Card Info (ONLY for products, NOT for main kit image) */}
            {slide.isProduct && (
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/75 dark:bg-slate-900/80 backdrop-blur-md rounded-none p-2.5 border border-white/10 flex items-center justify-between gap-3 shadow-lg">
                <div className="min-w-0 flex-grow">
                  <p className="text-[10px] font-black text-white truncate leading-tight tracking-tight">
                    {slide.title}
                  </p>
                  {slide.subtitle && (
                    <p className="text-[8px] text-slate-300 font-bold uppercase tracking-wider leading-none mt-0.5">
                      {slide.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-none shadow-sm">
                    Qté: {slide.quantity}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instagram-like index counter */}
      {slides.length > 1 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-950/60 backdrop-blur-sm rounded-none text-[9px] font-extrabold text-white">
          {activeIndex + 1}/{slides.length}
        </div>
      )}

      {/* Desktop chevrons */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 rounded-none shadow-md border border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 rounded-none shadow-md border border-slate-100 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Slide Indicators Dots */}
      {slides.length > 1 && (
        <div className={`absolute ${slides[activeIndex]?.isProduct ? 'bottom-16' : 'bottom-4'} left-0 right-0 flex justify-center gap-1 pointer-events-none transition-all duration-200`}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); scrollToSlide(i); }}
              className={`w-1.5 h-1.5 rounded-none pointer-events-auto transition-all ${
                i === activeIndex 
                  ? 'bg-emerald-500 w-3' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ClientRegistrationView: React.FC = () => {
  const { platformSettings, kitDefinitions, addSubscription, addClient, products, categories } = useApp();
  
  // Choose between public kitDefinitions from firestore or static defaults
  const kitsToDisplay = kitDefinitions.length > 0 ? kitDefinitions : DEFAULT_KITS;

  // Group kits by category!
  // We combine dynamic categories from db plus fallback default categories if needed.
  const categoriesList = React.useMemo(() => {
    const list = [...(categories || [])];
    // Add default categories if they don't exist by name
    if (!list.some(c => c.name.toLowerCase() === 'alimentaire')) {
      list.push({ id: 'alimentaire', name: 'Alimentaire', dailyAmount: '100 FCFA' });
    }
    if (!list.some(c => c.name.toLowerCase() === 'electromenager' || c.name.toLowerCase() === 'électroménager')) {
      list.push({ id: 'electromenager', name: 'Électroménager', dailyAmount: '250 FCFA' });
    }
    return list;
  }, [categories]);

  // For each category, filter the kits belonging to it.
  const groupedKits = React.useMemo(() => {
    const groups: { category: any; kits: Kit[] }[] = [];
    
    categoriesList.forEach(cat => {
      const catKits = kitsToDisplay.filter(kit => {
        const kitCat = (kit.categoryId || '').trim().toLowerCase();
        return kitCat === cat.id.toLowerCase() || kitCat === cat.name.toLowerCase();
      });
      
      if (catKits.length > 0) {
        groups.push({
          category: cat,
          kits: catKits
        });
      }
    });

    // Also gather any kits that didn't match any category in our categoriesList
    const unmatchedKits = kitsToDisplay.filter(kit => {
      const kitCat = (kit.categoryId || '').trim().toLowerCase();
      return !categoriesList.some(cat => kitCat === cat.id.toLowerCase() || kitCat === cat.name.toLowerCase());
    });

    if (unmatchedKits.length > 0) {
      groups.push({
        category: { id: 'autres', name: 'Autres packs', dailyAmount: '' },
        kits: unmatchedKits
      });
    }

    return groups;
  }, [categoriesList, kitsToDisplay]);

  // Selected state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeKit, setActiveKit] = useState<Kit | null>(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [generalRegistrationMode, setGeneralRegistrationMode] = useState(false);

  // Form fields
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [commune, setCommune] = useState('Cocody');
  const [quartier, setQuartier] = useState('');
  const [address, setAddress] = useState('');
  const [observations, setObservations] = useState('');
  const [autoRegisterInCRM, setAutoRegisterInCRM] = useState(true);

  // Photo & attachments
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);
  const [dragActiveFile, setDragActiveFile] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }, [error]);

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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      return;
    }

    setLoading(true);

    try {
      const customerName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Client public';
      
      // 1. Save Lead in subscriptions collection
      await addSubscription({
        customerName,
        phone: phone.trim(),
        address: `${commune}, ${quartier ? quartier + ', ' : ''}${address.trim()}`,
        kitId: activeKit?.id || 'general',
        kitName: activeKit?.name || 'Inscription Générale',
        status: 'En attente'
      });

      // 2. Seamlessly register client in CRM if selected
      if (autoRegisterInCRM) {
        const payload: Omit<Client, 'id' | 'createdAt'> = {
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          commune,
          quartier: quartier.trim(),
          address: address.trim(),
          photoUrl: photoDataUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          status: 'active',
          observations: observations.trim() || `Souscription demandée pour le pack: ${activeKit?.name || 'Général'}`,
          customFields: { 
            packInteret: activeKit?.name || 'Aucun pack spécifique',
            canal: 'Showcase Public Vitrine' 
          },
          attachments: attachments
        };
        await addClient(payload);
      }

      setSuccess(true);
      setIsSubscribeModalOpen(false);
      setGeneralRegistrationMode(false);
    } catch (err: any) {
      console.error(err);
      setError("Une erreur s'est produite lors de la transmission : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscribe = (kit: Kit) => {
    setActiveKit(kit);
    setObservations(`Intéressé par le pack "${kit.name}".`);
    setIsSubscribeModalOpen(true);
  };

  const handleOpenGeneralRegistration = () => {
    setActiveKit(null);
    setObservations('Demande d\'auto-inscription simple.');
    setGeneralRegistrationMode(true);
  };

  const filteredKits = kitsToDisplay;

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-white">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-10 h-10 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Demande Transmise !</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Votre demande de souscription pour le kit de **{platformSettings.siteName}** a été enregistrée avec succès.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Récapitulatif de votre demande :</p>
            <div className="grid grid-cols-2 gap-2 text-slate-500">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Téléphone</span>
                <strong className="text-slate-850 dark:text-slate-250">{phone}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Nom</span>
                <strong className="text-slate-850 dark:text-slate-250">{firstName} {lastName}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Produit / Kit Sélectionné</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{activeKit ? activeKit.name : "Inscription générale"}</strong>
              </div>
              {activeKit && (
                <>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Mensualité</span>
                    <strong className="text-slate-850 dark:text-slate-250">{activeKit.dailyAmount} / jour</strong>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Valeur Totale</span>
                    <strong className="text-slate-850 dark:text-slate-250">{activeKit.totalValue}</strong>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setPhone('');
              setFirstName('');
              setLastName('');
              setQuartier('');
              setAddress('');
              setPhotoDataUrl('');
              setAttachments([]);
            }}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Retour au catalogue
          </button>

          <p className="text-xs text-slate-400 italic">
            Notre équipe prendra contact avec vous d'ici quelques heures pour la livraison et la validation de vos acomptes.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      {/* Dynamic SEO / Sharing Look & Feel */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-display font-black text-lg overflow-hidden shadow-sm">
              {platformSettings.siteIconUrl ? (
                <img src={platformSettings.siteIconUrl} alt="logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white font-display">
              {platformSettings.siteName}
            </span>
          </div>

          <button 
            onClick={handleOpenGeneralRegistration}
            className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            S'enregistrer
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-12">
        {/* Showcase Banner */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider animate-pulse">
            <Zap className="w-3.5 h-3.5" /> Distribution & Souscription de Kits
          </span>
          <h1 className="text-4xl md:text-5xl font-black font-display text-slate-900 dark:text-white tracking-tight leading-none">
            Choisissez votre kit, payez au <span className="text-emerald-600">quotidien !</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl mx-auto">
            Découvrez nos kits alimentaires de premier choix ou nos packs d'électroménager. Souscrivez en ligne via notre acompte journalier ultra-flexible pour simplifier votre quotidien.
          </p>
        </div>

        {/* Kits Displayed By Category */}
        <div className="space-y-16">
          {groupedKits.map((group, gIndex) => (
            <div key={group.category.id} className="space-y-6">
              {/* Category Header */}
              <div className="border-b border-slate-200/60 dark:border-slate-800/60 pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight">
                    {group.category.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Découvrez nos packs exclusifs de la catégorie {group.category.name}.
                  </p>
                </div>
                {group.category.dailyAmount && (
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 px-3 py-1 rounded-full self-start sm:self-auto">
                    Acompte : {group.category.dailyAmount.includes('FCFA') ? group.category.dailyAmount : `${group.category.dailyAmount} FCFA / jour`}
                  </span>
                )}
              </div>

              {/* Grid of kits inside this category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {group.kits.map((kit, index) => (
                    <motion.div
                      key={kit.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden hover:shadow-md dark:hover:border-slate-700/60 transition-all group flex flex-col justify-between"
                    >
                      {/* Kit Image Header (Instagram-swipe style 287x210px) */}
                      <KitImageCarousel kit={kit} products={products} />

                      {/* Kit Content */}
                      <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white tracking-tight">{kit.name}</h3>
                          
                          {/* Benefits badges */}
                          <div className="flex flex-wrap gap-1">
                            {kit.benefits.slice(0, 2).map((b, bi) => (
                              <span key={bi} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-semibold">
                                {b}
                              </span>
                            ))}
                          </div>

                          {/* Products list overview */}
                          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1.5">Inclus dans le pack :</p>
                            {(() => {
                              const counts: Record<string, number> = {};
                              kit.products.forEach(p => {
                                counts[p] = (counts[p] || 0) + 1;
                              });
                              const uniqueItems = Object.entries(counts);
                              return uniqueItems.slice(0, 3).map(([prodName, qty], pi) => (
                                <div key={pi} className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  <span className="truncate">
                                    {prodName} {qty > 1 && <span className="text-emerald-600 font-bold">({qty})</span>}
                                  </span>
                                </div>
                              ));
                            })()}
                            {(() => {
                              const counts: Record<string, number> = {};
                              kit.products.forEach(p => {
                                counts[p] = (counts[p] || 0) + 1;
                              });
                              const totalUnique = Object.keys(counts).length;
                              return totalUnique > 3 && (
                                <p className="text-[10px] italic text-emerald-600 font-semibold pl-5 mt-1">
                                  Et {totalUnique - 3} autre(s) type(s) d'articles...
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Pricing / CTA */}
                        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 space-y-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400">Acompte</span>
                              <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-display">{kit.dailyAmount}</strong>
                              <span className="text-[10px] text-slate-400"> / jour</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[9px] uppercase font-bold text-slate-400 font-sans">Valeur Pack</span>
                              <strong className="text-sm font-extrabold text-slate-850 dark:text-slate-200 font-display">{kit.totalValue}</strong>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveKit(kit); }}
                              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Détails
                            </button>
                            <button
                              onClick={() => handleOpenSubscribe(kit)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1"
                            >
                              Choisir <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Kit Detail Bottom Sheet / Modal */}
      {activeKit && !isSubscribeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header image (Swipeable KitImageCarousel) */}
            <div className="relative flex-shrink-0 flex justify-center bg-slate-50 dark:bg-slate-950/30 p-4 border-b border-slate-100 dark:border-slate-800">
              <KitImageCarousel kit={activeKit} products={products} />
              <button
                onClick={() => setActiveKit(null)}
                className="absolute top-4 right-4 p-2 bg-slate-950/50 hover:bg-slate-950/80 text-white rounded-full backdrop-blur-md cursor-pointer transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm flex-grow">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{activeKit.name}</h3>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold">
                    {activeKit.dailyAmount} / jour
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-bold">
                    Valeur : {activeKit.totalValue}
                  </span>
                </div>
              </div>

              {/* Benefits list */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Points forts du pack :</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeKit.benefits.map((b, bi) => (
                    <div key={bi} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                      <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Included products */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Détail des articles inclus :</p>
                <div className="space-y-2">
                  {(() => {
                    const counts: Record<string, number> = {};
                    activeKit.products.forEach(p => {
                      counts[p] = (counts[p] || 0) + 1;
                    });
                    return Object.entries(counts).map(([prodName, qty], pi) => {
                      const matchedProduct = products.find(p => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
                      const productImg = matchedProduct?.image || (activeKit.categoryId === 'alimentaire' 
                        ? "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&q=80" 
                        : "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150&q=80");
                      return (
                        <div key={pi} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                              <img 
                                src={productImg} 
                                alt={prodName} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{prodName}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black">
                            Qté: {qty}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Delivery info */}
              <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wide">Modalités de livraison</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activeKit.deliveryInfo}</p>
                </div>
              </div>
            </div>

            {/* Footer with checkout button */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setActiveKit(null)}
                className="w-1/3 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Retour
              </button>
              <button
                onClick={() => handleOpenSubscribe(activeKit)}
                className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                Choisir et Souscrire <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Subscription Lead / CRM Self-Registration Form Modal */}
      {(isSubscribeModalOpen || generalRegistrationMode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl my-8 overflow-hidden flex flex-col"
          >
            {/* Form Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-display text-base">
                  {activeKit ? `Souscription au pack ${activeKit.name}` : "Demande d'auto-inscription CRM"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remplissez ce court formulaire pour soumettre vos informations.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsSubscribeModalOpen(false);
                  setGeneralRegistrationMode(false);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubscribe} className="p-6 space-y-5 text-xs overflow-y-auto max-h-[70vh]">
              {error && (
                <div ref={errorRef} className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 font-semibold">
                  {error}
                </div>
              )}

              {/* Téléphone (Obligatoire) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
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

              {/* Prénom & Nom de famille */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Jean-Marc"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Nom de famille</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Kouassi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Commune & Quartier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Commune</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Quartier</label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Adresse Géographique Détaillée
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
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Photo d'identité / Profil (Optionnel)
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
                      <img src={photoDataUrl} alt="Aperçu" className="w-12 h-12 rounded-none object-cover border-none" />
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
                      <UploadCloud className="w-6 h-6 text-slate-400" />
                      <p className="text-xs text-slate-500 font-medium">Glissez ou cliquez pour charger votre photo</p>
                    </>
                  )}
                </div>
              </div>

              {/* Pièces jointes (UPLOADER REEL) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Pièce jointe (ex: Copie CNI, Justificatif) - Optionnel
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
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Glissez un document ou cliquez pour parcourir</p>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {attachments.map(att => (
                      <div key={att.id} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter(a => a.id !== att.id)); }}
                          className="text-rose-500 hover:text-rose-600 font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automatic CRM integration switch */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Créer mon profil client</span>
                  <p className="text-[10px] text-slate-400">Ajouter automatiquement mes coordonnées au CRM de l'entreprise pour accélérer le suivi.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoRegisterInCRM}
                  onChange={(e) => setAutoRegisterInCRM(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Commentaires ou Demandes particulières</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Je préfère être livré les samedis matin si possible..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubscribeModalOpen(false);
                    setGeneralRegistrationMode(false);
                  }}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/60 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  {loading ? "Transmission..." : "Confirmer ma Demande"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
