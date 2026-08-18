import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Store,
  MapPin,
  X,
  BarChart2,
  AlertCircle,
  UserCheck,
  Search,
  ShoppingCart,
  Save,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react';
import { Visit, Party, Route } from '../types';
import { calculateProductivity } from '../lib/calculations';

interface VisitsViewProps {
  visits: Visit[];
  parties: Party[];
  routes: Route[];
  onAddVisit: (visit: Omit<Visit, 'id' | 'createdAt'>) => Promise<Visit>;
  onNavigate: (view: string) => void;
  onSelectPartyForOrder?: (partyId: string) => void;
}

interface RouteShopState {
  visited: boolean;
  receiptReceived: boolean;
  orderReceived: boolean;
  noOrderReason: string;
  notes: string;
}

export const VisitsView: React.FC<VisitsViewProps> = ({
  visits,
  parties,
  routes,
  onAddVisit,
  onNavigate,
  onSelectPartyForOrder,
}) => {
  const [entryMode, setEntryMode] = useState<'INDIVIDUAL' | 'ROUTE_WISE'>('ROUTE_WISE');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || 'ALL');
  const [routeSearchQuery, setRouteSearchQuery] = useState('');

  // Individual Log Modal State
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || '');
  const [orderReceived, setOrderReceived] = useState<boolean>(false);
  const [noOrderReason, setNoOrderReason] = useState<any>('Stock Available');
  const [notes, setNotes] = useState('');

  // Route-wise Batch Form State: partyId -> RouteShopState
  const [batchStates, setBatchStates] = useState<Record<string, RouteShopState>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchSaveSuccess, setBatchSaveSuccess] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter((v) => v.date === todayStr);
  const productiveCount = todayVisits.filter((v) => v.orderReceived).length;
  const nonProductiveCount = todayVisits.filter((v) => !v.orderReceived).length;
  const productivityPercent = calculateProductivity(todayVisits.length, productiveCount);

  // Filter parties by selected route and search query
  const filteredRouteParties = useMemo(() => {
    return parties.filter((p) => {
      if (!p.active) return false;
      const matchRoute = selectedRouteId === 'ALL' || p.routeId === selectedRouteId || p.routeName === selectedRouteId;
      if (!matchRoute) return false;

      if (!routeSearchQuery.trim()) return true;
      const q = routeSearchQuery.toLowerCase();
      return (
        p.shopName.toLowerCase().includes(q) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.area && p.area.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q))
      );
    });
  }, [parties, selectedRouteId, routeSearchQuery]);

  // Helper to get or set shop state
  const getShopState = (partyId: string): RouteShopState => {
    if (batchStates[partyId]) return batchStates[partyId];
    const existingVisit = todayVisits.find((v) => v.partyId === partyId);
    const hasOrderToday = todayVisits.some((v) => v.partyId === partyId && v.orderReceived);
    return {
      visited: !!existingVisit || hasOrderToday,
      receiptReceived: false,
      orderReceived: existingVisit ? existingVisit.orderReceived : hasOrderToday,
      noOrderReason: existingVisit?.noOrderReason || 'Stock Available',
      notes: existingVisit?.notes || '',
    };
  };

  const updateShopState = (partyId: string, updates: Partial<RouteShopState>) => {
    setBatchStates((prev) => ({
      ...prev,
      [partyId]: {
        ...getShopState(partyId),
        ...updates,
      },
    }));
  };

  const handleTakeOrder = (partyId: string) => {
    if (onSelectPartyForOrder) {
      onSelectPartyForOrder(partyId);
    } else {
      onNavigate('quick-order');
    }
  };

  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const party = parties.find((p) => p.id === selectedPartyId);
    if (!party) return;

    try {
      const now = new Date();
      await onAddVisit({
        date: todayStr,
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        salespersonId: 'usr_sales1',
        salespersonName: 'Amit Sharma',
        partyId: party.id,
        partyName: party.shopName,
        routeId: party.routeId,
        routeName: party.routeName,
        orderReceived: orderReceived,
        noOrderReason: orderReceived ? undefined : noOrderReason,
        notes: notes,
      });

      setIsRecordOpen(false);
      if (orderReceived) {
        handleTakeOrder(party.id);
      }
    } catch (err) {
      alert('Failed to log visit.');
    }
  };

  const handleSaveRouteBatch = async () => {
    setIsSavingBatch(true);
    setBatchSaveSuccess(false);

    try {
      const now = new Date();
      const nowTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      for (const party of filteredRouteParties) {
        const state = getShopState(party.id);
        // Only save if shop was marked visited or has explicit changes
        if (state.visited || batchStates[party.id]) {
          await onAddVisit({
            date: todayStr,
            time: nowTime,
            salespersonId: 'usr_sales1',
            salespersonName: 'Amit Sharma',
            partyId: party.id,
            partyName: party.shopName,
            routeId: party.routeId,
            routeName: party.routeName,
            orderReceived: state.orderReceived,
            noOrderReason: state.orderReceived ? undefined : state.noOrderReason,
            notes: state.receiptReceived ? `Receipt Received. ${state.notes}` : state.notes,
          });
        }
      }

      setBatchSaveSuccess(true);
      setTimeout(() => setBatchSaveSuccess(false), 4000);
    } catch (err) {
      alert('Failed to save route visits.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Visit & Productivity Manager</h2>
          <p className="text-xs text-slate-500">Route-wise shop visit entry, productivity logs & instant order taking</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setEntryMode('ROUTE_WISE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              entryMode === 'ROUTE_WISE' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Route-Wise Entry
          </button>
          <button
            onClick={() => setEntryMode('INDIVIDUAL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              entryMode === 'INDIVIDUAL' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Individual Entry
          </button>
        </div>
      </div>

      {/* TODAY'S FIELD PRODUCTIVITY SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Visits Today</span>
          <span className="text-2xl font-black text-slate-900">{todayVisits.length} Shops</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Productive Visits</span>
          <span className="text-2xl font-black text-emerald-600">{productiveCount} Orders</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">No-Order Visits</span>
          <span className="text-2xl font-black text-amber-600">{nonProductiveCount} Shops</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Productivity Strike Rate</span>
          <span className="text-2xl font-black text-indigo-600">{productivityPercent}%</span>
        </div>
      </div>

      {/* MODE 1: ROUTE WISE ENTRY SHEET */}
      {entryMode === 'ROUTE_WISE' && (
        <div className="space-y-4">
          {/* Route Tabs & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-500 shrink-0">Select Route:</span>
                <button
                  onClick={() => setSelectedRouteId('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedRouteId === 'ALL'
                      ? 'bg-[#0f2942] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Routes ({parties.length})
                </button>
                {routes.map((r) => {
                  const rShops = parties.filter((p) => p.routeId === r.id || p.routeName === r.name).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRouteId(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        selectedRouteId === r.id
                          ? 'bg-[#0f2942] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r.name} ({rShops})
                    </button>
                  );
                })}
              </div>

              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search shop, owner, phone, area..."
                  value={routeSearchQuery}
                  onChange={(e) => setRouteSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Top Batch Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-600 font-semibold">
                Showing <strong className="text-slate-900">{filteredRouteParties.length}</strong> shops on route
              </span>

              <button
                onClick={handleSaveRouteBatch}
                disabled={isSavingBatch || filteredRouteParties.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingBatch ? 'Saving Visits...' : 'SAVE ROUTE VISITS'}</span>
              </button>
            </div>

            {batchSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>All route shop visits updated successfully!</span>
              </div>
            )}
          </div>

          {/* Route Shop Cards List */}
          <div className="space-y-3">
            {filteredRouteParties.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                No retailers found matching the route or search query.
              </div>
            ) : (
              filteredRouteParties.map((party) => {
                const shopState = getShopState(party.id);
                const hasOrderToday = todayVisits.some((v) => v.partyId === party.id && v.orderReceived);

                return (
                  <div
                    key={party.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all ${
                      shopState.visited
                        ? 'border-sky-300 bg-sky-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      {/* Shop Information Header */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-base">{party.shopName}</h4>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-extrabold text-[10px] rounded-md border border-slate-200">
                            {party.shopNumber}
                          </span>
                          {hasOrderToday && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200 flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Order Booked Today</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 space-x-2">
                          <span>Owner: <strong className="text-slate-700">{party.ownerName || 'N/A'}</strong></span>
                          <span>• Phone: <strong className="text-slate-700">{party.phone}</strong></span>
                          <span>• Route: <strong className="text-sky-700">{party.routeName}</strong></span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          <strong className="text-slate-700">Area:</strong> {party.area || 'N/A'} |{' '}
                          <strong className="text-slate-700">Full Address:</strong> {party.address}
                        </div>
                      </div>

                      {/* Immediate Take Order Action Button */}
                      <div className="shrink-0">
                        <button
                          onClick={() => handleTakeOrder(party.id)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>TAKE ORDER NOW</span>
                        </button>
                      </div>
                    </div>

                    {/* Visit Controls Form Row */}
                    <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-center">
                      {/* Shop Visited Toggle */}
                      <label className="flex items-center space-x-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={shopState.visited}
                          onChange={(e) => updateShopState(party.id, { visited: e.target.checked })}
                          className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                        />
                        <span className="font-bold text-slate-800">Shop Visited Today</span>
                      </label>

                      {/* Receipt Received Toggle */}
                      <label className="flex items-center space-x-2 cursor-pointer p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                          type="checkbox"
                          checked={shopState.receiptReceived}
                          onChange={(e) => updateShopState(party.id, { receiptReceived: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-800">Receipt Received</span>
                      </label>

                      {/* No-Order Reason Dropdown */}
                      {!hasOrderToday && !shopState.orderReceived ? (
                        <select
                          value={shopState.noOrderReason}
                          onChange={(e) => updateShopState(party.id, { noOrderReason: e.target.value })}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs"
                        >
                          <option value="Stock Available">Stock Available</option>
                          <option value="No Requirement">No Requirement</option>
                          <option value="Shop Closed">Shop Closed</option>
                          <option value="Owner Unavailable">Owner Unavailable</option>
                          <option value="Payment Issue">Payment Issue</option>
                          <option value="Price Issue">Price Issue</option>
                          <option value="Competitor">Competitor Brand</option>
                          <option value="Other">Other Reason</option>
                        </select>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-[11px] text-center">
                          Productive Order Visit
                        </div>
                      )}

                      {/* Notes Input */}
                      <input
                        type="text"
                        placeholder="Visit notes / remarks..."
                        value={shopState.notes}
                        onChange={(e) => updateShopState(party.id, { notes: e.target.value })}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODE 2: INDIVIDUAL VISIT LOG FEED */}
      {entryMode === 'INDIVIDUAL' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Individual Shop Visit History Log</h3>
            <button
              onClick={() => setIsRecordOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Log Single Visit</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            {visits.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                No shop visits logged yet. Click "+ Log Single Visit" or switch to Route-Wise Entry.
              </div>
            ) : (
              <div className="space-y-2.5">
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          v.orderReceived ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {v.orderReceived ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">{v.partyName}</div>
                        <div className="text-slate-500 mt-0.5">
                          Route: {v.routeName} • Executive: {v.salespersonName}
                        </div>
                        {v.notes && <div className="text-slate-400 italic mt-1 font-normal">"{v.notes}"</div>}
                      </div>
                    </div>

                    <div className="text-right flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 gap-2">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                          v.orderReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {v.orderReceived ? 'ORDER BOOKED' : `NO ORDER: ${v.noOrderReason || 'N/A'}`}
                      </span>

                      <button
                        onClick={() => handleTakeOrder(v.partyId)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg shadow-2xs cursor-pointer flex items-center space-x-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Take Order</span>
                      </button>

                      <span className="text-[10px] text-slate-400">{v.date} {v.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORD INDIVIDUAL VISIT MODAL */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordVisit}
            className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Retail Shop Visit</h3>
              <button
                type="button"
                onClick={() => setIsRecordOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Retail Shop *</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shopName} ({p.shopNumber}) - {p.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order Received?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderReceived(true)}
                    className={`py-2 px-3 rounded-xl font-bold border ${
                      orderReceived
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    YES (Order Taken)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderReceived(false)}
                    className={`py-2 px-3 rounded-xl font-bold border ${
                      !orderReceived
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    NO (No Order)
                  </button>
                </div>
              </div>

              {!orderReceived && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for No Order</label>
                  <select
                    value={noOrderReason}
                    onChange={(e) => setNoOrderReason(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Stock Available">Stock Available</option>
                    <option value="No Requirement">No Requirement</option>
                    <option value="Shop Closed">Shop Closed</option>
                    <option value="Owner Unavailable">Owner Unavailable</option>
                    <option value="Payment Issue">Pending Payment Issue</option>
                    <option value="Price Issue">Price Issue</option>
                    <option value="Competitor">Competitor Brand</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Next order expected on Thursday..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsRecordOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                LOG VISIT
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
