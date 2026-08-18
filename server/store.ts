import fs from 'fs';
import path from 'path';
import {
  Product,
  PriceHistory,
  Route,
  Party,
  Order,
  Visit,
  PaymentRecord,
  ActivityLog,
  AppSettings,
  User,
} from '../src/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ROUTES,
  INITIAL_PARTIES,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../src/db/seedData';

interface DatabaseSchema {
  users: User[];
  settings: AppSettings;
  routes: Route[];
  products: Product[];
  priceHistories: PriceHistory[];
  parties: Party[];
  visits: Visit[];
  orders: Order[];
  payments: PaymentRecord[];
  activityLogs: ActivityLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class FileDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadOrInit();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrInit(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays exist
        return {
          users: parsed.users || INITIAL_USERS,
          settings: parsed.settings || INITIAL_SETTINGS,
          routes: parsed.routes || INITIAL_ROUTES,
          products: parsed.products || this.buildInitialProducts(),
          priceHistories: parsed.priceHistories || [],
          parties: parsed.parties || this.buildInitialParties(),
          visits: parsed.visits || [],
          orders: parsed.orders || this.buildInitialOrders(),
          payments: parsed.payments || [],
          activityLogs: parsed.activityLogs || [],
        };
      } catch (err) {
        console.error('Error reading db.json, re-initializing seed data', err);
      }
    }

    const initial = {
      users: INITIAL_USERS,
      settings: INITIAL_SETTINGS,
      routes: INITIAL_ROUTES,
      products: this.buildInitialProducts(),
      priceHistories: [],
      parties: this.buildInitialParties(),
      visits: [],
      orders: [],
      payments: [],
      activityLogs: [
        {
          id: 'log_init',
          userId: 'usr_admin',
          userName: 'System',
          action: 'SYSTEM_INIT',
          entity: 'DATABASE',
          entityId: 'db',
          details: 'Initial Mother Dairy Price List database seeded successfully.',
          timestamp: new Date().toISOString(),
        }
      ],
    };

    initial.orders = [];

    this.saveData(initial);
    return initial;
  }

  private buildInitialProducts(): Product[] {
    const now = new Date().toISOString();
    return INITIAL_PRODUCTS.map((p, index) => ({
      ...p,
      id: `prod_${index + 1}`,
      createdAt: now,
      updatedAt: now,
    }));
  }

  private buildInitialParties(): Party[] {
    const now = new Date().toISOString();
    return INITIAL_PARTIES.map((p, index) => ({
      ...p,
      id: `pty_${index + 1}`,
      createdAt: now,
    }));
  }

  private buildInitialOrders(): Order[] {
    return [];
  }

  private buildInitialOrdersWithProducts(_products: Product[], _parties: Party[]): Order[] {
    return [];
  }

  public resetAllData(userId: string = 'usr_admin', userName: string = 'Admin'): DatabaseSchema {
    const now = new Date().toISOString();
    this.data = {
      users: INITIAL_USERS,
      settings: INITIAL_SETTINGS,
      routes: INITIAL_ROUTES,
      products: this.buildInitialProducts(),
      priceHistories: [],
      parties: this.buildInitialParties(),
      visits: [],
      orders: [],
      payments: [],
      activityLogs: [
        {
          id: `log_reset_${Date.now()}`,
          userId,
          userName,
          action: 'RESET_DATABASE',
          entity: 'DATABASE',
          entityId: 'db',
          details: 'Cleared all sample data and re-initialized latest Mother Dairy product price list.',
          timestamp: now,
        }
      ],
    };
    this.saveData();
    return this.data;
  }

  private saveData(updatedData?: DatabaseSchema) {
    if (updatedData) {
      this.data = updatedData;
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Activity Logger
  public logActivity(userId: string, userName: string, action: string, entity: string, entityId: string, details: string) {
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 500);
    }
    this.saveData();
  }

  // --- GETTERS & CRUD METHODS ---

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(newSettings: Partial<AppSettings>, userId: string, userName: string): AppSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.logActivity(userId, userName, 'UPDATE', 'SETTINGS', 'settings', 'Updated business and UPI settings.');
    this.saveData();
    return this.data.settings;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  public addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, userId: string, userName: string): Product {
    const now = new Date().toISOString();
    const casePtr = Number((product.ptr * product.piecesPerCase).toFixed(2));
    const newProd: Product = {
      ...product,
      casePtr,
      id: `prod_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.push(newProd);
    this.logActivity(userId, userName, 'CREATE', 'PRODUCT', newProd.id, `Added product ${newProd.name}`);
    this.saveData();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>, userId: string, userName: string): Product | null {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const old = this.data.products[index];
    const now = new Date().toISOString();

    // Track price change in priceHistories
    if ((updates.mrp !== undefined && updates.mrp !== old.mrp) || (updates.ptr !== undefined && updates.ptr !== old.ptr)) {
      const historyRecord: PriceHistory = {
        id: `ph_${Date.now()}`,
        productId: old.id,
        productName: old.name,
        oldMrp: old.mrp,
        newMrp: updates.mrp ?? old.mrp,
        oldPtr: old.ptr,
        newPtr: updates.ptr ?? old.ptr,
        changedBy: userName,
        changedAt: now,
      };
      this.data.priceHistories.unshift(historyRecord);
    }

    const updatedMrp = updates.mrp ?? old.mrp;
    const updatedPtr = updates.ptr ?? old.ptr;
    const updatedPcs = updates.piecesPerCase ?? old.piecesPerCase;
    const casePtr = Number((updatedPtr * updatedPcs).toFixed(2));

    const updatedProduct: Product = {
      ...old,
      ...updates,
      mrp: updatedMrp,
      ptr: updatedPtr,
      piecesPerCase: updatedPcs,
      casePtr,
      updatedAt: now,
    };

    this.data.products[index] = updatedProduct;
    this.logActivity(userId, userName, 'UPDATE', 'PRODUCT', id, `Updated product ${old.name}`);
    this.saveData();
    return updatedProduct;
  }

  public deleteProduct(id: string, userId: string, userName: string): boolean {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    const name = this.data.products[index].name;
    // Soft delete/deactivate so historical references don't break
    this.data.products[index].active = false;
    this.logActivity(userId, userName, 'DEACTIVATE', 'PRODUCT', id, `Deactivated product ${name}`);
    this.saveData();
    return true;
  }

  public getPriceHistories(): PriceHistory[] {
    return this.data.priceHistories;
  }

  public getRoutes(): Route[] {
    return this.data.routes;
  }

  public addRoute(name: string, day: string, userId: string, userName: string): Route {
    const newRoute: Route = {
      id: `rt_${Date.now()}`,
      name,
      day,
      sequence: this.data.routes.length + 1,
      active: true,
      totalShops: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.routes.push(newRoute);
    this.logActivity(userId, userName, 'CREATE', 'ROUTE', newRoute.id, `Created route ${name}`);
    this.saveData();
    return newRoute;
  }

  public updateRoute(id: string, updates: Partial<Route>, userId: string, userName: string): Route | null {
    const index = this.data.routes.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.data.routes[index] = { ...this.data.routes[index], ...updates };
    this.logActivity(userId, userName, 'UPDATE', 'ROUTE', id, `Updated route ${this.data.routes[index].name}`);
    this.saveData();
    return this.data.routes[index];
  }

  public getParties(): Party[] {
    return this.data.parties;
  }

  public addParty(party: Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>, userId: string, userName: string): Party {
    const matchedRoute = this.data.routes.find(r => r.id === party.routeId);
    const newParty: Party = {
      ...party,
      routeName: matchedRoute ? matchedRoute.name : (party.routeName || 'General Route'),
      id: `pty_${Date.now()}`,
      active: true,
      lifetimeOrders: 0,
      lifetimeValue: 0,
      createdAt: new Date().toISOString(),
    };
    this.data.parties.push(newParty);

    // Update shop count on route
    const routeIndex = this.data.routes.findIndex(r => r.id === newParty.routeId);
    if (routeIndex !== -1) {
      this.data.routes[routeIndex].totalShops = (this.data.routes[routeIndex].totalShops || 0) + 1;
    }

    this.logActivity(userId, userName, 'CREATE', 'PARTY', newParty.id, `Added retailer ${newParty.shopName} to route ${newParty.routeName}`);
    this.saveData();
    return newParty;
  }

  public updateParty(id: string, updates: Partial<Party>, userId: string, userName: string): Party | null {
    const index = this.data.parties.findIndex(p => p.id === id);
    if (index === -1) return null;
    const oldRouteId = this.data.parties[index].routeId;

    let routeName = updates.routeName;
    if (updates.routeId) {
      const matchedRoute = this.data.routes.find(r => r.id === updates.routeId);
      if (matchedRoute) {
        routeName = matchedRoute.name;
      }
    }

    this.data.parties[index] = {
      ...this.data.parties[index],
      ...updates,
      ...(routeName ? { routeName } : {}),
    };

    // Update shop counts if route changed
    if (updates.routeId && updates.routeId !== oldRouteId) {
      const oldRouteIdx = this.data.routes.findIndex(r => r.id === oldRouteId);
      if (oldRouteIdx !== -1 && this.data.routes[oldRouteIdx].totalShops > 0) {
        this.data.routes[oldRouteIdx].totalShops -= 1;
      }
      const newRouteIdx = this.data.routes.findIndex(r => r.id === updates.routeId);
      if (newRouteIdx !== -1) {
        this.data.routes[newRouteIdx].totalShops = (this.data.routes[newRouteIdx].totalShops || 0) + 1;
      }
    }

    this.logActivity(userId, userName, 'UPDATE', 'PARTY', id, `Updated party ${this.data.parties[index].shopName}`);
    this.saveData();
    return this.data.parties[index];
  }

  public deleteParty(id: string, userId: string, userName: string): boolean {
    const index = this.data.parties.findIndex(p => p.id === id);
    if (index === -1) return false;
    const party = this.data.parties[index];
    const shopName = party.shopName;
    const routeId = party.routeId;

    // Remove party completely from parties list
    this.data.parties.splice(index, 1);

    // Identify associated order IDs
    const partyOrders = this.data.orders.filter(o => o.partyId === id);
    const partyOrderIds = new Set(partyOrders.map(o => o.id));

    // Remove all associated orders
    this.data.orders = this.data.orders.filter(o => o.partyId !== id);

    // Remove all associated visits
    this.data.visits = this.data.visits.filter(v => v.partyId !== id);

    // Remove all associated payments
    this.data.payments = this.data.payments.filter(
      p => !partyOrderIds.has(p.orderId) && p.partyId !== id
    );

    // Decrement route totalShops count
    const routeIndex = this.data.routes.findIndex(r => r.id === routeId);
    if (routeIndex !== -1 && this.data.routes[routeIndex].totalShops > 0) {
      this.data.routes[routeIndex].totalShops -= 1;
    }

    this.logActivity(
      userId,
      userName,
      'DELETE_PARTY',
      'PARTY',
      id,
      `Deleted store "${shopName}" and removed all associated data (${partyOrders.length} orders, visits, payments & analytics).`
    );
    this.saveData();
    return true;
  }

  // VISITS
  public getVisits(): Visit[] {
    return this.data.visits;
  }

  public addVisit(visit: Omit<Visit, 'id' | 'createdAt'>, userId: string, userName: string): Visit {
    const newVisit: Visit = {
      ...visit,
      id: `vst_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.visits.unshift(newVisit);

    // Update last visit date on party
    const pIndex = this.data.parties.findIndex(p => p.id === visit.partyId);
    if (pIndex !== -1) {
      this.data.parties[pIndex].lastVisitDate = visit.date;
    }

    this.logActivity(userId, userName, 'CREATE', 'VISIT', newVisit.id, `Recorded visit for ${visit.partyName}`);
    this.saveData();
    return newVisit;
  }

  // ORDERS
  public getOrders(): Order[] {
    return this.data.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  public addOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>, userId: string, userName: string): Order {
    const now = new Date();
    const countToday = this.data.orders.length + 1029;
    const orderNumber = `MD-${countToday}`;

    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.data.orders.unshift(newOrder);

    // Update Party lifetime orders and lifetime value
    const pIndex = this.data.parties.findIndex(p => p.id === orderData.partyId);
    if (pIndex !== -1) {
      this.data.parties[pIndex].lifetimeOrders += 1;
      this.data.parties[pIndex].lifetimeValue += orderData.grandTotal;
      this.data.parties[pIndex].lastOrderDate = orderData.date;
    }

    this.logActivity(userId, userName, 'CREATE', 'ORDER', newOrder.id, `Created Order #${orderNumber} for ${orderData.shopName} (₹${orderData.grandTotal})`);
    this.saveData();
    return newOrder;
  }

  public updateOrder(id: string, updates: Partial<Order>, userId: string, userName: string): Order | null {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const oldOrder = this.data.orders[index];
    const diffValue = (updates.grandTotal ?? oldOrder.grandTotal) - oldOrder.grandTotal;

    const updatedOrder: Order = {
      ...oldOrder,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.data.orders[index] = updatedOrder;

    // Adjust party lifetime value if total changed
    if (diffValue !== 0) {
      const pIndex = this.data.parties.findIndex(p => p.id === updatedOrder.partyId);
      if (pIndex !== -1) {
        this.data.parties[pIndex].lifetimeValue += diffValue;
      }
    }

    this.logActivity(userId, userName, 'UPDATE', 'ORDER', id, `Updated Order #${oldOrder.orderNumber}`);
    this.saveData();
    return updatedOrder;
  }

  public deleteOrder(id: string, userId: string, userName: string): boolean {
    const index = this.data.orders.findIndex(o => o.id === id);
    if (index === -1) return false;

    const order = this.data.orders[index];
    // Revert party lifetime value
    const pIndex = this.data.parties.findIndex(p => p.id === order.partyId);
    if (pIndex !== -1) {
      this.data.parties[pIndex].lifetimeOrders = Math.max(0, this.data.parties[pIndex].lifetimeOrders - 1);
      this.data.parties[pIndex].lifetimeValue = Math.max(0, this.data.parties[pIndex].lifetimeValue - order.grandTotal);
    }

    this.data.orders.splice(index, 1);
    this.logActivity(userId, userName, 'DELETE', 'ORDER', id, `Deleted Order #${order.orderNumber}`);
    this.saveData();
    return true;
  }

  // PAYMENTS
  public getPayments(): PaymentRecord[] {
    return this.data.payments;
  }

  public recordPayment(
    orderId: string,
    amountPaid: number,
    paymentMethod: 'UPI' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER',
    referenceNo: string | undefined,
    userId: string,
    userName: string
  ): Order | null {
    const orderIndex = this.data.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return null;

    const order = this.data.orders[orderIndex];
    const newPaidTotal = Number((order.paidAmount + amountPaid).toFixed(2));
    const newPending = Math.max(0, Number((order.grandTotal - newPaidTotal).toFixed(2)));

    let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' = 'PARTIAL';
    if (newPending <= 0) {
      newStatus = 'PAID';
    } else if (newPaidTotal > 0) {
      newStatus = 'PARTIAL';
    }

    this.data.orders[orderIndex].paidAmount = newPaidTotal;
    this.data.orders[orderIndex].pendingAmount = newPending;
    this.data.orders[orderIndex].paymentStatus = newStatus;

    const paymentRecord: PaymentRecord = {
      id: `pmt_${Date.now()}`,
      orderId,
      orderNumber: order.orderNumber,
      partyId: order.partyId,
      partyName: order.shopName,
      amountPaid,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod,
      referenceNo,
      recordedBy: userName,
      createdAt: new Date().toISOString(),
    };

    this.data.payments.unshift(paymentRecord);
    this.logActivity(userId, userName, 'PAYMENT', 'ORDER', orderId, `Received ₹${amountPaid} for Order #${order.orderNumber} via ${paymentMethod}`);
    this.saveData();
    return this.data.orders[orderIndex];
  }

  public getActivityLogs(): ActivityLog[] {
    return this.data.activityLogs;
  }
}

export const dbStore = new FileDatabase();
