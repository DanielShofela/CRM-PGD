/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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
import {
  UserRepository,
  ClientRepository,
  TontineRepository,
  KitRepository,
  DeliveryRepository,
  PaymentRepository,
  NotificationRepository,
  ActivityRepository,
  SettingsRepository,
  seedPlatformData,
  ProductRepository,
  CategoryRepository,
  KitDefinitionRepository,
  SubscriptionRepository
} from '../repositories/database';
import { db } from '../lib/firebase';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeModuleId: string;
  setActiveModuleId: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Data collections
  users: User[];
  clients: Client[];
  tontines: TontineGroup[];
  contributions: TontineContribution[];
  kits: KitPlan[];
  deliveries: Delivery[];
  payments: Payment[];
  notifications: Notification[];
  logs: ActivityLog[];
  roles: Role[];
  modules: ModuleRegistry[];
  categories: Category[];
  products: Product[];
  kitDefinitions: Kit[];
  subscriptions: Subscription[];

  // General state
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;

  // Actions
  refreshData: () => Promise<void>;
  seedData: () => Promise<void>;
  login: (phone: string, rawPass: string) => Promise<boolean>;
  register: (displayName: string, phone: string, rawPass: string, role?: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Modifiers
  addClient: (client: Omit<Client, 'id' | 'createdAt'>, author?: { id: string, name: string, phone: string }) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>, author?: { id: string, name: string, phone: string }) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  addTontineGroup: (group: Omit<TontineGroup, 'id' | 'createdAt'>) => Promise<void>;
  deleteTontineGroup: (id: string) => Promise<void>;
  addContribution: (contribution: Omit<TontineContribution, 'id'>) => Promise<void>;

  addKitPlan: (plan: Omit<KitPlan, 'id'>) => Promise<void>;
  updateKitPlan: (id: string, updates: Partial<KitPlan>) => Promise<void>;

  addDelivery: (delivery: Omit<Delivery, 'id'>) => Promise<void>;
  updateDelivery: (id: string, updates: Partial<Delivery>) => Promise<void>;

  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;

  addUser: (user: Omit<User, 'id' | 'createdAt' | 'passwordHash'>, rawPass: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>) => Promise<void>;
  updateUserPassword: (id: string, newRawPass: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  saveModule: (module: ModuleRegistry) => Promise<void>;
  sendNotification: (title: string, message: string, type: Notification['type']) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  platformSettings: { siteName: string; siteIconUrl: string };
  updatePlatformSettings: (settings: { siteName: string; siteIconUrl: string }) => Promise<void>;

  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addKitDefinition: (kit: Omit<Kit, 'id'>) => Promise<void>;
  updateKitDefinition: (id: string, updates: Partial<Kit>) => Promise<void>;
  deleteKitDefinition: (id: string) => Promise<void>;

  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscriptionStatus: (id: string, status: Subscription['status']) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  addPlanMessage: (id: string, text: string) => Promise<void>;
  addSubscriptionMessage: (id: string, text: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Collections
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tontines, setTontines] = useState<TontineGroup[]>([]);
  const [contributions, setContributions] = useState<TontineContribution[]>([]);
  const [kits, setKits] = useState<KitPlan[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleRegistry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kitDefinitions, setKitDefinitions] = useState<Kit[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platformSettings, setPlatformSettings] = useState<{ siteName: string; siteIconUrl: string }>({
    siteName: 'Penta GAD Distribution',
    siteIconUrl: ''
  });

  // Charger les paramètres globaux dès le chargement de l'application
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        const settings = await SettingsRepository.getGlobalSettings();
        setPlatformSettings({
          siteName: settings.siteName,
          siteIconUrl: settings.siteIconUrl
        });
      } catch (err) {
        console.error("Erreur de chargement des paramètres globaux :", err);
      }
    };
    loadGlobalSettings();
  }, []);

  // Mettre à jour le titre du document et le favicon
  useEffect(() => {
    document.title = platformSettings.siteName;
    if (platformSettings.siteIconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = platformSettings.siteIconUrl;
    }
  }, [platformSettings]);

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('penta_crm_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('penta_crm_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Charger la session utilisateur si elle existe en local
  useEffect(() => {
    const savedUser = localStorage.getItem('penta_crm_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('penta_crm_user');
      }
    }
  }, []);

  // Charger toutes les données
  const refreshData = async () => {
    setLoading(true);
    try {
      const [
        fetchedUsers,
        fetchedClients,
        fetchedGroups,
        fetchedConts,
        fetchedKits,
        fetchedDeliveries,
        fetchedPayments,
        fetchedNotifs,
        fetchedLogs,
        fetchedRoles,
        fetchedModules
      ] = await Promise.all([
        UserRepository.getAll(),
        ClientRepository.getAll(),
        TontineRepository.getAllGroups(),
        TontineRepository.getAllContributions(),
        KitRepository.getAllPlans(),
        DeliveryRepository.getAll(),
        PaymentRepository.getAll(),
        NotificationRepository.getAll(),
        ActivityRepository.getAll(),
        SettingsRepository.getRoles(),
        SettingsRepository.getModules()
      ]);

      setUsers(fetchedUsers);
      setClients(fetchedClients);
      setTontines(fetchedGroups);
      setContributions(fetchedConts);
      setKits(fetchedKits);
      setDeliveries(fetchedDeliveries);
      setPayments(fetchedPayments);
      setNotifications(fetchedNotifs);
      setLogs(fetchedLogs);
      setRoles(fetchedRoles);
      setModules(fetchedModules);
      setError(null);
    } catch (err: any) {
      console.error("Erreur lors de la récupération des données :", err);
      // Ne pas planter l'application, afficher juste une alerte ou stocker l'erreur
      setError("Certaines collections Firestore sont vides ou non initialisées. Veuillez cliquer sur 'Générer les données de démonstration' dans les paramètres.");
    } finally {
      setLoading(false);
    }
  };

  // Charger les données en temps réel dès qu'un utilisateur est connecté ou que la base est mise à jour
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    let activeListenersCount = 0;
    const totalCriticalListeners = 10;

    const checkLoadingComplete = () => {
      activeListenersCount++;
      if (activeListenersCount >= totalCriticalListeners) {
        setLoading(false);
      }
    };

    try {
      // 1. Utilisateurs
      const unsubUsers = onSnapshot(
        query(collection(db, 'users'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setUsers(snapshot.docs.map(doc => doc.data() as User));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Users:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubUsers);

      // 2. Clients
      const unsubClients = onSnapshot(
        query(collection(db, 'clients'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setClients(snapshot.docs.map(doc => doc.data() as Client));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Clients:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubClients);

      // 3. Groupes de Tontine
      const unsubGroups = onSnapshot(
        query(collection(db, 'tontine_groups'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setTontines(snapshot.docs.map(doc => doc.data() as TontineGroup));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Tontine Groups:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubGroups);

      // 4. Cotisations de Tontine
      const unsubContributions = onSnapshot(
        query(collection(db, 'tontine_contributions'), orderBy('date', 'desc')),
        (snapshot) => {
          setContributions(snapshot.docs.map(doc => doc.data() as TontineContribution));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Contributions:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubContributions);

      // 5. Kits Alimentaires
      const unsubKits = onSnapshot(
        collection(db, 'kits'),
        (snapshot) => {
          setKits(snapshot.docs.map(doc => doc.data() as KitPlan));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Kits:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubKits);

      // 6. Livraisons
      const unsubDeliveries = onSnapshot(
        query(collection(db, 'deliveries'), orderBy('date', 'desc')),
        (snapshot) => {
          setDeliveries(snapshot.docs.map(doc => doc.data() as Delivery));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Deliveries:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubDeliveries);

      // 7. Paiements
      const unsubPayments = onSnapshot(
        query(collection(db, 'payments'), orderBy('date', 'desc')),
        (snapshot) => {
          setPayments(snapshot.docs.map(doc => doc.data() as Payment));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Payments:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubPayments);

      // 8. Notifications
      const unsubNotifs = onSnapshot(
        query(collection(db, 'notifications'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setNotifications(snapshot.docs.map(doc => doc.data() as Notification));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Notifications:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubNotifs);

      // 9. Journal d'activités
      const unsubLogs = onSnapshot(
        query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(200)),
        (snapshot) => {
          setLogs(snapshot.docs.map(doc => doc.data() as ActivityLog));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Logs:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubLogs);

      // 10. Rôles
      const unsubRoles = onSnapshot(
        collection(db, 'roles'),
        (snapshot) => {
          if (!snapshot.empty) {
            setRoles(snapshot.docs.map(doc => doc.data() as Role));
          }
        },
        (err) => console.error("Erreur temps réel Roles:", err)
      );
      unsubscribers.push(unsubRoles);

      // 11. Modules
      const unsubModules = onSnapshot(
        collection(db, 'settings'),
        (snapshot) => {
          const fetchedModules: ModuleRegistry[] = [];
          snapshot.forEach(doc => {
            if (doc.id.startsWith('module_')) {
              fetchedModules.push(doc.data() as ModuleRegistry);
            }
          });
          if (fetchedModules.length > 0) {
            setModules(fetchedModules);
          }
        },
        (err) => console.error("Erreur temps réel Modules:", err)
      );
      unsubscribers.push(unsubModules);

      // 12. Souscriptions (Leads)
      const unsubSubs = onSnapshot(
        query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setSubscriptions(snapshot.docs.map(doc => doc.data() as Subscription));
          checkLoadingComplete();
        },
        (err) => {
          console.error("Erreur temps réel Subscriptions:", err);
          checkLoadingComplete();
        }
      );
      unsubscribers.push(unsubSubs);

    } catch (err: any) {
      console.error("Erreur lors de l'initialisation des écouteurs temps réel :", err);
      setError("Erreur d'initialisation de la synchronisation en temps réel.");
      setLoading(false);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser]);

  // Écouteurs inconditionnels pour les visiteurs publics (catalogue produits et kits)
  useEffect(() => {
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), orderBy('name', 'asc')),
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      },
      (err) => console.error("Erreur temps réel Products:", err)
    );

    const unsubKitsDef = onSnapshot(
      query(collection(db, 'kit_definitions'), orderBy('name', 'asc')),
      (snapshot) => {
        setKitDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kit)));
      },
      (err) => console.error("Erreur temps réel Kit Definitions:", err)
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories'), orderBy('name', 'asc')),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      },
      (err) => console.error("Erreur temps réel Categories:", err)
    );

    return () => {
      unsubProducts();
      unsubKitsDef();
      unsubCategories();
    };
  }, []);

  const seedData = async () => {
    setLoading(true);
    try {
      await seedPlatformData();
      await refreshData();
      if (currentUser) {
        await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'other', 'Initialisation des données de démonstration de la plateforme');
      }
      setError(null);
    } catch (err: any) {
      setError("Erreur de génération des données : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, rawPass: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const user = await UserRepository.authenticate(phone, rawPass);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('penta_crm_user', JSON.stringify(user));
        return true;
      } else {
        setError("Numéro de téléphone ou mot de passe incorrect, ou compte inactif.");
        return false;
      }
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (displayName: string, phone: string, rawPass: string, role: string = 'client'): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const existingUser = await UserRepository.getByPhone(phone);
      if (existingUser) {
        setError("Ce numéro de téléphone est déjà enregistré.");
        return false;
      }
      const user = await UserRepository.create({
        displayName,
        phone,
        role,
        status: 'active'
      }, rawPass);

      if (user) {
        // Optionnel : Connecter automatiquement si c'est une auto-inscription
        setCurrentUser(user);
        localStorage.setItem('penta_crm_user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'other', 'Déconnexion de l\'application');
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('penta_crm_user');
    setActiveModuleId('dashboard');
  };

  // CLIENTS ACTIONS
  const getAuthor = () => {
    if (!currentUser) throw new Error("Veuillez vous connecter.");
    return { id: currentUser.id, name: currentUser.displayName, phone: currentUser.phone };
  };

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>, author?: { id: string, name: string, phone: string }) => {
    const existingClient = await ClientRepository.getByPhone(client.phone);
    const existingUser = await UserRepository.getByPhone(client.phone);
    if (existingClient || existingUser) {
      throw new Error("L'utilisateur est déjà inscrit.");
    }
    const auth = author || (currentUser ? { id: currentUser.id, name: currentUser.displayName, phone: currentUser.phone } : undefined);
    await ClientRepository.create(client, auth);
    await refreshData();
  };

  const updateClient = async (id: string, updates: Partial<Client>, author?: { id: string, name: string, phone: string }) => {
    if (updates.phone) {
      const existingClient = await ClientRepository.getByPhone(updates.phone);
      if (existingClient && existingClient.id !== id) {
        throw new Error("L'utilisateur est déjà inscrit.");
      }
      const existingUser = await UserRepository.getByPhone(updates.phone);
      if (existingUser) {
        throw new Error("L'utilisateur est déjà inscrit.");
      }
    }
    const auth = author || (currentUser ? { id: currentUser.id, name: currentUser.displayName, phone: currentUser.phone } : undefined);
    await ClientRepository.update(id, updates, auth);
    await refreshData();
  };

  const deleteClient = async (id: string) => {
    await ClientRepository.delete(id, getAuthor());
    await refreshData();
  };

  // TONTINES ACTIONS
  const addTontineGroup = async (group: Omit<TontineGroup, 'id' | 'createdAt'>) => {
    await TontineRepository.createGroup(group, getAuthor());
    await refreshData();
  };

  const deleteTontineGroup = async (id: string) => {
    await TontineRepository.deleteGroup(id, getAuthor());
    await refreshData();
  };

  const addContribution = async (contribution: Omit<TontineContribution, 'id'>) => {
    await TontineRepository.addContribution(contribution, getAuthor());
    await refreshData();
  };

  // KITS ALIMENTAIRES ACTIONS
  const addKitPlan = async (plan: Omit<KitPlan, 'id'>) => {
    await KitRepository.createPlan(plan, getAuthor());
    await refreshData();
  };

  const updateKitPlan = async (id: string, updates: Partial<KitPlan>) => {
    await KitRepository.updatePlan(id, updates, getAuthor());
    await refreshData();
  };

  // LIVRAISONS ACTIONS
  const addDelivery = async (delivery: Omit<Delivery, 'id'>) => {
    await DeliveryRepository.create(delivery, getAuthor());
    await refreshData();
  };

  const updateDelivery = async (id: string, updates: Partial<Delivery>) => {
    await DeliveryRepository.update(id, updates, getAuthor());
    await refreshData();
  };

  // PAIEMENTS ACTIONS
  const addPayment = async (payment: Omit<Payment, 'id'>) => {
    await PaymentRepository.create(payment, getAuthor());
    await refreshData();
  };

  // TEAM MANAGEMENTS
  const addUser = async (user: Omit<User, 'id' | 'createdAt' | 'passwordHash'>, rawPass: string) => {
    const existingUser = await UserRepository.getByPhone(user.phone);
    const existingClient = await ClientRepository.getByPhone(user.phone);
    if (existingUser || existingClient) {
      throw new Error("L'utilisateur est déjà inscrit.");
    }
    await UserRepository.create(user, rawPass);
    await refreshData();
  };

  const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>) => {
    if (updates.phone) {
      const existingUser = await UserRepository.getByPhone(updates.phone);
      if (existingUser && existingUser.id !== id) {
        throw new Error("L'utilisateur est déjà inscrit.");
      }
      const existingClient = await ClientRepository.getByPhone(updates.phone);
      if (existingClient) {
        throw new Error("L'utilisateur est déjà inscrit.");
      }
    }
    await UserRepository.update(id, updates, getAuthor());
    await refreshData();
  };

  const updateUserPassword = async (id: string, newRawPass: string) => {
    await UserRepository.updatePassword(id, newRawPass, getAuthor());
    await refreshData();
  };

  const deleteUser = async (id: string) => {
    await UserRepository.delete(id, getAuthor());
    await refreshData();
  };

  // MODULE REGISTRY SETTING
  const saveModule = async (module: ModuleRegistry) => {
    await SettingsRepository.saveModule(module);
    await refreshData();
  };

  // NOTIFICATION CENTRALIZED SERVICE
  const sendNotification = async (title: string, message: string, type: Notification['type']) => {
    await NotificationRepository.send(title, message, type);
    await refreshData();
  };

  const markNotificationAsRead = async (id: string) => {
    await NotificationRepository.markAsRead(id);
    await refreshData();
  };

  const markAllNotificationsAsRead = async () => {
    await NotificationRepository.markAllAsRead();
    await refreshData();
  };

  const updatePlatformSettings = async (settings: { siteName: string; siteIconUrl: string }) => {
    try {
      await SettingsRepository.saveGlobalSettings(settings);
      setPlatformSettings(settings);
      if (currentUser) {
        await ActivityRepository.log(
          currentUser.id,
          currentUser.phone,
          currentUser.displayName,
          'update',
          `Modification des paramètres globaux : Nom "${settings.siteName}"`
        );
      }
    } catch (err: any) {
      console.error("Erreur de mise à jour des paramètres :", err);
      throw err;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const isDuplicate = products.some(p => p.name.trim().toLowerCase() === product.name.trim().toLowerCase());
    if (isDuplicate) {
      console.warn(`Product "${product.name}" already exists. Skipping insertion.`);
      return;
    }
    await ProductRepository.create(product);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'create', `Ajout d'un produit maître : ${product.name}`);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await ProductRepository.update(id, updates);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'update', `Mise à jour du produit maître ID: ${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    await ProductRepository.delete(id);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'delete', `Suppression du produit maître ID: ${id}`);
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    await CategoryRepository.create(category);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'create', `Création d'une catégorie de pack : ${category.name}`);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    await CategoryRepository.update(id, updates);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'update', `Mise à jour de la catégorie ID: ${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    await CategoryRepository.delete(id);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'delete', `Suppression de la catégorie ID: ${id}`);
    }
  };

  const addKitDefinition = async (kit: Omit<Kit, 'id'>) => {
    await KitDefinitionRepository.create(kit);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'create', `Configuration d'un kit complexe : ${kit.name}`);
    }
  };

  const updateKitDefinition = async (id: string, updates: Partial<Kit>) => {
    await KitDefinitionRepository.update(id, updates);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'update', `Mise à jour de la configuration du kit ID: ${id}`);
    }
  };

  const deleteKitDefinition = async (id: string) => {
    await KitDefinitionRepository.delete(id);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'delete', `Suppression du kit ID: ${id}`);
    }
  };

  const addSubscription = async (sub: Omit<Subscription, 'id' | 'createdAt'>) => {
    await SubscriptionRepository.create(sub);
  };

  const updateSubscriptionStatus = async (id: string, status: Subscription['status']) => {
    await SubscriptionRepository.updateStatus(id, status);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'update', `Statut du lead/souscription ID: ${id} mis à jour en : ${status}`);
    }
  };

  const deleteSubscription = async (id: string) => {
    await SubscriptionRepository.delete(id);
    if (currentUser) {
      await ActivityRepository.log(currentUser.id, currentUser.phone, currentUser.displayName, 'delete', `Suppression du lead/souscription ID: ${id}`);
    }
  };

  const addPlanMessage = async (id: string, text: string) => {
    if (!currentUser) return;
    const msg = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      text,
      createdAt: new Date().toISOString()
    };
    await KitRepository.addPlanMessage(id, msg);
    await refreshData();
  };

  const addSubscriptionMessage = async (id: string, text: string) => {
    if (!currentUser) return;
    const msg = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      text,
      createdAt: new Date().toISOString()
    };
    await SubscriptionRepository.addSubscriptionMessage(id, msg);
    await refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeModuleId,
        setActiveModuleId,
        theme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        searchQuery,
        setSearchQuery,
        users,
        clients,
        tontines,
        contributions,
        kits,
        deliveries,
        payments,
        notifications,
        logs,
        roles,
        modules,
        categories,
        products,
        kitDefinitions,
        subscriptions,
        loading,
        error,
        setError,
        refreshData,
        seedData,
        login,
        register,
        logout,
        addClient,
        updateClient,
        deleteClient,
        addTontineGroup,
        deleteTontineGroup,
        addContribution,
        addKitPlan,
        updateKitPlan,
        addDelivery,
        updateDelivery,
        addPayment,
        addUser,
        updateUser,
        updateUserPassword,
        deleteUser,
        saveModule,
        sendNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        platformSettings,
        updatePlatformSettings,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addKitDefinition,
        updateKitDefinition,
        deleteKitDefinition,
        addSubscription,
        updateSubscriptionStatus,
        deleteSubscription,
        addPlanMessage,
        addSubscriptionMessage
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp doit être utilisé à l\'intérieur de AppProvider');
  }
  return context;
};
