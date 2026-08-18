import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  X,
  FileText,
  MessageSquare,
  IndianRupee,
  Store,
  MapPin,
  ChevronRight,
  Trash2,
  Sparkles,
  Gift,
  Tag,
  Truck,
} from 'lucide-react';
import { Product, Party, Route, Order, AppSettings, OrderItem } from '../types';
import { calculateOrderLine, calculateOrderTotal, calculateOfferForProduct } from '../lib/calculations';
import { generateWhatsAppBillMessage } from '../lib/whatsapp';
import { generateInvoicePdf } from '../lib/pdf';

interface QuickOrderViewProps {
  products: Product[];
  parties: Party[];
  routes: Route[];
  settings: AppSettings;
  initialPartyId?: string;
  onSaveOrder?: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  onCreateOrder?: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  onNavigate: (view: string) => void;
}

export const QuickOrderView: React.FC<QuickOrderViewProps> = ({
  products,
  parties,
  routes,
  settings,
  initialPartyId,
  onSaveOrder,
  onCreateOrder,
  onNavigate,
}) => {
  // Selection State
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || '');
  const [partySearchQuery, setPartySearchQuery] = useState('');

  React.useEffect(() => {
    if (initialPartyId) {
      const party = parties.find((p) => p.id === initialPartyId);
      if (party) {
        setSelectedPartyId(party.id);
        if (party.routeId) setSelectedRouteId(party.routeId);
      }
    }
  }, [initialPartyId, parties]);
  
  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State: Map of productId -> { caseQty, pieceQty }
  const [cartMap, setCartMap] = useState<Record<string, { caseQty: number; pieceQty: number }>>({});
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL'>('PAID');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Review Drawer & Success Modal
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'PENDING' | 'DELIVERED'>('PENDING');
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter parties by route
  const activePartiesForRoute = useMemo(() => {
    return parties.filter((p) => p.active && (p.routeId === selectedRouteId || !selectedRouteId));
  }, [parties, selectedRouteId]);

  const filteredPartiesForRoute = useMemo(() => {
    if (!partySearchQuery.trim()) return activePartiesForRoute;
    const q = partySearchQuery.toLowerCase().trim();
    return activePartiesForRoute.filter(
      (p) =>
        p.shopName.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        (p.shopNumber && p.shopNumber.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  }, [activePartiesForRoute, partySearchQuery]);

  const selectedParty = useMemo(() => {
    return parties.find((p) => p.id === selectedPartyId);
  }, [parties, selectedPartyId]);

  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId);
  }, [routes, selectedRouteId]);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['ALL', ...cats];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.packSize && p.packSize.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Quantity change helper
  const handleQuantityChange = (productId: string, type: 'case' | 'piece', delta: number) => {
    setCartMap((prev) => {
      const current = prev[productId] || { caseQty: 0, pieceQty: 0 };
      const newCase = type === 'case' ? Math.max(0, current.caseQty + delta) : current.caseQty;
      const newPiece = type === 'piece' ? Math.max(0, current.pieceQty + delta) : current.pieceQty;

      if (newCase === 0 && newPiece === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      return {
        ...prev,
        [productId]: { caseQty: newCase, pieceQty: newPiece },
      };
    });
  };

  // Direct manual quantity set helper
  const handleSetQuantity = (productId: string, type: 'case' | 'piece', val: number) => {
    const validVal = Math.max(0, isNaN(val) ? 0 : val);
    setCartMap((prev) => {
      const current = prev[productId] || { caseQty: 0, pieceQty: 0 };
      const newCase = type === 'case' ? validVal : current.caseQty;
      const newPiece = type === 'piece' ? validVal : current.pieceQty;

      if (newCase === 0 && newPiece === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      return {
        ...prev,
        [productId]: { caseQty: newCase, pieceQty: newPiece },
      };
    });
  };

  // Custom manual item state
  const [customItems, setCustomItems] = useState<OrderItem[]>([]);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPtr, setCustomPtr] = useState<number>(0);
  const [customMrp, setCustomMrp] = useState<number>(0);
  const [customPackSize, setCustomPackSize] = useState('Standard');
  const [customPiecesPerCase, setCustomPiecesPerCase] = useState<number>(1);
  const [customCaseQty, setCustomCaseQty] = useState<number>(0);
  const [customPieceQty, setCustomPieceQty] = useState<number>(1);

  const handleAddCustomItem = () => {
    if (!customName.trim()) {
      alert('Please enter a product item name.');
      return;
    }
    const calc = calculateOrderLine(customPtr, customPiecesPerCase || 1, customCaseQty, customPieceQty);
    if (calc.totalPieces <= 0) {
      alert('Please enter a case or loose piece quantity greater than 0.');
      return;
    }

    const newItem: OrderItem = {
      productId: `custom_${Date.now()}`,
      productName: customName.trim(),
      category: 'Custom / Manual Item',
      packSize: customPackSize || 'Standard',
      piecesPerCase: customPiecesPerCase || 1,
      mrpAtOrder: customMrp || customPtr,
      ptrAtOrder: customPtr,
      caseQty: customCaseQty,
      pieceQty: customPieceQty,
      totalPieces: calc.totalPieces,
      lineTotal: calc.lineTotal,
    };

    setCustomItems((prev) => [...prev, newItem]);
    setCustomName('');
    setCustomPtr(0);
    setCustomMrp(0);
    setCustomCaseQty(0);
    setCustomPieceQty(1);
    setIsAddCustomOpen(false);
  };

  // Convert cartMap and customItems into OrderItem[]
  const cartItems: OrderItem[] = useMemo(() => {
    const items: OrderItem[] = [];
    Object.entries(cartMap).forEach(([prodId, qtyObj]) => {
      const qty = qtyObj as { caseQty: number; pieceQty: number };
      const p = products.find((prod) => prod.id === prodId);
      if (!p) return;

      const calc = calculateOfferForProduct(p, qty.caseQty, qty.pieceQty);
      if (calc.totalPieces > 0) {
        items.push({
          productId: p.id,
          productName: p.name,
          category: p.category,
          packSize: p.packSize,
          piecesPerCase: p.piecesPerCase,
          mrpAtOrder: p.mrp,
          ptrAtOrder: calc.effectivePtr,
          caseQty: qty.caseQty,
          pieceQty: qty.pieceQty,
          totalPieces: calc.totalPieces,
          lineTotal: calc.lineTotal,
          appliedOfferTitle: calc.appliedOfferTitle,
          appliedOfferBonusPieces: calc.appliedOfferBonusPieces,
          appliedOfferSavings: calc.appliedOfferSavings,
        });
      }
    });
    return [...items, ...customItems];
  }, [cartMap, products, customItems]);

  const totals = useMemo(() => {
    return calculateOrderTotal(cartItems, discount);
  }, [cartItems, discount]);

  const handleSave = async () => {
    if (!selectedParty) return;
    if (cartItems.length === 0) return;

    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newOrderData = {
        date: todayStr,
        time: timeStr,
        salespersonId: 'usr_sales1',
        salespersonName: 'Amit Sharma',
        partyId: selectedParty.id,
        shopNumber: selectedParty.shopNumber,
        shopName: selectedParty.shopName,
        ownerName: selectedParty.ownerName,
        phone: selectedParty.phone,
        address: selectedParty.address,
        routeId: selectedRoute?.id || selectedParty.routeId,
        routeName: selectedRoute?.name || selectedParty.routeName,
        items: cartItems,
        totalCases: totals.totalCases,
        totalPieces: totals.totalPieces,
        subtotal: totals.subtotal,
        discount: totals.discount,
        grandTotal: totals.grandTotal,
        deliveryType: 'STANDARD',
        isManualDelivery: false,
        deliveryStatus: deliveryMode === 'DELIVERED' ? ('DELIVERED' as const) : ('NEW' as const),
        deliveredAt: deliveryMode === 'DELIVERED' ? new Date().toISOString() : undefined,
        deliveredBy: deliveryMode === 'DELIVERED' ? 'Sales Rep' : undefined,
        paymentStatus: paymentStatus,
        paidAmount: paymentStatus === 'PAID' ? totals.grandTotal : paidAmount,
        pendingAmount: paymentStatus === 'PAID' ? 0 : Math.max(0, totals.grandTotal - paidAmount),
        notes: notes,
      };

      const saveFn = onSaveOrder || onCreateOrder;
      if (!saveFn) throw new Error('Save handler not provided');
      const result = await saveFn(newOrderData);
      setSavedOrder(result);
      setIsReviewOpen(false);
      setCartMap({});
    } catch (err) {
      alert('Failed to save order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Step 1: Route & Party Selector Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-sky-700 uppercase tracking-wider">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <span>Step 1: Select Field Route & Retail Store</span>
          </div>
          {selectedRoute && (
            <span className="text-[11px] font-semibold text-slate-500 normal-case bg-slate-100 px-2 py-0.5 rounded-md">
              {activePartiesForRoute.length} shops on route
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Select Route */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Route</label>
            <select
              value={selectedRouteId}
              onChange={(e) => {
                setSelectedRouteId(e.target.value);
                setSelectedPartyId('');
                setPartySearchQuery('');
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.day})
                </option>
              ))}
            </select>
          </div>

          {/* Search Retailer / Shop */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Search Retailer / Shop
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search shop, owner, shop no..."
                value={partySearchQuery}
                onChange={(e) => setPartySearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
              />
              {partySearchQuery && (
                <button
                  onClick={() => setPartySearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Select Party / Retailer Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Retail Store</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full p-2.5 bg-sky-50/60 border border-sky-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- Choose Shop ({filteredPartiesForRoute.length}) --</option>
              {filteredPartiesForRoute.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shopName} ({p.shopNumber}) • {p.ownerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Instant matching retailer search results cards */}
        {partySearchQuery.trim() !== '' && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Matching Shops ({filteredPartiesForRoute.length} found on {selectedRoute?.name || 'Route'})</span>
              {filteredPartiesForRoute.length > 0 && (
                <span className="text-sky-600 font-normal">Click to select shop</span>
              )}
            </div>

            {filteredPartiesForRoute.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>No retailer found matching "{partySearchQuery}" on {selectedRoute?.name || 'this route'}.</span>
                <button
                  onClick={() => setPartySearchQuery('')}
                  className="text-xs font-bold text-amber-900 underline ml-2"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredPartiesForRoute.map((p) => {
                  const isSelected = p.id === selectedPartyId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPartyId(p.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
                        isSelected
                          ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <Store className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 truncate">{p.shopName}</div>
                        <div className="text-[11px] text-slate-500 truncate">{p.ownerName} • {p.shopNumber}</div>
                        {p.address && <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.address}</div>}
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedParty && (
          <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-900 text-sm">{selectedParty.shopName}</span>
              <span className="ml-2 text-slate-500">
                Owner: {selectedParty.ownerName} • Phone: {selectedParty.phone} • Shop No: {selectedParty.shopNumber}
              </span>
            </div>
            <div className="font-semibold text-sky-800">
              Address: {selectedParty.address}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Search & Category Chips */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <Search className="w-5 h-5 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Search product name, pack size, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-sm focus:outline-none text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Horizontal Chips & Add Custom Product Item Button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center space-x-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0f2942] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsAddCustomOpen(true)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs whitespace-nowrap cursor-pointer flex items-center space-x-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* Step 3: Product List with Case + Piece Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((p) => {
          const qty = cartMap[p.id] || { caseQty: 0, pieceQty: 0 };
          const calc = calculateOfferForProduct(p, qty.caseQty, qty.pieceQty);

          return (
            <div
              key={p.id}
              className={`p-3.5 bg-white rounded-2xl border transition-all flex flex-col justify-between ${
                calc.totalPieces > 0
                  ? 'border-sky-500 ring-2 ring-sky-200 shadow-md'
                  : p.hasOffer
                  ? 'border-amber-300/80 hover:border-amber-400 bg-gradient-to-b from-amber-50/30 to-white'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                        {p.category}
                      </span>
                      {p.hasOffer && (
                        <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600 fill-current shrink-0" />
                          <span>OFFER</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate mt-1">{p.name}</h4>
                    <div className="text-[11px] text-slate-500 font-medium">Pack: {p.packSize || 'Standard'} • {p.piecesPerCase} pcs/case</div>

                    <div className="flex items-center space-x-3 mt-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px]">PTR </span>
                        <strong className={calc.effectivePtr < p.ptr ? "text-emerald-700 line-through text-[11px] mr-1" : "text-slate-900"}>
                          ₹{p.ptr}
                        </strong>
                        {calc.effectivePtr < p.ptr && (
                          <strong className="text-emerald-700 font-extrabold">₹{calc.effectivePtr}</strong>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">MRP </span>
                        <span className="text-slate-700 font-bold">₹{p.mrp}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600 font-bold text-[10px]">{p.ptrMargin}% margin</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Offer Details Box if product has special scheme */}
                {p.hasOffer && p.offerTitle && (
                  <div className="mt-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-2 text-xs">
                    <div className="font-extrabold text-amber-900 text-[11px] flex items-center space-x-1">
                      <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{p.offerTitle}</span>
                    </div>
                    {p.offerDetails && (
                      <p className="text-[10px] text-amber-800 font-medium mt-0.5 leading-tight">
                        {p.offerDetails}
                      </p>
                    )}
                  </div>
                )}

                {/* Applied Offer Highlight when order requirement is met */}
                {calc.appliedOfferTitle && (
                  <div className="mt-2 bg-emerald-500 text-white p-2 rounded-xl text-xs font-black flex items-center justify-between shadow-xs animate-pulse">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-100" />
                      <span className="truncate">{calc.appliedOfferTitle}</span>
                    </div>
                    {calc.appliedOfferBonusPieces > 0 && (
                      <span className="bg-white text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0">
                        +{calc.appliedOfferBonusPieces} FREE PCS
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Controls Section */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
                {/* CASE CONTROL */}
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex flex-col items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">CASE ({p.piecesPerCase} pcs)</span>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(p.id, 'case', -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90 shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty.caseQty === 0 ? '' : qty.caseQty}
                      placeholder="0"
                      onChange={(e) => handleSetQuantity(p.id, 'case', parseInt(e.target.value, 10) || 0)}
                      className="w-12 h-7 text-center font-extrabold text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(p.id, 'case', 1)}
                      className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 cursor-pointer active:scale-90 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PIECE CONTROL */}
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex flex-col items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">LOOSE PIECE</span>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(p.id, 'piece', -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-90 shrink-0"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={qty.pieceQty === 0 ? '' : qty.pieceQty}
                      placeholder="0"
                      onChange={(e) => handleSetQuantity(p.id, 'piece', parseInt(e.target.value, 10) || 0)}
                      className="w-12 h-7 text-center font-extrabold text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(p.id, 'piece', 1)}
                      className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 cursor-pointer active:scale-90 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {calc.totalPieces > 0 && (
                <div className="mt-2 text-right text-xs font-bold text-sky-700">
                  Subtotal: {calc.totalPieces} pcs = ₹{calc.lineTotal.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-14 lg:bottom-4 left-0 right-0 z-40 max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-[#0f2942] to-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300 font-medium">
                {cartItems.length} Products | {totals.totalCases} Cases, {totals.totalPieces} Loose
              </div>
              <div className="text-lg font-black text-white">
                Total: ₹{totals.grandTotal.toLocaleString('en-IN')}
              </div>
            </div>

            <button
              onClick={() => {
                if (!selectedPartyId) {
                  alert('Please select a retail store at the top before reviewing the order.');
                  return;
                }
                setIsReviewOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer flex items-center space-x-2 active:scale-95"
            >
              <span>REVIEW ORDER</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Custom / Manual Product Item Modal */}
      {isAddCustomOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-[#0f2942] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Add Custom Product Item</span>
              </h3>
              <button
                onClick={() => setIsAddCustomOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Special Dahi 1kg / Custom Item"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / PTR (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customPtr || ''}
                    onChange={(e) => setCustomPtr(Number(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customMrp || ''}
                    onChange={(e) => setCustomMrp(Number(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pack Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 500g / 1L / Box"
                    value={customPackSize}
                    onChange={(e) => setCustomPackSize(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pcs per Case</label>
                  <input
                    type="number"
                    min="1"
                    value={customPiecesPerCase || 1}
                    onChange={(e) => setCustomPiecesPerCase(Number(e.target.value) || 1)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="bg-sky-50/60 p-2 rounded-xl border border-sky-200">
                  <label className="block font-bold text-slate-700 mb-1">Cases Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={customCaseQty === 0 ? '' : customCaseQty}
                    placeholder="0"
                    onChange={(e) => setCustomCaseQty(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-center font-black text-sm"
                  />
                </div>
                <div className="bg-sky-50/60 p-2 rounded-xl border border-sky-200">
                  <label className="block font-bold text-slate-700 mb-1">Loose Pieces</label>
                  <input
                    type="number"
                    min="0"
                    value={customPieceQty === 0 ? '' : customPieceQty}
                    placeholder="0"
                    onChange={(e) => setCustomPieceQty(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-center font-black text-sm"
                  />
                </div>
              </div>

              {customName && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-right font-bold text-emerald-800">
                  Subtotal: ₹{calculateOrderLine(customPtr, customPiecesPerCase || 1, customCaseQty, customPieceQty).lineTotal}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item To Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Review Drawer Modal */}
      {isReviewOpen && selectedParty && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-[#0f2942] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Review & Save Order</h3>
                <p className="text-xs text-slate-300">
                  Shop: {selectedParty.shopName} ({selectedParty.shopNumber})
                </p>
              </div>
              <button onClick={() => setIsReviewOpen(false)} className="p-1 rounded-lg text-slate-300 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Items List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5">Cases</th>
                      <th className="p-2.5">Pieces</th>
                      <th className="p-2.5">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          {item.appliedOfferTitle && (
                            <div className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 mt-0.5 inline-flex items-center space-x-1">
                              <Gift className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>{item.appliedOfferTitle}</span>
                              {item.appliedOfferBonusPieces ? (
                                <span className="bg-amber-200 text-amber-900 px-1 rounded font-black text-[9px]">
                                  +{item.appliedOfferBonusPieces} Free Pcs
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">{item.caseQty}</td>
                        <td className="p-2.5">{item.pieceQty}</td>
                        <td className="p-2.5">₹{item.ptrAtOrder}</td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">₹{item.lineTotal}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => {
                              if (item.productId.startsWith('custom_')) {
                                setCustomItems((prev) => prev.filter((i) => i.productId !== item.productId));
                              } else {
                                setCartMap((prev) => {
                                  const copy = { ...prev };
                                  delete copy[item.productId];
                                  return copy;
                                });
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Delivery Status at Booking */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Delivery Status</span>
                  </label>
                  <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('PENDING')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        deliveryMode === 'PENDING'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending (Route Dispatch)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('DELIVERED')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        deliveryMode === 'DELIVERED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✓ Delivered (Spot Handover)
                    </button>
                  </div>
                </div>

                {deliveryMode === 'DELIVERED' && (
                  <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Crates/items will be recorded as delivered to the store immediately.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Deliver before 12 PM..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Totals Summary Box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totals.totalCases} cases, {totals.totalPieces} pieces):</span>
                  <span className="font-bold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-bold">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 text-base font-black pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-sky-700">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2 text-slate-600 font-bold text-xs hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer flex items-center space-x-2"
              >
                {isSaving ? (
                  <span>Saving Order...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>CONFIRM & CREATE ORDER</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Print PDF & WhatsApp Bill Options */}
      {savedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="font-black text-xl text-slate-900">Order Saved Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Order #{savedOrder.orderNumber} for <strong className="text-slate-800">{savedOrder.shopName}</strong>
              </p>
              <div className="text-2xl font-black text-sky-700 mt-2">
                ₹{savedOrder.grandTotal.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => generateInvoicePdf(savedOrder, settings)}
                className="w-full py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>DOWNLOAD TAX INVOICE (PDF)</span>
              </button>

              <a
                href={generateWhatsAppBillMessage(savedOrder, settings)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SEND BILL ON WHATSAPP</span>
              </a>
            </div>

            <button
              onClick={() => {
                setSavedOrder(null);
                setCartMap({});
                setCustomItems([]);
              }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer pt-2 border-t border-slate-100"
            >
              Done / Continue Next Order →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
