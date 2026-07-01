/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

// Configuration Firebase récupérée du fichier de configuration de l'applet
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Initialisation de Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialisation de Firestore avec l'ID de base de données spécifique s'il existe
const databaseId = config.firestoreDatabaseId || '(default)';
const db = getFirestore(app, databaseId);

export { app, db };
export default db;
