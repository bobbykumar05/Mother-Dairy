import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Store,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Edit2,
  X,
  IndianRupee,
  ChevronRight,
  TrendingUp,
  Download,
  Upload,
} from 'lucide-react';
import { Route, Party, Order, Visit } from '../types';
import { generateRouteStoresPdf } from '../lib/pdf';
import { calculateProductivity } from '../lib/calculations';
import { RetailerPdfImportModal } from './RetailerPdfImportModal';

interface RoutesViewProps {
  routes: Route[];
  parties: Party[];
  orders: Order[];
  visits: Visit[];
  onAddRoute: (name: string, day: string) => Promise<Route>;
  onUpdateRoute: (id: string, updates: Partial<Route>) => Promise<Route>;
  onAddParty?: (party: Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>) => Promise<Party>;
  onNavigate: (view: string) => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({
  routes,
  parties,
  orders,
  visits,
  onAddRoute,
  onUpdateRoute,
  onAddParty,
  onNavigate,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [routeNameInput, setRouteNameInput] = useState('');
  const [routeDayInput, setRouteDayInput] = useState('Monday');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeNameInput) return;

    try {
      if (editingRoute) {
        await onUpdateRoute(editingRoute.id, { name: routeNameInput, day: routeDayInput });
        setEditingRoute(null);
      } else {
        const created = await onAddRoute(routeNameInput, routeDayInput);
        setSelectedRouteId(created.id);
        setIsAddOpen(false);
      }
      setRouteNameInput('');
    } catch (err) {
      alert('Failed to save route');
    }
  };

  const handleStartEdit = (route: Route) => {
    setEditingRoute(route);
    setRouteNameInput(route.name);
    setRouteDayInput(route.day);
  };

  // Route specific analytics
  const routeParties = parties.filter((p) => p.active && (p.routeId === selectedRoute?.id || p.routeName === selectedRoute?.name));
  const routeOrders = orders.filter((o) => o.routeId === selectedRoute?.id || o.routeName === selectedRoute?.name);
  const routeVisits = visits.filter((v) => v.routeId === selectedRoute?.id || v.routeName === selectedRoute?.name);
  const productiveRouteVisits = routeVisits.filter((v) => v.orderReceived);

  const routeRevenue = routeOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const routeProductivity = calculateProductivity(routeVisits.length, productiveRouteVisits.length);

  const handleBatchImportParties = async (
    retailers: Array<Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>>,
    targetRoute: Route
  ) => {
    let successCount = 0;
    let failCount = 0;
    if (onAddParty) {
      for (const retailer of retailers) {
        try {
          await onAddParty(retailer);
          successCount++;
        } catch (err) {
          console.error('Failed to create retailer during batch import:', err);
          failCount++;
        }
      }
    }
    return { successCount, failCount };
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Custom Route Manager</h2>
          <p className="text-xs text-slate-500">Configure weekly field beats, assign retailers & analyze beat productivity</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPdfImportOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 transition-all"
            title="Import retailers directly from Route PDF"
          >
            <Upload className="w-4 h-4" />
            <span>Import Beat PDF</span>
          </button>

          <button
            onClick={() => {
              setRouteNameInput('');
              setRouteDayInput('Monday');
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Route</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL ROUTE CHIPS / DAYS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {routes.map((r) => {
          const isSelected = selectedRouteId === r.id;
          const assignedCount = parties.filter((p) => p.active && (p.routeId === r.id || p.routeName === r.name)).length;

          return (
            <button
              key={r.id}
              onClick={() => setSelectedRouteId(r.id)}
              className={`p-3 rounded-2xl border text-left transition-all shrink-0 cursor-pointer min-w-[140px] ${
                isSelected
                  ? 'bg-[#0f2942] text-white border-slate-800 shadow-md ring-2 ring-sky-400'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase ${isSelected ? 'text-sky-300' : 'text-slate-400'}`}>
                  {r.day}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-sky-500/30 text-sky-200' : 'bg-slate-100 text-slate-600'}`}>
                  {assignedCount} Shops
                </span>
              </div>
              <div className="font-bold text-sm mt-1 truncate">{r.name}</div>
            </button>
          );
        })}
      </div>

      {/* SELECTED ROUTE DETAILS & ANALYTICS */}
      {selectedRoute && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-[#0f2942] text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>Scheduled Day: {selectedRoute.day}</span>
              </div>
              <h3 className="text-2xl font-black text-white mt-1">{selectedRoute.name} Route Details</h3>
              <p className="text-xs text-slate-300 mt-1">
                {routeParties.length} retail stores assigned on this beat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPdfImportOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 transition-all"
                title={`Import PDF stores directly into ${selectedRoute.name}`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import PDF Stores</span>
              </button>

              <button
                onClick={() => handleStartEdit(selectedRoute)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 cursor-pointer flex items-center space-x-1"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Route Name</span>
              </button>

              <button
                onClick={() => generateRouteStoresPdf(selectedRoute, parties)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export Beat PDF</span>
              </button>
            </div>
          </div>

          {/* Route Performance Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block">Total Beat Shops</span>
              <span className="text-2xl font-black text-slate-900">{routeParties.length}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block">Visited Logged</span>
              <span className="text-2xl font-black text-sky-700">{routeVisits.length}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block">Productivity %</span>
              <span className="text-2xl font-black text-indigo-600">{routeProductivity}%</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold block">Total Beat Revenue</span>
              <span className="text-2xl font-black text-emerald-600">₹{routeRevenue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Assigned Stores Master List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Store className="w-4 h-4 text-sky-600" />
                <span>Assigned Retailers on {selectedRoute.name} ({routeParties.length})</span>
              </h4>

              <button
                onClick={() => onNavigate('parties')}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                + Add / Move Retailer
              </button>
            </div>

            {routeParties.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                No shops assigned to this route yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {routeParties.map((party, idx) => (
                  <div
                    key={party.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{party.shopName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                          {party.shopNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Owner: {party.ownerName} • Tel: {party.phone}
                      </div>
                      <div className="text-[11px] text-slate-400">{party.address}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">
                        ₹{party.lifetimeValue.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">{party.lifetimeOrders} Orders</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROUTE MODAL */}
      {(isAddOpen || editingRoute) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRoute}
            className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                {editingRoute ? 'Edit Route Details' : 'Create New Beat Route'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRoute(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Route Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morabadi or Main Road Market"
                  value={routeNameInput}
                  onChange={(e) => setRouteNameInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheduled Beat Day</label>
                <select
                  value={routeDayInput}
                  onChange={(e) => setRouteDayInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRoute(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                SAVE ROUTE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PDF RETAILER IMPORT MODAL */}
      <RetailerPdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        routes={routes}
        existingParties={parties}
        initialRouteId={selectedRouteId}
        onImportRetailers={handleBatchImportParties}
      />
    </div>
  );
};
