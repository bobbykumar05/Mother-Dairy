import {
  User,
  Product,
  Route,
  Party,
  Order,
  Visit,
  PaymentRecord,
  ActivityLog,
  AppSettings,
  PriceHistory,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ROUTES,
  INITIAL_PARTIES,
  INITIAL_SETTINGS,
} from '../db/seedData';
import { calculateOrderTotal } from './calculations';
import {
  saveOrderToFirestore,
  updateOrderInFirestore,
  deleteOrderFromFirestore,
  saveProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  savePartyToFirestore,
  updatePartyInFirestore,
  deletePartyFromFirestore,
  saveRouteToFirestore,
  updateRouteInFirestore,
  saveVisitToFirestore,
  savePaymentToFirestore,
  saveSettingsToFirestore,
  savePriceHistoryToFirestore,
  resetAllDataInFirestore,
  getAllDataFromFirestore,
} from './firebase';

const STORAGE_KEYS = {
  SETTINGS: 'md_sales_settings_v3',
  PRODUCTS: 'md_sales_products_v3',
  ROUTES: 'md_sales_routes_v3',
  PARTIES: 'md_sales_parties_v3',
  VISITS: 'md_sales_visits_v3',
  ORDERS: 'md_sales_orders_v3',
  PAYMENTS: 'md_sales_payments_v3',
  PRICE_HISTORIES: 'md_sales_price_histories_v3',
  LOGS: 'md_sales_logs_v3',
};

function getStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
}

