/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  User,
  Client,
  TontineGroup,
  TontineContribution,
  KitPlan,
  Delivery,
  Payment,
  Notification,
  ActivityLog,
  Role,
  ModuleRegistry,
  PlatformSettings,
  Category,
  Product,
  Kit,
  Subscription
} from '../types';
import { hashPassword } from '../utils/crypto';

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  if (cleaned.startsWith('+225')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('225') && cleaned.length > 10) {
    cleaned = cleaned.substring(3);
  }
  return cleaned;
}

// Collections Firestore
const USERS_COL = 'users';
const CLIENTS_COL = 'clients';
const TONTINE_GROUPS_COL = 'tontine_groups';
const CONTRIBUTIONS_COL = 'tontine_contributions';
const KITS_COL = 'kits';
const DELIVERIES_COL = 'deliveries';
const PAYMENTS_COL = 'payments';
const NOTIFICATIONS_COL = 'notifications';
const ACTIVITY_LOGS_COL = 'activity_logs';
const ROLES_COL = 'roles';
const SETTINGS_COL = 'settings';

/**
 * Générateur d'ID unique si nécessaire en local, ou utilise l'ID généré par Firestore doc
 */
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// ==========================================
// 1. REPOSITORY UTILISATEURS (USERS)
// ==========================================
export const UserRepository = {
  async getById(id: string): Promise<User | null> {
    const docRef = doc(db, USERS_COL, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },

  async getByPhone(phone: string): Promise<User | null> {
    const targetNormalized = normalizePhone(phone);
    if (!targetNormalized) return null;

    // 1. Try exact match from Firestore server
    const qExact = query(collection(db, USERS_COL), where('phone', '==', phone));
    const snapExact = await getDocsFromServer(qExact);
    if (!snapExact.empty) {
      return snapExact.docs[0].data() as User;
    }

    // Try normalized match from server if different from inputted phone
    if (phone !== targetNormalized) {
      const qNorm = query(collection(db, USERS_COL), where('phone', '==', targetNormalized));
      const snapNorm = await getDocsFromServer(qNorm);
      if (!snapNorm.empty) {
        return snapNorm.docs[0].data() as User;
      }
    }

    // 2. Fallback scan on the server results to guarantee real verification bypasses any local caching
    const qAll = query(collection(db, USERS_COL));
    const snapAll = await getDocsFromServer(qAll);
    for (const d of snapAll.docs) {
      const u = d.data() as User;
      if (normalizePhone(u.phone) === targetNormalized) {
        return u;
      }
    }

    return null;
  },

  async getAll(): Promise<User[]> {
    const q = query(collection(db, USERS_COL), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as User);
  },

  async create(user: Omit<User, 'id' | 'createdAt' | 'passwordHash'>, rawPassword: string): Promise<User> {
    const id = generateId();
    const passwordHash = await hashPassword(rawPassword);
    const newUser: User = {
      ...user,
      id,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, USERS_COL, id), newUser);
    await ActivityRepository.log(id, user.phone, user.displayName, 'create', `Création de l'utilisateur ${user.displayName} (${user.role})`);
    return newUser;
  },

  async update(id: string, userUpdates: Partial<Omit<User, 'id' | 'passwordHash'>>, adminUser?: { id: string, name: string, phone: string }): Promise<void> {
    const docRef = doc(db, USERS_COL, id);
    await updateDoc(docRef, userUpdates);
    if (adminUser) {
      await ActivityRepository.log(adminUser.id, adminUser.phone, adminUser.name, 'update', `Mise à jour de l'utilisateur ID: ${id}`);
    }
  },

  async updatePassword(id: string, newRawPassword: string, adminUser?: { id: string, name: string, phone: string }): Promise<void> {
    const passwordHash = await hashPassword(newRawPassword);
    const docRef = doc(db, USERS_COL, id);
    await updateDoc(docRef, { passwordHash });
    if (adminUser) {
      await ActivityRepository.log(adminUser.id, adminUser.phone, adminUser.name, 'update', `Changement de mot de passe de l'utilisateur ID: ${id}`);
    }
  },

  async delete(id: string, adminUser: { id: string, name: string, phone: string }): Promise<void> {
    await deleteDoc(doc(db, USERS_COL, id));
    await ActivityRepository.log(adminUser.id, adminUser.phone, adminUser.name, 'delete', `Suppression de l'utilisateur ID: ${id}`);
  },

  async authenticate(phone: string, rawPassword: string): Promise<User | null> {
    // S'assurer de la présence de l'administrateur suprême demandé
    if (phone === '0170561121' && rawPassword === '70561121Daniel 19') {
      const existing = await this.getByPhone(phone);
      if (!existing) {
        const passwordHash = await hashPassword(rawPassword);
        const supremeAdmin: User = {
          id: 'user_super_admin',
          displayName: 'admin',
          phone: '0170561121',
          passwordHash,
          role: 'super_admin',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, USERS_COL, supremeAdmin.id), supremeAdmin);
      }
    } else if (phone === '0102030405' && rawPassword === 'penta2026') {
      const existing = await this.getByPhone(phone);
      if (!existing) {
        const passwordHash = await hashPassword(rawPassword);
        const demoAdmin: User = {
          id: 'user_old_super_admin',
          displayName: 'Awa Koné (Super Admin)',
          phone: '0102030405',
          passwordHash,
          role: 'super_admin',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, USERS_COL, demoAdmin.id), demoAdmin);
      }
    }

    const user = await this.getByPhone(phone);
    if (user) {
      if (user.status !== 'active') return null;
      const inputHash = await hashPassword(rawPassword);
      if (user.passwordHash === inputHash) {
        if (user.role === 'client' && user.clientId) {
          const client = await ClientRepository.getById(user.clientId);
          if (!client || !client.portalAccountEnabled) {
            throw new Error("Le compte portail de ce client est désactivé. Veuillez contacter un administrateur.");
          }
        }
        await ActivityRepository.log(user.id, user.phone, user.displayName, 'login', 'Connexion réussie à l\'application');
        return user;
      }
      return null;
    }

    // Vérification directe dans CLIENTS_COL si le client n'est pas encore dans USERS_COL
    const client = await ClientRepository.getByPhone(phone);
    if (client) {
      if (!client.portalAccountEnabled) {
        throw new Error("Le compte portail pour ce numéro est désactivé. Veuillez contacter un administrateur.");
      }
      const inputHash = await hashPassword(rawPassword);
      if (client.portalPasswordHash === inputHash) {
        const clientUser: User = {
          id: 'user_client_' + client.id,
          displayName: `${client.firstName} ${client.lastName}`,
          phone: client.phone,
          passwordHash: client.portalPasswordHash || '',
          role: 'client',
          clientId: client.id,
          status: 'active',
          createdAt: client.createdAt || new Date().toISOString()
        };
        await ActivityRepository.log(clientUser.id, clientUser.phone, clientUser.displayName, 'login', 'Connexion au Portail Client réussie');
        return clientUser;
      }
    }

    return null;
  }
};

