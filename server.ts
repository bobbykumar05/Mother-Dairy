import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './server/store';
import { calculateOrderTotal } from './src/lib/calculations';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Settings
  app.get('/api/settings', (_req, res) => {
    res.json(dbStore.getSettings());
  });

  app.put('/api/settings', (req, res) => {
    const { userId = 'usr_admin', userName = 'Admin', ...updates } = req.body;
    const updated = dbStore.updateSettings(updates, userId, userName);
    res.json(updated);
  });

  // Auth & Users
  app.get('/api/users', (_req, res) => {
    res.json(dbStore.getUsers());
  });

  app.post('/api/users/login', (req, res) => {
    const { username, role } = req.body;
    const users = dbStore.getUsers();
    let user = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
    if (!user) {
      user = users.find(u => u.role === (role || 'SALES')) || users[0];
    }
    res.json({ success: true, user });
  });

  // Products
  app.get('/api/products', (_req, res) => {
    res.json(dbStore.getProducts());
  });

  app.post('/api/products', (req, res) => {
    const { userId = 'usr_admin', userName = 'Admin', ...productData } = req.body;
    if (!productData.name || !productData.category || !productData.ptr) {
      return res.status(400).json({ error: 'Name, Category and PTR are required' });
    }
    const product = dbStore.addProduct(productData, userId, userName);
    res.status(201).json(product);
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin', ...updates } = req.body;
    const updated = dbStore.updateProduct(id, updates, userId, userName);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin' } = req.body || {};
    const success = dbStore.deleteProduct(id, userId, userName);
    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  });

  app.post('/api/reset-data', (req, res) => {
    const { userId = 'usr_admin', userName = 'Admin' } = req.body || {};
    const newData = dbStore.resetAllData(userId, userName);
    res.json({ success: true, data: newData });
  });

  // Price History
  app.get('/api/price-history', (_req, res) => {
    res.json(dbStore.getPriceHistories());
  });

  // Routes
  app.get('/api/routes', (_req, res) => {
    res.json(dbStore.getRoutes());
  });

  app.post('/api/routes', (req, res) => {
    const { name, day, userId = 'usr_admin', userName = 'Admin' } = req.body;
    if (!name) return res.status(400).json({ error: 'Route name is required' });
    const newRoute = dbStore.addRoute(name, day || 'Scheduled', userId, userName);
    res.status(201).json(newRoute);
  });

  app.put('/api/routes/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin', ...updates } = req.body;
    const updated = dbStore.updateRoute(id, updates, userId, userName);
    if (!updated) return res.status(404).json({ error: 'Route not found' });
    res.json(updated);
  });

  // Parties
  app.get('/api/parties', (_req, res) => {
    res.json(dbStore.getParties());
  });

  app.post('/api/parties', (req, res) => {
    const { userId = 'usr_admin', userName = 'Admin', ...partyData } = req.body;
    if (!partyData.shopName || !partyData.routeId) {
      return res.status(400).json({ error: 'Shop name and Route are required' });
    }
    const cleanPartyData = {
      ...partyData,
      ownerName: partyData.ownerName || '',
      area: partyData.area || '',
      address: partyData.address || '',
    };
    const party = dbStore.addParty(cleanPartyData, userId, userName);
    res.status(201).json(party);
  });

  app.put('/api/parties/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin', ...updates } = req.body;
    const updated = dbStore.updateParty(id, updates, userId, userName);
    if (!updated) return res.status(404).json({ error: 'Party not found' });
    res.json(updated);
  });

  app.delete('/api/parties/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin' } = req.body || {};
    const success = dbStore.deleteParty(id, userId, userName);
    if (!success) return res.status(404).json({ error: 'Party not found' });
    res.json({ success: true });
  });

  // Visits
  app.get('/api/visits', (_req, res) => {
    res.json(dbStore.getVisits());
  });

  app.post('/api/visits', (req, res) => {
    const { userId = 'usr_sales1', userName = 'Salesperson', ...visitData } = req.body;
    if (!visitData.partyId || !visitData.routeId) {
      return res.status(400).json({ error: 'Party ID and Route ID are required' });
    }
    const visit = dbStore.addVisit(visitData, userId, userName);
    res.status(201).json(visit);
  });

  // Orders
  app.get('/api/orders', (_req, res) => {
    res.json(dbStore.getOrders());
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = dbStore.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });

  app.post('/api/orders', (req, res) => {
    const { userId = 'usr_sales1', userName = 'Salesperson', ...orderInput } = req.body;

    if (!orderInput.partyId || !orderInput.items || orderInput.items.length === 0) {
      return res.status(400).json({ error: 'Party and non-empty items list required' });
    }

    // SERVER-SIDE TOTAL RECALCULATION & VALIDATION
    const totals = calculateOrderTotal(orderInput.items, orderInput.discount || 0);

    const fullOrderData = {
      ...orderInput,
      totalCases: totals.totalCases,
      totalPieces: totals.totalPieces,
      subtotal: totals.subtotal,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      deliveryStatus: orderInput.deliveryStatus || 'NEW',
      paymentStatus: orderInput.paymentStatus || 'UNPAID',
      paidAmount: orderInput.paidAmount || 0,
      pendingAmount: Math.max(0, totals.grandTotal - (orderInput.paidAmount || 0)),
    };

    const newOrder = dbStore.addOrder(fullOrderData, userId, userName);
    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_sales1', userName = 'Salesperson', ...updates } = req.body;

    if (updates.items) {
      const totals = calculateOrderTotal(updates.items, updates.discount || 0);
      updates.totalCases = totals.totalCases;
      updates.totalPieces = totals.totalPieces;
      updates.subtotal = totals.subtotal;
      updates.discount = totals.discount;
      updates.grandTotal = totals.grandTotal;
      updates.pendingAmount = Math.max(0, totals.grandTotal - (updates.paidAmount || 0));
    }

    const updated = dbStore.updateOrder(id, updates, userId, userName);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  });

  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const { userId = 'usr_admin', userName = 'Admin' } = req.body || {};
    const success = dbStore.deleteOrder(id, userId, userName);
    if (!success) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  });

  // Payments
  app.post('/api/orders/:id/payment', (req, res) => {
    const { id } = req.params;
    const { amountPaid, paymentMethod = 'UPI', referenceNo, userId = 'usr_sales1', userName = 'Salesperson' } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    const updatedOrder = dbStore.recordPayment(id, Number(amountPaid), paymentMethod, referenceNo, userId, userName);
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json(updatedOrder);
  });

  app.get('/api/payments', (_req, res) => {
    res.json(dbStore.getPayments());
  });

  // Activity Logs
  app.get('/api/activity-logs', (_req, res) => {
    res.json(dbStore.getActivityLogs());
  });

  // Comprehensive Analytics
  app.get('/api/analytics', (_req, res) => {
    const orders = dbStore.getOrders();
    const visits = dbStore.getVisits();
    const parties = dbStore.getParties();
    const products = dbStore.getProducts();

    const todayStr = new Date().toISOString().split('T')[0];

    const todayOrders = orders.filter(o => o.date === todayStr);
    const todayOrderValue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const todayCases = todayOrders.reduce((sum, o) => sum + o.totalCases, 0);
    const todayPieces = todayOrders.reduce((sum, o) => sum + o.totalPieces, 0);
    const todayVisits = visits.filter(v => v.date === todayStr);
    const productiveVisits = todayVisits.filter(v => v.orderReceived);

    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalPendingAmount = orders.reduce((sum, o) => sum + o.pendingAmount, 0);
    const totalDeliveredAmount = orders.filter(o => o.deliveryStatus === 'DELIVERED').reduce((sum, o) => sum + o.grandTotal, 0);

    // Category breakdown
    const categoryRevenueMap: Record<string, { revenue: number; cases: number; pieces: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const cat = item.category || 'OTHER';
        if (!categoryRevenueMap[cat]) {
          categoryRevenueMap[cat] = { revenue: 0, cases: 0, pieces: 0 };
        }
        categoryRevenueMap[cat].revenue += item.lineTotal;
        categoryRevenueMap[cat].cases += item.caseQty;
        categoryRevenueMap[cat].pieces += item.pieceQty;
      });
    });

    const categoryBreakdown = Object.entries(categoryRevenueMap).map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      cases: stats.cases,
      pieces: stats.pieces,
      percentage: totalRevenue > 0 ? Number(((stats.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // Top Parties by Revenue
    const partyStatsMap: Record<string, { shopName: string; ownerName: string; revenue: number; ordersCount: number; cases: number }> = {};
    orders.forEach(order => {
      if (!partyStatsMap[order.partyId]) {
        partyStatsMap[order.partyId] = { shopName: order.shopName, ownerName: order.ownerName, revenue: 0, ordersCount: 0, cases: 0 };
      }
      partyStatsMap[order.partyId].revenue += order.grandTotal;
      partyStatsMap[order.partyId].ordersCount += 1;
      partyStatsMap[order.partyId].cases += order.totalCases;
    });

    const topParties = Object.values(partyStatsMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      today: {
        ordersCount: todayOrders.length,
        orderValue: todayOrderValue,
        totalCases: todayCases,
        totalPieces: todayPieces,
        visitsCount: todayVisits.length,
        productiveVisitsCount: productiveVisits.length,
        productivityPercent: todayVisits.length > 0 ? Number(((productiveVisits.length / todayVisits.length) * 100).toFixed(1)) : 0,
      },
      overall: {
        totalRevenue,
        totalOrdersCount: orders.length,
        totalPartiesCount: parties.length,
        activePartiesCount: parties.filter(p => p.active).length,
        totalPendingAmount,
        totalDeliveredAmount,
        averageOrderValue: orders.length > 0 ? Number((totalRevenue / orders.length).toFixed(2)) : 0,
      },
      categoryBreakdown,
      topParties,
    });
  });

  // VITE / STATIC MIDDLEWARE
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mother Dairy Sales System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
