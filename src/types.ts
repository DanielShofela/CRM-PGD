/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  displayName: string;
  phone: string;
  passwordHash: string;
  role: string; // 'super_admin' | 'admin' | 'agent' | 'livreur' | 'client' | custom
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Client {
  id: string;
  lastName: string;
  firstName: string;
  phone: string;
  address: string;
  commune: string;
  quartier: string;
  photoUrl: string;
  status: 'active' | 'inactive';
  observations: string;
  createdAt: string;
  customFields?: Record<string, any>; // Permet l'extensibilité du profil client
  attachments?: Attachment[];
}

export interface TontineMember {
  clientId: string;
  articleName: string;
  totalAmount: number;
  durationInDays: number;
  dailyAmount: number;
  frequency: 'weekly' | 'monthly' | 'bi_monthly' | 'custom';
  customDays?: number;
  frequencyAmount: number;
}

export interface TontineGroup {
  id: string;
  name: string;
  amount: number; // Cotisation par période de référence
  cycle: 'daily' | 'weekly' | 'monthly' | 'bi_monthly' | 'custom';
  status: 'active' | 'completed' | 'paused';
  memberIds: string[]; // Liste des IDs des clients participants (gardé pour compatibilité)
  drawOrder: string[]; // Ordre des IDs clients pour le tirage (gardé pour compatibilité)
  createdAt: string;
  members?: TontineMember[]; // Paramètres individuels par membre
}

export interface TontineContribution {
  id: string;
  groupId: string;
  clientId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'late';
}

export interface KitPlan {
  id: string;
  clientId: string;
  kitType: string; // ex: 'bronze' | 'silver' | 'gold' | custom
  status: 'active' | 'suspended' | 'delivered';
  price: number;
  balance: number; // Solde payé ou restant
  startDate: string;
  endDate: string;
  nextDeliveryDate: string;
  conversations?: ConversationMessage[];
}

export interface Delivery {
  id: string;
  clientId: string;
  orderItems: string; // Description de la commande / kit
  livreurId?: string; // ID de l'utilisateur livreur
  address: string;
  commune: string;
  quartier: string;
  status: 'pending' | 'out_for_delivery' | 'delivered' | 'cancelled';
  date: string;
  time: string;
  confirmationCode?: string;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  type: 'tontine' | 'kit' | 'delivery' | 'other';
  referenceId: string; // ID du groupe tontine, du plan kit, ou de la livraison
  date: string;
  method: 'orange_money' | 'mtn_money' | 'wave' | 'cash';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  userId?: string; // Ciblé pour un utilisateur ou global
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  action: 'login' | 'create' | 'update' | 'delete' | 'payment' | 'delivery_update' | 'other';
  details: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
}

export interface ModuleRegistry {
  id: string;
  name: string;
  icon: string; // Nom de l'icône Lucide
  enabled: boolean;
  rolesAllowed: string[];
  future?: boolean; // Indique un module futur planifié
  description?: string;
}

export interface PlatformSettings {
  id: string; // 'global_config'
  siteName: string;
  siteIconUrl: string;
}

export interface Category {
  id: string;
  name: string; // e.g. "Bronze" or "Gamme Bronze"
  dailyAmount: string; // e.g. "100 FCFA"
  image?: string; // Image base64 or URL
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  image: string;
}

export interface Kit {
  id: string;
  name: string;
  categoryId: string;
  dailyAmount: string;
  totalValue: string;
  images: string[];
  benefits: string[];
  products: string[];
  deliveryInfo: string;
}

export interface ConversationMessage {
  id: string;
  senderName: string;
  senderRole: 'agent' | 'client' | 'admin' | 'super_admin';
  text: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  kitId: string;
  kitName: string;
  status: 'En attente' | 'Contacté' | 'Livré';
  createdAt: string;
  conversations?: ConversationMessage[];
}