// ==========================================
// 2. REPOSITORY CLIENTS (CLIENTS)
// ==========================================
export const ClientRepository = {
  async getById(id: string): Promise<Client | null> {
    const docRef = doc(db, CLIENTS_COL, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Client) : null;
  },

  async getByPhone(phone: string): Promise<Client | null> {
    const targetNormalized = normalizePhone(phone);
    if (!targetNormalized) return null;

    // 1. Try exact match from Firestore server
    const qExact = query(collection(db, CLIENTS_COL), where('phone', '==', phone));
    const snapExact = await getDocsFromServer(qExact);
    if (!snapExact.empty) {
      return snapExact.docs[0].data() as Client;
    }

    // Try normalized match from server if different from inputted phone
    if (phone !== targetNormalized) {
      const qNorm = query(collection(db, CLIENTS_COL), where('phone', '==', targetNormalized));
      const snapNorm = await getDocsFromServer(qNorm);
      if (!snapNorm.empty) {
        return snapNorm.docs[0].data() as Client;
      }
    }

    // 2. Fallback scan on the server results to guarantee real verification bypasses any local caching
    const qAll = query(collection(db, CLIENTS_COL));
    const snapAll = await getDocsFromServer(qAll);
    for (const d of snapAll.docs) {
      const c = d.data() as Client;
      if (normalizePhone(c.phone) === targetNormalized) {
        return c;
      }
    }

    return null;
  },

  async getAll(): Promise<Client[]> {
    const q = query(collection(db, CLIENTS_COL), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Client);
  },

  async create(client: Omit<Client, 'id' | 'createdAt'>, author?: { id: string, name: string, phone: string }): Promise<Client> {
    const id = generateId();
    const newClient: Client = {
      ...client,
      id,
      createdAt: new Date().toISOString(),
      customFields: client.customFields || {},
      attachments: client.attachments || [],
      portalAccountEnabled: client.portalAccountEnabled || false
    };
    await setDoc(doc(db, CLIENTS_COL, id), newClient);
    const authorId = author ? author.id : 'public_self_register';
    const authorPhone = author ? author.phone : client.phone;
    const authorName = author ? author.name : 'Auto-Inscription';
    const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || `Client (${client.phone})`;
    await ActivityRepository.log(authorId, authorPhone, authorName, 'create', `Création du client ${clientName}`);
    await NotificationRepository.send(`Nouveau client`, `Le client ${clientName} a été créé.`);
    return newClient;
  },

  async update(id: string, clientUpdates: Partial<Client>, author?: { id: string, name: string, phone: string }): Promise<void> {
    const docRef = doc(db, CLIENTS_COL, id);
    await updateDoc(docRef, clientUpdates);
    const authorId = author ? author.id : 'public_self_update';
    const authorPhone = author ? author.phone : (clientUpdates.phone || '0000000000');
    const authorName = author ? author.name : 'Auto-Modification';
    await ActivityRepository.log(authorId, authorPhone, authorName, 'update', `Modification du client ID: ${id}`);
  },

  async togglePortalAccount(clientId: string, enabled: boolean, rawPassword?: string, adminUser?: { id: string, name: string, phone: string }): Promise<void> {
    const docRef = doc(db, CLIENTS_COL, clientId);
    const client = await this.getById(clientId);
    if (!client) throw new Error("Client non trouvé");

    if (enabled) {
      if (!rawPassword || rawPassword.trim().length < 4) {
        throw new Error("Le mot de passe initial doit contenir au moins 4 caractères.");
      }
      const portalPasswordHash = await hashPassword(rawPassword);
      await updateDoc(docRef, {
        portalAccountEnabled: true,
        portalPasswordHash,
        portalPassword: rawPassword
      });

      const userId = 'user_client_' + clientId;
      const userRef = doc(db, USERS_COL, userId);
      const userSnap = await getDoc(userRef);
      const userPayload: User = {
        id: userId,
        displayName: `${client.firstName} ${client.lastName}`,
        phone: client.phone,
        passwordHash: portalPasswordHash,
        role: 'client',
        clientId: client.id,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          displayName: userPayload.displayName,
          phone: userPayload.phone,
          passwordHash: portalPasswordHash,
          status: 'active',
          role: 'client'
        });
      } else {
        await setDoc(userRef, userPayload);
      }

      if (adminUser) {
        await ActivityRepository.log(adminUser.id, adminUser.phone, adminUser.name, 'update', `Activation du compte portail pour le client ${client.firstName} ${client.lastName}`);
      }
    } else {
      await updateDoc(docRef, {
        portalAccountEnabled: false
      });

      const userId = 'user_client_' + clientId;
      const userRef = doc(db, USERS_COL, userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { status: 'inactive' });
      }

      if (adminUser) {
        await ActivityRepository.log(adminUser.id, adminUser.phone, adminUser.name, 'update', `Désactivation du compte portail pour le client ${client.firstName} ${client.lastName}`);
      }
    }
  },

  async updatePortalPassword(clientId: string, newRawPassword: string, author?: { id: string, name: string, phone: string }): Promise<void> {
    if (!newRawPassword || newRawPassword.trim().length < 4) {
      throw new Error("Le mot de passe doit contenir au moins 4 caractères.");
    }
    const docRef = doc(db, CLIENTS_COL, clientId);
    const client = await this.getById(clientId);
    if (!client) throw new Error("Client non trouvé");

    const portalPasswordHash = await hashPassword(newRawPassword);
    await updateDoc(docRef, {
      portalPasswordHash,
      portalPassword: newRawPassword
    });

    const userId = 'user_client_' + clientId;
    const userRef = doc(db, USERS_COL, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, { passwordHash: portalPasswordHash });
    }

    const logAuthor = author || { id: client.id, phone: client.phone, name: `${client.firstName} ${client.lastName}` };
    await ActivityRepository.log(logAuthor.id, logAuthor.phone, logAuthor.name, 'update', `Modification du mot de passe du compte portail client ID: ${clientId}`);
  },

  async delete(id: string, author: { id: string, name: string, phone: string }): Promise<void> {
    await deleteDoc(doc(db, CLIENTS_COL, id));
    const userId = 'user_client_' + id;
    await deleteDoc(doc(db, USERS_COL, userId));
    await ActivityRepository.log(author.id, author.phone, author.name, 'delete', `Suppression du client ID: ${id}`);
  }
};

