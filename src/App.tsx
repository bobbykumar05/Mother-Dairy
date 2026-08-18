import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Order,
  Product,
  Party,
  Route,
  Visit,
  PaymentRecord,
  PriceHistory,
  AppSettings,
  User,
  UserRole,
  ActivityLog,
} from './types';
import { api } from './lib/api';
import {
  auth,
  logActivityToFirebase,
  getActivityLogsFromFirebase,
  getCurrentUserProfile,
  logoutWithFirebase,
  subscribeToAllRealtimeData,
  initFirestoreDefaultsIfEmpty,
} from './lib/firebase';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { QuickOrderView } from './components/QuickOrderView';
import { OrdersView } from './components/OrdersView';
import { PartiesView } from './components/PartiesView';
import { RoutesView } from './components/RoutesView';
import { ProductsView } from './components/ProductsView';
import { VisitsView } from './components/VisitsView';
import { PaymentsView } from './components/PaymentsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { PersonalManagementView } from './components/PersonalManagementView';
import { AttendanceView } from './components/AttendanceView';
import { AuthPage } from './components/AuthPage';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedPartyForOrder, setSelectedPartyForOrder] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Core Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [priceHistories, setPriceHistories] = useState<PriceHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    businessName: 'HR Trader',
    distributorName: 'HR Trader - Mother Dairy Authorised Distributor',
    phone: '9431102938',
    whatsappNumber: '9431102938',
    upiId: 'hrtrader@upi',
    payeeName: 'HR Trader',
    invoiceFooter: 'Thank you for choosing Mother Dairy products! Subject to local jurisdiction.',
    currency: 'INR',
    defaultRouteId: 'rt_mon',
  });
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Listen to Firebase Authentication state changes for auto-login / session persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getCurrentUserProfile(firebaseUser);
          setCurrentUser(profile);
        } catch (err) {
          console.error('Error fetching user profile on auth change:', err);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getInitialData();
      const fbLogs = await getActivityLogsFromFirebase().catch(() => []);
      
      if (data.orders) setOrders(data.orders);
      if (data.products) setProducts(data.products);
      if (data.parties) setParties(data.parties);
      if (data.routes) setRoutes(data.routes);
      if (data.visits) setVisits(data.visits);
      if (data.payments) setPayments(data.payments);
      if (data.priceHistories) setPriceHistories(data.priceHistories);
      if (data.settings) setSettings(data.settings);
      
      const combinedLogs = [...fbLogs, ...(data.logs || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(combinedLogs);
    } catch (err) {
      console.error('Failed to load server/cloud data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Immediate data load and real-time subscription across all devices
  useEffect(() => {
    // 1. Instant data fetch from cache, server & Firestore
    loadData();

    // 2. Ensure initial seed defaults exist in Cloud Firestore if brand new
    initFirestoreDefaultsIfEmpty().catch((err) => {
      console.warn('Firestore initial defaults sync notice:', err);
    });

    // 3. Centralized Real-time Firestore Listener across all devices (Android & Web)
    const unsubscribeRealtime = subscribeToAllRealtimeData({
      onOrders: (realtimeOrders) => {
        if (realtimeOrders) {
          setOrders(realtimeOrders);
        }
      },
      onProducts: (realtimeProducts) => {
        if (realtimeProducts) {
          setProducts(realtimeProducts);
        }
      },
      onParties: (realtimeParties) => {
        if (realtimeParties) {
          setParties(realtimeParties);
        }
      },
      onRoutes: (realtimeRoutes) => {
        if (realtimeRoutes) {
          setRoutes(realtimeRoutes);
        }
      },
      onVisits: (realtimeVisits) => {
        if (realtimeVisits) {
          setVisits(realtimeVisits);
        }
      },
      onPayments: (realtimePayments) => {
        if (realtimePayments) {
          setPayments(realtimePayments);
        }
      },
      onSettings: (realtimeSettings) => {
        if (realtimeSettings) {
          setSettings(realtimeSettings);
        }
      },
      onPriceHistories: (realtimePriceHistories) => {
        if (realtimePriceHistories) {
          setPriceHistories(realtimePriceHistories);
        }
      },
      onLogs: (realtimeLogs) => {
        if (realtimeLogs) {
          setLogs(realtimeLogs);
        }
      },
    });

    return () => {
      unsubscribeRealtime();
    };
  }, []);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logoutWithFirebase(currentUser);
    } catch (err) {
      console.error('Failed to sign out from Firebase:', err);
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Handlers with Optimistic UI updates for zero perceptible latency
  const handleCreateOrder = async (orderPayload: any) => {
    const created = await api.createOrder({
      ...orderPayload,
      salespersonId: currentUser?.id || 'usr_sales_1',
      salespersonName: currentUser?.name || 'Sales Officer',
    });

    // Optimistic immediate update
    setOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);

    // Log to Firebase Firestore asynchronously
    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREATE_ORDER',
        `Order #${created.orderNumber || created.id} placed for ${created.shopName || 'Outlet'} (Total: ₹${created.grandTotal})`,
        'ORDERS'
      ).catch(console.error);
    }

    return created;
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    // Optimistic immediate state update
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o))
    );

    const updated = await api.updateOrder(id, updates);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'UPDATE_ORDER',
        `Updated Order #${updated.orderNumber || id}`,
        'ORDERS'
      ).catch(console.error);
    }

    return updated;
  };

  const handleDeleteOrder = async (id: string) => {
    // Optimistic immediate state update
    setOrders((prev) => prev.filter((o) => o.id !== id));

    const success = await api.deleteOrder(id);
    if (success && currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'DELETE_ORDER',
        `Deleted Order ID: ${id}`,
        'ORDERS'
      ).catch(console.error);
    }
    return success;
  };

  const handleAddParty = async (partyPayload: any) => {
    const created = await api.createParty(partyPayload);

    // Optimistic immediate state update
    setParties((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREATE_PARTY',
        `Added store outlet: ${created.shopName} (${created.ownerName || ''})`,
        'PARTIES'
      ).catch(console.error);
    }

    return created;
  };

  const handleUpdateParty = async (id: string, updates: Partial<Party>) => {
    // Optimistic immediate state update
    setParties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );

    const updated = await api.updateParty(id, updates);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'UPDATE_PARTY',
        `Updated store: ${updated.shopName}`,
        'PARTIES'
      ).catch(console.error);
    }

    return updated;
  };

  const handleDeleteParty = async (id: string) => {
    const targetParty = parties.find((p) => p.id === id);
    const shopName = targetParty?.shopName || id;

    // Optimistic immediate state update
    setParties((prev) => prev.filter((p) => p.id !== id));

    const res = await api.deleteParty(id);
    if (res?.success && currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'DELETE_PARTY',
        `Deleted store "${shopName}" and removed all associated records`,
        'PARTIES'
      ).catch(console.error);
    }
    return res?.success || false;
  };

  const handleAddRoute = async (name: string, day: string) => {
    const created = await api.createRoute({ name, day, active: true });

    setRoutes((prev) => [...prev, created]);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREATE_ROUTE',
        `Created route: ${name} (${day})`,
        'ROUTES'
      ).catch(console.error);
    }

    return created;
  };

  const handleUpdateRoute = async (id: string, updates: Partial<Route>) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );

    const updated = await api.updateRoute(id, updates);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'UPDATE_ROUTE',
        `Updated route: ${updated.name}`,
        'ROUTES'
      ).catch(console.error);
    }

    return updated;
  };

  const handleAddProduct = async (prodPayload: any) => {
    const created = await api.createProduct(prodPayload);

    setProducts((prev) => [...prev, created]);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'CREATE_PRODUCT',
        `Created product: ${created.name} (PTR ₹${created.ptr}, MRP ₹${created.mrp})`,
        'PRODUCTS'
      ).catch(console.error);
    }

    return created;
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    const updated = await api.updateProduct(id, updates);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'UPDATE_PRODUCT',
        `Updated product: ${updated.name}`,
        'PRODUCTS'
      ).catch(console.error);
    }

    return updated;
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));

    const success = await api.deleteProduct(id);
    if (success && currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'DELETE_PRODUCT',
        `Deleted product ID: ${id}`,
        'PRODUCTS'
      ).catch(console.error);
    }
    return success;
  };

  const handleAddVisit = async (visitPayload: any) => {
    const created = await api.createVisit({
      ...visitPayload,
      salespersonId: currentUser?.id || 'usr_sales_1',
      salespersonName: currentUser?.name || 'Sales Officer',
      salespersonRole: currentUser?.role || 'SALES',
    });

    setVisits((prev) => [created, ...prev]);

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'LOG_VISIT',
        `Market visit logged at ${created.partyName || 'Outlet'} (${created.orderReceived ? 'Order Received' : created.noOrderReason || 'Visit Completed'})`,
        'VISITS'
      ).catch(console.error);
    }

    return created;
  };

  const handleRecordPayment = async (orderId: string, amount: number, method: string, refNo?: string) => {
    const updatedOrder = await api.recordPayment({
      orderId,
      amount,
      paymentMethod: method as any,
      referenceNo: refNo,
      collectedBy: currentUser?.name || 'Sales Officer',
    });

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? updatedOrder : o))
    );

    if (currentUser) {
      logActivityToFirebase(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'COLLECT_PAYMENT',
        `Collected ₹${amount} (${method}) for Order #${updatedOrder.orderNumber || orderId}`,
        'PAYMENTS'
      ).catch(console.error);
    }

    return updatedOrder;
  };

  const handleUpdateDeliveryStatus = async (orderId: string, status: any) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, deliveryStatus: status } : o))
    );
    const updated = await api.updateOrder(orderId, { deliveryStatus: status });
    return updated;
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  const toggleUserRole = () => {
    if (!currentUser) return;
    if (currentUser.role === 'ADMIN') {
      setCurrentUser({
        ...currentUser,
        role: 'SALES',
      });
    } else {
      setCurrentUser({
        ...currentUser,
        role: 'ADMIN',
      });
    }
  };

  const handleClearSampleData = async () => {
    setLoading(true);
    try {
      await api.resetAllData(currentUser?.id, currentUser?.name);
      if (currentUser) {
        await logActivityToFirebase(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'RESET_DATABASE',
          'Cleared all sample orders, visits, payments, and analytics records.',
          'SYSTEM'
        );
      }
      await loadData();
    } catch (err) {
      console.error('Failed to clear sample data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Full screen loading state while verifying Firebase Auth session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-200">Verifying Mother Dairy Account...</p>
        <p className="text-xs text-slate-400 mt-1">Firebase Sync Active</p>
      </div>
    );
  }

  // Redirect unauthenticated users to Sign In / Sign Up page
  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={(u) => {
          setCurrentUser(u);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* Navigation Top Header & Sidebar */}
      <Navigation
        currentView={activeTab}
        setCurrentView={setActiveTab}
        user={currentUser}
        setUser={(u) => setCurrentUser(u)}
        settings={settings}
        onLogout={handleLogout}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          setCurrentUser(u);
          loadData();
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* View Component Body */}
        <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto pb-20 lg:pb-8">
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading Mother Dairy Sales System...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  orders={orders}
                  parties={parties}
                  routes={routes}
                  visits={visits}
                  products={products}
                  onUpdateOrder={handleUpdateOrder}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'quick-order' && (
                <QuickOrderView
                  products={products}
                  parties={parties}
                  routes={routes}
                  settings={settings}
                  initialPartyId={selectedPartyForOrder}
                  onCreateOrder={handleCreateOrder}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'today-orders' && (
                <OrdersView
                  orders={orders}
                  products={products}
                  settings={settings}
                  isTodayOnly={true}
                  onUpdateOrder={handleUpdateOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'orders' && (
                <OrdersView
                  orders={orders}
                  products={products}
                  settings={settings}
                  isTodayOnly={false}
                  onUpdateOrder={handleUpdateOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'parties' && (
                <PartiesView
                  parties={parties}
                  routes={routes}
                  orders={orders}
                  onAddParty={handleAddParty}
                  onUpdateParty={handleUpdateParty}
                  onDeleteParty={handleDeleteParty}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'routes' && (
                <RoutesView
                  routes={routes}
                  parties={parties}
                  orders={orders}
                  visits={visits}
                  onAddRoute={handleAddRoute}
                  onUpdateRoute={handleUpdateRoute}
                  onAddParty={handleAddParty}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'products' && (
                <ProductsView
                  products={products}
                  priceHistories={priceHistories}
                  settings={settings}
                  userRole={currentUser.role}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              )}

              {activeTab === 'visits' && (
                <VisitsView
                  visits={visits}
                  parties={parties}
                  routes={routes}
                  onAddVisit={handleAddVisit}
                  onNavigate={setActiveTab}
                  onSelectPartyForOrder={(partyId) => {
                    setSelectedPartyForOrder(partyId);
                    setActiveTab('quick-order');
                  }}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsView
                  orders={orders}
                  payments={payments}
                  settings={settings}
                  onRecordPayment={handleRecordPayment}
                  onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  orders={orders}
                  parties={parties}
                  routes={routes}
                  products={products}
                  onClearAllData={handleClearSampleData}
                />
              )}

              {activeTab === 'personal-management' && (
                <PersonalManagementView currentUser={currentUser} />
              )}

              {activeTab === 'attendance' && (
                <AttendanceView currentUser={currentUser} />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  users={[currentUser]}
                  logs={logs}
                  currentUser={currentUser}
                  onUpdateSettings={handleUpdateSettings}
                  onResetAllData={handleClearSampleData}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
