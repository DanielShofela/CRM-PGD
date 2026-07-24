/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Plus,
  Minus,
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
  Bookmark,
  UploadCloud,
  Search,
  MessageSquare,
  Send
} from 'lucide-react';
import { KitPlan, Product, Kit, Subscription, Client } from '../types';

// Image Compression Helper
function compressImage(file: File, maxWidth = 500, maxHeight = 500, quality = 0.75): Promise<string> {
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

// Robust product matching helper to prevent issues with slight name modifications, whitespaces, accents or special characters
function findProductRobust(prodName: string, productsList: Product[]): Product | undefined {
  if (!prodName || !productsList || productsList.length === 0) return undefined;

  const cleanName = prodName.trim().toLowerCase();

  // Helper to normalize string (remove accents/diacritics and symbols)
  const normalize = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/['’\-\s]/g, "") // remove spaces, hyphens, and apostrophes for comparison
      .toLowerCase();
  };

  const normCleanName = normalize(cleanName);

  // 1. Try exact match (trimmed, case-insensitive)
  let matched = productsList.find(p => p.name.trim().toLowerCase() === cleanName);
  if (matched) return matched;

  // 2. Try normalized exact match (ignoring accents, punctuation, spacing)
  matched = productsList.find(p => normalize(p.name.trim()) === normCleanName);
  if (matched) return matched;

  // 3. Try partial match (if database product name contains the requested product name or vice versa)
  matched = productsList.find(p => {
    const pName = p.name.trim().toLowerCase();
    return pName.includes(cleanName) || cleanName.includes(pName);
  });
  if (matched) return matched;

  // 4. Try partial match on normalized strings
  matched = productsList.find(p => {
    const pNorm = normalize(p.name.trim());
    return pNorm.includes(normCleanName) || normCleanName.includes(pNorm);
  });
  if (matched) return matched;

  // 5. Keyword overlap fallback (find product sharing the most words of length > 2)
  const cleanWords = cleanName.split(/\s+/).filter(w => w.length > 2);
  if (cleanWords.length > 0) {
    let bestMatch: Product | undefined = undefined;
    let maxOverlap = 0;

    productsList.forEach(p => {
      const pWords = p.name.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const overlap = cleanWords.filter(w => pWords.includes(w)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = p;
      }
    });

    if (maxOverlap > 0) {
      return bestMatch;
    }
  }

  return undefined;
}

// Helper to calculate remaining days to December 15th
function getRemainingDaysToDecember15(): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  const startDate = new Date(currentYear, 5, 15); // June 15 (month index 5)
  const endDate = new Date(currentYear, 11, 15);  // December 15 (month index 11)

  // Clear time components for pure day comparison
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // If today is on or before June 15th, count the entire 183 campaign days
  if (todayMidnight.getTime() <= startDate.getTime()) {
    return 183;
  }

  // If today is past December 15th, default to 1 day to prevent divide-by-zero
  if (todayMidnight.getTime() >= endDate.getTime()) {
    return 1;
  }

  // Otherwise calculate remaining days
  const diffTime = endDate.getTime() - todayMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

export const KitsView: React.FC = () => {
  const {
    kits,
    clients,
    products,
    kitDefinitions,
    subscriptions,
    categories,
    addKitPlan,
    updateKitPlan,
    addPayment,
    addProduct,
    updateProduct,
    deleteProduct,
    addKitDefinition,
    updateKitDefinition,
    deleteKitDefinition,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubscription,
    updateSubscriptionStatus,
    deleteSubscription,
    addPlanMessage,
    addSubscriptionMessage,
    addClient,
    searchQuery,
    currentUser
  } = useApp();

  const isReadOnly = currentUser?.role === 'agent' || currentUser?.role === 'client' || currentUser?.role === 'lead';
  const isClient = currentUser?.role === 'client' || currentUser?.role === 'lead';

  // Navigation tabs for CRM Panel
  const [activeTab, setActiveTab] = useState<'plans' | 'leads' | 'messages' | 'categories' | 'kits' | 'catalogue' | 'personnaliser'>('plans');

  // Discussions & Conversations states
  const [selectedPlanForDiscussion, setSelectedPlanForDiscussion] = useState<KitPlan | null>(null);
  const [selectedSubForDiscussion, setSelectedSubForDiscussion] = useState<Subscription | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedMsgConvId, setSelectedMsgConvId] = useState<string | null>(null);
  const [hubReplyText, setHubReplyText] = useState('');

  const activePlanForDiscussion = selectedPlanForDiscussion ? kits.find(k => k.id === selectedPlanForDiscussion.id) || selectedPlanForDiscussion : null;
  const activeSubForDiscussion = selectedSubForDiscussion ? subscriptions.find(s => s.id === selectedSubForDiscussion.id) || selectedSubForDiscussion : null;

  // Unified Messaging Conversations across Kit Plans & Subscriptions
  const kitConvs = kits.map(k => {
    const clientObj = clients.find(c => c.id === k.clientId);
    const msgs = k.conversations || [];
    const lastMsg = msgs[msgs.length - 1];
    return {
      id: k.id,
      itemType: 'kit' as const,
      title: clientObj ? `${clientObj.firstName} ${clientObj.lastName}` : `Client #${k.clientId.substring(0, 6)}`,
      subtitle: `Abonnement : ${k.kitType}`,
      phone: clientObj?.phone || '',
      conversations: msgs,
      lastMsgText: lastMsg?.text || 'Aucun message pour l\'instant',
      lastMsgDate: lastMsg?.createdAt || k.startDate,
      hasClientMsg: msgs.some(m => m.senderRole === 'client' || m.senderRole === 'prospect')
    };
  });

  const leadConvs = subscriptions.map(s => {
    const msgs = s.conversations || [];
    const lastMsg = msgs[msgs.length - 1];
    return {
      id: s.id,
      itemType: 'lead' as const,
      title: s.customerName || 'Prospect',
      subtitle: `Lead : ${s.kitName}`,
      phone: s.phone || '',
      conversations: msgs,
      lastMsgText: lastMsg?.text || 'Nouvelle demande',
      lastMsgDate: lastMsg?.createdAt || new Date().toISOString(),
      hasClientMsg: msgs.some(m => m.senderRole === 'client' || m.senderRole === 'prospect')
    };
  });

  const allMessagingConvs = [...kitConvs, ...leadConvs].sort(
    (a, b) => new Date(b.lastMsgDate).getTime() - new Date(a.lastMsgDate).getTime()
  );

  const totalMessagesCount = allMessagingConvs.reduce((acc, c) => acc + c.conversations.length, 0);

  // Modals visibility
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isKitDefModalOpen, setIsKitDefModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Active items states
  const [selectedPlan, setSelectedPlan] = useState<KitPlan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedKitDef, setSelectedKitDef] = useState<Kit | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

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
  const [prodCategory, setProdCategory] = useState('Produits alimentaires'); // Default as 'Produits alimentaires'
  const [prodSubcategory, setProdSubcategory] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodIsDragging, setProdIsDragging] = useState(false);
  const [prodUploadError, setProdUploadError] = useState('');
  const prodFileInputRef = useRef<HTMLInputElement>(null);

  // 4. Kit definition form
  const [kitDefName, setKitDefName] = useState('');
  const [kitDefCategory, setKitDefCategory] = useState('');
  const [kitDefDaily, setKitDefDaily] = useState('150 FCFA');
  const [kitDefTotal, setKitDefTotal] = useState('25 000 FCFA');
  const [kitDefBenefits, setKitDefBenefits] = useState('');
  const [kitDefDelivery, setKitDefDelivery] = useState('Livraison en commune sous 48h.');
  const [kitDefSelectedProducts, setKitDefSelectedProducts] = useState<string[]>([]);
  const [kitDefImage, setKitDefImage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5. Category creation form
  const [catName, setCatName] = useState('');
  const [catDailyAmount, setCatDailyAmount] = useState('100 FCFA / jour');
  const [catImage, setCatImage] = useState('');
  const [catIsDragging, setCatIsDragging] = useState(false);
  const [catUploadError, setCatUploadError] = useState('');
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // Custom addition states for Kit creation
  const [manualProductName, setManualProductName] = useState('');
  const [manualBenefitText, setManualBenefitText] = useState('');
  const [kitProductSearch, setKitProductSearch] = useState('');

  // Filter kits under "Gérer Kits"
  const [selectedKitCategoryFilter, setSelectedKitCategoryFilter] = useState<string>('all');

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

  // Filter catalogue under "Catalogue"
  const [selectedCatalogueCategoryFilter, setSelectedCatalogueCategoryFilter] = useState<string>('all');
  const [productSearchQuery, setProductSearchQuery] = useState('');

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
    if (window.confirm("Voulez-vous réinitialiser et charger les 4 Catégories, les 53 Produits et les 4 Kits de démonstration dans Firestore ?")) {
      try {
        // 1. Seed Categories
        const seedCategories = [
          { name: 'Gamme Bronze', minDailyAmount: '100 FCFA / jour', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' },
          { name: 'Gamme Silver', minDailyAmount: '150 FCFA / jour', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
          { name: 'Gamme Gold', minDailyAmount: '200 FCFA / jour', imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400' },
          { name: 'Gamme Platinum', minDailyAmount: '450 FCFA / jour', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' }
        ];

        // Delete existing categories first to avoid duplicates if seeding manually
        for (const cat of categories) {
          await deleteCategory(cat.id);
        }

        const createdCategories: Record<string, string> = {};
        for (const cat of seedCategories) {
          const res = await addCategory(cat);
          // Wait briefly
        }

        // 2. Seed Products (53 items)
        const seedProducts = [
          { name: 'Riz La Rizière 1 kg', category: 'Produits alimentaires', subcategory: 'Riz', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' },
          { name: 'Petit pois', category: 'Produits alimentaires', subcategory: 'Conserves', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Lait concentré sucré', category: 'Produits alimentaires', subcategory: 'Produits laitiers', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Lait en poudre en boîte', category: 'Produits alimentaires', subcategory: 'Produits laitiers', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Lait en poudre chapelet', category: 'Produits alimentaires', subcategory: 'Produits laitiers', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Spaghetti', category: 'Produits alimentaires', subcategory: 'Féculents', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' },
          { name: 'Cube Maggi (plaquette)', category: 'Produits alimentaires', subcategory: 'Assaisonnements', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Jus Presséa', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Sucrerie 1 L', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Sucrerie 1,5 L', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Pack de sucrerie 1 L', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Riz La Rizière 4,5 kg', category: 'Produits alimentaires', subcategory: 'Riz', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' },
          { name: 'Pack Coca-Cola 6 × 1 L', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Poulets', category: 'Produits alimentaires', subcategory: 'Produits frais', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: "Plaquette d'œufs", category: 'Produits alimentaires', subcategory: 'Produits frais', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: "1/2 plaquette d'œufs", category: 'Produits alimentaires', subcategory: 'Produits frais', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Assiette de table', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Kit de 6 assiettes cassables', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Complet soupière 5 pièces', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Complet soupière 6 pièces', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Verre normal', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Verre en coupe', category: 'Articles ménagers', subcategory: 'Vaisselle', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Riz La Rizière 22,5 kg', category: 'Produits alimentaires', subcategory: 'Riz', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150' },
          { name: 'Complet de pagne', category: 'Articles ménagers', subcategory: 'Textile', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150' },
          { name: 'Mixeur Foutou 3 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Mixeur Foutou 6 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Mixeur Foutou 12 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Mixeur 2 en 1', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Bouilloire électrique', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Air Fryer 6,5 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Air Fryer 9 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Air Fryer 10 L', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Mini cuisinière', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150' },
          { name: 'Huile Aya 0,9 L', category: 'Produits alimentaires', subcategory: 'Huiles', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Gazinière 4 feux', category: 'Électroménager', subcategory: 'Cuisine', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Gaz B6', category: 'Électroménager', subcategory: 'Gaz', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Gaz B12', category: 'Électroménager', subcategory: 'Gaz', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Réfrigérateur', category: 'Électroménager', subcategory: 'Froid', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Machine à laver 7 kg', category: 'Électroménager', subcategory: 'Lavage', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Ventilateur 15K', category: 'Électroménager', subcategory: 'Confort', image: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=150' },
          { name: 'Ventilateur 20K', category: 'Électroménager', subcategory: 'Confort', image: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=150' },
          { name: 'Chauffe-eau électrique', category: 'Électroménager', subcategory: 'Confort', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'Matelas orthopédique', category: 'Électroménager', subcategory: 'Literie', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150' },
          { name: 'TV 24 pouces', category: 'Électronique', subcategory: 'Général', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150' },
          { name: 'Huile Aya 3 L', category: 'Produits alimentaires', subcategory: 'Huiles', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'TV 32 pouces simple', category: 'Électronique', subcategory: 'Général', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150' },
          { name: 'Tablette enfant', category: 'Électronique', subcategory: 'Général', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150' },
          { name: 'Tablette adulte', category: 'Électronique', subcategory: 'Général', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150' },
          { name: 'Huile Aya 5 L', category: 'Produits alimentaires', subcategory: 'Huiles', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Tomate Alyssa 370 g', category: 'Produits alimentaires', subcategory: 'Conserves', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Tomate Alyssa 2 kg', category: 'Produits alimentaires', subcategory: 'Conserves', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Sardines Safi', category: 'Produits alimentaires', subcategory: 'Conserves', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' },
          { name: 'Sucrerie 30 CL', category: 'Produits alimentaires', subcategory: 'Boissons', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150' }
        ];

        // Delete existing products
        for (const prod of products) {
          await deleteProduct(prod.id);
        }

        for (const prod of seedProducts) {
          await addProduct(prod);
        }

        // 3. Seed Kits (4 items)
        const seedKits = [
          {
            name: 'kit 1',
            categoryId: 'Gamme Bronze',
            dailyAmount: '100 FCFA',
            totalValue: '18 300 FCFA',
            benefits: [
              'Grand sac de riz pour nourrir toute la famille élargie',
              'Boissons et gourmandises festives haut de gamme',
              'Approvisionnement complet pour les festivités de fin d\'année'
            ],
            products: [
              'Poulets', 'Riz La Rizière 1 kg', 'Huile Aya 0,9 L', 'Tomate Alyssa 370 g',
              'Petit pois', 'Petit pois', 'Spaghetti', 'Spaghetti', 'Spaghetti', 'Spaghetti',
              'Spaghetti', 'Sucrerie 1 L', '1/2 plaquette d\'œufs', 'Sardines Safi', 'Sardines Safi'
            ],
            deliveryInfo: 'Livraison express offerte sous 48h à domicile.',
            images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=600']
          },
          {
            name: 'kit 2',
            categoryId: 'Gamme Silver',
            dailyAmount: '150 FCFA',
            totalValue: '25 000 FCFA',
            benefits: [
              'Idéal pour les petits foyers ou couples',
              'Ingrédients complets pour un mois de repas variés',
              'Qualité supérieure et huiles sélectionnées'
            ],
            products: [
              'Riz La Rizière 4,5 kg', 'Huile Aya 3 L', 'Lait concentré sucré',
              'Plaquette d\'œufs', 'Sucrerie 1,5 L'
            ],
            deliveryInfo: 'Livré chaque samedi matin gratuitement.',
            images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600']
          },
          {
            name: 'kit 3',
            categoryId: 'Gamme Gold',
            dailyAmount: '200 FCFA',
            totalValue: '45 000 FCFA',
            benefits: [
              'Équipement de cuisine performant',
              'Grand format de riz parfumé',
              'Mixeur ultra-puissant et robuste'
            ],
            products: [
              'Riz La Rizière 22,5 kg', 'Huile Aya 5 L', 'Mixeur Foutou 3 L',
              'Bouilloire électrique'
            ],
            deliveryInfo: 'Livraison express incluse.',
            images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600']
          },
          {
            name: 'kit 4',
            categoryId: 'Gamme Platinum',
            dailyAmount: '450 FCFA',
            totalValue: '55 000 FCFA',
            benefits: [
              'Garantie constructeur 12 mois sur l\'électroménager',
              'Parfait confort pour lutter contre la chaleur',
              'Qualité Premium certifiée'
            ],
            products: [
              'Ventilateur 20K', 'Machine à laver 7 kg', 'TV 24 pouces'
            ],
            deliveryInfo: 'Installé et livré sous 48h.',
            images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600']
          }
        ];

        // Delete existing kits
        for (const kit of kitDefinitions) {
          await deleteKitDefinition(kit.id);
        }

        for (const kit of seedKits) {
          await addKitDefinition(kit);
        }

        alert("Base de données initialisée avec brio ! 4 Catégories, 53 Produits et 4 Kits ont été chargés.");
      } catch (err: any) {
        alert("Erreur lors de l'initialisation complète : " + err.message);
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
        if (err.message === "L'utilisateur est déjà inscrit.") {
          alert(err.message);
        } else {
          alert("Erreur lors de la conversion : " + err.message);
        }
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

  const handleSendPlanMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedPlanForDiscussion) return;
    try {
      await addPlanMessage(selectedPlanForDiscussion.id, newMessageText.trim(), {
        senderName: currentUser?.displayName || 'Administration',
        senderRole: currentUser?.role || 'admin'
      });
      setNewMessageText('');
    } catch (err: any) {
      alert("Erreur lors de l'envoi du message : " + err.message);
    }
  };

  const handleSendSubMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedSubForDiscussion) return;
    try {
      await addSubscriptionMessage(selectedSubForDiscussion.id, newMessageText.trim(), {
        senderName: currentUser?.displayName || 'Administration',
        senderRole: currentUser?.role || 'admin'
      });
      setNewMessageText('');
    } catch (err: any) {
      alert("Erreur lors de l'envoi du message : " + err.message);
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
      const defaultImg = (prodCategory === 'alimentaire' || prodCategory === 'Produits alimentaires') 
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
        const isDuplicate = products.some(p => p.name.trim().toLowerCase() === prodName.trim().toLowerCase());
        if (isDuplicate) {
          alert(`Erreur : Le produit "${prodName}" existe déjà dans le catalogue.`);
          return;
        }
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

  const handleDeleteProduct = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Retirer du catalogue",
      message: "Êtes-vous sûr de vouloir retirer ce produit du catalogue ?",
      confirmText: "Oui, retirer",
      cancelText: "Annuler",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteProduct(id);
          showToast("Produit retiré du catalogue avec succès !", "success");
        } catch (err: any) {
          showToast("Erreur de suppression : " + err.message, "error");
        }
      }
    });
  };

  // ==========================================
  // CATEGORIES MANAGEMENT ACTION HANDLERS
  // ==========================================
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;

    try {
      const defaultImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400";
      const payload = {
        name: catName,
        minDailyAmount: catDailyAmount,
        imageUrl: catImage || defaultImg
      };

      if (selectedCategory) {
        await updateCategory(selectedCategory.id, payload);
      } else {
        await addCategory(payload);
      }

      setIsCategoryModalOpen(false);
      setSelectedCategory(null);
      setCatName('');
      setCatDailyAmount('100 FCFA / jour');
      setCatImage('');
      alert("Catégorie enregistrée avec succès !");
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement de la catégorie : " + err.message);
    }
  };

  const handleEditCategory = (cat: any) => {
    setSelectedCategory(cat);
    setCatName(cat.name);
    setCatDailyAmount(cat.minDailyAmount || '100 FCFA / jour');
    setCatImage(cat.imageUrl || '');
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer la catégorie",
      message: "Êtes-vous sûr de vouloir supprimer cette catégorie et tous ses kits associés ? Cette action est irréversible.",
      confirmText: "Oui, supprimer",
      cancelText: "Annuler",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteCategory(id);
          showToast("Catégorie supprimée avec succès !", "success");
        } catch (err: any) {
          showToast("Erreur de suppression : " + err.message, "error");
        }
      }
    });
  };

  // Drag and Drop for Category Images
  const processCategoryFile = async (file: File) => {
    setCatUploadError('');
    if (!file.type.startsWith('image/')) {
      setCatUploadError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCatUploadError("L'image est trop lourde (max 5 Mo).");
      return;
    }
    try {
      const base64Str = await compressImage(file, 600, 600, 0.8);
      setCatImage(base64Str);
    } catch (err: any) {
      setCatUploadError("Erreur de traitement de l'image : " + err.message);
    }
  };

  const handleCategoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processCategoryFile(file);
    }
  };

  const handleCatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setCatIsDragging(true);
  };

  const handleCatDragLeave = () => {
    setCatIsDragging(false);
  };

  const handleCatDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setCatIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processCategoryFile(file);
    }
  };

  // Drag and Drop for Product Images
  const processProductFile = async (file: File) => {
    setProdUploadError('');
    if (!file.type.startsWith('image/')) {
      setProdUploadError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProdUploadError("L'image est trop lourde (max 5 Mo).");
      return;
    }
    try {
      const base64Str = await compressImage(file, 600, 600, 0.8);
      setProdImage(base64Str);
    } catch (err: any) {
      setProdUploadError("Erreur de traitement de l'image : " + err.message);
    }
  };

  const handleProductFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processProductFile(file);
    }
  };

  const handleProdDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setProdIsDragging(true);
  };

  const handleProdDragLeave = () => {
    setProdIsDragging(false);
  };

  const handleProdDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setProdIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processProductFile(file);
    }
  };

  // File handlers for Kit Definition images
  const processImageFile = async (file: File) => {
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'image est trop lourde (max 5 Mo).");
      return;
    }
    try {
      const base64Str = await compressImage(file, 600, 600, 0.8);
      setKitDefImage(base64Str);
    } catch (err: any) {
      setUploadError("Erreur de traitement de l'image : " + err.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  // Dynamic Calculation Handlers for Kit Creation/Edition
  const handleDailyAmountChange = (val: string) => {
    setKitDefDaily(val);
    const numericDaily = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericDaily > 0) {
      const remainingDays = getRemainingDaysToDecember15();
      const total = numericDaily * remainingDays;
      const formattedTotal = new Intl.NumberFormat('fr-FR').format(total);
      setKitDefTotal(`${formattedTotal} FCFA`);
    } else {
      setKitDefTotal('');
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setKitDefTotal(val);
    const numericTotal = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericTotal > 0) {
      const remainingDays = getRemainingDaysToDecember15();
      const daily = Math.round(numericTotal / remainingDays);
      const formattedDaily = new Intl.NumberFormat('fr-FR').format(daily);
      setKitDefDaily(`${formattedDaily} FCFA`);
    } else {
      setKitDefDaily('');
    }
  };

  const handleDailyAmountBlur = () => {
    const numericDaily = parseInt(kitDefDaily.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericDaily > 0) {
      const formattedDaily = new Intl.NumberFormat('fr-FR').format(numericDaily);
      setKitDefDaily(`${formattedDaily} FCFA`);
    }
  };

  const handleTotalAmountBlur = () => {
    const numericTotal = parseInt(kitDefTotal.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericTotal > 0) {
      const formattedTotal = new Intl.NumberFormat('fr-FR').format(numericTotal);
      setKitDefTotal(`${formattedTotal} FCFA`);
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

      // Standardize/canonicalize product names to match the database's latest names exactly
      const standardizedProducts = kitDefSelectedProducts.map(name => {
        const matched = findProductRobust(name, products);
        return matched ? matched.name : name;
      });

      const payload = {
        name: kitDefName,
        categoryId: kitDefCategory,
        dailyAmount: kitDefDaily,
        totalValue: kitDefTotal,
        benefits: parsedBenefits.length > 0 ? parsedBenefits : ['Produits Premium', 'Économie solidaire'],
        products: standardizedProducts,
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

  const handleDeleteKitDef = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer la configuration de kit",
      message: "Êtes-vous sûr de vouloir supprimer définitivement cette configuration de kit ?",
      confirmText: "Oui, supprimer",
      cancelText: "Annuler",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteKitDefinition(id);
          showToast("Configuration du kit supprimée avec succès !", "success");
        } catch (err: any) {
          showToast("Erreur de suppression : " + err.message, "error");
        }
      }
    });
  };

  const handleToggleProductSelection = (prodName: string) => {
    const targetProduct = findProductRobust(prodName, products);
    setKitDefSelectedProducts(prev => {
      const isSelected = prev.some(name => {
        const matched = findProductRobust(name, products);
        return targetProduct && matched ? matched.id === targetProduct.id : name === prodName;
      });

      if (isSelected) {
        return prev.filter(name => {
          const matched = findProductRobust(name, products);
          return targetProduct && matched ? matched.id !== targetProduct.id : name !== prodName;
        });
      } else {
        return [...prev, targetProduct ? targetProduct.name : prodName];
      }
    });
  };

  const setProductQuantity = (prodName: string, qty: number) => {
    const targetQty = Math.max(0, qty);
    const targetProduct = findProductRobust(prodName, products);
    setKitDefSelectedProducts(prev => {
      const withoutProduct = prev.filter(name => {
        const matched = findProductRobust(name, products);
        if (targetProduct && matched) {
          return matched.id !== targetProduct.id;
        }
        return name !== prodName;
      });
      const added = Array(targetQty).fill(targetProduct ? targetProduct.name : prodName);
      return [...withoutProduct, ...added];
    });
  };

  const existingProductCategories = Array.from(new Set([
    'Produits alimentaires',
    'Articles ménagers',
    'Électroménager',
    'Électronique',
    ...products.map(p => p.category)
  ].filter(Boolean)));

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Tabs Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-900 dark:text-white tracking-tight">
            Penta GAD Distribution
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">
            Admin Panel : Suivez les abonnements, gérez les leads, configurez les catégories de pack et le catalogue de produits maîtres.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Abonnements Actifs
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
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
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative flex items-center gap-1.5 ${
              activeTab === 'messages'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Centre Messagerie</span>
            {totalMessagesCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                activeTab === 'messages' ? 'bg-indigo-800 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {totalMessagesCount}
              </span>
            )}
            {allMessagingConvs.some(c => c.hasClientMsg) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gérer Catégories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('kits')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kits'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gérer Kits ({kitDefinitions.length})
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'catalogue'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Catalogue ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('personnaliser')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'personnaliser'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Personnaliser
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT SWITCHER */}
      <AnimatePresence mode="wait">
        {/* TAB 1 : ACTIVE CUSTOMER SUBSCRIPTIONS */}
        {activeTab === 'plans' && (
          <motion.div
            key="plans"
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
              {!isClient && (
                <button
                  onClick={handleOpenRegisterModal}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Nouvel Abonnement Manuel
                </button>
              )}
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
                                disabled={isClient}
                                onClick={() => handleToggleStatus(k)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                  isClient ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                                } ${
                                  k.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                                }`}
                              >
                                {k.status === 'active' ? 'Actif' : 'Suspendu'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedPlanForDiscussion(k)}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all relative shadow-sm"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Échanges</span>
                                  {(k.conversations?.length || 0) > 0 && (
                                    <span className="px-1.5 py-0.2 bg-indigo-800 text-indigo-100 rounded-full text-[9px] font-black">
                                      {k.conversations?.length}
                                    </span>
                                  )}
                                  {k.conversations && k.conversations.length > 0 && (k.conversations[k.conversations.length - 1].senderRole === 'client' || k.conversations[k.conversations.length - 1].senderRole === 'prospect') && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5"></span>
                                  )}
                                </button>
                                {!isClient && (
                                  <button
                                    onClick={() => handleOpenPaymentModal(k)}
                                    disabled={isFullyPaid}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" /> Payer
                                  </button>
                                )}
                              </div>
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
            key="leads"
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
                              disabled={isClient}
                              value={lead.status}
                              onChange={(e) => updateSubscriptionStatus(lead.id, e.target.value as any)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-80 ${
                                isClient ? 'cursor-not-allowed' : 'cursor-pointer'
                              } ${
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
                              onClick={() => setSelectedSubForDiscussion(lead)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer inline-flex items-center gap-1.5 relative shadow-sm"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Échanges</span>
                              {(lead.conversations?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.2 bg-indigo-800 text-indigo-100 rounded-full text-[9px] font-black">
                                  {lead.conversations?.length}
                                </span>
                              )}
                              {lead.conversations && lead.conversations.length > 0 && (lead.conversations[lead.conversations.length - 1].senderRole === 'client' || lead.conversations[lead.conversations.length - 1].senderRole === 'prospect') && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5"></span>
                              )}
                            </button>
                            {!isClient && (
                              <>
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
                              </>
                            )}
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

        {/* TAB : CENTRE DE MESSAGERIE CLIENTS & LEADS */}
        {activeTab === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Header info bar */}
            <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-800/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Live CRM Chat
                  </span>
                  <span className="text-xs text-indigo-300 font-semibold">• {allMessagingConvs.length} fils de discussion</span>
                </div>
                <h2 className="text-xl font-bold font-display">Centre de Messagerie & Support Client</h2>
                <p className="text-xs text-indigo-200/80 max-w-2xl">
                  Recevez et répondez instantanément aux messages des clients abonnés et des prospects en ligne. Tous les messages sont synchronisés en temps réel.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="px-3.5 py-2 bg-indigo-950/80 border border-indigo-700/50 rounded-2xl text-center">
                  <span className="text-xs text-indigo-300 block">Total Messages</span>
                  <span className="text-lg font-black text-emerald-400">{totalMessagesCount}</span>
                </div>
              </div>
            </div>

            {/* Main Messaging Hub Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px]">
              
              {/* Left Column: Conversations List */}
              <div className="lg:col-span-5 border-r border-slate-100 dark:border-slate-800 flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    Fils d'Échanges ({allMessagingConvs.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">Sélectionnez une discussion pour lire et répondre.</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {allMessagingConvs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs">Aucun message client enregistré.</p>
                    </div>
                  ) : (
                    allMessagingConvs.map((conv) => {
                      const isSelected = selectedMsgConvId === conv.id || (!selectedMsgConvId && conv === allMessagingConvs[0]);
                      const lastMsg = conv.conversations[conv.conversations.length - 1];
                      const isClientSender = lastMsg && (lastMsg.senderRole === 'client' || lastMsg.senderRole === 'prospect');

                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedMsgConvId(conv.id)}
                          className={`p-4 transition-all cursor-pointer flex items-start gap-3 relative ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-l-4 border-l-indigo-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-950/20'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            conv.itemType === 'kit'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {conv.title.charAt(0)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {conv.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                {new Date(conv.lastMsgDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate mb-1">
                              {conv.subtitle} {conv.phone && `• ${conv.phone}`}
                            </p>

                            <p className={`text-[11px] truncate leading-tight ${
                              isClientSender ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500'
                            }`}>
                              {isClientSender && <span className="text-emerald-600 dark:text-emerald-400 mr-1">💬 Client :</span>}
                              {conv.lastMsgText}
                            </p>
                          </div>

                          {conv.conversations.length > 0 && (
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[9px] font-bold shrink-0">
                              {conv.conversations.length}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Chat Window */}
              <div className="lg:col-span-7 flex flex-col h-[600px] bg-slate-50/50 dark:bg-slate-950/20">
                {(() => {
                  const activeConv = allMessagingConvs.find(c => c.id === selectedMsgConvId) || allMessagingConvs[0];

                  if (!activeConv) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                        <MessageSquare className="w-12 h-12 text-slate-300" />
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Aucune discussion sélectionnée</h4>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Sélectionnez une discussion dans la colonne de gauche pour afficher l'historique complet et envoyer vos réponses.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Active Chat Header */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm font-display">
                              {activeConv.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              activeConv.itemType === 'kit'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}>
                              {activeConv.itemType === 'kit' ? 'Abonnement Kit' : 'Lead Public'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {activeConv.subtitle} {activeConv.phone && `• Téléphone: ${activeConv.phone}`}
                          </p>
                        </div>

                        {activeConv.itemType === 'kit' ? (
                          <button
                            onClick={() => {
                              const kit = kits.find(k => k.id === activeConv.id);
                              if (kit) setSelectedPlanForDiscussion(kit);
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Ouvrir Fiche Kit
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const sub = subscriptions.find(s => s.id === activeConv.id);
                              if (sub) setSelectedSubForDiscussion(sub);
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Ouvrir Fiche Lead
                          </button>
                        )}
                      </div>

                      {/* Messages Feed */}
                      <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                        {activeConv.conversations.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                            <p className="text-xs">Aucun message échangé pour le moment.</p>
                            <p className="text-[10px] text-slate-400">Écrivez ci-dessous pour initier la conversation avec le client.</p>
                          </div>
                        ) : (
                          activeConv.conversations.map((msg) => {
                            const isOwn = msg.senderRole !== 'client' && msg.senderRole !== 'prospect';
                            return (
                              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div className="text-[9px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                                  <span className="font-bold text-slate-600 dark:text-slate-300">{msg.senderName}</span>
                                  <span className="px-1 bg-slate-200 dark:bg-slate-800 rounded text-[8px] uppercase font-mono">{msg.senderRole}</span>
                                  <span>• {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div
                                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                                    isOwn
                                      ? 'bg-emerald-600 text-white rounded-tr-none'
                                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none font-medium'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Reply Box */}
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                        {isClient ? (
                          <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 text-center">
                            🔒 Mode consultation client actif.
                          </div>
                        ) : (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!hubReplyText.trim()) return;
                              const text = hubReplyText.trim();
                              setHubReplyText('');
                              try {
                                const senderName = currentUser?.displayName || 'Direction Penta GAD';
                                if (activeConv.itemType === 'kit') {
                                  await addPlanMessage(activeConv.id, text, { senderName, senderRole: currentUser?.role || 'agent' });
                                } else {
                                  await addSubscriptionMessage(activeConv.id, text, { senderName, senderRole: currentUser?.role || 'agent' });
                                }
                              } catch (err: any) {
                                console.error(err);
                                alert("Erreur lors de l'envoi : " + err.message);
                              }
                            }}
                            className="flex gap-2"
                          >
                            <input
                              type="text"
                              placeholder={`Répondre à ${activeConv.title}...`}
                              value={hubReplyText}
                              onChange={(e) => setHubReplyText(e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white font-medium"
                            />
                            <button
                              type="submit"
                              disabled={!hubReplyText.trim()}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Envoyer</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3 : GÉRER CATÉGORIES */}
        {activeTab === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Gérer Catégories ({categories.length})</h2>
                <p className="text-xs text-slate-500">Configurez les grandes gammes de kits (ex: Bronze, Silver, Gold, Platinum).</p>
              </div>
              {!isReadOnly ? (
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setCatName('');
                    setCatDailyAmount('100 FCFA / jour');
                    setCatImage('');
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10"
                >
                  <Plus className="w-4 h-4" /> Nouvelle Catégorie
                </button>
              ) : (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black flex items-center gap-1">
                  🔒 Lecture seule
                </span>
              )}
            </div>

            {isReadOnly && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <span>Les agents et les clients disposent d'un accès en lecture seule aux catégories, kits, catalogue et personnalisation.</span>
              </div>
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
              {categories.length === 0 ? (
                <div className="col-span-full p-12 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 rounded-3xl text-center text-slate-400 text-xs">
                  Aucune catégorie enregistrée. {!isReadOnly && "Cliquez sur 'Nouvelle Catégorie' ou initialisez la base depuis l'onglet 'Personnaliser'."}
                </div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group relative">
                    <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                      {!isReadOnly && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditCategory(cat)}
                            className="p-1.5 bg-white text-slate-700 rounded-lg shadow-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 bg-white text-rose-600 rounded-lg shadow-md hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{cat.name}</h3>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                        <span>Acompte estimé</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{cat.minDailyAmount}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4 : GÉRER KITS */}
        {activeTab === 'kits' && (
          <motion.div
            key="kits"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Gérer Kits ({kitDefinitions.length})</h2>
                <p className="text-xs text-slate-500">Gérez les packs cadeaux configurés et liés à vos catégories.</p>
              </div>
              {!isReadOnly ? (
                <button
                  onClick={() => {
                    setSelectedKitDef(null);
                    setKitDefName('');
                    setKitDefBenefits('');
                    const remainingDays = getRemainingDaysToDecember15();
                    const defaultTotal = 25000;
                    const calculatedDaily = Math.round(defaultTotal / remainingDays);
                    setKitDefTotal(`${new Intl.NumberFormat('fr-FR').format(defaultTotal)} FCFA`);
                    setKitDefDaily(`${new Intl.NumberFormat('fr-FR').format(calculatedDaily)} FCFA`);
                    setKitDefCategory(categories[0]?.name || 'Gamme Bronze');
                    setKitDefSelectedProducts([]);
                    setKitDefImage('');
                    setIsKitDefModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10 self-start md:self-auto"
                >
                  <Plus className="w-4 h-4" /> Nouveau Kit
                </button>
              ) : (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black flex items-center gap-1">
                  🔒 Lecture seule
                </span>
              )}
            </div>

            {isReadOnly && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <span>Les agents et les clients disposent d'un accès en lecture seule aux catégories, kits, catalogue et personnalisation.</span>
              </div>
            )}

            {/* Filter by Category */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-900 overflow-x-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-shrink-0">Filtrer par catégorie de pack:</span>
              <div className="flex gap-1.5 flex-nowrap md:flex-wrap">
                <button
                  onClick={() => setSelectedKitCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedKitCategoryFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800'
                  }`}
                >
                  Tous les packs ({kitDefinitions.length})
                </button>
                {categories.map(cat => {
                  const count = kitDefinitions.filter(k => k.categoryId === cat.name).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedKitCategoryFilter(cat.name)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedKitCategoryFilter === cat.name
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kit Definitions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {(() => {
                const filteredKits = selectedKitCategoryFilter === 'all'
                  ? kitDefinitions
                  : kitDefinitions.filter(k => k.categoryId === selectedKitCategoryFilter);

                if (filteredKits.length === 0) {
                  return (
                    <div className="col-span-full p-12 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl text-center text-slate-400 text-xs">
                      Aucun pack de cette catégorie trouvé.
                    </div>
                  );
                }

                return filteredKits.map(def => (
                  <div key={def.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative aspect-[16/10] bg-slate-50">
                      <img src={def.images[0]} alt={def.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {!isReadOnly && (
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
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full inline-block mb-1">{def.categoryId}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{def.name}</h4>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Articles inclus :</span>
                        <div className="flex flex-wrap gap-1">
                           {(() => {
                            // Let's count occurrences to display quantity nicely like "Spaghetti (5)"
                            const itemCounts: Record<string, { product: Product | undefined; qty: number; originalName: string }> = {};
                            def.products.forEach(p => {
                              const matched = findProductRobust(p, products);
                              const displayName = matched ? matched.name : p;
                              const key = displayName.trim().toLowerCase();
                              if (!itemCounts[key]) {
                                itemCounts[key] = {
                                  product: matched,
                                  qty: 0,
                                  originalName: p
                                };
                              }
                              itemCounts[key].qty += 1;
                            });
                            return Object.values(itemCounts).map((item, pi) => {
                              const { product: matched, qty, originalName } = item;
                              const displayName = matched ? matched.name : originalName;
                              return (
                                <span key={pi} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] flex items-center gap-1">
                                  {displayName} {qty > 1 && <strong className="text-emerald-600 font-bold">({qty})</strong>}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Contribution Jour</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 text-xs block font-bold">{def.dailyAmount}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Total Package Value</span>
                          <strong className="text-slate-800 dark:text-slate-200 text-xs block font-bold">{def.totalValue}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </motion.div>
        )}

        {/* TAB 5 : CATALOGUE */}
        {activeTab === 'catalogue' && (
          <motion.div
            key="catalogue"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Catalogue Gérant</h2>
                <p className="text-xs text-slate-500">Gérez les produits servant à composer vos kits ({products.length} produits enregistrés)</p>
              </div>
              {!isReadOnly ? (
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setProdName('');
                    setProdCategory('Produits alimentaires');
                    setProdSubcategory('');
                    setProdImage('');
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10 self-start md:self-auto"
                >
                  <Plus className="w-4 h-4" /> Nouveau Produit
                </button>
              ) : (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black flex items-center gap-1">
                  🔒 Lecture seule
                </span>
              )}
            </div>

            {isReadOnly && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <span>Les agents et les clients disposent d'un accès en lecture seule aux catégories, kits, catalogue et personnalisation.</span>
              </div>
            )}

            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
              <div className="relative md:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un produit, catégorie, marque..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-1">
                {['all', 'Produits alimentaires', 'Articles ménagers', 'Électroménager', 'Électronique'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCatalogueCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedCatalogueCategoryFilter === cat
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'all' ? 'Tous' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalogue List Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 pt-2">
              {(() => {
                const filteredProds = products.filter(p => {
                  const matchCat = selectedCatalogueCategoryFilter === 'all' || p.category === selectedCatalogueCategoryFilter;
                  const matchSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                    (p.subcategory || '').toLowerCase().includes(productSearchQuery.toLowerCase());
                  return matchCat && matchSearch;
                });

                if (filteredProds.length === 0) {
                  return (
                    <div className="col-span-full p-12 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 rounded-3xl text-center text-slate-400 text-xs">
                      Aucun produit ne correspond à ces critères.
                    </div>
                  );
                }

                return filteredProds.map(prod => (
                  <div key={prod.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative aspect-square rounded-xl bg-slate-50 overflow-hidden mb-2">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {!isReadOnly && (
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
                      )}
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">
                        {prod.category} {prod.subcategory && `• ${prod.subcategory}`}
                      </span>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] leading-tight truncate mt-0.5" title={prod.name}>
                        {prod.name}
                      </h4>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </motion.div>
        )}

        {/* TAB 6 : PERSONNALISER */}
        {activeTab === 'personnaliser' && (
          <motion.div
            key="personnaliser"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm p-6 space-y-6 max-w-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display">Personnaliser votre Plateforme</h2>
                  <p className="text-xs text-slate-500">Ajustez l'index d'agencement et gérez l'état global du catalogue de distribution.</p>
                </div>
                {isReadOnly && (
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black flex items-center gap-1">
                    🔒 Lecture seule
                  </span>
                )}
              </div>

              {isReadOnly && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                  <span>Les agents et les clients disposent d'un accès en lecture seule aux catégories, kits, catalogue et personnalisation.</span>
                </div>
              )}

              <div className="pt-4 space-y-4 text-xs">
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Initialisation / Réinitialisation Complète
                  </h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Vous pouvez écraser toutes vos données de kits, catégories et catalogue actuels pour charger la démo complète de Penta GAD Distribution de <strong>53 produits, 4 catégories de pack (Gamme Bronze, Silver, Gold, Platinum) et 4 kits publics</strong>.
                  </p>
                  <button
                    disabled={isReadOnly}
                    onClick={handleSeedDefaultCatalog}
                    className={`px-4 py-2 text-white font-bold rounded-xl text-[11px] transition-all cursor-pointer shadow-sm ${
                      isReadOnly
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10'
                    }`}
                  >
                    Réinitialiser & Charger les 53 Produits Démo
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">Index d'agencement des Packs</h3>
                  <p className="text-slate-500 text-[11px]">Réglez l'index de tri d'affichage de vos kits et produits par défaut.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Tri par défaut des Packs</label>
                      <select disabled={isReadOnly} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 disabled:opacity-50">
                        <option>Par index d'agencement (Ordre croissant)</option>
                        <option>Par valeur financière (Croissant)</option>
                        <option>Par valeur financière (Décroissant)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Affichage du Catalogue Gérant</label>
                      <select disabled={isReadOnly} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 disabled:opacity-50">
                        <option>Ordre alphabétique des noms (A-Z)</option>
                        <option>Ajoutés récemment d'abord</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MODALS SWITCHER */}
      {/* DISCUSSION MODAL - ACTIVE PLAN */}
      {activePlanForDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px]"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">Fiche Échanges & Discussion</h3>
                <p className="text-[10px] text-slate-400">
                  Kit : <strong className="text-slate-600 dark:text-slate-300">{activePlanForDiscussion.kitType}</strong> • Client ID : {activePlanForDiscussion.clientId}
                </p>
              </div>
              <button onClick={() => setSelectedPlanForDiscussion(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
              {(!activePlanForDiscussion.conversations || activePlanForDiscussion.conversations.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Aucun message d'échange enregistré pour cet abonnement.</p>
                  <p className="text-[10px] text-slate-400">Les échanges entre l'agent et le service d'administration s'affichent ici.</p>
                </div>
              ) : (
                activePlanForDiscussion.conversations.map((msg) => {
                  const isOwn = msg.senderRole !== 'client' && msg.senderRole !== 'prospect';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="text-[9px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{msg.senderName}</span>
                        <span className="px-1 bg-slate-100 dark:bg-slate-800 rounded text-[8px] uppercase">{msg.senderRole}</span>
                        <span>• {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Input form */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
              {isClient ? (
                <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 text-center">
                  🔒 Vous disposez d'un accès en lecture seule à vos abonnements et conversations. Les gérants s'occupent de la mise à jour de vos données.
                </div>
              ) : (
                <form onSubmit={handleSendPlanMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Saisissez un message à ajouter au fil d'échange..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* DISCUSSION MODAL - SUBSCRIPTION/LEAD */}
      {activeSubForDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[600px]"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 flex-shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">Discussion Prospect / Lead</h3>
                <p className="text-[10px] text-slate-400">
                  Prospect : <strong className="text-slate-600 dark:text-slate-300">{activeSubForDiscussion.customerName}</strong> • Kit demandé : {activeSubForDiscussion.kitName}
                </p>
              </div>
              <button onClick={() => setSelectedSubForDiscussion(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
              {(!activeSubForDiscussion.conversations || activeSubForDiscussion.conversations.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-xs">Aucun message d'échange avec ce prospect.</p>
                  <p className="text-[10px] text-slate-400">Ajoutez des notes ou des comptes-rendus d'appels pour suivre l'avancement de la conversion.</p>
                </div>
              ) : (
                activeSubForDiscussion.conversations.map((msg) => {
                  const isOwn = msg.senderRole !== 'client' && msg.senderRole !== 'prospect';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="text-[9px] text-slate-400 mb-1 px-1 flex items-center gap-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{msg.senderName}</span>
                        <span className="px-1 bg-slate-100 dark:bg-slate-800 rounded text-[8px] uppercase">{msg.senderRole}</span>
                        <span>• {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer / Input form */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
              {isClient ? (
                <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 text-center">
                  🔒 Vous disposez d'un accès en lecture seule à vos abonnements et conversations. Les gérants s'occupent de la mise à jour de vos données.
                </div>
              ) : (
                <form onSubmit={handleSendSubMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Saisissez un commentaire ou message d'échange..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}

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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Catégorie *</label>
                <select
                  required
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-medium"
                >
                  {existingProductCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
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

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Photo du Produit *
                </label>

                {/* Product Drag and Drop Zone */}
                <div
                  onDragOver={handleProdDragOver}
                  onDragLeave={handleProdDragLeave}
                  onDrop={handleProdDrop}
                  onClick={() => prodFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    prodIsDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={prodFileInputRef}
                    onChange={handleProductFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {prodImage ? (
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <img
                          src={prodImage}
                          alt="Prévisualisation"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded">Changer</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Image chargée
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProdImage('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold underline cursor-pointer"
                      >
                        Retirer la photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center space-y-2">
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          Glissez-déposez une image ici
                        </p>
                        <p className="text-[9px] text-slate-400">
                          ou cliquez pour parcourir vos fichiers
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {prodUploadError && (
                  <p className="text-rose-500 text-[10px] mt-1 font-bold">{prodUploadError}</p>
                )}
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
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Acompte / Jour *</label>
                  <input
                    type="text"
                    required
                    value={kitDefDaily}
                    onChange={(e) => handleDailyAmountChange(e.target.value)}
                    onBlur={handleDailyAmountBlur}
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
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    onBlur={handleTotalAmountBlur}
                    placeholder="Ex: 25 000 FCFA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Campaign Helper Banner */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">Calculateur de Tontine (15 Juin – 15 Décembre)</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Il reste <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{getRemainingDaysToDecember15()} jours</strong> de campagne. Le montant quotidien ou total est automatiquement réévalué.
                  </p>
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

              {/* Multi-select checklist for products from Master Catalog with Quantities */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Sélectionner les articles inclus * ({kitDefSelectedProducts.length} choisis)</label>
                
                {/* Product Search Box */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un article du catalogue..."
                      value={kitProductSearch}
                      onChange={(e) => setKitProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-[10px] text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                  {kitProductSearch && (
                    <button
                      type="button"
                      onClick={() => setKitProductSearch('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40 space-y-1.5 max-h-[180px] overflow-y-auto">
                  {products.length === 0 ? (
                    <p className="text-slate-400 text-[10px] italic">Aucun produit disponible dans la base maîtresse. Enregistrez des produits dans l'onglet "Produits Maîtres" d'abord.</p>
                  ) : (() => {
                    const filteredProducts = products.filter(p => 
                      p.name.toLowerCase().includes(kitProductSearch.toLowerCase()) ||
                      (p.subcategory && p.subcategory.toLowerCase().includes(kitProductSearch.toLowerCase()))
                    );

                    if (filteredProducts.length === 0) {
                      return <p className="text-slate-400 text-[10px] italic py-2 text-center">Aucun article ne correspond à votre recherche.</p>;
                    }

                    return filteredProducts.map(p => {
                      const count = kitDefSelectedProducts.filter(name => {
                        const matched = findProductRobust(name, products);
                        return matched ? matched.id === p.id : name === p.name;
                      }).length;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-100/60 dark:border-slate-900/60 last:border-0 hover:bg-slate-100/30 rounded px-1.5">
                          <div className="flex items-center gap-2 flex-grow min-w-0">
                            <input
                              type="checkbox"
                              checked={count > 0}
                              onChange={() => {
                                if (count > 0) {
                                  setProductQuantity(p.name, 0);
                                } else {
                                  setProductQuantity(p.name, 1);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-[10px] truncate">{p.name}</p>
                              {p.subcategory && (
                                <p className="text-[8px] text-slate-400 font-bold uppercase">{p.subcategory}</p>
                              )}
                            </div>
                          </div>

                          {/* Quantity selector */}
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setProductQuantity(p.name, count - 1)}
                              disabled={count === 0}
                              className="w-5 h-5 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[10px]"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={count === 0 ? "" : count}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                const numericVal = val === "" ? 0 : parseInt(val, 10);
                                setProductQuantity(p.name, numericVal);
                              }}
                              className="w-6 text-center font-bold text-[10px] text-slate-850 dark:text-slate-100 focus:outline-none bg-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setProductQuantity(p.name, count + 1)}
                              className="w-5 h-5 flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded cursor-pointer text-[10px]"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Photo d'illustration du Pack *
                </label>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {kitDefImage ? (
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <img
                          src={kitDefImage}
                          alt="Prévisualisation du Kit"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded">Changer</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Image chargée
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setKitDefImage('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold underline cursor-pointer"
                      >
                        Retirer l'image
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center space-y-2">
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          Glissez-déposez une image ici
                        </p>
                        <p className="text-[9px] text-slate-400">
                          ou cliquez pour parcourir vos fichiers
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-rose-500 text-[10px] mt-1 font-bold">{uploadError}</p>
                )}
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

      {/* E. CATEGORY ADD/EDIT MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden animate-none"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
              <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm">
                {selectedCategory ? "Modifier la Catégorie" : "Ajouter une Catégorie de Pack"}
              </h3>
              <button 
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setSelectedCategory(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Nom de la Catégorie *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ex: Gamme Platinum"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Acompte Journalier Estimé *</label>
                <input
                  type="text"
                  required
                  value={catDailyAmount}
                  onChange={(e) => setCatDailyAmount(e.target.value)}
                  placeholder="Ex: 200 FCFA / jour"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Image de la Catégorie *
                </label>

                {/* Category Drag and Drop Zone */}
                <div
                  onDragOver={handleCatDragOver}
                  onDragLeave={handleCatDragLeave}
                  onDrop={handleCatDrop}
                  onClick={() => catFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    catIsDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="file"
                    ref={catFileInputRef}
                    onChange={handleCategoryFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {catImage ? (
                    <div className="flex flex-col items-center space-y-2 w-full">
                      <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                        <img
                          src={catImage}
                          alt="Prévisualisation"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded">Changer</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Image chargée
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatImage('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold underline cursor-pointer"
                      >
                        Retirer l'image
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2 text-center space-y-2">
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                          Glissez-déposez une image ici
                        </p>
                        <p className="text-[9px] text-slate-400">
                          ou cliquez pour parcourir vos fichiers
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {catUploadError && (
                  <p className="text-rose-500 text-[10px] mt-1 font-bold">{catUploadError}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setSelectedCategory(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {selectedCategory ? "Sauvegarder" : "Créer la catégorie"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 8. Global Custom Confirm Dialog */}
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
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden"
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

      {/* 9. Global Custom Toast */}
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