// ==========================================
// 3. REPOSITORY TONTINES
// ==========================================
export const TontineRepository = {
  async getGroupById(id: string): Promise<TontineGroup | null> {
    const docRef = doc(db, TONTINE_GROUPS_COL, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as TontineGroup) : null;
  },

  async getAllGroups(): Promise<TontineGroup[]> {
    const q = query(collection(db, TONTINE_GROUPS_COL), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as TontineGroup);
  },

  async createGroup(group: Omit<TontineGroup, 'id' | 'createdAt'>, author: { id: string, name: string, phone: string }): Promise<TontineGroup> {
    const id = generateId();
    const newGroup: TontineGroup = {
      ...group,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, TONTINE_GROUPS_COL, id), newGroup);
    await ActivityRepository.log(author.id, author.phone, author.name, 'create', `Création du groupe de tontine : ${group.name}`);
    await NotificationRepository.send(`Nouveau groupe Tontine`, `Le groupe "${group.name}" de cotisation ${group.amount} FCFA a été ouvert.`);
    return newGroup;
  },

  async updateGroup(id: string, groupUpdates: Partial<TontineGroup>, author: { id: string, name: string, phone: string }): Promise<void> {
    await updateDoc(doc(db, TONTINE_GROUPS_COL, id), groupUpdates);
    await ActivityRepository.log(author.id, author.phone, author.name, 'update', `Modification du groupe tontine ID: ${id}`);
  },

  async deleteGroup(id: string, author: { id: string, name: string, phone: string }): Promise<void> {
    await deleteDoc(doc(db, TONTINE_GROUPS_COL, id));
    await ActivityRepository.log(author.id, author.phone, author.name, 'delete', `Suppression du groupe de tontine ID: ${id}`);
  },

  async getContributionsByGroup(groupId: string): Promise<TontineContribution[]> {
    const q = query(collection(db, CONTRIBUTIONS_COL), where('groupId', '==', groupId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as TontineContribution);
  },

  async getAllContributions(): Promise<TontineContribution[]> {
    const q = query(collection(db, CONTRIBUTIONS_COL), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as TontineContribution);
  },

  async addContribution(contribution: Omit<TontineContribution, 'id'>, author: { id: string, name: string, phone: string }): Promise<TontineContribution> {
    const id = generateId();
    const newContribution: TontineContribution = { ...contribution, id };
    await setDoc(doc(db, CONTRIBUTIONS_COL, id), newContribution);

    // Enregistrer également en tant que paiement centralisé
    await PaymentRepository.create({
      clientId: contribution.clientId,
      amount: contribution.amount,
      type: 'tontine',
      referenceId: id,
      date: contribution.date,
      method: 'cash'
    }, author);

    await ActivityRepository.log(author.id, author.phone, author.name, 'payment', `Cotisation de ${contribution.amount} FCFA par le client ID: ${contribution.clientId}`);
    return newContribution;
  }
};

