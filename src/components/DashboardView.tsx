import React from 'react';
import {
  ShoppingCart,
  IndianRupee,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Truck,
  Store,
  Users,
  PlusCircle,
  MapPin,
  ChevronRight,
  BarChart2,
  Package,
} from 'lucide-react';
import { Order, Visit, Party, Route, Product } from '../types';
import { calculateProductivity, calculateAverageOrderValue } from '../lib/calculations';

interface DashboardViewProps {
  orders: Order[];
  visits: Visit[];
  parties: Party[];
  routes: Route[];
  products?: Product[];
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<Order>;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  visits,
  parties,
  routes,
  products,
  onUpdateOrder,
  onNavigate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Today stats
  const todayOrders = orders.filter((o) => o.date === todayStr);
  const todayOrderValue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const todayVisits = visits.filter((v) => v.date === todayStr);
  const productiveVisits = todayVisits.filter((v) => v.orderReceived);
  const nonProductiveVisits = todayVisits.filter((v) => !v.orderReceived);
  const productivityPercent = calculateProductivity(todayVisits.length, productiveVisits.length);

  // Overall stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED').length;
  const pendingDeliveries = orders.filter((o) => o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED').length;
  const deliveredCrates = orders.filter((o) => o.deliveryStatus === 'DELIVERED').reduce((sum, o) => sum + o.totalCases, 0);
  const totalPendingPayment = orders.reduce((sum, o) => sum + o.pendingAmount, 0);
  const activeParties = parties.filter((p) => p.active).length;
  const repeatParties = parties.filter((p) => p.lifetimeOrders > 1).length;
  const aov = calculateAverageOrderValue(totalRevenue, orders.length);

  // Today's scheduled route
  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysRoute = routes.find((r) => r.day.toLowerCase() === currentDayName.toLowerCase()) || routes[0];

  const handleDeliver = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    if (!onUpdateOrder) return;
    try {
      await onUpdateOrder(orderId, {
        deliveryStatus: 'DELIVERED',
        deliveredAt: new Date().toISOString(),
        deliveredBy: 'Sales Rep',
      });
    } catch (err) {
      alert('Failed to deliver order');
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-10">
      {/* Top Banner / Quick Action Bar */}
      <div className="bg-gradient-to-r from-[#0f2942] to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Mother Dairy Sales Command</h2>
          <p className="text-xs text-slate-300">
            {currentDayName}'s Active Route: <strong className="text-sky-400">{todaysRoute?.name || 'All Routes'}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={() => onNavigate('quick-order')}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Take Quick Order</span>
          </button>
          <button
            onClick={() => onNavigate('today-orders')}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-600 cursor-pointer"
          >
            <span>Today's Deliveries & Bills</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TODAY'S PERFORMANCE HIGHLIGHTS (PRIMARY METRICS) */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-sky-600" />
          <span>Today's Field Sales Overview</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Today Orders */}
          <div
            onClick={() => onNavigate('today-orders')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Today's Orders</span>
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{todayOrders.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Shops ordered today</p>
          </div>

          {/* Today Value */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Today's Value</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">₹{todayOrderValue.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Booked total revenue</p>
          </div>

          {/* Today Visits */}
          <div
            onClick={() => onNavigate('visits')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Shop Visits</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{todayVisits.length}</div>
            <div className="flex items-center space-x-2 text-[11px] mt-1">
              <span className="text-emerald-600 font-bold">{productiveVisits.length} Productive</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-600">{nonProductiveVisits.length} No-Order</span>
            </div>
          </div>

          {/* Productivity % */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Productivity</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{productivityPercent}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, productivityPercent)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* OVERALL BUSINESS & DELIVERIES KPI */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
          <Store className="w-4 h-4 text-sky-600" />
          <span>Deliveries & Distribution Overview</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-700">
            <span className="text-[11px] text-slate-500 block font-medium">Total Revenue</span>
            <span className="text-lg font-extrabold text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div
            onClick={() => onNavigate('orders')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 text-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-700 block font-bold">Pending Deliveries</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-lg font-extrabold text-amber-600">{pendingDeliveries} Pending</span>
          </div>

          <div
            onClick={() => onNavigate('orders')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 text-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-700 block font-bold">Crates Delivered</span>
              <Package className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg font-extrabold text-emerald-700">{deliveredCrates} Crates</span>
          </div>

          <div
            onClick={() => onNavigate('orders')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 text-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-700 block font-bold">Delivered Orders</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-lg font-extrabold text-emerald-600">{deliveredOrders} Orders</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-700">
            <span className="text-[11px] text-slate-500 block font-medium">Pending Payments</span>
            <span className="text-lg font-extrabold text-rose-600">₹{totalPendingPayment.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-700">
            <span className="text-[11px] text-slate-500 block font-medium">Active Retailers</span>
            <span className="text-lg font-extrabold text-slate-900">{activeParties} Shops</span>
          </div>
        </div>
      </div>

      {/* TODAY'S RECENT ORDERS & DELIVERIES TABLE / CARDS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Field Orders & Deliveries</h3>
            <p className="text-xs text-slate-500">Live feed of orders taken today • Deliver orders directly</p>
          </div>
          <button
            onClick={() => onNavigate('today-orders')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
          >
            View All ({todayOrders.length})
          </button>
        </div>

        {todayOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">No orders recorded yet today</p>
            <p className="text-xs text-slate-400 mt-0.5">Start visiting shops on your route to log orders</p>
            <button
              onClick={() => onNavigate('quick-order')}
              className="mt-3 px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              + Create First Order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todayOrders.slice(0, 6).map((order) => {
              const isDelivered = order.deliveryStatus === 'DELIVERED';
              const isManual = order.isManualDelivery || order.deliveryType === 'MANUAL' || order.deliveryStatus === 'MANUAL_DELIVERY';

              return (
                <div
                  key={order.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDelivered
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isManual
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/90 hover:border-sky-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isManual
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      #{order.orderNumber.replace('MD-', '')}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-1.5">
                        <span>{order.shopName}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {order.routeName}
                        </span>
                        {isManual && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            📦 Manual
                          </span>
                        )}
                        {isDelivered && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Delivered
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Owner: {order.ownerName} • Tel: {order.phone}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {order.items.length} Product(s) ({order.totalCases} Cases, {order.totalPieces} Loose)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900">
                        ₹{order.grandTotal.toLocaleString('en-IN')}
                      </div>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>

                    {/* Quick Deliver Action button */}
                    {!isDelivered && onUpdateOrder && (
                      <button
                        onClick={(e) => handleDeliver(e, order.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Deliver</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('today-orders')}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
