import React, { useState, useMemo } from 'react';
import {
  Truck,
  IndianRupee,
  QrCode,
  MessageSquare,
  CheckCircle,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  Building,
  DollarSign,
  Search,
  Filter,
  Package,
} from 'lucide-react';
import { Order, PaymentRecord, AppSettings, DeliveryStatus } from '../types';
import { generateWhatsAppBillMessage } from '../lib/whatsapp';
import { generateUpiQrDataUrl } from '../lib/qr';

interface PaymentsViewProps {
  orders: Order[];
  payments: PaymentRecord[];
  settings: AppSettings;
  onRecordPayment: (orderId: string, amount: number, method: string, refNo?: string) => Promise<Order>;
  onUpdateDeliveryStatus: (orderId: string, status: any) => Promise<Order>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  orders,
  payments,
  settings,
  onRecordPayment,
  onUpdateDeliveryStatus,
}) => {
  // Modal states
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<any>('UPI');
  const [refNo, setRefNo] = useState('');

  // QR Modal
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'PENDING' | 'MANUAL' | 'DELIVERED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID'>('ALL');

  const totalPendingBalance = orders.reduce((sum, o) => sum + o.pendingAmount, 0);
  const totalCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const pendingDeliveriesCount = orders.filter((o) => o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED').length;
  const deliveredCasesCount = orders.filter((o) => o.deliveryStatus === 'DELIVERED').reduce((sum, o) => sum + o.totalCases, 0);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const isManual = o.isManualDelivery || o.deliveryType === 'MANUAL' || o.deliveryStatus === 'MANUAL_DELIVERY';
      const isPending = o.deliveryStatus !== 'DELIVERED' && o.deliveryStatus !== 'CANCELLED';

      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.phone.includes(searchQuery) ||
        o.routeName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPayment = paymentFilter === 'ALL' || o.paymentStatus === paymentFilter;

      let matchesDelivery = true;
      if (deliveryFilter === 'PENDING') {
        matchesDelivery = isPending;
      } else if (deliveryFilter === 'MANUAL') {
        matchesDelivery = isManual;
      } else if (deliveryFilter === 'DELIVERED') {
        matchesDelivery = o.deliveryStatus === 'DELIVERED';
      }

      return matchesSearch && matchesPayment && matchesDelivery;
    });
  }, [orders, searchQuery, deliveryFilter, paymentFilter]);

  const handleOpenPayment = (order: Order) => {
    setPaymentModalOrder(order);
    setPayAmount(order.pendingAmount);
    setPayMethod('UPI');
    setRefNo('');
  };

  const handleOpenQr = async (order: Order) => {
    setQrModalOrder(order);
    const dataUrl = await generateUpiQrDataUrl(
      settings.upiId || 'motherdairy@upi',
      settings.payeeName || 'Mother Dairy Sales',
      order.pendingAmount,
      `Invoice #${order.orderNumber}`
    );
    setQrCodeDataUrl(dataUrl);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder || payAmount <= 0) return;

    try {
      await onRecordPayment(paymentModalOrder.id, payAmount, payMethod, refNo);
      setPaymentModalOrder(null);
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  const handleQuickDeliver = async (orderId: string) => {
    try {
      await onUpdateDeliveryStatus(orderId, 'DELIVERED');
    } catch (err) {
      alert('Failed to mark delivery');
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Deliveries & Payment Follow-Up</h2>
          <p className="text-xs text-slate-500">Track delivery statuses, convert to manual delivery & mark orders as delivered</p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-[#0f2942] bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200">
          <IndianRupee className="w-4 h-4 text-sky-600" />
          <span>Pending Collections: ₹{totalPendingBalance.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Revenue Collected</span>
          <span className="text-2xl font-black text-emerald-600">₹{totalCollected.toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Pending Balance</span>
          <span className="text-2xl font-black text-rose-600">₹{totalPendingBalance.toLocaleString('en-IN')}</span>
        </div>

        <div
          onClick={() => setDeliveryFilter('PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            deliveryFilter === 'PENDING' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 font-semibold block">Pending Deliveries</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600">{pendingDeliveriesCount}</span>
        </div>

        <div
          onClick={() => setDeliveryFilter('DELIVERED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            deliveryFilter === 'DELIVERED' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-semibold block">Crates Delivered</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{deliveredCasesCount} Crates</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, shop name, phone, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Delivery: All</option>
            <option value="PENDING">Pending Deliveries</option>
            <option value="MANUAL">Manual Deliveries</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Payment: All</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
      </div>

      {/* ORDERS DELIVERY & PAYMENT STATUS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-base">Invoices & Delivery Follow-up ({filteredOrders.length})</h3>

        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No matching orders found.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDelivered = order.deliveryStatus === 'DELIVERED';
              const isManual = order.isManualDelivery || order.deliveryType === 'MANUAL' || order.deliveryStatus === 'MANUAL_DELIVERY';

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
                    isDelivered
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : isManual
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-slate-50 border-slate-200/90'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900">#{order.orderNumber}</span>
                      <span className="font-bold text-slate-700 text-xs">• {order.shopName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {order.routeName}
                      </span>
                      {isManual && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          📦 Manual Delivery
                        </span>
                      )}
                      {isDelivered && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ DELIVERED
                        </span>
                      )}
                    </div>

                    <div className="text-slate-500">
                      Owner: {order.ownerName} • Phone: {order.phone}
                      {order.manualDeliveryAssignedTo && (
                        <span className="text-amber-800 font-semibold ml-2">
                          • Assigned: {order.manualDeliveryAssignedTo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 pt-1 text-slate-700 font-medium">
                      <div>
                        Total: <strong className="text-slate-900">₹{order.grandTotal.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        Paid: <span className="text-emerald-600 font-bold">₹{order.paidAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        Pending: <span className="text-rose-600 font-bold">₹{order.pendingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Selectors & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                    {/* One-Click DELIVER Button */}
                    {!isDelivered ? (
                      <button
                        onClick={() => handleQuickDeliver(order.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Deliver</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Delivered</span>
                      </div>
                    )}

                    {/* Delivery Status Selector */}
                    <div>
                      <select
                        value={order.deliveryStatus}
                        onChange={(e) => onUpdateDeliveryStatus(order.id, e.target.value)}
                        className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="NEW">NEW</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="MANUAL_DELIVERY">MANUAL DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    {/* QR Code Trigger */}
                    {order.pendingAmount > 0 && (
                      <button
                        onClick={() => handleOpenQr(order)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>UPI QR</span>
                      </button>
                    )}

                    {/* WhatsApp Bill */}
                    <a
                      href={generateWhatsAppBillMessage(order, settings)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {/* Record Collection */}
                    {order.pendingAmount > 0 && (
                      <button
                        onClick={() => handleOpenPayment(order)}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
                      >
                        + Record Cash/UPI
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitPayment}
            className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Payment Collection</h3>
                <p className="text-xs text-slate-500">Order #{paymentModalOrder.orderNumber} • {paymentModalOrder.shopName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Collected (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModalOrder.pendingAmount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-sky-50 border border-sky-300 rounded-xl font-extrabold text-sm text-sky-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="BANK_TRANSFER">Bank Direct Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / UTR / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR 42019283719"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-extrabold text-sm text-slate-900">Instant UPI QR Code</span>
              <button
                onClick={() => setQrModalOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-base font-black text-slate-900">{qrModalOrder.shopName}</div>
              <div className="text-xs text-slate-500">Order #{qrModalOrder.orderNumber}</div>
            </div>

            {qrCodeDataUrl ? (
              <div className="bg-white p-3 border-2 border-slate-900 rounded-2xl inline-block shadow-md">
                <img src={qrCodeDataUrl} alt="UPI QR" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-2xl mx-auto text-xs text-slate-400">
                Generating QR...
              </div>
            )}

            <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 text-sky-900 text-xs">
              <div className="font-extrabold text-sm">Amount: ₹{qrModalOrder.pendingAmount.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-sky-700">Scan using any UPI App (GPay / PhonePe / Paytm)</div>
            </div>

            <button
              onClick={() => setQrModalOrder(null)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