// ==========================================
// 4. REPOSITORY KITS ALIMENTAIRES (KITS)
// ==========================================
export const KitRepository = {
  async getPlanById(id: string): Promise<KitPlan | null> {
    const docRef = doc(db, KITS_COL, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as KitPlan) : null;
  },

  async getAllPlans(): Promise<KitPlan[]> {
    const q = query(collection(db, KITS_COL));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as KitPlan);
  },

  async createPlan(plan: Omit<KitPlan, 'id'>, author: { id: string, name: string, phone: string }): Promise<KitPlan> {
    const id = generateId();
    const newPlan: KitPlan = { ...plan, id };
    await setDoc(doc(db, KITS_COL, id), newPlan);
    await ActivityRepository.log(author.id, author.phone, author.name, 'create', `Inscription du client ID: ${plan.clientId} au kit ${plan.kitType}`);
    await NotificationRepository.send(`Nouvelle inscription Kit`, `Un nouveau plan de kit alimentaire (${plan.kitType}) a été activé.`);
    return newPlan;
  },

  async updatePlan(id: string, planUpdates: Partial<KitPlan>, author: { id: string, name: string, phone: string }): Promise<void> {
    await updateDoc(doc(db, KITS_COL, id), planUpdates);
    await ActivityRepository.log(author.id, author.phone, author.name, 'update', `Mise à jour du plan kit ID: ${id}`);
  },

  async addPlanMessage(id: string, message: any): Promise<void> {
    const docRef = doc(db, KITS_COL, id);
    try {
      await updateDoc(docRef, {
        conversations: arrayUnion(message)
      });
    } catch (e) {
      // Fallback if doc needs conversations initialized
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const conversations = data.conversations || [];
        conversations.push(message);
        await updateDoc(docRef, { conversations });
      }
    }
  }
};

