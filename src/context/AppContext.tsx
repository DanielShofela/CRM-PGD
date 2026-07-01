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
  ModuleRegistry
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
  seedPlatformData
} from '../repositories/database';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Charger les données dès qu'un utilisateur est connecté
  useEffect(() => {
    if (currentUser) {
      refreshData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

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
    const auth = author || (currentUser ? { id: currentUser.id, name: currentUser.displayName, phone: currentUser.phone } : undefined);
    await ClientRepository.create(client, auth);
    await refreshData();
  };

  const updateClient = async (id: string, updates: Partial<Client>, author?: { id: string, name: string, phone: string }) => {
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
    const existing = await UserRepository.getByPhone(user.phone);
    if (existing) {
      throw new Error("Ce numéro de téléphone est déjà utilisé par un membre de l'équipe.");
    }
    await UserRepository.create(user, rawPass);
    await refreshData();
  };

  const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'passwordHash'>>) => {
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
        markAllNotificationsAsRead
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
