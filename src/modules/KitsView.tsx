/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
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
  XCircle,
  Package,
  ListFilter,
  FileText,
  UserPlus,
  Trash2,
  Info,
  Edit2,
  Check,
  ArrowRight,
  Bookmark
} from 'lucide-react';
import { KitPlan, Product, Kit, Subscription, Client } from '../types';

export const KitsView: React.FC = () => {
  const {
    kits,
    clients,
    products,
    kitDefinitions,
    subscriptions,
    addKitPlan,
    updateKitPlan,
    addPayment,
    addProduct,
    updateProduct,
    deleteProduct,
    addKitDefinition,
    updateKitDefinition,
    deleteKitDefinition,
    addSubscription,
    updateSubscriptionStatus,
    deleteSubscription,
    addClient,
    searchQuery
  } = useApp();

  // Navigation tabs for CRM Panel
  const [activeTab, setActiveTab] = useState<'plans' | 'leads' | 'catalog' | 'products'>('plans');

  // Modals visibility
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isKitDefModalOpen, setIsKitDefModalOpen] = useState(false);

  // Active items states
  const [selectedPlan, setSelectedPlan] = useState<KitPlan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedKitDef, setSelectedKitDef] = useState<Kit | null>(null);

  // Forms state
  // 1. Client Kit Plan Registration form
  const [regClient, setRegClient] = useState('');
  const [regKitType, setRegKitType] = useState('Kit Silver - Complet (25 000 FCFA)');
  const [regPrice, setRegPrice] = useState(25000);
  const [regStartDate, setRegStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [regNextDelivery, setRegNextDelivery] = useState('');

  // 2. Active Kit Payment Form
  const [payAmount, setPayAmount] = useState(5000);
  const [payMethod, setPayMethod] = useState<'orange_money' | 'mtn_money' | 'wave' | 'cash'>('wave');

  // 3. Product creation form
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('alimentaire');
  const [prodSubcategory, setProdSubcategory] = useState('');
  const [prodImage, setProdImage] = useState('');

  // 4. Kit definition form
  const [kitDefName, setKitDefName] = useState('');
  const [kitDefCategory, setKitDefCategory] = useState('alimentaire');
  const [kitDefDaily, setKitDefDaily] = useState('150 FCFA');
  const [kitDefTotal, setKitDefTotal] = useState('25 000 FCFA');
  const [kitDefBenefits, setKitDefBenefits] = useState('');
  const [kitDefDelivery, setKitDefDelivery] = useState('Livraison en commune sous 48h.');
  const [kitDefSelectedProducts, setKitDefSelectedProducts] = useState<string[]>([]);
  const [kitDefImage, setKitDefImage] = useState('');

  // Local helper for fallback/static kits if database is not seeded
  const fallbackKits = [
    { name: 'Kit Bronze - Essentiel', price: 15000, description: 'Riz 10kg, Huile 1.5L, Sel, Pâtes alimentaires' },
    { name: 'Kit Silver - Complet', price: 25000, description: 'Riz 25kg, Huile 5L, Sucre, Pâtes, Tomate concentrée, Savon' },
    { name: 'Kit Gold - Famille', price: 45000, description: 'Riz 50kg, Huile 10L, Lait concentré, Sucre, Conserves, Pâtes, Épices' }
  ];

  // Filters active plans based on search
  const filteredPlans = kits.filter(k => {
    const clientObj = clients.find(c => c.id === k.clientId);
    if (!clientObj) return false;
    const clientName = `${clientObj.firstName} ${clientObj.lastName}`.toLowerCase();
    return clientName.includes(searchQuery.toLowerCase()) || k.kitType.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Seeds default kits into database for user if they want to
  const handleSeedDefaultCatalog = async () => {
    if (window.confirm("Voulez-vous pré-charger des kits et produits de démonstration dans Firestore ?")) {
      try {
        // Create 4 products first
        const p1 = await addProduct({ name: 'Riz parfumé de luxe (Sac de 25kg)', category: 'alimentaire', subcategory: 'Riz', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' });
        const p2 = await addProduct({ name: 'Huile végétale raffinée (Bidon de 5L)', category: 'alimentaire', subcategory: 'Huiles', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150' });
        const p3 = await addProduct({ name: 'Cuiseur de riz automatique 1.8L', category: 'electromenager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' });
        const p4 = await addProduct({ name: 'Ventilateur rechargeable sur pied', category: 'electromenager', subcategory: 'Confort', image: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=150' });

        // Add 2 kits Definitions
        await addKitDefinition({
          name: 'Panier Alimentaire Complet',
          categoryId: 'alimentaire',
          dailyAmount: '150 FCFA',
          totalValue: '25 000 FCFA',
          images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600'],
          benefits: ['Rapport qualité-prix imbattable', 'Produits certifiés', 'Livraison offerte'],
          products: ['Riz parfumé de luxe (Sac de 25kg)', 'Huile végétale raffinée (Bidon de 5L)'],
          deliveryInfo: 'Livré chaque samedi matin gratuitement.'
        });

        await addKitDefinition({
          name: 'Pack Électroménager Éco',
          categoryId: 'electromenager',
          dailyAmount: '450 FCFA',
          totalValue: '55 000 FCFA',
          images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600'],
          benefits: ['Idéal coupures d\'électricité', 'Garantie constructeur 12 mois'],
          products: ['Cuiseur de riz automatique 1.8L', 'Ventilateur rechargeable sur pied'],
          deliveryInfo: 'Livré sous 48h à domicile.'
        });

        alert("Données du catalogue initialisées avec succès !");
      } catch (err: any) {
        alert("Erreur d'initialisation : " + err.message);
      }
    }
  };

  // Convert Subscription Lead to a fully registered CRM Client & Active Subscription
  const handleConvertLead = async (lead: Subscription) => {
    if (window.confirm(`Voulez-vous convertir ${lead.customerName} (${lead.phone}) en client actif et lui ouvrir un plan de kit ?`)) {
      try {
        const phoneClean = lead.phone.trim();
        let existingClient = clients.find(c => c.phone === phoneClean);
        let clientId = existingClient?.id;

        // 1. If client doesn't exist, register them
        if (!existingClient) {
          const names = lead.customerName.split(' ');
          const fName = names[0] || 'Client';
          const lName = names.slice(1).join(' ') || 'Auto';
          
          const newId = Math.random().toString(36).substring(7);
          const newClientPayload: Omit<Client, 'id' | 'createdAt'> = {
            firstName: fName,
            lastName: lName,
            phone: phoneClean,
            address: lead.address,
            commune: lead.address.split(',')[0]?.trim() || 'Cocody',
            quartier: lead.address.split(',')[1]?.trim() || '',
            photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            status: 'active',
            observations: `Client converti automatiquement depuis un lead de souscription web pour le pack ${lead.kitName}.`
          };

          await addClient(newClientPayload);
          // Retrieve newly created client ID via snapshot search
          clientId = newId; 
        }

        // Wait brief delay to let firestore sync client or use phone
        const updatedClients = clients;
        const finalClientId = updatedClients.find(c => c.phone === phoneClean)?.id || clientId || 'temp_client';

        // 2. Open active subscription KitPlan for them
        const defaultPrice = lead.kitName.toLowerCase().includes('gold') ? 45000 : lead.kitName.toLowerCase().includes('bronze') ? 15000 : 25000;
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);
        const nextDelivery = new Date();
        nextDelivery.setDate(nextDelivery.getDate() + 10);

        await addKitPlan({
          clientId: finalClientId,
          kitType: lead.kitName,
          status: 'active',
          price: defaultPrice,
          balance: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          nextDeliveryDate: nextDelivery.toISOString().split('T')[0]
        });

        // 3. Mark Lead as Contacted and Converted
        await updateSubscriptionStatus(lead.id, 'Livré');

        alert(`Client converti et abonnement actif ouvert avec succès pour ${lead.customerName} !`);
      } catch (err: any) {
        console.error(err);
        alert("Erreur lors de la conversion : " + err.message);
      }
    }
  };

  const handleOpenRegisterModal = () => {
    setRegClient(clients[0]?.id || '');
    const defaultKit = fallbackKits[1];
    setRegKitType(defaultKit.name);
    setRegPrice(defaultKit.price);
    setRegStartDate(new Date().toISOString().split('T')[0]);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 14);
    setRegNextDelivery(deliveryDate.toISOString().split('T')[0]);

    setIsRegisterModalOpen(true);
  };

  const handleKitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    setRegKitType(selectedName);
    const matched = fallbackKits.find(opt => opt.name === selectedName);
    if (matched) {
      setRegPrice(matched.price);
    }
  };

  const handleRegisterPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regClient || !regKitType) return;

    const endDate = new Date(regStartDate);
    endDate.setMonth(endDate.getMonth() + 12);

    const newPlan = {
      clientId: regClient,
      kitType: regKitType,
      status: 'active' as const,
      price: regPrice,
      balance: 0,
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
    setPayAmount(plan.price - plan.balance);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      const updatedBalance = selectedPlan.balance + payAmount;
      await updateKitPlan(selectedPlan.id, {
        balance: updatedBalance
      });

      await addPayment({
        clientId: selectedPlan.clientId,
        amount: payAmount,
        type: 'kit',
        referenceId: selectedPlan.id,
        date: new Date().toISOString().split('T')[0],
        method: payMethod
      });

      setIsPaymentModalOpen(false);
      alert("Paiement enregistré avec succès !");
    } catch (err: any) {
      alert("Erreur lors du paiement : " + err.message);
    }
  };

  const handleToggleStatus = async (plan: KitPlan) => {
    const newStatus = plan.status === 'active' ? 'suspended' : 'active';
    if (window.confirm(`Modifier le statut de l'abonnement en : ${newStatus === 'active' ? 'Actif' : 'Suspendu'} ?`)) {
      await updateKitPlan(plan.id, { status: newStatus });
    }
  };

  // Master Products management
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) return;

    try {
      const defaultImg = prodCategory === 'alimentaire' 
        ? "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150" 
        : "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150";

      if (selectedProduct) {
        await updateProduct(selectedProduct.id, {
          name: prodName,
          category: prodCategory,
          subcategory: prodSubcategory,
          image: prodImage || defaultImg
        });
      } else {
        await addProduct({
          name: prodName,
          category: prodCategory,
          subcategory: prodSubcategory,
          image: prodImage || defaultImg
        });
      }
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      setProdName('');
      setProdSubcategory('');
      setProdImage('');
      alert("Produit enregistré avec succès !");
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement du produit : " + err.message);
    }
  };

  const handleEditProduct = (p: Product) => {
    setSelectedProduct(p);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdSubcategory(p.subcategory || '');
    setProdImage(p.image);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir retirer ce produit du catalogue ?")) {
      try {
        await deleteProduct(id);
        alert("Produit supprimé !");
      } catch (err: any) {
        alert("Erreur de suppression : " + err.message);
      }
    }
  };

  // Kit Definitions management
  const handleSaveKitDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitDefName) return;

    try {
      const parsedBenefits = kitDefBenefits.split(',').map(b => b.trim()).filter(Boolean);
      const defaultImg = kitDefCategory === 'alimentaire' 
        ? "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600" 
        : "https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=600";

      const payload = {
        name: kitDefName,
        categoryId: kitDefCategory,
        dailyAmount: kitDefDaily,
        totalValue: kitDefTotal,
        benefits: parsedBenefits.length > 0 ? parsedBenefits : ['Produits Premium', 'Économie solidaire'],
        products: kitDefSelectedProducts,
        deliveryInfo: kitDefDelivery,
        images: [kitDefImage || defaultImg]
      };

      if (selectedKitDef) {
        await updateKitDefinition(selectedKitDef.id, payload);
      } else {
        await addKitDefinition(payload);
      }
      setIsKitDefModalOpen(false);
      setSelectedKitDef(null);
      setKitDefName('');
      setKitDefBenefits('');
      setKitDefSelectedProducts([]);
      setKitDefImage('');
      alert("Kit de démonstration configuré avec succès !");
    } catch (err: any) {
      alert("Erreur lors de la configuration du kit : " + err.message);
    }
  };

  const handleEditKitDef = (k: Kit) => {
    setSelectedKitDef(k);
    setKitDefName(k.name);
    setKitDefCategory(k.categoryId);
    setKitDefDaily(k.dailyAmount);
    setKitDefTotal(k.totalValue);
    setKitDefBenefits(k.benefits.join(', '));
    setKitDefDelivery(k.deliveryInfo);
    setKitDefSelectedProducts(k.products);
    setKitDefImage(k.images[0] || '');
    setIsKitDefModalOpen(true);
  };

  const handleDeleteKitDef = async (id: string) => {
    if (window.confirm("Voulez-vous détruire cette configuration de kit ?")) {
      try {
        await deleteKitDefinition(id);
        alert("Configuration supprimée !");
      } catch (err: any) {
        alert("Erreur de suppression : " + err.message);
      }
    }
  };

  const handleToggleProductSelection = (prodName: string) => {
    setKitDefSelectedProducts(prev => 
      prev.includes(prodName) 
        ? prev.filter(n => n !== prodName) 
        : [...prev, prodName]
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Tabs Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Packs & Kits de Distribution
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">
            Admin Panel : Suivez les abonnements, gérez les leads, configurez les packs et le catalogue de produits maîtres.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Abonnements Actifs
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Leads / Souscriptions
            {subscriptions.filter(s => s.status === 'En attente').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {subscriptions.filter(s => s.status === 'En attente').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Configuration des Packs
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Produits Maîtres
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT SWITCHER */}
      <AnimatePresence mode="wait">
        {/* TAB 1 : ACTIVE CUSTOMER SUBSCRIPTIONS */}
        {activeTab === 'plans' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Quick action + info alert */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="inline-flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400">
                <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Les abonnements actifs gèrent le solde des paiements journaliers et les livraisons.</span>
              </div>
              <button
                onClick={handleOpenRegisterModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Nouvel Abonnement Manuel
              </button>
            </div>

            {/* In-Line Quick Catalog Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fallbackKits.map((opt, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <span className="font-bold text-slate-900 dark:text-white font-display text-xs">{opt.name}</span>
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{opt.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5 border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-3">
                    <span className="text-md font-extrabold text-emerald-600 dark:text-emerald-400 font-display">{opt.price.toLocaleString('fr-FR')} FCFA</span>
                    <span className="text-[10px] text-slate-400">/ mois</span>
                  </div>
                </div>
              ))}
            </div>

            {/* List Table of active plans */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
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
                          Aucun plan de kit trouvé dans la base.
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
          </motion.div>
        )}

        {/* TAB 2 : PUBLIC SUBSCRIPTIONS LEADS */}
        {activeTab === 'leads' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white text-xs block">Leads de souscription public</span>
                <p className="text-[10px] text-slate-400">Demandes de souscription issues de la Vitrine publique. Contactez-les puis cliquez sur "Convertir" pour les inscrire.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-bold text-slate-900 dark:text-white font-display text-sm">Souscriptions Web reçues</h2>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black text-[10px]">
                  {subscriptions.filter(s => s.status === 'En attente').length} À traiter
                </span>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">Contact Prospect</th>
                      <th className="p-4">Kit demandé</th>
                      <th className="p-4">Adresse géographique</th>
                      <th className="p-4">Date de soumission</th>
                      <th className="p-4 text-center">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          Aucun lead de souscription public reçu pour le moment.
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{lead.customerName}</div>
                            <div className="text-slate-400 mt-0.5">{lead.phone}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Bookmark className="w-3.5 h-3.5" />
                              {lead.kitName}
                            </div>
                          </td>
                          <td className="p-4 text-slate-500 max-w-[200px] truncate">{lead.address}</td>
                          <td className="p-4 text-slate-400">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : "Aujourd'hui"}</td>
                          <td className="p-4 text-center">
                            <select
                              value={lead.status}
                              onChange={(e) => updateSubscriptionStatus(lead.id, e.target.value as any)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                                lead.status === 'En attente'
                                  ? 'bg-rose-100 text-rose-700'
                                  : lead.status === 'Contacté'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <option value="En attente">En attente</option>
                              <option value="Contacté">Contacté</option>
                              <option value="Livré">Livré</option>
                            </select>
                          </td>
                          <td className="p-4 text-right space-x-1.5 flex items-center justify-end">
                            <button
                              onClick={() => handleConvertLead(lead)}
                              disabled={lead.status === 'Livré'}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-850 text-white disabled:text-slate-400 rounded-lg font-bold cursor-pointer inline-flex items-center gap-1"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Convertir
                            </button>
                            <button
                              onClick={() => deleteSubscription(lead.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3 : CONFIGURE COMPLEX KITS (LES PACKS) */}
        {activeTab === 'catalog' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="inline-flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400">
                <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Configurez ici les packs disponibles sur la Vitrine client. Saisissez l'acompte journalier et le coût total.</span>
              </div>
              <div className="flex gap-2">
                {kitDefinitions.length === 0 && (
                  <button
                    onClick={handleSeedDefaultCatalog}
                    className="px-3.5 py-2 border border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/20 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Générer Kits de Démo
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedKitDef(null);
                    setKitDefName('');
                    setKitDefBenefits('');
                    setKitDefDaily('150 FCFA');
                    setKitDefTotal('25 000 FCFA');
                    setKitDefSelectedProducts([]);
                    setKitDefImage('');
                    setIsKitDefModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Configurer un Pack
                </button>
              </div>
            </div>

            {/* List of defined packs in catalog */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kitDefinitions.length === 0 ? (
                <div className="col-span-full p-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl text-center text-slate-400 text-xs">
                  Aucun kit configuré en base pour la vitrine. Cliquez sur "Configurer un Pack" ou "Générer Kits de Démo" ci-dessus.
                </div>
              ) : (
                kitDefinitions.map(def => (
                  <div key={def.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative aspect-[16/10] bg-slate-50">
                      <img src={def.images[0]} alt={def.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditKitDef(def)}
                          className="p-1.5 bg-white/90 text-slate-700 rounded-lg shadow-sm hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKitDef(def.id)}
                          className="p-1.5 bg-white/90 text-rose-600 rounded-lg shadow-sm hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">{def.categoryId === 'alimentaire' ? 'Panier Alimentaire' : 'Électroménager'}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{def.name}</h4>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Articles inclus :</span>
                        <div className="flex flex-wrap gap-1">
                          {def.products.map((p, pi) => (
                            <span key={pi} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Acompte</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 text-xs block">{def.dailyAmount} / jour</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Valeur totale</span>
                          <strong className="text-slate-800 dark:text-slate-200 text-xs block">{def.totalValue}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4 : MASTER PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="inline-flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400">
                <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Base maîtresse des produits individuels en stock pouvant être groupés dans les packs.</span>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setProdName('');
                  setProdSubcategory('');
                  setProdImage('');
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Ajouter un Produit
              </button>
            </div>

            {/* List of master products */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {products.length === 0 ? (
                <div className="col-span-full p-12 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl text-center text-slate-400 text-xs">
                  Aucun produit enregistré dans la base maîtresse.
                </div>
              ) : (
                products.map(prod => (
                  <div key={prod.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative aspect-square rounded-xl bg-slate-50 overflow-hidden mb-2">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditProduct(prod)}
                          className="p-1 bg-white text-slate-700 rounded shadow hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1 bg-white text-rose-600 rounded shadow hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">
                        {prod.category === 'alimentaire' ? 'Alimentaire' : 'Électroménager'} {prod.subcategory && `• ${prod.subcategory}`}
                      </span>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] leading-tight truncate mt-0.5" title={prod.name}>
                        {prod.name}
                      </h4>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MODALS SWITCHER */}
      {/* A. MANUAL INSCRIPTION KIT PLAN MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-none"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">Ouvrir un Abonnement Kit</h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPlan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Sélectionner le client *</label>
                <select
                  value={regClient}
                  onChange={(e) => setRegClient(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="">-- Choisir un client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Type de Kit / Pack *</label>
                <select
                  value={regKitType}
                  onChange={handleKitTypeChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                >
                  {fallbackKits.map((opt, i) => (
                    <option key={i} value={opt.name}>
                      {opt.name} ({opt.price.toLocaleString('fr-FR')} FCFA)
                    </option>
                  ))}
                  {kitDefinitions.map(def => (
                    <option key={def.id} value={def.name}>
                      {def.name} ({def.totalValue})
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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Ouvrir l'abonnement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* B. KIT PLAN PAYMENT MODAL */}
      {isPaymentModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-none"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-xs">Paiement de Kit Alimentaire</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <p>Plan : <strong>{selectedPlan.kitType}</strong></p>
                <p>Montant total : <strong>{selectedPlan.price.toLocaleString('fr-FR')} FCFA</strong></p>
                <p>Déjà versé : <strong>{selectedPlan.balance.toLocaleString('fr-FR')} FCFA</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Montant à encaisser (FCFA)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Mode de règlement</label>
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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer l'acompte
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* C. MASTER PRODUCT ADD/EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-none"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">
                {selectedProduct ? "Modifier le Produit" : "Ajouter un Produit"}
              </h3>
              <button 
                onClick={() => {
                  setIsProductModalOpen(false);
                  setSelectedProduct(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Nom du Produit *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Riz parfumé (Sac de 25kg)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Catégorie *</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="alimentaire">Alimentaire</option>
                    <option value="electromenager">Électroménager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Sous-catégorie</label>
                  <input
                    type="text"
                    value={prodSubcategory}
                    onChange={(e) => setProdSubcategory(e.target.value)}
                    placeholder="Ex: Céréales"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">URL de la Photo</label>
                <input
                  type="url"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="Ex: https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-mono text-[10px]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* D. KIT DEF CONFIGURATION MODAL */}
      {isKitDefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-none flex flex-col max-h-[90vh]"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">
                {selectedKitDef ? "Modifier la Configuration" : "Configurer un Nouveau Pack"}
              </h3>
              <button 
                onClick={() => {
                  setIsKitDefModalOpen(false);
                  setSelectedKitDef(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKitDef} className="p-6 space-y-4 text-xs overflow-y-auto flex-grow">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Nom du Pack / Kit *</label>
                <input
                  type="text"
                  required
                  value={kitDefName}
                  onChange={(e) => setKitDefName(e.target.value)}
                  placeholder="Ex: Kit Premium Famille"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Catégorie *</label>
                  <select
                    value={kitDefCategory}
                    onChange={(e) => setKitDefCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="alimentaire">Alimentaire</option>
                    <option value="electromenager">Électroménager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Acompte / Jour *</label>
                  <input
                    type="text"
                    required
                    value={kitDefDaily}
                    onChange={(e) => setKitDefDaily(e.target.value)}
                    placeholder="Ex: 150 FCFA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Valeur Totale *</label>
                  <input
                    type="text"
                    required
                    value={kitDefTotal}
                    onChange={(e) => setKitDefTotal(e.target.value)}
                    placeholder="Ex: 25 000 FCFA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Avantages & Points Forts (Séparés par des virgules)</label>
                <input
                  type="text"
                  value={kitDefBenefits}
                  onChange={(e) => setKitDefBenefits(e.target.value)}
                  placeholder="Ex: Économique, Livraison gratuite, Stock garanti"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Modalités de Livraison</label>
                <input
                  type="text"
                  value={kitDefDelivery}
                  onChange={(e) => setKitDefDelivery(e.target.value)}
                  placeholder="Ex: Livré sous 48h gratuitement."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Multi-select checklist for products from Master Catalog */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Sélectionner les articles inclus * ({kitDefSelectedProducts.length} choisis)</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5 max-h-[140px] overflow-y-auto">
                  {products.length === 0 ? (
                    <p className="text-slate-400 text-[10px] italic">Aucun produit disponible dans la base maîtresse. Enregistrez des produits dans l'onglet "Produits Maîtres" d'abord.</p>
                  ) : (
                    products.map(p => {
                      const isChecked = kitDefSelectedProducts.includes(p.name);
                      return (
                        <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-100/50 rounded px-1.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProductSelection(p.name)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-[10px]">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Photo d'illustration (URL)</label>
                <input
                  type="url"
                  value={kitDefImage}
                  onChange={(e) => setKitDefImage(e.target.value)}
                  placeholder="Ex: https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-mono text-[10px]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsKitDefModalOpen(false);
                    setSelectedKitDef(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {selectedKitDef ? "Sauvegarder" : "Créer le pack"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