// ==========================================
// 5. REPOSITORY LIVRAISONS (DELIVERIES)
// ==========================================
export const DeliveryRepository = {
  async getById(id: string): Promise<Delivery | null> {
    const docRef = doc(db, DELIVERIES_COL, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Delivery) : null;
  },

  async getAll(): Promise<Delivery[]> {
    const q = query(collection(db, DELIVERIES_COL), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Delivery);
  },

  async create(delivery: Omit<Delivery, 'id'>, author: { id: string, name: string, phone: string }): Promise<Delivery> {
    const id = generateId();
    const confirmationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Code de confirmation simple
    const newDelivery: Delivery = { ...delivery, id, confirmationCode };
    await setDoc(doc(db, DELIVERIES_COL, id), newDelivery);
    await ActivityRepository.log(author.id, author.phone, author.name, 'create', `Création d'une livraison pour le client ID: ${delivery.clientId}`);
    await NotificationRepository.send(`Nouvelle livraison créée`, `Livraison prévue le ${delivery.date} à ${delivery.commune}. Code: ${confirmationCode}`);
    return newDelivery;
  },

  async update(id: string, updates: Partial<Delivery>, author: { id: string, name: string, phone: string }): Promise<void> {
    await updateDoc(doc(db, DELIVERIES_COL, id), updates);
    await ActivityRepository.log(author.id, author.phone, author.name, 'delivery_update', `Statut de livraison ID ${id} mis à jour : ${updates.status}`);
    if (updates.status === 'delivered') {
      await NotificationRepository.send(`Livraison confirmée`, `La livraison ID: ${id} a été marquée comme livrée.`);
    }
  }
};

