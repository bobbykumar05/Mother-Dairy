import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Store,
  MapPin,
  Phone,
  FileText,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Eye,
  Clock,
  Download,
  Upload,
} from 'lucide-react';
import { Party, Route, Order } from '../types';
import { generateSinglePartyPdf, generateRouteStoresPdf } from '../lib/pdf';
import { RetailerPdfImportModal } from './RetailerPdfImportModal';

interface PartiesViewProps {
  parties: Party[];
  routes: Route[];
  orders: Order[];
  onAddParty: (party: Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>) => Promise<Party>;
  onUpdateParty: (id: string, updates: Partial<Party>) => Promise<Party>;
  onDeleteParty: (id: string) => Promise<boolean>;
  onNavigate: (view: string) => void;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties,
  routes,
  orders,
  onAddParty,
  onUpdateParty,
  onDeleteParty,
  onNavigate,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [viewingParty, setViewingParty] = useState<Party | null>(null);
  const [deletingPartyId, setDeletingPartyId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    shopNumber: '',
    shopName: '',
    ownerName: '',
    phone: '',
    altPhone: '',
    address: '',
    landmark: '',
    routeId: routes[0]?.id || '',
    area: '',
    notes: '',
  });

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (!p.active) return false;
      const matchesSearch =
        p.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        p.shopNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.area.toLowerCase().includes(searchQuery.toLowerCase());

      const selectedRouteObj = routes.find((r) => r.id === selectedRouteFilter);
      const matchesRoute =
        selectedRouteFilter === 'ALL' ||
        p.routeId === selectedRouteFilter ||
        (selectedRouteObj && p.routeName === selectedRouteObj.name);
      return matchesSearch && matchesRoute;
    });
  }, [parties, searchQuery, selectedRouteFilter, routes]);

  const handleOpenAdd = () => {
    const initialRouteId =
      selectedRouteFilter !== 'ALL' && routes.some((r) => r.id === selectedRouteFilter)
        ? selectedRouteFilter
        : routes[0]?.id || '';

    setFormData({
      shopNumber: `SH-${100 + parties.length + 1}`,
      shopName: '',
      ownerName: '',
      phone: '',
      altPhone: '',
      address: '',
      landmark: '',
      routeId: initialRouteId,
      area: '',
      notes: '',
    });
    setIsAddOpen(true);
  };

  const handleStartEdit = (party: Party) => {
    setEditingParty(party);
    setFormData({
      shopNumber: party.shopNumber,
      shopName: party.shopName,
      ownerName: party.ownerName,
      phone: party.phone,
      altPhone: party.altPhone || '',
      address: party.address,
      landmark: party.landmark || '',
      routeId: party.routeId || routes.find(r => r.name === party.routeName)?.id || routes[0]?.id || '',
      area: party.area,
      notes: party.notes || '',
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.routeId) {
      alert('Please select a delivery route for this retailer.');
      return;
    }

    const routeObj = routes.find((r) => r.id === formData.routeId) || routes[0];

    const partyPayload = {
      ...formData,
      routeId: routeObj?.id || formData.routeId,
      routeName: routeObj?.name || 'General Route',
      active: true,
    };

    try {
      if (editingParty) {
        await onUpdateParty(editingParty.id, partyPayload);
        setEditingParty(null);
      } else {
        await onAddParty(partyPayload);
        setIsAddOpen(false);
      }
    } catch (err) {
      alert('Failed to save party details.');
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await onDeleteParty(id);
      setDeletingPartyId(null);
    } catch (err) {
      alert('Failed to delete party.');
    }
  };

  const handleExportRoutePdf = () => {
    if (selectedRouteFilter === 'ALL') {
      const selectedRoute = routes[0];
      if (selectedRoute) generateRouteStoresPdf(selectedRoute, parties);
    } else {
      const selectedRoute = routes.find((r) => r.id === selectedRouteFilter);
      if (selectedRoute) generateRouteStoresPdf(selectedRoute, parties);
    }
  };

  const handleBatchImportParties = async (
    retailers: Array<Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>>,
    targetRoute: Route
  ) => {
    let successCount = 0;
    let failCount = 0;
    for (const retailer of retailers) {
      try {
        await onAddParty(retailer);
        successCount++;
      } catch (err) {
        console.error('Failed to create retailer during batch import:', err);
        failCount++;
      }
    }
    return { successCount, failCount };
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Retail Shop & Party Master</h2>
          <p className="text-xs text-slate-500">Manage all registered customer shops, addresses & route assignments</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPdfImportOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 transition-all"
            title="Upload Route PDF to auto-extract & bulk create stores"
          >
            <Upload className="w-4 h-4" />
            <span>Import from PDF</span>
          </button>

          <button
            onClick={handleExportRoutePdf}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Route PDF</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Retailer</span>
          </button>
        </div>
      </div>

      {/* SEARCH & ROUTE FILTER BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shop name, owner, phone, shop number, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedRouteFilter}
            onChange={(e) => setSelectedRouteFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Routes ({parties.filter((p) => p.active).length} Shops)</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.day})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PARTIES CARDS / GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredParties.map((party) => {
          const partyOrders = orders.filter((o) => o.partyId === party.id);

          return (
            <div
              key={party.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 hover:border-sky-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {party.routeName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setViewingParty(party)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 cursor-pointer"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(party)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPartyId(party.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2">{party.shopName}</h3>
                <div className="text-xs text-slate-600 font-medium mt-0.5">Owner: {party.ownerName || 'N/A'}</div>

                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{party.phone} {party.altPhone ? ` / ${party.altPhone}` : ''}</span>
                  </div>
                  <div className="flex items-start space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{party.address} ({party.area})</span>
                  </div>
                </div>
              </div>

              {/* Stats Footer & Quick Order */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">LIFETIME SALES</div>
                  <div className="font-black text-slate-900">₹{party.lifetimeValue.toLocaleString('en-IN')}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => generateSinglePartyPdf(party, partyOrders)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    title="Export Party PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onNavigate('quick-order')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                  >
                    + Take Order
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT PARTY MODAL */}
      {(isAddOpen || editingParty) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveForm}
            className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 bg-[#0f2942] text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingParty ? `Edit Retailer ${editingParty.shopName}` : 'Add New Retail Store'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingParty(null);
                }}
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Delivery Route Beat Selection */}
              <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 space-y-1.5">
                <label className="block font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-sky-900">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Assigned Delivery Route / Beat *</span>
                  </span>
                  <span className="text-[10px] text-sky-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-sky-200 shadow-2xs">
                    Route Assignment
                  </span>
                </label>
                <select
                  required
                  value={formData.routeId}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  className="w-full p-2.5 bg-white border border-sky-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer shadow-2xs text-xs"
                >
                  <option value="" disabled>
                    -- Select Route Beat --
                  </option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.day})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-sky-700/90 font-medium">
                  Retailer will be allocated strictly to this beat for orders, visits & delivery schedules.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maa Durga General Store"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="10 digit phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alt Phone</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    placeholder="e.g. Morabadi Chowk"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Shop Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Complete street address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingParty(null);
                }}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                SAVE RETAILER
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW PARTY PROFILE MODAL */}
      {viewingParty && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{viewingParty.shopName}</h3>
              </div>
              <button onClick={() => setViewingParty(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-700">
              <div><strong>Owner:</strong> {viewingParty.ownerName || 'N/A'}</div>
              <div><strong>Phone:</strong> {viewingParty.phone} {viewingParty.altPhone ? ` / ${viewingParty.altPhone}` : ''}</div>
              <div><strong>Route:</strong> {viewingParty.routeName}</div>
              <div><strong>Area:</strong> {viewingParty.area || 'N/A'}</div>
              <div><strong>Full Address:</strong> {viewingParty.address}</div>
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-slate-900">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">LIFETIME ORDERS</div>
                  <div className="text-lg font-black">{viewingParty.lifetimeOrders} Orders</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">LIFETIME VALUE</div>
                  <div className="text-lg font-black text-sky-700">₹{viewingParty.lifetimeValue.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => {
                  const partyOrders = orders.filter((o) => o.partyId === viewingParty.id);
                  generateSinglePartyPdf(viewingParty, partyOrders);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Export Profile PDF</span>
              </button>

              <button
                onClick={() => setViewingParty(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingPartyId && (() => {
        const deletingParty = parties.find((p) => p.id === deletingPartyId);
        const partyOrdersCount = orders.filter((o) => o.partyId === deletingPartyId).length;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-5 text-center shadow-2xl border border-slate-200 space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-lg">Delete Store & Associated Data?</h3>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {deletingParty?.shopName || 'Selected Store'}
                </p>
                {deletingParty?.ownerName && (
                  <p className="text-xs text-slate-500">Owner: {deletingParty.ownerName}</p>
                )}
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left text-xs text-rose-900 space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5 text-rose-800">
                  <span>⚠️ Permanent Data Deletion Warning</span>
                </div>
                <p className="leading-relaxed">
                  Deleting this store will permanently erase the shop profile and <strong>all associated data</strong>:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-rose-800 pl-1 font-medium">
                  <li><strong>{partyOrdersCount}</strong> Associated Order{partyOrdersCount === 1 ? '' : 's'} & bills</li>
                  <li>All past shop visits & audit history</li>
                  <li>All payment records & balance history</li>
                  <li>All metrics from repeat volume & sales analytics</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingPartyId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(deletingPartyId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Store & All Data</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PDF RETAILER IMPORT MODAL */}
      <RetailerPdfImportModal
        isOpen={isPdfImportOpen}
        onClose={() => setIsPdfImportOpen(false)}
        routes={routes}
        existingParties={parties}
        initialRouteId={selectedRouteFilter !== 'ALL' ? selectedRouteFilter : undefined}
        onImportRetailers={handleBatchImportParties}
      />
    </div>
  );
};
