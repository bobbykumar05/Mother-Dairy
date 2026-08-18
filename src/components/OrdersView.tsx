import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  MessageSquare,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  CheckCircle,
  CheckCircle2,
  Truck,
  IndianRupee,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Package,
} from 'lucide-react';
import { Order, Product, AppSettings, DeliveryStatus, PaymentStatus } from '../types';
import { generateInvoicePdf } from '../lib/pdf';
import { generateWhatsAppBillMessage } from '../lib/whatsapp';
import { calculateOrderLine, calculateOrderTotal } from '../lib/calculations';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  settings: AppSettings;
  isTodayOnly?: boolean;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<Order>;
  onDeleteOrder: (id: string) => Promise<boolean>;
  onNavigate: (view: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  settings,
  isTodayOnly = false,
  onUpdateOrder,
  onDeleteOrder,
  onNavigate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('ALL');

  // Expanded card state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Edit Order Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);

  // Delete confirmation
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Action status feedback
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3000);
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (isTodayOnly && o.date !== todayStr) return false;

      const isManual = o.isManualDelivery || o.deliveryType === 'MANUAL' || o.deliveryStatus === 'MANUAL_DELIVERY';
      const isPending = o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED';

      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone.includes(searchQuery) ||
        o.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.manualDeliveryAssignedTo && o.manualDeliveryAssignedTo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPayment = paymentFilter === 'ALL' || o.paymentStatus === paymentFilter;

      let matchesDelivery = true;
      if (deliveryFilter === 'PENDING') {
        matchesDelivery = isPending;
      } else if (deliveryFilter === 'MANUAL') {
        matchesDelivery = isManual;
      } else if (deliveryFilter === 'DELIVERED') {
        matchesDelivery = o.deliveryStatus === 'DELIVERED';
      } else if (deliveryFilter !== 'ALL') {
        matchesDelivery = o.deliveryStatus === deliveryFilter;
      }

      return matchesSearch && matchesPayment && matchesDelivery;
    });
  }, [orders, isTodayOnly, todayStr, searchQuery, paymentFilter, deliveryFilter]);

  // Summary Metrics
  const summary = useMemo(() => {
    const list = isTodayOnly ? orders.filter((o) => o.date === todayStr) : orders;
    const totalValue = list.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCases = list.reduce((sum, o) => sum + o.totalCases, 0);
    const totalPieces = list.reduce((sum, o) => sum + o.totalPieces, 0);
    const pendingDeliveries = list.filter((o) => o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED').length;
    const deliveredCases = list.filter((o) => o.deliveryStatus === 'DELIVERED').reduce((sum, o) => sum + o.totalCases, 0);
    const deliveredCount = list.filter((o) => o.deliveryStatus === 'DELIVERED').length;

    return {
      count: list.length,
      totalValue,
      totalCases,
      totalPieces,
      pendingDeliveries,
      deliveredCases,
      deliveredCount,
    };
  }, [orders, isTodayOnly, todayStr]);

  // Mark Delivered Handler
  const handleMarkDelivered = async (order: Order) => {
    try {
      const nowIso = new Date().toISOString();
      await onUpdateOrder(order.id, {
        deliveryStatus: 'DELIVERED',
        deliveredAt: nowIso,
        deliveredBy: 'Sales Rep',
      });
      triggerToast(`✓ Order #${order.orderNumber} successfully marked as DELIVERED!`);
    } catch (err) {
      alert('Failed to mark order as delivered');
    }
  };

  // Edit Order Handler
  const handleStartEdit = (order: Order) => {
    setEditingOrder(order);
    setEditItems(JSON.parse(JSON.stringify(order.items)));
  };

  const handleUpdateItemQty = (productId: string, type: 'case' | 'piece', delta: number) => {
    setEditItems((prev) => {
      return prev.map((item) => {
        if (item.productId === productId) {
          const newCase = type === 'case' ? Math.max(0, item.caseQty + delta) : item.caseQty;
          const newPiece = type === 'piece' ? Math.max(0, item.pieceQty + delta) : item.pieceQty;
          const calc = calculateOrderLine(item.ptrAtOrder, item.piecesPerCase, newCase, newPiece);

          return {
            ...item,
            caseQty: newCase,
            pieceQty: newPiece,
            totalPieces: calc.totalPieces,
            lineTotal: calc.lineTotal,
          };
        }
        return item;
      }).filter((item) => item.totalPieces > 0);
    });
  };

  const handleSaveEditedOrder = async () => {
    if (!editingOrder) return;
    try {
      const calcTotals = calculateOrderTotal(editItems, editingOrder.discount);
      await onUpdateOrder(editingOrder.id, {
        items: editItems,
        totalCases: calcTotals.totalCases,
        totalPieces: calcTotals.totalPieces,
        subtotal: calcTotals.subtotal,
        discount: calcTotals.discount,
        grandTotal: calcTotals.grandTotal,
        pendingAmount: Math.max(0, calcTotals.grandTotal - editingOrder.paidAmount),
      });
      setEditingOrder(null);
      triggerToast(`Order #${editingOrder.orderNumber} updated successfully.`);
    } catch (err) {
      alert('Failed to update order');
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await onDeleteOrder(id);
      setDeletingOrderId(null);
      triggerToast('Order deleted permanently.');
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-5 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {isTodayOnly ? "Today's Orders & Deliveries" : 'Sales Order & Delivery Management'}
          </h2>
          <p className="text-xs text-slate-500">
            {isTodayOnly
              ? `Manage orders generated on ${todayStr} • Convert to manual delivery or mark delivered`
              : 'Search, filter, convert manual deliveries & track delivery statuses'}
          </p>
        </div>

        <button
          onClick={() => onNavigate('quick-order')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Order</span>
        </button>
      </div>

      {/* TOP SUMMARY KPI CARDS WITH INTERACTIVE FILTER PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setDeliveryFilter('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            deliveryFilter === 'ALL'
              ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500 block">Total Orders</span>
          <span className="text-xl font-black text-slate-900">{summary.count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Order Value</span>
          <span className="text-xl font-black text-sky-700">₹{summary.totalValue.toLocaleString('en-IN')}</span>
        </div>

        <div
          onClick={() => setDeliveryFilter('PENDING')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            deliveryFilter === 'PENDING'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 block">Pending Delivery</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-600">{summary.pendingDeliveries}</span>
        </div>

        <div
          onClick={() => setDeliveryFilter('DELIVERED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            deliveryFilter === 'DELIVERED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 block">Crates Delivered</span>
            <Package className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-700">{summary.deliveredCases} Crates</span>
        </div>

        <div
          onClick={() => setDeliveryFilter('DELIVERED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            deliveryFilter === 'DELIVERED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 block">Delivered Orders</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-600">{summary.deliveredCount}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 block">Cases Booked</span>
          <span className="text-xl font-black text-slate-900">{summary.totalCases} Cse</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, shop name, phone, owner, route, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Delivery Filter */}
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Delivery: All Orders</option>
            <option value="PENDING">⏳ Pending Deliveries ({summary.pendingDeliveries})</option>
            <option value="MANUAL">📦 Manual Deliveries ({summary.manualDeliveries})</option>
            <option value="DELIVERED">✓ Delivered ({summary.deliveredCount})</option>
            <option value="NEW">Status: NEW</option>
            <option value="PROCESSING">Status: PROCESSING</option>
            <option value="DISPATCHED">Status: DISPATCHED</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Payment: All</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* ORDERS LIST / CARDS */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 text-sm">No matching orders found</h4>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or create a new order.</p>
            {deliveryFilter !== 'ALL' && (
              <button
                onClick={() => setDeliveryFilter('ALL')}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Reset Delivery Filter
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isDelivered = order.deliveryStatus === 'DELIVERED';
            const isManual = order.isManualDelivery || order.deliveryType === 'MANUAL' || order.deliveryStatus === 'MANUAL_DELIVERY';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isDelivered
                    ? 'border-emerald-200/80 shadow-xs'
                    : isManual
                    ? 'border-amber-300/80 shadow-xs bg-gradient-to-r from-amber-50/20 to-white'
                    : 'border-slate-200/90 shadow-xs hover:border-sky-300'
                }`}
              >
                {/* Main Order Card Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 border ${
                        isDelivered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isManual
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-sky-50 text-sky-700 border-sky-100'
                      }`}
                    >
                      #{order.orderNumber.replace('MD-', '')}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{order.shopName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {order.routeName}
                        </span>

                        {/* Manual Delivery Badge */}
                        {isManual && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-amber-700 inline" />
                            <span>Manual Delivery</span>
                          </span>
                        )}

                        {/* Delivery Status Badge */}
                        {isDelivered ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                            <span>DELIVERED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {order.deliveryStatus}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5">
                        Shop #{order.shopNumber} • Owner: {order.ownerName} • Tel: {order.phone}
                        {order.manualDeliveryAssignedTo && (
                          <span className="text-amber-800 font-semibold ml-2">
                            • Assigned: {order.manualDeliveryAssignedTo}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>Date: {order.date} {order.time}</span>
                        <span>•</span>
                        <span>{order.items.length} Products ({order.totalCases} Cse, {order.totalPieces} Loose Pcs)</span>
                        {order.deliveredAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Delivered at {new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount, Quick Action Buttons & Statuses */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right mr-1">
                      <div className="text-base font-black text-slate-900">
                        ₹{order.grandTotal.toLocaleString('en-IN')}
                      </div>
                      <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* QUICK ACTION: DELIVER BUTTON */}
                    {!isDelivered ? (
                      <button
                        onClick={() => handleMarkDelivered(order)}
                        title="Mark this order as Delivered"
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Deliver</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivered</span>
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ORDER DETAILS */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs space-y-4">
                    {/* DELIVERY MANAGEMENT CARD SECTION */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                            Delivery Status:
                          </span>
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                              isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isDelivered ? '✓ DELIVERED' : 'PENDING ROUTE DISPATCH'}
                          </span>
                        </div>

                        {isDelivered ? (
                          <div className="text-xs text-emerald-800">
                            Delivered successfully on{' '}
                            <strong>
                              {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : order.date}
                            </strong>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            Order is scheduled for route truck delivery. Click "Deliver" once items are handed over.
                          </div>
                        )}
                      </div>

                      {/* Delivery Actions inside details */}
                      <div className="flex flex-wrap items-center gap-2">
                        {!isDelivered ? (
                          <button
                            onClick={() => handleMarkDelivered(order)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Mark as Delivered</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onUpdateOrder(order.id, {
                                deliveryStatus: 'PROCESSING',
                                deliveredAt: undefined,
                              })
                            }
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reopen Delivery</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      ORDERED PRODUCTS BREAKDOWN
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 font-bold text-slate-700 text-[11px]">
                          <tr>
                            <th className="p-2">Product Name</th>
                            <th className="p-2">Pack</th>
                            <th className="p-2">Cases</th>
                            <th className="p-2">Loose Pcs</th>
                            <th className="p-2">PTR Rate</th>
                            <th className="p-2 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {order.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-bold text-slate-900">
                                <div>{item.productName}</div>
                                {item.appliedOfferTitle && (
                                  <div className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-0.5 inline-block">
                                    🎁 {item.appliedOfferTitle}
                                    {item.appliedOfferBonusPieces ? (
                                      <span className="ml-1 text-amber-900 font-black">
                                        (+{item.appliedOfferBonusPieces} Free Pcs)
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-slate-500">{item.packSize || '-'}</td>
                              <td className="p-2">{item.caseQty} Cse</td>
                              <td className="p-2">{item.pieceQty} Pcs</td>
                              <td className="p-2">₹{item.ptrAtOrder}</td>
                              <td className="p-2 text-right font-extrabold text-slate-900">
                                ₹{item.lineTotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center space-x-2">
                        <a
                          href={generateWhatsAppBillMessage(order, settings)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Bill</span>
                        </a>

                        <button
                          onClick={() => generateInvoicePdf(order, settings)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF Invoice</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(order)}
                          className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Order</span>
                        </button>

                        <button
                          onClick={() => setDeletingOrderId(order.id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-[#0f2942] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Edit Order #{editingOrder.orderNumber}</h3>
                <p className="text-xs text-slate-300">Shop: {editingOrder.shopName}</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-1 rounded-lg text-slate-300 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs font-bold text-slate-700 uppercase">MODIFY ITEM QUANTITIES</div>

              {editItems.map((item) => (
                <div key={item.productId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{item.productName}</div>
                    <div className="text-[11px] text-slate-500">Rate: ₹{item.ptrAtOrder} / pc</div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    {/* Cases */}
                    <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">CSE:</span>
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, 'case', -1)}
                        className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold w-4 text-center">{item.caseQty}</span>
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, 'case', 1)}
                        className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Loose Pieces */}
                    <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">PCS:</span>
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, 'piece', -1)}
                        className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold w-4 text-center">{item.pieceQty}</span>
                      <button
                        onClick={() => handleUpdateItemQty(item.productId, 'piece', 1)}
                        className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-extrabold text-sky-700 text-xs w-16 text-right">
                      ₹{item.lineTotal}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedOrder}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                SAVE EDITED CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-slate-900 text-base">Delete Order Permanently?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete this order? Retailer lifetime stats will be updated automatically.
            </p>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingOrderId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deletingOrderId)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