// ==========================================
// 6. REPOSITORY PAIEMENTS (PAYMENTS)
// ==========================================
export const PaymentRepository = {
  async getAll(): Promise<Payment[]> {
    const q = query(collection(db, PAYMENTS_COL), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Payment);
  },

  async create(payment: Omit<Payment, 'id'>, author: { id: string, name: string, phone: string }): Promise<Payment> {
    const id = generateId();
    const newPayment: Payment = { ...payment, id };
    await setDoc(doc(db, PAYMENTS_COL, id), newPayment);
    await ActivityRepository.log(author.id, author.phone, author.name, 'payment', `Paiement enregistré de ${payment.amount} FCFA via ${payment.method}`);
    return newPayment;
  }
};

// ==========================================
// 7. REPOSITORY NOTIFICATIONS (CENTRALIZED)
// ==========================================
export const NotificationRepository = {
  async getAll(): Promise<Notification[]> {
    const q = query(collection(db, NOTIFICATIONS_COL), orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Notification);
  },

  async send(title: string, message: string, type: Notification['type'] = 'info', userId?: string): Promise<Notification> {
    const id = generateId();
    const newNotif: Notification = {
      id,
      title,
      message,
      type,
      ...(userId !== undefined ? { userId } : {}),
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, NOTIFICATIONS_COL, id), newNotif);
    return newNotif;
  },

  async markAsRead(id: string): Promise<void> {
    await updateDoc(doc(db, NOTIFICATIONS_COL, id), { read: true });
  },

  async markAllAsRead(): Promise<void> {
    const q = query(collection(db, NOTIFICATIONS_COL), where('read', '==', false));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(d => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  }
};

// ==========================================
// 8. REPOSITORY JOURNAL D'ACTIVITÉS (ACTIVITY LOGS)
// ==========================================
export const ActivityRepository = {
  async getAll(): Promise<ActivityLog[]> {
    const q = query(collection(db, ACTIVITY_LOGS_COL), orderBy('createdAt', 'desc'), limit(200));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as ActivityLog);
  },

  async log(userId: string, userPhone: string, userName: string, action: ActivityLog['action'], details: string): Promise<ActivityLog> {
    const id = generateId();
    const newLog: ActivityLog = {
      id,
      userId,
      userPhone,
      userName,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, ACTIVITY_LOGS_COL, id), newLog);
    return newLog;
  }
};