function buildDefaultProducts(): Product[] {
  const now = new Date().toISOString();
  return INITIAL_PRODUCTS.map((p, idx) => ({
    ...p,
    id: `prod_${idx + 1}`,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildDefaultParties(): Party[] {
  const now = new Date().toISOString();
  return INITIAL_PARTIES.map((p, idx) => ({
    ...p,
    id: `pty_${idx + 1}`,
    createdAt: now,
  }));
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Settings
  getSettings: async (): Promise<AppSettings> => {
    try {
      const res = await fetchJson<AppSettings>('/api/settings');
      if (res && res.businessName) {
        setStored(STORAGE_KEYS.SETTINGS, res);
        return res;
      }
    } catch (e) {
      // ignore
    }
    return getStored<AppSettings>(STORAGE_KEYS.SETTINGS) || INITIAL_SETTINGS;
  },

  updateSettings: async (data: Partial<AppSettings>): Promise<AppSettings> => {
    let current = getStored<AppSettings>(STORAGE_KEYS.SETTINGS) || INITIAL_SETTINGS;
    const updated = { ...current, ...data };
    setStored(STORAGE_KEYS.SETTINGS, updated);

    // Sync to Cloud Firestore
    try {
      await saveSettingsToFirestore(updated);
    } catch (e) {
      console.warn('Firestore settings sync notice:', e);
    }

    try {
      await fetchJson<AppSettings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (e) {
      // fallback
    }
    return updated;
  },

  // Auth
  login: async (username: string, role: 'ADMIN' | 'SALES') => {
    try {
      return await fetchJson<{ success: boolean; user: User }>('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, role }),
      });
    } catch (e) {
      return {
        success: true,
        user: {
          id: username === 'admin' ? 'usr_admin' : 'usr_sales1',
          username: username || 'sales',
          name: username === 'admin' ? 'Rajesh Kumar (Manager)' : 'Amit Sharma (Executive)',
          email: `${username || 'user'}@hrtrader.com`,
          role,
          phone: '9431102938',
          active: true,
        },
      };
    }
  },

  // Initial Bootstrapping Data with Real-time Cloud Firestore & Server Synchronization
  getInitialData: async () => {
    // Run Firestore query and backend API queries in parallel
    const [
      firestoreData,
      apiSettings,
      apiProducts,
      apiRoutes,
      apiParties,
      apiVisits,
      apiOrders,
      apiPayments,
      apiPriceHistories,
      apiLogs,
    ] = await Promise.all([
      getAllDataFromFirestore().catch(() => null),
      fetchJson<AppSettings>('/api/settings').catch(() => null),
      fetchJson<Product[]>('/api/products').catch(() => null),
      fetchJson<Route[]>('/api/routes').catch(() => null),
      fetchJson<Party[]>('/api/parties').catch(() => null),
      fetchJson<Visit[]>('/api/visits').catch(() => null),
      fetchJson<Order[]>('/api/orders').catch(() => null),
      fetchJson<PaymentRecord[]>('/api/payments').catch(() => null),
      fetchJson<PriceHistory[]>('/api/price-history').catch(() => null),
      fetchJson<ActivityLog[]>('/api/activity-logs').catch(() => null),
    ]);

    // Priority 1: Firestore Cloud Database (live multi-device source of truth)
    // Priority 2: Express Server API endpoints
    // Priority 3: Persistent LocalStorage Cache
    // Priority 4: Default Initial Catalogs
    const hasFirestoreParties = firestoreData && Array.isArray(firestoreData.parties) && firestoreData.parties.length > 0;
    const hasFirestoreProducts = firestoreData && Array.isArray(firestoreData.products) && firestoreData.products.length > 0;
    const hasBackendProducts = Array.isArray(apiProducts) && apiProducts.length > 0;

    let settings: AppSettings =
      firestoreData?.settings ||
      apiSettings ||
      getStored<AppSettings>(STORAGE_KEYS.SETTINGS) ||
      INITIAL_SETTINGS;

    let products: Product[] =
      hasFirestoreProducts
        ? firestoreData!.products
        : hasBackendProducts
        ? apiProducts!
        : getStored<Product[]>(STORAGE_KEYS.PRODUCTS) || buildDefaultProducts();

    let routes: Route[] =
      firestoreData && firestoreData.routes.length > 0
        ? firestoreData.routes
        : apiRoutes && apiRoutes.length > 0
        ? apiRoutes
        : getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;

    let parties: Party[] =
      hasFirestoreParties
        ? firestoreData!.parties
        : apiParties && apiParties.length > 0
        ? apiParties
        : getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();

    let orders: Order[] =
      firestoreData && firestoreData.orders.length > 0
        ? firestoreData.orders
        : apiOrders && apiOrders.length > 0
        ? apiOrders
        : getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];

    let visits: Visit[] =
      firestoreData && firestoreData.visits.length > 0
        ? firestoreData.visits
        : apiVisits && apiVisits.length > 0
        ? apiVisits
        : getStored<Visit[]>(STORAGE_KEYS.VISITS) || [];

    let payments: PaymentRecord[] =
      firestoreData && firestoreData.payments.length > 0
        ? firestoreData.payments
        : apiPayments && apiPayments.length > 0
        ? apiPayments
        : getStored<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || [];

    let priceHistories: PriceHistory[] =
      firestoreData && firestoreData.priceHistories.length > 0
        ? firestoreData.priceHistories
        : apiPriceHistories && apiPriceHistories.length > 0
        ? apiPriceHistories
        : getStored<PriceHistory[]>(STORAGE_KEYS.PRICE_HISTORIES) || [];

    let logs: ActivityLog[] =
      firestoreData && firestoreData.logs.length > 0
        ? firestoreData.logs
        : apiLogs && apiLogs.length > 0
        ? apiLogs
        : getStored<ActivityLog[]>(STORAGE_KEYS.LOGS) || [];

    // Save consolidated fresh state into local storage for immediate next boot
    setStored(STORAGE_KEYS.SETTINGS, settings);
    setStored(STORAGE_KEYS.PRODUCTS, products);
    setStored(STORAGE_KEYS.ROUTES, routes);
    setStored(STORAGE_KEYS.PARTIES, parties);
    setStored(STORAGE_KEYS.VISITS, visits);
    setStored(STORAGE_KEYS.ORDERS, orders);
    setStored(STORAGE_KEYS.PAYMENTS, payments);
    setStored(STORAGE_KEYS.PRICE_HISTORIES, priceHistories);
    setStored(STORAGE_KEYS.LOGS, logs);

    return {
      settings,
      products,
      routes,
      parties,
      visits,
      orders,
      payments,
      priceHistories,
      logs,
    };
  },

  resetAllData: async (userId: string = 'usr_admin', userName: string = 'Admin') => {
    // Reset in Cloud Firestore
    try {
      await resetAllDataInFirestore(userId, userName);
    } catch (e) {
      console.warn('Firestore reset notice:', e);
    }

    try {
      await fetchJson('/api/reset-data', {
        method: 'POST',
        body: JSON.stringify({ userId, userName }),
      });
    } catch (e) {
      // fallback
    }

    // Clear local storage and seed fresh
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    const defaultProds = buildDefaultProducts();
    const defaultParties = buildDefaultParties();

    setStored(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    setStored(STORAGE_KEYS.PRODUCTS, defaultProds);
    setStored(STORAGE_KEYS.ROUTES, INITIAL_ROUTES);
    setStored(STORAGE_KEYS.PARTIES, defaultParties);
    setStored(STORAGE_KEYS.ORDERS, []);
    setStored(STORAGE_KEYS.VISITS, []);
    setStored(STORAGE_KEYS.PAYMENTS, []);
    setStored(STORAGE_KEYS.PRICE_HISTORIES, []);

    return {
      settings: INITIAL_SETTINGS,
      products: defaultProds,
      routes: INITIAL_ROUTES,
      parties: defaultParties,
      orders: [],
      visits: [],
      payments: [],
      priceHistories: [],
      logs: [],
    };
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    try {
      const res = await fetchJson<Product[]>('/api/products');
      if (Array.isArray(res) && res.length > 0) {
        setStored(STORAGE_KEYS.PRODUCTS, res);
        return res;
      }
    } catch (e) {
      // ignore
    }
    return getStored<Product[]>(STORAGE_KEYS.PRODUCTS) || buildDefaultProducts();
  },

  addProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    let created: Product | null = null;
    try {
      created = await fetchJson<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    } catch (e) {
      // fallback
    }

    const now = new Date().toISOString();
    const casePtr = Number((productData.ptr * productData.piecesPerCase).toFixed(2));
    const newProd: Product = created || {
      ...productData,
      casePtr,
      id: `prod_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    const currentProds = getStored<Product[]>(STORAGE_KEYS.PRODUCTS) || buildDefaultProducts();
    const updatedList = [newProd, ...currentProds.filter(p => p.id !== newProd.id)];
    setStored(STORAGE_KEYS.PRODUCTS, updatedList);

    // Sync to Cloud Firestore
    try {
      await saveProductToFirestore(newProd);
    } catch (e) {
      console.warn('Firestore product save notice:', e);
    }

    return newProd;
  },

  createProduct: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    return api.addProduct(productData);
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    let updated: Product | null = null;
    try {
      updated = await fetchJson<Product>(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      // fallback
    }

    const currentProds = getStored<Product[]>(STORAGE_KEYS.PRODUCTS) || buildDefaultProducts();
    const index = currentProds.findIndex(p => p.id === id);
    const now = new Date().toISOString();

    let resultProduct: Product;
    if (index !== -1) {
      const old = currentProds[index];
      const updatedPtr = updates.ptr ?? old.ptr;
      const updatedPcs = updates.piecesPerCase ?? old.piecesPerCase;
      const casePtr = Number((updatedPtr * updatedPcs).toFixed(2));
      resultProduct = updated || {
        ...old,
        ...updates,
        casePtr,
        updatedAt: now,
      };
      currentProds[index] = resultProduct;
    } else {
      resultProduct = updated || ({ id, ...updates } as Product);
      currentProds.push(resultProduct);
    }

    setStored(STORAGE_KEYS.PRODUCTS, currentProds);

    // Sync to Cloud Firestore
    try {
      await updateProductInFirestore(id, updates);
    } catch (e) {
      console.warn('Firestore product update notice:', e);
    }

    return resultProduct;
  },

  deleteProduct: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetchJson<{ success: boolean }>(`/api/products/${id}`, { method: 'DELETE' });
    } catch (e) {
      // fallback
    }

    const currentProds = getStored<Product[]>(STORAGE_KEYS.PRODUCTS) || buildDefaultProducts();
    const updatedProds = currentProds.map(p => (p.id === id ? { ...p, active: false } : p));
    setStored(STORAGE_KEYS.PRODUCTS, updatedProds);

    // Sync to Cloud Firestore
    try {
      await deleteProductFromFirestore(id);
    } catch (e) {
      console.warn('Firestore product delete notice:', e);
    }

    return { success: true };
  },

  getPriceHistories: async (): Promise<PriceHistory[]> => {
    try {
      const res = await fetchJson<PriceHistory[]>('/api/price-history');
      if (Array.isArray(res)) return res;
    } catch (e) {
      // ignore
    }
    return getStored<PriceHistory[]>(STORAGE_KEYS.PRICE_HISTORIES) || [];
  },

  // Routes
  getRoutes: async (): Promise<Route[]> => {
    try {
      const res = await fetchJson<Route[]>('/api/routes');
      if (Array.isArray(res) && res.length > 0) return res;
    } catch (e) {
      // ignore
    }
    return getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
  },

  addRoute: async (data: string | { name: string; day?: string; active?: boolean }, day?: string): Promise<Route> => {
    const payload = typeof data === 'string' ? { name: data, day } : data;
    let created: Route | null = null;
    try {
      created = await fetchJson<Route>('/api/routes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // fallback
    }

    const currentRoutes = getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
    const newRoute: Route = created || {
      id: `rt_${Date.now()}`,
      name: payload.name,
      day: payload.day || 'Scheduled',
      sequence: currentRoutes.length + 1,
      active: payload.active ?? true,
      totalShops: 0,
      createdAt: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.ROUTES, [...currentRoutes, newRoute]);

    // Sync to Cloud Firestore
    try {
      await saveRouteToFirestore(newRoute);
    } catch (e) {
      console.warn('Firestore route save notice:', e);
    }

    return newRoute;
  },

  createRoute: async (data: string | { name: string; day?: string; active?: boolean }, day?: string): Promise<Route> => {
    return api.addRoute(data, day);
  },

  updateRoute: async (id: string, updates: Partial<Route>): Promise<Route> => {
    let updated: Route | null = null;
    try {
      updated = await fetchJson<Route>(`/api/routes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      // fallback
    }

    const currentRoutes = getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
    const index = currentRoutes.findIndex(r => r.id === id);
    let resultRoute: Route;
    if (index !== -1) {
      resultRoute = updated || { ...currentRoutes[index], ...updates };
      currentRoutes[index] = resultRoute;
    } else {
      resultRoute = updated || ({ id, ...updates } as Route);
      currentRoutes.push(resultRoute);
    }
    setStored(STORAGE_KEYS.ROUTES, currentRoutes);

    // Sync to Cloud Firestore
    try {
      await updateRouteInFirestore(id, updates);
    } catch (e) {
      console.warn('Firestore route update notice:', e);
    }

    return resultRoute;
  },

  // Parties
  getParties: async (): Promise<Party[]> => {
    try {
      const res = await fetchJson<Party[]>('/api/parties');
      if (Array.isArray(res) && res.length > 0) return res;
    } catch (e) {
      // ignore
    }
    return getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();
  },

  addParty: async (partyData: Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>): Promise<Party> => {
    let created: Party | null = null;
    try {
      created = await fetchJson<Party>('/api/parties', {
        method: 'POST',
        body: JSON.stringify(partyData),
      });
    } catch (e) {
      // fallback
    }

    const currentRoutes = getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
    const matchedRoute = currentRoutes.find(r => r.id === partyData.routeId);

    const newParty: Party = created || {
      ...partyData,
      routeName: matchedRoute ? matchedRoute.name : (partyData.routeName || 'General Route'),
      id: `pty_${Date.now()}`,
      active: true,
      lifetimeOrders: 0,
      lifetimeValue: 0,
      createdAt: new Date().toISOString(),
    };

    const currentParties = getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();
    setStored(STORAGE_KEYS.PARTIES, [newParty, ...currentParties]);

    // Update route totalShops
    if (newParty.routeId) {
      const updatedRoutes = currentRoutes.map(r =>
        r.id === newParty.routeId ? { ...r, totalShops: (r.totalShops || 0) + 1 } : r
      );
      setStored(STORAGE_KEYS.ROUTES, updatedRoutes);
    }

    // Sync to Cloud Firestore
    try {
      await savePartyToFirestore(newParty);
    } catch (e) {
      console.warn('Firestore party save notice:', e);
    }

    return newParty;
  },

  createParty: async (partyData: Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>): Promise<Party> => {
    return api.addParty(partyData);
  },

  updateParty: async (id: string, updates: Partial<Party>): Promise<Party> => {
    let updated: Party | null = null;
    try {
      updated = await fetchJson<Party>(`/api/parties/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      // fallback
    }

    const currentRoutes = getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
    const currentParties = getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();
    const index = currentParties.findIndex(p => p.id === id);
    const oldParty = index !== -1 ? currentParties[index] : null;

    let routeName = updates.routeName;
    if (updates.routeId) {
      const matchedRoute = currentRoutes.find(r => r.id === updates.routeId);
      if (matchedRoute) {
        routeName = matchedRoute.name;
      }
    }

    let resultParty: Party;
    if (index !== -1) {
      resultParty = updated || {
        ...currentParties[index],
        ...updates,
        ...(routeName ? { routeName } : {}),
      };
      currentParties[index] = resultParty;
    } else {
      resultParty = updated || ({ id, ...updates, ...(routeName ? { routeName } : {}) } as Party);
      currentParties.push(resultParty);
    }
    setStored(STORAGE_KEYS.PARTIES, currentParties);

    // Update route counts if route changed
    if (oldParty && updates.routeId && updates.routeId !== oldParty.routeId) {
      const updatedRoutes = currentRoutes.map(r => {
        if (r.id === oldParty.routeId) return { ...r, totalShops: Math.max(0, (r.totalShops || 0) - 1) };
        if (r.id === updates.routeId) return { ...r, totalShops: (r.totalShops || 0) + 1 };
        return r;
      });
      setStored(STORAGE_KEYS.ROUTES, updatedRoutes);
    }

    // Sync to Cloud Firestore
    try {
      await updatePartyInFirestore(id, updates);
    } catch (e) {
      console.warn('Firestore party update notice:', e);
    }

    return resultParty;
  },

  deleteParty: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetchJson<{ success: boolean }>(`/api/parties/${id}`, { method: 'DELETE' });
    } catch (e) {
      // fallback
    }

    const currentParties = getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();
    const partyToDelete = currentParties.find(p => p.id === id);
    const updatedParties = currentParties.filter(p => p.id !== id);
    setStored(STORAGE_KEYS.PARTIES, updatedParties);

    // Remove associated orders
    const currentOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
    const partyOrders = currentOrders.filter(o => o.partyId === id);
    const partyOrderIds = new Set(partyOrders.map(o => o.id));
    const updatedOrders = currentOrders.filter(o => o.partyId !== id);
    setStored(STORAGE_KEYS.ORDERS, updatedOrders);

    // Remove associated visits
    const currentVisits = getStored<Visit[]>(STORAGE_KEYS.VISITS) || [];
    const updatedVisits = currentVisits.filter(v => v.partyId !== id);
    setStored(STORAGE_KEYS.VISITS, updatedVisits);

    // Remove associated payments
    const currentPayments = getStored<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || [];
    const updatedPayments = currentPayments.filter(
      p => !partyOrderIds.has(p.orderId) && p.partyId !== id
    );
    setStored(STORAGE_KEYS.PAYMENTS, updatedPayments);

    // Update route shop count
    if (partyToDelete?.routeId) {
      const currentRoutes = getStored<Route[]>(STORAGE_KEYS.ROUTES) || INITIAL_ROUTES;
      const updatedRoutes = currentRoutes.map(r =>
        r.id === partyToDelete.routeId ? { ...r, totalShops: Math.max(0, r.totalShops - 1) } : r
      );
      setStored(STORAGE_KEYS.ROUTES, updatedRoutes);
    }

    // Sync to Cloud Firestore (removes party and associated records)
    try {
      await deletePartyFromFirestore(id);
    } catch (e) {
      console.warn('Firestore party delete notice:', e);
    }

    return { success: true };
  },

  // Visits
  getVisits: async (): Promise<Visit[]> => {
    try {
      const res = await fetchJson<Visit[]>('/api/visits');
      if (Array.isArray(res)) return res;
    } catch (e) {
      // ignore
    }
    return getStored<Visit[]>(STORAGE_KEYS.VISITS) || [];
  },

  addVisit: async (visitData: Omit<Visit, 'id' | 'createdAt'>): Promise<Visit> => {
    let created: Visit | null = null;
    try {
      created = await fetchJson<Visit>('/api/visits', {
        method: 'POST',
        body: JSON.stringify(visitData),
      });
    } catch (e) {
      // fallback
    }

    const newVisit: Visit = created || {
      ...visitData,
      id: `vst_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const currentVisits = getStored<Visit[]>(STORAGE_KEYS.VISITS) || [];
    setStored(STORAGE_KEYS.VISITS, [newVisit, ...currentVisits]);

    // Sync to Cloud Firestore
    try {
      await saveVisitToFirestore(newVisit);
    } catch (e) {
      console.warn('Firestore visit save notice:', e);
    }

    return newVisit;
  },

  createVisit: async (visitData: Omit<Visit, 'id' | 'createdAt'>): Promise<Visit> => {
    return api.addVisit(visitData);
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await fetchJson<Order[]>('/api/orders');
      if (Array.isArray(res)) return res;
    } catch (e) {
      // ignore
    }
    return getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    const orders = await api.getOrders();
    return orders.find(o => o.id === id);
  },

  addOrder: async (orderInput: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    let created: Order | null = null;
    try {
      created = await fetchJson<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderInput),
      });
    } catch (e) {
      // fallback
    }

    const currentOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
    const totals = calculateOrderTotal(orderInput.items, orderInput.discount || 0);

    const newOrder: Order = created || {
      ...orderInput,
      id: `ord_${Date.now()}`,
      orderNumber: `MD-${1028 + currentOrders.length + 1}`,
      totalCases: totals.totalCases,
      totalPieces: totals.totalPieces,
      subtotal: totals.subtotal,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      deliveryStatus: orderInput.deliveryStatus || 'NEW',
      paymentStatus: orderInput.paymentStatus || 'UNPAID',
      paidAmount: orderInput.paidAmount || 0,
      pendingAmount: Math.max(0, totals.grandTotal - (orderInput.paidAmount || 0)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStored(STORAGE_KEYS.ORDERS, [newOrder, ...currentOrders]);

    // Update Party stats in localStorage
    const currentParties = getStored<Party[]>(STORAGE_KEYS.PARTIES) || buildDefaultParties();
    const pIndex = currentParties.findIndex(p => p.id === orderInput.partyId);
    if (pIndex !== -1) {
      currentParties[pIndex].lifetimeOrders = (currentParties[pIndex].lifetimeOrders || 0) + 1;
      currentParties[pIndex].lifetimeValue = (currentParties[pIndex].lifetimeValue || 0) + newOrder.grandTotal;
      currentParties[pIndex].lastOrderDate = orderInput.date;
      setStored(STORAGE_KEYS.PARTIES, currentParties);

      // Sync party update to Firestore
      try {
        await updatePartyInFirestore(orderInput.partyId, {
          lifetimeOrders: currentParties[pIndex].lifetimeOrders,
          lifetimeValue: currentParties[pIndex].lifetimeValue,
          lastOrderDate: orderInput.date,
        });
      } catch (e) {
        // ignore
      }
    }

    // Sync to Cloud Firestore
    try {
      await saveOrderToFirestore(newOrder);
    } catch (e) {
      console.warn('Firestore order save notice:', e);
    }

    return newOrder;
  },

  createOrder: async (orderInput: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    return api.addOrder(orderInput);
  },

  updateOrder: async (id: string, updates: Partial<Order>): Promise<Order> => {
    let updated: Order | null = null;
    try {
      updated = await fetchJson<Order>(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (e) {
      // fallback
    }

    const currentOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
    const index = currentOrders.findIndex(o => o.id === id);

    let resultOrder: Order;
    if (index !== -1) {
      const old = currentOrders[index];
      if (updates.items) {
        const totals = calculateOrderTotal(updates.items, updates.discount ?? old.discount ?? 0);
        updates.totalCases = totals.totalCases;
        updates.totalPieces = totals.totalPieces;
        updates.subtotal = totals.subtotal;
        updates.discount = totals.discount;
        updates.grandTotal = totals.grandTotal;
        updates.pendingAmount = Math.max(0, totals.grandTotal - (updates.paidAmount ?? old.paidAmount ?? 0));
      }
      resultOrder = updated || {
        ...old,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      currentOrders[index] = resultOrder;
    } else {
      resultOrder = updated || ({ id, ...updates } as Order);
      currentOrders.unshift(resultOrder);
    }

    setStored(STORAGE_KEYS.ORDERS, currentOrders);

    // Sync to Cloud Firestore
    try {
      await updateOrderInFirestore(id, updates);
    } catch (e) {
      console.warn('Firestore order update notice:', e);
    }

    return resultOrder;
  },

  deleteOrder: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetchJson<{ success: boolean }>(`/api/orders/${id}`, { method: 'DELETE' });
    } catch (e) {
      // fallback
    }

    const currentOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
    const filtered = currentOrders.filter(o => o.id !== id);
    setStored(STORAGE_KEYS.ORDERS, filtered);

    // Sync to Cloud Firestore
    try {
      await deleteOrderFromFirestore(id);
    } catch (e) {
      console.warn('Firestore order delete notice:', e);
    }

    return { success: true };
  },

  // Payments
  recordPayment: async (
    orderIdOrObj: string | { orderId: string; amount: number; paymentMethod: string; referenceNo?: string; collectedBy?: string },
    amountPaid?: number,
    paymentMethod?: string,
    referenceNo?: string
  ): Promise<Order> => {
    let orderId: string;
    let amount: number;
    let method: string;
    let refNo: string | undefined;
    let collectedBy: string | undefined;

    if (typeof orderIdOrObj === 'object') {
      orderId = orderIdOrObj.orderId;
      amount = orderIdOrObj.amount;
      method = orderIdOrObj.paymentMethod;
      refNo = orderIdOrObj.referenceNo;
      collectedBy = orderIdOrObj.collectedBy;
    } else {
      orderId = orderIdOrObj;
      amount = amountPaid || 0;
      method = paymentMethod || 'CASH';
      refNo = referenceNo;
    }

    let updatedBackendOrder: Order | null = null;
    try {
      const res = await fetchJson<{ success: boolean; order: Order }>(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          paymentMethod: method,
          referenceNumber: refNo,
          collectedBy,
        }),
      });
      if (res && res.order) {
        updatedBackendOrder = res.order;
      }
    } catch (e) {
      // fallback
    }

    const currentOrders = getStored<Order[]>(STORAGE_KEYS.ORDERS) || [];
    const oIndex = currentOrders.findIndex(o => o.id === orderId);

    if (oIndex === -1 && !updatedBackendOrder) {
      throw new Error('Order not found');
    }

    const targetOrder = oIndex !== -1 ? currentOrders[oIndex] : updatedBackendOrder!;
    const newPaidAmount = (targetOrder.paidAmount || 0) + amount;
    const newPendingAmount = Math.max(0, targetOrder.grandTotal - newPaidAmount);
    const newStatus = newPendingAmount === 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const updatedOrder: Order = updatedBackendOrder || {
      ...targetOrder,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      paymentStatus: newStatus as any,
      updatedAt: new Date().toISOString(),
    };

    if (oIndex !== -1) {
      currentOrders[oIndex] = updatedOrder;
      setStored(STORAGE_KEYS.ORDERS, currentOrders);
    }

    // Add payment record
    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      orderId,
      orderNumber: updatedOrder.orderNumber || orderId,
      partyId: updatedOrder.partyId,
      partyName: updatedOrder.shopName,
      amountPaid: amount,
      paymentMethod: (method as any) || 'CASH',
      referenceNo: refNo || '',
      paymentDate: new Date().toISOString().split('T')[0],
      recordedBy: collectedBy || updatedOrder.salespersonName || 'Executive',
      createdAt: new Date().toISOString(),
    };

    const currentPayments = getStored<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || [];
    setStored(STORAGE_KEYS.PAYMENTS, [paymentRecord, ...currentPayments]);

    // Sync order update & payment record to Cloud Firestore
    try {
      await updateOrderInFirestore(orderId, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        paymentStatus: newStatus as any,
      });
      await savePaymentToFirestore(paymentRecord);
    } catch (e) {
      console.warn('Firestore payment record notice:', e);
    }

    return updatedOrder;
  },
};
