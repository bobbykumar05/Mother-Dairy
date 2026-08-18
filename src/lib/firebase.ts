import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  User,
  UserRole,
  Product,
  Route,
  Party,
  Order,
  Visit,
  PaymentRecord,
  PriceHistory,
  AppSettings,
  ActivityLog,
  ExpenseRecord,
  SalaryRecord,
  FuelExpenseRecord,
  AttendanceRecord,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ROUTES,
  INITIAL_PARTIES,
  INITIAL_SETTINGS,
} from '../db/seedData';
import firebaseConfigJson from '../../firebase-applet-config.json';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) {
    return (import.meta as any).env[key] || '';
  }
  return '';
};

const firebaseConfig = {
  apiKey:
    getEnv('VITE_FIREBASE_API_KEY') ||
    getEnv('VITE_API_KEY') ||
    firebaseConfigJson?.apiKey ||
    "AIzaSyBtQNnN_LDD-67Sq_2B1Npk7bH9O3w3gls",
  authDomain:
    getEnv('VITE_FIREBASE_AUTH_DOMAIN') ||
    firebaseConfigJson?.authDomain ||
    "mother-dairy-sales-system.firebaseapp.com",
  projectId:
    getEnv('VITE_FIREBASE_PROJECT_ID') ||
    firebaseConfigJson?.projectId ||
    "mother-dairy-sales-system",
  storageBucket:
    getEnv('VITE_FIREBASE_STORAGE_BUCKET') ||
    firebaseConfigJson?.storageBucket ||
    "mother-dairy-sales-system.firebasestorage.app",
  messagingSenderId:
    getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    firebaseConfigJson?.messagingSenderId ||
    "258806244029",
  appId:
    getEnv('VITE_FIREBASE_APP_ID') ||
    firebaseConfigJson?.appId ||
    "1:258806244029:web:0d70275f341b1273ef8dd4",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use custom databaseId if configured via environment variable or JSON config
const customDatabaseId =
  getEnv('VITE_FIREBASE_DATABASE_ID') ||
  firebaseConfigJson?.firestoreDatabaseId;

let firestoreDb;
try {
  firestoreDb = customDatabaseId
    ? initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        customDatabaseId
      )
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
} catch (e) {
  firestoreDb = customDatabaseId
    ? getFirestore(app, customDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

// ==========================================
// ERROR HANDLING PER FIREBASE SKILL
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

/**
 * Log all Sales and Manager activities to Firebase Firestore
 */
export async function logActivityToFirebase(
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  details: string,
  module: string
) {
  try {
    const logRef = collection(db, 'activityLogs');
    await addDoc(logRef, {
      userId,
      userName,
      userRole,
      action,
      details,
      module,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'activityLogs');
  }
}

/**
 * Sign Up new Sales Representative or Manager account in Firebase Auth & Firestore
 */
export async function signUpWithFirebase(
  email: string,
  pass: string,
  name: string,
  role: UserRole,
  phone: string
): Promise<User> {
  let uid: string;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    uid = userCred.user.uid;
    // Set display name in Firebase Auth user profile
    try {
      await updateProfile(userCred.user, { displayName: name });
    } catch (profileErr) {
      console.warn('Could not update Firebase Auth displayName:', profileErr);
    }
  } catch (authErr: any) {
    if (
      authErr.code === 'auth/operation-not-allowed' ||
      authErr.code === 'auth/admin-restricted-operation' ||
      authErr.code === 'auth/configuration-not-found'
    ) {
      console.warn('Firebase Email/Password Auth is disabled in Firebase console. Storing user profile directly in Firestore.');
      uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    } else {
      throw authErr;
    }
  }

  const newUser: User = {
    id: uid,
    username: email,
    name,
    email,
    role,
    phone,
    active: true,
  };

  // Save profile document in Firestore users collection
  try {
    await setDoc(doc(db, 'users', uid), {
      ...newUser,
      createdAt: new Date().toISOString(),
    });
  } catch (dbErr) {
    handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}`);
  }

  // Log registration activity
  await logActivityToFirebase(
    uid,
    name,
    role,
    'ACCOUNT_SIGNUP',
    `New ${role} account signed up: ${name} (${email})`,
    'AUTH'
  );

  return newUser;
}

/**
 * Log In user with Firebase Auth & fetch Firestore user profile
 */
export async function loginWithFirebase(email: string, pass: string): Promise<User> {
  let uid: string | undefined;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    uid = userCred.user.uid;
  } catch (authErr: any) {
    if (
      authErr.code === 'auth/operation-not-allowed' ||
      authErr.code === 'auth/admin-restricted-operation' ||
      authErr.code === 'auth/configuration-not-found'
    ) {
      console.warn('Firebase Email/Password Auth is disabled in Firebase console. Searching user profile directly in Firestore.');
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as User;
          const userObj: User = {
            id: snap.docs[0].id,
            username: docData.email || email,
            name: docData.name || email.split('@')[0],
            email: docData.email || email,
            role: docData.role || 'SALES',
            phone: docData.phone || '',
            active: docData.active !== false,
          };
          await logActivityToFirebase(userObj.id, userObj.name, userObj.role, 'LOGIN', `Logged in via direct Firestore account`, 'AUTH');
          return userObj;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }

      // If user profile is not found, auto-create one
      const tempUid = 'usr_' + Math.random().toString(36).substring(2, 9);
      const isManagerOrAdmin = email.toLowerCase().includes('admin') || email.toLowerCase().includes('manager');
      const assignedRole: UserRole = isManagerOrAdmin ? 'ADMIN' : 'SALES';
      const createdUser: User = {
        id: tempUid,
        username: email,
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: assignedRole,
        phone: '',
        active: true,
      };
      try {
        await setDoc(doc(db, 'users', tempUid), {
          ...createdUser,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${tempUid}`);
      }

      await logActivityToFirebase(createdUser.id, createdUser.name, createdUser.role, 'LOGIN', `User session started (${createdUser.role})`, 'AUTH');
      return createdUser;
    } else {
      throw authErr;
    }
  }

  // Fetch Firestore user document
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as User;
      const userObj: User = {
        id: uid,
        username: data.email || email,
        name: data.name || (email ? email.split('@')[0] : 'User'),
        email: data.email || email,
        role: data.role || 'SALES',
        phone: data.phone || '',
        active: data.active !== false,
      };
      await logActivityToFirebase(userObj.id, userObj.name, userObj.role, 'LOGIN', `User session started (${userObj.role})`, 'AUTH');
      return userObj;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  // Fallback if user profile doesn't exist in Firestore
  const fallbackUser: User = {
    id: uid,
    username: email,
    name: email.split('@')[0] || 'User',
    email: email,
    role: 'SALES',
    phone: '',
    active: true,
  };

  try {
    await setDoc(doc(db, 'users', uid), {
      ...fallbackUser,
      createdAt: new Date().toISOString(),
    });
  } catch (dbErr) {
    handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}`);
  }

  await logActivityToFirebase(fallbackUser.id, fallbackUser.name, fallbackUser.role, 'LOGIN', `User session initialized (${fallbackUser.role})`, 'AUTH');
  return fallbackUser;
}

/**
 * Sign out user from Firebase
 */
export async function logoutWithFirebase(currentUser?: User | null) {
  if (currentUser) {
    await logActivityToFirebase(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'LOGOUT',
      `User signed out of session`,
      'AUTH'
    );
  }
  await signOut(auth);
}

/**
 * Send password reset email via Firebase Auth
 */
export async function resetPasswordWithFirebase(email: string) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Fetch or initialize Firestore User profile from a Firebase Auth user
 */
export async function getCurrentUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const uid = firebaseUser.uid;
  const email = firebaseUser.email || '';

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  // Fallback profile if Firestore doc doesn't exist yet
  const fallbackUser: User = {
    id: uid,
    username: email,
    name: firebaseUser.displayName || (email ? email.split('@')[0] : 'User'),
    email: email,
    role: 'SALES',
    phone: '',
    active: true,
  };

  try {
    await setDoc(doc(db, 'users', uid), {
      ...fallbackUser,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
  }

  return fallbackUser;
}

/**
 * Fetch all activity logs saved in Firebase
 */
export async function getActivityLogsFromFirebase(): Promise<ActivityLog[]> {
  try {
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    querySnapshot.forEach((d) => {
      const data = d.data();
      logs.push({
        id: d.id,
        userId: data.userId || '',
        userName: data.userName || 'System',
        userRole: data.userRole || 'SALES',
        action: data.action || '',
        details: data.details || '',
        module: data.module || 'SYSTEM',
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });
    return logs;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'activityLogs');
    return [];
  }
}

/**
 * Fetch all registered users from Firestore
 */
export async function getUsersFromFirebase(): Promise<User[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: User[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      users.push({
        id: d.id,
        username: data.email || data.username || '',
        name: data.name || 'User',
        email: data.email || '',
        role: data.role || 'SALES',
        phone: data.phone || '',
        active: data.active !== false,
      });
    });
    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'users');
    return [];
  }
}

// =========================================================================
// REAL-TIME CENTRALIZED DATA SUBSCRIPTION & CLOUD INITIALIZATION
// =========================================================================

/**
 * Initializes Firestore with default Mother Dairy catalog, routes, parties, and settings if empty.
 * Guarantees that Android apps and desktop web browsers share the exact same centralized data.
 */
export async function initFirestoreDefaultsIfEmpty(): Promise<void> {
  try {
    // Check if products collection has documents
    const prodSnap = await getDocs(query(collection(db, 'products'), limit(1)));
    if (prodSnap.empty) {
      console.log('Centralized Firestore database is fresh. Initializing default products, routes, parties & settings...');
      const batch = writeBatch(db);

      // Seed default products
      INITIAL_PRODUCTS.forEach((p, idx) => {
        const id = `prod_${idx + 1}`;
        const ref = doc(db, 'products', id);
        batch.set(ref, {
          ...p,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      // Seed default routes
      INITIAL_ROUTES.forEach((r) => {
        const ref = doc(db, 'routes', r.id);
        batch.set(ref, {
          ...r,
          createdAt: new Date().toISOString(),
        });
      });

      // Seed default parties
      INITIAL_PARTIES.forEach((p, idx) => {
        const id = `pty_${idx + 1}`;
        const ref = doc(db, 'parties', id);
        batch.set(ref, {
          ...p,
          id,
          createdAt: new Date().toISOString(),
        });
      });

      // Seed default settings
      const settingsRef = doc(db, 'settings', 'appConfig');
      batch.set(settingsRef, INITIAL_SETTINGS);

      await batch.commit();
      console.log('Centralized Firestore database successfully populated.');
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'initial_seed');
  }
}

/**
 * Concurrently fetches all collections from Firestore in a single parallel query batch.
 * Provides immediate server data synchronization upon app refresh or initial launch.
 */
export async function getAllDataFromFirestore(): Promise<{
  products: Product[];
  parties: Party[];
  routes: Route[];
  orders: Order[];
  visits: Visit[];
  payments: PaymentRecord[];
  priceHistories: PriceHistory[];
  settings: AppSettings | null;
  logs: ActivityLog[];
  users: User[];
}> {
  try {
    const [
      prodSnap,
      partySnap,
      routeSnap,
      orderSnap,
      visitSnap,
      paySnap,
      priceSnap,
      settingSnap,
      logSnap,
      userSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'products')).catch(() => null),
      getDocs(collection(db, 'parties')).catch(() => null),
      getDocs(collection(db, 'routes')).catch(() => null),
      getDocs(collection(db, 'orders')).catch(() => null),
      getDocs(collection(db, 'visits')).catch(() => null),
      getDocs(collection(db, 'payments')).catch(() => null),
      getDocs(collection(db, 'priceHistories')).catch(() => null),
      getDoc(doc(db, 'settings', 'appConfig')).catch(() => null),
      getDocs(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100))).catch(() => null),
      getDocs(collection(db, 'users')).catch(() => null),
    ]);

    const products: Product[] = [];
    if (prodSnap) {
      prodSnap.forEach((d) => products.push({ id: d.id, ...(d.data() as any) }));
    }

    const parties: Party[] = [];
    if (partySnap) {
      partySnap.forEach((d) => parties.push({ id: d.id, ...(d.data() as any) }));
    }

    const routes: Route[] = [];
    if (routeSnap) {
      routeSnap.forEach((d) => routes.push({ id: d.id, ...(d.data() as any) }));
      routes.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    }

    const orders: Order[] = [];
    if (orderSnap) {
      orderSnap.forEach((d) => orders.push({ id: d.id, ...(d.data() as any) }));
      orders.sort((a, b) => {
        const dateComp = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        if (dateComp !== 0) return dateComp;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }

    const visits: Visit[] = [];
    if (visitSnap) {
      visitSnap.forEach((d) => visits.push({ id: d.id, ...(d.data() as any) }));
      visits.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }

    const payments: PaymentRecord[] = [];
    if (paySnap) {
      paySnap.forEach((d) => payments.push({ id: d.id, ...(d.data() as any) }));
      payments.sort((a, b) => new Date(b.paymentDate || b.createdAt || 0).getTime() - new Date(a.paymentDate || a.createdAt || 0).getTime());
    }

    const priceHistories: PriceHistory[] = [];
    if (priceSnap) {
      priceSnap.forEach((d) => priceHistories.push({ id: d.id, ...(d.data() as any) }));
    }

    const settings: AppSettings | null = settingSnap && settingSnap.exists()
      ? (settingSnap.data() as AppSettings)
      : null;

    const logs: ActivityLog[] = [];
    if (logSnap) {
      logSnap.forEach((d) => logs.push({ id: d.id, ...(d.data() as any) }));
    }

    const users: User[] = [];
    if (userSnap) {
      userSnap.forEach((d) => users.push({ id: d.id, ...(d.data() as any) }));
    }

    return {
      products,
      parties,
      routes,
      orders,
      visits,
      payments,
      priceHistories,
      settings,
      logs,
      users,
    };
  } catch (err) {
    console.error('getAllDataFromFirestore error:', err);
    return {
      products: [],
      parties: [],
      routes: [],
      orders: [],
      visits: [],
      payments: [],
      priceHistories: [],
      settings: null,
      logs: [],
      users: [],
    };
  }
}

export interface RealtimeDataSubscribers {
  onOrders?: (orders: Order[]) => void;
  onProducts?: (products: Product[]) => void;
  onParties?: (parties: Party[]) => void;
  onRoutes?: (routes: Route[]) => void;
  onVisits?: (visits: Visit[]) => void;
  onPayments?: (payments: PaymentRecord[]) => void;
  onSettings?: (settings: AppSettings) => void;
  onPriceHistories?: (histories: PriceHistory[]) => void;
  onLogs?: (logs: ActivityLog[]) => void;
  onUsers?: (users: User[]) => void;
  onSyncStateChange?: (state: 'connected' | 'syncing' | 'offline') => void;
}

/**
 * Subscribes to ALL Firestore collections in real time.
 * Automatically synchronizes changes bi-directionally between Android apps and Web browsers.
 */
export function subscribeToAllRealtimeData(subs: RealtimeDataSubscribers): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];

  // 1. Orders Real-Time Listener
  if (subs.onOrders) {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        // Sort descending by order date / timestamp
        list.sort((a, b) => {
          const dateComp = new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
          if (dateComp !== 0) return dateComp;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        subs.onOrders!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'orders')
    );
    unsubscribers.push(unsub);
  }

  // 2. Products Real-Time Listener
  if (subs.onProducts) {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        subs.onProducts!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'products')
    );
    unsubscribers.push(unsub);
  }

  // 3. Parties Real-Time Listener
  if (subs.onParties) {
    const unsub = onSnapshot(
      collection(db, 'parties'),
      (snapshot) => {
        const list: Party[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        subs.onParties!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'parties')
    );
    unsubscribers.push(unsub);
  }

  // 4. Routes Real-Time Listener
  if (subs.onRoutes) {
    const unsub = onSnapshot(
      collection(db, 'routes'),
      (snapshot) => {
        const list: Route[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        subs.onRoutes!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'routes')
    );
    unsubscribers.push(unsub);
  }

  // 5. Visits Real-Time Listener
  if (subs.onVisits) {
    const unsub = onSnapshot(
      collection(db, 'visits'),
      (snapshot) => {
        const list: Visit[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        subs.onVisits!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'visits')
    );
    unsubscribers.push(unsub);
  }

  // 6. Payments Real-Time Listener
  if (subs.onPayments) {
    const unsub = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const list: PaymentRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => new Date(b.paymentDate || b.createdAt || 0).getTime() - new Date(a.paymentDate || a.createdAt || 0).getTime());
        subs.onPayments!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'payments')
    );
    unsubscribers.push(unsub);
  }

  // 7. Settings Real-Time Listener
  if (subs.onSettings) {
    const unsub = onSnapshot(
      doc(db, 'settings', 'appConfig'),
      (snapshot) => {
        if (snapshot.exists()) {
          subs.onSettings!(snapshot.data() as AppSettings);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'settings/appConfig')
    );
    unsubscribers.push(unsub);
  }

  // 8. Price History Real-Time Listener
  if (subs.onPriceHistories) {
    const unsub = onSnapshot(
      collection(db, 'priceHistories'),
      (snapshot) => {
        const list: PriceHistory[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime());
        subs.onPriceHistories!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'priceHistories')
    );
    unsubscribers.push(unsub);
  }

  // 9. Activity Logs Real-Time Listener
  if (subs.onLogs) {
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId || '',
            userName: data.userName || 'System',
            userRole: data.userRole || 'SALES',
            action: data.action || '',
            details: data.details || '',
            module: data.module || 'SYSTEM',
            timestamp: data.timestamp || new Date().toISOString(),
          });
        });
        subs.onLogs!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'activityLogs')
    );
    unsubscribers.push(unsub);
  }

  // 10. Users Real-Time Listener
  if (subs.onUsers) {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: User[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as User;
          list.push({
            id: d.id,
            username: data.email || data.username || '',
            name: data.name || 'User',
            email: data.email || '',
            role: data.role || 'SALES',
            phone: data.phone || '',
            active: data.active !== false,
          });
        });
        subs.onUsers!(list);
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'users')
    );
    unsubscribers.push(unsub);
  }

  // Return composite unsubscribe
  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

// =========================================================================
// DIRECT CLOUD MUTATIONS (FIRESTORE REAL-TIME OPERATIONS)
// =========================================================================

// --- ORDERS ---
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const docRef = doc(db, 'orders', order.id);
  await setDoc(docRef, {
    ...order,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateOrderInFirestore(orderId: string, updates: Partial<Order>): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', orderId));
}

// --- PRODUCTS ---
export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, 'products', product.id);
  await setDoc(docRef, {
    ...product,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateProductInFirestore(productId: string, updates: Partial<Product>): Promise<void> {
  const docRef = doc(db, 'products', productId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  await deleteDoc(doc(db, 'products', productId));
}

// --- PARTIES ---
export async function savePartyToFirestore(party: Party): Promise<void> {
  const docRef = doc(db, 'parties', party.id);
  await setDoc(docRef, {
    ...party,
  });
}

export async function updatePartyInFirestore(partyId: string, updates: Partial<Party>): Promise<void> {
  const docRef = doc(db, 'parties', partyId);
  await updateDoc(docRef, {
    ...updates,
  });
}

export async function deletePartyFromFirestore(partyId: string): Promise<void> {
  await deleteDoc(doc(db, 'parties', partyId));

  // Also remove associated orders, visits, payments in Firestore
  try {
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('partyId', '==', partyId)));
    const batch = writeBatch(db);
    ordersSnap.forEach((d) => batch.delete(d.ref));

    const visitsSnap = await getDocs(query(collection(db, 'visits'), where('partyId', '==', partyId)));
    visitsSnap.forEach((d) => batch.delete(d.ref));

    const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('partyId', '==', partyId)));
    paymentsSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (e) {
    console.warn('Batch deletion of party associated records notice:', e);
  }
}

// --- ROUTES ---
export async function saveRouteToFirestore(route: Route): Promise<void> {
  const docRef = doc(db, 'routes', route.id);
  await setDoc(docRef, {
    ...route,
  });
}

export async function updateRouteInFirestore(routeId: string, updates: Partial<Route>): Promise<void> {
  const docRef = doc(db, 'routes', routeId);
  await updateDoc(docRef, {
    ...updates,
  });
}

// --- VISITS ---
export async function saveVisitToFirestore(visit: Visit): Promise<void> {
  const docRef = doc(db, 'visits', visit.id);
  await setDoc(docRef, {
    ...visit,
  });
}

// --- PAYMENTS ---
export async function savePaymentToFirestore(payment: PaymentRecord): Promise<void> {
  const docRef = doc(db, 'payments', payment.id);
  await setDoc(docRef, {
    ...payment,
  });
}

// --- SETTINGS ---
export async function saveSettingsToFirestore(settings: Partial<AppSettings>): Promise<void> {
  const docRef = doc(db, 'settings', 'appConfig');
  await setDoc(docRef, settings, { merge: true });
}

export async function getSettingsFromFirestore(): Promise<AppSettings | null> {
  try {
    const docRef = doc(db, 'settings', 'appConfig');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'settings/appConfig');
  }
  return null;
}

// --- PRICE HISTORY ---
export async function savePriceHistoryToFirestore(history: PriceHistory): Promise<void> {
  const docRef = doc(db, 'priceHistories', history.id);
  await setDoc(docRef, {
    ...history,
  });
}

// --- RESET DATABASE IN FIRESTORE ---
export async function resetAllDataInFirestore(userId: string = 'usr_admin', userName: string = 'Admin'): Promise<void> {
  try {
    // Clear dynamic operational collections: orders, visits, payments
    const collectionsToClear = ['orders', 'visits', 'payments'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // Reset party lifetime order counters in Firestore
    const partiesSnap = await getDocs(collection(db, 'parties'));
    if (!partiesSnap.empty) {
      const batch = writeBatch(db);
      partiesSnap.forEach((d) => {
        batch.update(d.ref, {
          lifetimeOrders: 0,
          lifetimeValue: 0,
          lastOrderDate: '',
          lastVisitDate: '',
        });
      });
      await batch.commit();
    }

    await logActivityToFirebase(
      userId,
      userName,
      'ADMIN',
      'RESET_DATABASE',
      'Cleared all sample orders, visits, payments, and analytics records in cloud database.',
      'SYSTEM'
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'reset_all_data');
  }
}

// ==========================================
// EXPENSE MANAGEMENT FIRESTORE HELPERS
// ==========================================

export async function getExpensesFromFirebase(): Promise<ExpenseRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    const items: ExpenseRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        date: data.date || '',
        category: data.category || 'Misc',
        amount: Number(data.amount) || 0,
        description: data.description || '',
        createdBy: data.createdBy || '',
        createdById: data.createdById || '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'expenses');
    return [];
  }
}

export async function addExpenseToFirebase(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord> {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    createdAt: new Date().toISOString(),
  });
  return {
    id: docRef.id,
    ...expense,
    createdAt: new Date().toISOString(),
  };
}

export async function updateExpenseInFirebase(id: string, updates: Partial<ExpenseRecord>): Promise<void> {
  await updateDoc(doc(db, 'expenses', id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteExpenseFromFirebase(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id));
}

// ==========================================
// SALARY CREDIT FIRESTORE HELPERS
// ==========================================

export async function getSalariesFromFirebase(): Promise<SalaryRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'salaries'));
    const items: SalaryRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        userId: data.userId || '',
        userName: data.userName || '',
        amount: Number(data.amount) || 0,
        creditDate: data.creditDate || '',
        month: data.month || '',
        status: data.status || 'Credited',
        notes: data.notes || '',
        recordedBy: data.recordedBy || '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return items.sort((a, b) => new Date(b.creditDate).getTime() - new Date(a.creditDate).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'salaries');
    return [];
  }
}

export async function addSalaryToFirebase(salary: Omit<SalaryRecord, 'id' | 'createdAt'>): Promise<SalaryRecord> {
  const docRef = await addDoc(collection(db, 'salaries'), {
    ...salary,
    createdAt: new Date().toISOString(),
  });
  return {
    id: docRef.id,
    ...salary,
    createdAt: new Date().toISOString(),
  };
}

export async function updateSalaryInFirebase(id: string, updates: Partial<SalaryRecord>): Promise<void> {
  await updateDoc(doc(db, 'salaries', id), { ...updates });
}

export async function deleteSalaryFromFirebase(id: string): Promise<void> {
  await deleteDoc(doc(db, 'salaries', id));
}

// ==========================================
// FUEL EXPENSE FIRESTORE HELPERS
// ==========================================

export async function getFuelExpensesFromFirebase(): Promise<FuelExpenseRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'fuelExpenses'));
    const items: FuelExpenseRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        date: data.date || '',
        amount: Number(data.amount) || 0,
        notes: data.notes || '',
        recordedBy: data.recordedBy || '',
        recordedById: data.recordedById || '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'fuelExpenses');
    return [];
  }
}

export async function addFuelExpenseToFirebase(fuel: Omit<FuelExpenseRecord, 'id' | 'createdAt'>): Promise<FuelExpenseRecord> {
  const docRef = await addDoc(collection(db, 'fuelExpenses'), {
    ...fuel,
    createdAt: new Date().toISOString(),
  });
  return {
    id: docRef.id,
    ...fuel,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteFuelExpenseFromFirebase(id: string): Promise<void> {
  await deleteDoc(doc(db, 'fuelExpenses', id));
}

// ==========================================
// ATTENDANCE MANAGEMENT FIRESTORE HELPERS
// ==========================================

export async function getAttendanceFromFirebase(userId?: string): Promise<AttendanceRecord[]> {
  try {
    const colRef = collection(db, 'attendance');
    const snap = userId
      ? await getDocs(query(colRef, where('userId', '==', userId)))
      : await getDocs(colRef);

    const items: AttendanceRecord[] = [];
    snap.forEach((d) => {
      const data = d.data();
      items.push({
        id: d.id,
        userId: data.userId || '',
        userName: data.userName || '',
        userRole: data.userRole || 'SALES',
        date: data.date || '',
        status: data.status || 'Present',
        checkInTime: data.checkInTime || '',
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt,
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'attendance');
    return [];
  }
}

/**
 * Mark or update daily attendance for a user.
 * Overwrites existing entry if already recorded for the same userId and date to prevent duplicate entries.
 */
export async function saveAttendanceToFirebase(
  userId: string,
  userName: string,
  userRole: UserRole,
  date: string,
  status: 'Present' | 'Absent' | 'Leave' | 'Holiday',
  checkInTime?: string,
  notes?: string
): Promise<AttendanceRecord> {
  const colRef = collection(db, 'attendance');
  const q = query(colRef, where('userId', '==', userId), where('date', '==', date));
  const existingSnap = await getDocs(q);

  const payload = {
    userId,
    userName,
    userRole,
    date,
    status,
    checkInTime: checkInTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    notes: notes || '',
    updatedAt: new Date().toISOString(),
  };

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    await updateDoc(doc(db, 'attendance', existingDoc.id), payload);
    return {
      id: existingDoc.id,
      ...payload,
      createdAt: existingDoc.data().createdAt || new Date().toISOString(),
    };
  } else {
    const docRef = await addDoc(colRef, {
      ...payload,
      createdAt: new Date().toISOString(),
    });
    return {
      id: docRef.id,
      ...payload,
      createdAt: new Date().toISOString(),
    };
  }
}