// ==========================================
// 9. REPOSITORY CONFIGURATION (SETTINGS & ROLES)
// ==========================================
export const SettingsRepository = {
  async getRoles(): Promise<Role[]> {
    const querySnapshot = await getDocs(collection(db, ROLES_COL));
    if (querySnapshot.empty) {
      // Retourner rôles par défaut
      return [
        { id: 'super_admin', name: 'super_admin', displayName: 'Super Administrateur', permissions: ['all'] },
        { id: 'admin', name: 'admin', displayName: 'Administrateur', permissions: ['view_all', 'edit_all'] },
        { id: 'agent', name: 'agent', displayName: 'Agent', permissions: ['view_all', 'edit_clients', 'edit_tontines'] },
        { id: 'livreur', name: 'livreur', displayName: 'Livreur', permissions: ['view_deliveries', 'edit_deliveries'] },
        { id: 'client', name: 'client', displayName: 'Client', permissions: ['view_own_profile'] }
      ];
    }
    return querySnapshot.docs.map(doc => doc.data() as Role);
  },

  async addRole(role: Role): Promise<void> {
    await setDoc(doc(db, ROLES_COL, role.id), role);
  },

  async getModules(): Promise<ModuleRegistry[]> {
    const querySnapshot = await getDocs(collection(db, SETTINGS_COL));
    const modules: ModuleRegistry[] = [];
    querySnapshot.forEach(doc => {
      if (doc.id.startsWith('module_')) {
        modules.push(doc.data() as ModuleRegistry);
      }
    });

    if (modules.length === 0) {
      // Retourner modules initiaux par défaut
      return [
        { id: 'dashboard', name: 'Tableau de bord', icon: 'LayoutDashboard', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'] },
        { id: 'clients', name: 'Clients', icon: 'Users', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'] },
        { id: 'tontine', name: 'Tontine', icon: 'PiggyBank', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'] },
        { id: 'kits', name: 'Kits alimentaires', icon: 'ShoppingBag', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'] },
        { id: 'deliveries', name: 'Livraisons', icon: 'Truck', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent', 'livreur'] },
        { id: 'users', name: 'Utilisateurs', icon: 'ShieldAlert', enabled: true, rolesAllowed: ['super_admin', 'admin'] },
        { id: 'settings', name: 'Paramètres', icon: 'Settings', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent', 'livreur', 'client'] }
      ];
    }
    return modules;
  },

  async saveModule(module: ModuleRegistry): Promise<void> {
    await setDoc(doc(db, SETTINGS_COL, `module_${module.id}`), module);
  },

  async getGlobalSettings(): Promise<PlatformSettings> {
    const docRef = doc(db, SETTINGS_COL, 'global_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PlatformSettings;
    }
    return {
      id: 'global_config',
      siteName: 'Penta GAD Distribution',
      siteIconUrl: ''
    };
  },

  async saveGlobalSettings(settings: Omit<PlatformSettings, 'id'>): Promise<void> {
    await setDoc(doc(db, SETTINGS_COL, 'global_config'), {
      id: 'global_config',
      ...settings
    });
  }
};

// ==========================================
// 9.5 REPOSITORY CATEGORIES (PACKS CATEGORIES)
// ==========================================
export const CategoryRepository = {
  async getAll(): Promise<Category[]> {
    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  },

  async create(category: Omit<Category, 'id'>): Promise<Category> {
    const id = generateId();
    const newCategory: Category = { ...category, id };
    await setDoc(doc(db, 'categories', id), newCategory);
    return newCategory;
  },

  async update(id: string, updates: Partial<Category>): Promise<void> {
    await updateDoc(doc(db, 'categories', id), updates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'categories', id));
  }
};

// ==========================================
// 10. REPOSITORY PRODUITS (PRODUCTS CATALOG)
// ==========================================
export const ProductRepository = {
  async getAll(): Promise<Product[]> {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  },

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const id = generateId();
    const newProduct: Product = { ...product, id };
    await setDoc(doc(db, 'products', id), newProduct);
    return newProduct;
  },

  async update(id: string, updates: Partial<Product>): Promise<void> {
    await updateDoc(doc(db, 'products', id), updates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'products', id));
  }
};

// ==========================================
// 11. REPOSITORY KITS CATALOGUE (KIT DEFINITIONS)
// ==========================================
export const KitDefinitionRepository = {
  async getAll(): Promise<Kit[]> {
    const q = query(collection(db, 'kit_definitions'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kit));
  },

  async create(kit: Omit<Kit, 'id'>): Promise<Kit> {
    const id = generateId();
    const newKit: Kit = { ...kit, id };
    await setDoc(doc(db, 'kit_definitions', id), newKit);
    return newKit;
  },

  async update(id: string, updates: Partial<Kit>): Promise<void> {
    await updateDoc(doc(db, 'kit_definitions', id), updates);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'kit_definitions', id));
  }
};

// ==========================================
// 12. REPOSITORY SOUSCRIPTIONS / LEADS (SUBSCRIPTIONS)
// ==========================================
export const SubscriptionRepository = {
  async getAll(): Promise<Subscription[]> {
    const q = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
  },

  async create(sub: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> {
    const id = generateId();
    const newSub: Subscription = {
      ...sub,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'subscriptions', id), newSub);
    // Notification et log d'activité
    await NotificationRepository.send(
      `Nouveau lead d'inscription`,
      `Client ${sub.customerName} s'est inscrit au kit ${sub.kitName}. Tél: ${sub.phone}`
    );
    return newSub;
  },

  async updateStatus(id: string, status: Subscription['status']): Promise<void> {
    await updateDoc(doc(db, 'subscriptions', id), { status });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'subscriptions', id));
  },

  async addSubscriptionMessage(id: string, message: any): Promise<void> {
    const docRef = doc(db, 'subscriptions', id);
    try {
      await updateDoc(docRef, {
        conversations: arrayUnion(message)
      });
    } catch (e) {
      // Fallback
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const conversations = data.conversations || [];
        conversations.push(message);
        await updateDoc(docRef, { conversations });
      }
    }
  }
};

// ==========================================
// SEED INITIAL DATA FOR THE ENTIRE PLATFORM
// ==========================================
export async function seedPlatformData(): Promise<void> {
  const batch = writeBatch(db);

  // 1. Enregistrer les rôles par défaut
  const roles: Role[] = [
    { id: 'super_admin', name: 'super_admin', displayName: 'Super Administrateur', permissions: ['all'] },
    { id: 'admin', name: 'admin', displayName: 'Administrateur', permissions: ['view_all', 'edit_all'] },
    { id: 'agent', name: 'agent', displayName: 'Agent', permissions: ['view_all', 'edit_clients', 'edit_tontines'] },
    { id: 'livreur', name: 'livreur', displayName: 'Livreur', permissions: ['view_deliveries', 'edit_deliveries'] },
    { id: 'client', name: 'client', displayName: 'Client', permissions: ['view_own_profile'] }
  ];
  roles.forEach(r => {
    batch.set(doc(db, ROLES_COL, r.id), r);
  });

  // 2. Enregistrer les modules de base
  const baseModules: ModuleRegistry[] = [
    { id: 'dashboard', name: 'Tableau de bord', icon: 'LayoutDashboard', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'], description: 'Vue d\'ensemble de l\'activité, des statistiques clés et des notifications.' },
    { id: 'clients', name: 'Clients', icon: 'Users', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'], description: 'Gestion complète du portefeuille clients, fiches détaillées et extensibilité.' },
    { id: 'tontine', name: 'Tontine', icon: 'PiggyBank', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'], description: 'Gestion des groupes de tontine, participants, tirages et cotisations.' },
    { id: 'kits', name: 'Kits alimentaires', icon: 'ShoppingBag', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent'], description: 'Inscriptions aux abonnements de kits alimentaires, suivi des soldes et livraisons.' },
    { id: 'deliveries', name: 'Livraisons', icon: 'Truck', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent', 'livreur'], description: 'Suivi et attribution des livraisons de kits alimentaires aux livreurs.' },
    { id: 'portal', name: 'Portail Client', icon: 'UserCheck', enabled: true, rolesAllowed: ['super_admin', 'admin', 'client'], description: 'Espace client sécurisé en consultation seule pour l\'historique, les cotisations et livraisons.' },
    { id: 'users', name: 'Utilisateurs', icon: 'ShieldAlert', enabled: true, rolesAllowed: ['super_admin', 'admin'], description: 'Gestion des accès d\'équipe, des agents, des livreurs et des rôles.' },
    { id: 'settings', name: 'Paramètres', icon: 'Settings', enabled: true, rolesAllowed: ['super_admin', 'admin', 'agent', 'livreur', 'client'], description: 'Configuration du profil, gestion des rôles dynamiques et du registre de modules.' }
  ];
  baseModules.forEach(m => {
    batch.set(doc(db, SETTINGS_COL, `module_${m.id}`), m);
  });

  // 3. Enregistrer un utilisateur Super Admin par défaut
  const superAdminPhone = '0170561121';
  const hashedSuperAdmin = await hashPassword('70561121Daniel 19');
  const superAdmin: User = {
    id: 'user_super_admin',
    displayName: 'admin',
    phone: superAdminPhone,
    passwordHash: hashedSuperAdmin,
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  batch.set(doc(db, USERS_COL, superAdmin.id), superAdmin);

  // Nous n'enregistrons aucun autre utilisateur de l'équipe ni aucune donnée d'exemple (clients, tontines, livraisons, etc.)
  // afin de laisser la base de données propre par défaut, avec uniquement le compte admin suprême.

  await batch.commit();
}
