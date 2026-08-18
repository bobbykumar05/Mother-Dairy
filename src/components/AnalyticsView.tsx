import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  PieChart as PieIcon,
  Store,
  MapPin,
  Calendar,
  Repeat,
  PackageCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Order, Party, Route, Product } from '../types';

interface AnalyticsViewProps {
  orders: Order[];
  parties: Party[];
  routes: Route[];
  products: Product[];
  onClearAllData?: () => void;
}

const CATEGORY_COLORS = ['#0284c7', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0284c7', '#0d9488', '#e11d48'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  orders,
  parties,
  routes,
  products,
  onClearAllData,
}) => {
  // Main Analytics View Mode
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REPEAT_VOLUME'>('REPEAT_VOLUME');

  // Overview Filters
  const [timeRange, setTimeRange] = useState<'30days' | '7days' | 'today' | 'all'>('30days');
  const [topPartyMetric, setTopPartyMetric] = useState<'revenue' | 'cases' | 'orders'>('revenue');

  // Repeat Orders & Purchase Volume Filters
  const [volumeFilterRange, setVolumeFilterRange] = useState<'today' | 'this_week' | 'this_month' | 'last_month' | 'all'>('this_month');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rankingMode, setRankingMode] = useState<'repeat' | 'volume' | 'value' | 'frequency' | 'increasing' | 'declining'>('repeat');
  const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null);

  // Helper date filters
  const filterOrdersByDate = (orderList: Order[], rangeKey: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return orderList.filter((o) => {
      if (rangeKey === 'today') return o.date === todayStr;
      if (rangeKey === '7days' || rangeKey === 'this_week') {
        const d = new Date(o.date);
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (rangeKey === '30days' || rangeKey === 'this_month') {
        const d = new Date(o.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (rangeKey === 'last_month') {
        const d = new Date(o.date);
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === year;
      }
      return true; // 'all'
    });
  };

  // Filtered orders for Overview
  const overviewOrders = useMemo(() => filterOrdersByDate(orders, timeRange), [orders, timeRange]);

  // Category Revenue Donut Chart Data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    overviewOrders.forEach((o) => {
      o.items.forEach((item) => {
        const cat = item.category || 'DAIRY';
        map[cat] = (map[cat] || 0) + item.lineTotal;
      });
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [overviewOrders]);

  // Route Performance Comparison Bar Chart Data
  const routeData = useMemo(() => {
    return routes.map((r) => {
      const routeOrders = overviewOrders.filter((o) => o.routeId === r.id || o.routeName === r.name);
      const rev = routeOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      return {
        name: r.name,
        Revenue: Math.round(rev),
        Orders: routeOrders.length,
      };
    });
  }, [routes, overviewOrders]);

  // Top Parties Leaderboard for Overview
  const topParties = useMemo(() => {
    const map: Record<string, { partyId: string; shopName: string; revenue: number; cases: number; ordersCount: number }> = {};
    overviewOrders.forEach((o) => {
      if (!map[o.partyId]) {
        map[o.partyId] = { partyId: o.partyId, shopName: o.shopName, revenue: 0, cases: 0, ordersCount: 0 };
      }
      map[o.partyId].revenue += o.grandTotal;
      map[o.partyId].cases += o.totalCases;
      map[o.partyId].ordersCount += 1;
    });

    const list = Object.values(map);
    if (topPartyMetric === 'revenue') {
      return list.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    } else if (topPartyMetric === 'cases') {
      return list.sort((a, b) => b.cases - a.cases).slice(0, 5);
    } else {
      return list.sort((a, b) => b.ordersCount - a.ordersCount).slice(0, 5);
    }
  }, [overviewOrders, topPartyMetric]);

  // -------------------------------------------------------------
  // REPEAT ORDERS & CLIENT PURCHASE VOLUME CALCULATIONS
  // -------------------------------------------------------------
  const filteredVolumeOrders = useMemo(() => {
    let list = filterOrdersByDate(orders, volumeFilterRange);

    if (selectedRouteFilter !== 'ALL') {
      list = list.filter((o) => o.routeId === selectedRouteFilter || o.routeName === selectedRouteFilter);
    }
    if (selectedPartyFilter !== 'ALL') {
      list = list.filter((o) => o.partyId === selectedPartyFilter);
    }
    if (selectedCategoryFilter !== 'ALL') {
      list = list.filter((o) => o.items.some((i) => (i.category || 'DAIRY') === selectedCategoryFilter));
    }

    return list;
  }, [orders, volumeFilterRange, selectedRouteFilter, selectedPartyFilter, selectedCategoryFilter]);

  // Comprehensive Client Analysis List
  const clientPurchaseAnalytics = useMemo(() => {
    const activeParties = parties.filter((p) => p.active !== false);
    return activeParties.map((party) => {
      const partyOrders = filteredVolumeOrders.filter((o) => o.partyId === party.id);
      const totalOrders = partyOrders.length;
      const repeatOrders = Math.max(0, totalOrders - 1);
      const totalPurchaseValue = partyOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const totalCases = partyOrders.reduce((sum, o) => sum + o.totalCases, 0);
      const totalPieces = partyOrders.reduce((sum, o) => sum + o.totalPieces, 0);

      // Product Breakdown
      const productMap: Record<string, { name: string; cases: number; pieces: number; totalUnits: number; revenue: number }> = {};
      let totalUnits = 0;

      partyOrders.forEach((o) => {
        o.items.forEach((item) => {
          if (selectedCategoryFilter !== 'ALL' && (item.category || 'DAIRY') !== selectedCategoryFilter) return;

          const units = item.caseQty * item.piecesPerCase + item.pieceQty;
          totalUnits += units;

          if (!productMap[item.productName]) {
            productMap[item.productName] = { name: item.productName, cases: 0, pieces: 0, totalUnits: 0, revenue: 0 };
          }
          productMap[item.productName].cases += item.caseQty;
          productMap[item.productName].pieces += item.pieceQty;
          productMap[item.productName].totalUnits += units;
          productMap[item.productName].revenue += item.lineTotal;
        });
      });

      const productList = Object.values(productMap).sort((a, b) => b.totalUnits - a.totalUnits);
      const mostPurchasedProduct = productList[0]?.name || 'N/A';

      // Date calculations
      const dates = partyOrders.map((o) => new Date(o.date).getTime()).sort((a, b) => a - b);
      const lastOrderDate = dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString().split('T')[0] : 'No orders';
      const firstOrderDate = dates.length > 0 ? new Date(dates[0]).toISOString().split('T')[0] : 'N/A';

      let frequencyDays = 0;
      if (dates.length > 1) {
        const diffDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
        frequencyDays = Math.round(diffDays / (dates.length - 1));
      }

      // Period Growth / Decline Comparison (Comparing with all historical orders)
      const allPartyOrders = orders.filter((o) => o.partyId === party.id);
      const currentPeriodRev = totalPurchaseValue;
      const avgHistRev = allPartyOrders.length > 0 ? (allPartyOrders.reduce((s, o) => s + o.grandTotal, 0) / allPartyOrders.length) * totalOrders : 0;
      const growthPercent = avgHistRev > 0 ? Math.round(((currentPeriodRev - avgHistRev) / avgHistRev) * 100) : 0;

      return {
        party,
        totalOrders,
        repeatOrders,
        totalPurchaseValue,
        totalCases,
        totalPieces,
        totalUnits,
        avgOrderUnits: totalOrders > 0 ? Math.round(totalUnits / totalOrders) : 0,
        avgOrderValue: totalOrders > 0 ? Math.round(totalPurchaseValue / totalOrders) : 0,
        lastOrderDate,
        firstOrderDate,
        frequencyDays,
        mostPurchasedProduct,
        productList,
        growthPercent,
      };
    });
  }, [parties, filteredVolumeOrders, orders, selectedCategoryFilter]);

  // Search and Ranking Sort
  const rankedClientList = useMemo(() => {
    let list = clientPurchaseAnalytics;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.party.shopName.toLowerCase().includes(q) ||
          (item.party.ownerName && item.party.ownerName.toLowerCase().includes(q)) ||
          (item.party.area && item.party.area.toLowerCase().includes(q)) ||
          item.party.routeName.toLowerCase().includes(q)
      );
    }

    if (rankingMode === 'repeat') {
      return list.sort((a, b) => b.repeatOrders - a.repeatOrders || b.totalPurchaseValue - a.totalPurchaseValue);
    } else if (rankingMode === 'volume') {
      return list.sort((a, b) => b.totalUnits - a.totalUnits);
    } else if (rankingMode === 'value') {
      return list.sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue);
    } else if (rankingMode === 'frequency') {
      return list.sort((a, b) => b.totalOrders - a.totalOrders);
    } else if (rankingMode === 'increasing') {
      return list.sort((a, b) => b.growthPercent - a.growthPercent);
    } else {
      return list.sort((a, b) => a.growthPercent - b.growthPercent);
    }
  }, [clientPurchaseAnalytics, searchQuery, rankingMode]);

  // Overall Repeat Statistics Summary
  const overallStats = useMemo(() => {
    const totalClientsWithOrders = clientPurchaseAnalytics.filter((c) => c.totalOrders > 0).length;
    const repeatClients = clientPurchaseAnalytics.filter((c) => c.repeatOrders > 0).length;
    const repeatRate = totalClientsWithOrders > 0 ? Math.round((repeatClients / totalClientsWithOrders) * 100) : 0;
    const totalVolumeUnits = clientPurchaseAnalytics.reduce((s, c) => s + c.totalUnits, 0);
    const totalVolumeValue = clientPurchaseAnalytics.reduce((s, c) => s + c.totalPurchaseValue, 0);

    return {
      totalClientsWithOrders,
      repeatClients,
      repeatRate,
      totalVolumeUnits,
      totalVolumeValue,
    };
  }, [clientPurchaseAnalytics]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Analytics & Retailer Intelligence</h2>
          <p className="text-xs text-slate-500">Track client purchase volume, repeat ordering frequency & beat sales</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab('REPEAT_VOLUME')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'REPEAT_VOLUME'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Repeat Orders & Volume</span>
            </button>
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Distribution Charts</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: REPEAT ORDERS & CLIENT PURCHASE VOLUME */}
      {activeTab === 'REPEAT_VOLUME' && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold block">Repeat Customer Rate</span>
              <div className="text-2xl font-black text-emerald-600">{overallStats.repeatRate}%</div>
              <span className="text-[11px] text-slate-400 font-medium">
                {overallStats.repeatClients} of {overallStats.totalClientsWithOrders} ordering clients repeat
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold block">Total Volume Sold</span>
              <div className="text-2xl font-black text-sky-700">{overallStats.totalVolumeUnits.toLocaleString('en-IN')} Pcs</div>
              <span className="text-[11px] text-slate-400 font-medium">Cases & loose pieces combined</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold block">Total Client Billing</span>
              <div className="text-2xl font-black text-slate-900">₹{overallStats.totalVolumeValue.toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-slate-400 font-medium">Across selected filters</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold block">Active Retailers</span>
              <div className="text-2xl font-black text-indigo-600">{overallStats.totalClientsWithOrders} Shops</div>
              <span className="text-[11px] text-slate-400 font-medium">With orders in selected range</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search shop name, owner name, area, route..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* Date Filter */}
                <select
                  value={volumeFilterRange}
                  onChange={(e) => setVolumeFilterRange(e.target.value as any)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="all">All Time History</option>
                </select>

                {/* Route Filter */}
                <select
                  value={selectedRouteFilter}
                  onChange={(e) => setSelectedRouteFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="ALL">All Routes</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                {/* Retailer Filter */}
                <select
                  value={selectedPartyFilter}
                  onChange={(e) => setSelectedPartyFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="ALL">All Retailers</option>
                  {parties
                    .filter((p) => p.active !== false)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.shopName}
                      </option>
                    ))}
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="ALL">All Categories</option>
                  <option value="MILK">Milk</option>
                  <option value="CURD_DAHI">Curd & Dahi</option>
                  <option value="PANEER_BUTTER">Paneer & Butter</option>
                  <option value="BEVERAGES">Beverages & Lassi</option>
                  <option value="ICE_CREAM">Ice Cream</option>
                  <option value="GHEE_SWEETS">Ghee & Sweets</option>
                </select>
              </div>
            </div>

            {/* Ranking Selector Pills */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs font-bold">
              <span className="text-slate-500 shrink-0">Rank Clients By:</span>
              {(
                [
                  { id: 'repeat', label: 'Top Repeat Customers' },
                  { id: 'volume', label: 'Highest Purchase Volume' },
                  { id: 'value', label: 'Highest Purchase Value (₹)' },
                  { id: 'frequency', label: 'Most Frequent Orders' },
                  { id: 'increasing', label: 'Increasing Orders ↑' },
                  { id: 'declining', label: 'Declining Orders ↓' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setRankingMode(mode.id)}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer ${
                    rankingMode === mode.id
                      ? 'bg-[#0f2942] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client Analysis Cards List */}
          <div className="space-y-3">
            {rankedClientList.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                No retailer purchase data found matching the current filters.
              </div>
            ) : (
              rankedClientList.map((client, idx) => {
                const isExpanded = expandedPartyId === client.party.id;

                return (
                  <div
                    key={client.party.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedPartyId(isExpanded ? null : client.party.id)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80"
                    >
                      {/* Left Title & Retailer Details */}
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-extrabold text-slate-900 text-base">{client.party.shopName}</h4>
                            <span className="text-xs font-bold text-slate-500">({client.party.shopNumber})</span>
                            {client.repeatOrders > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full border border-emerald-200 flex items-center space-x-1">
                                <Repeat className="w-3 h-3" />
                                <span>{client.repeatOrders} Repeat Orders</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 mt-1 space-x-2">
                            <span>Owner: <strong className="text-slate-700">{client.party.ownerName || 'N/A'}</strong></span>
                            <span>• Route: <strong className="text-sky-700">{client.party.routeName}</strong></span>
                            <span>• Area: <strong className="text-slate-700">{client.party.area || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right Metrics Grid */}
                      <div className="flex items-center justify-between md:justify-end gap-4 text-xs shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-slate-400 font-medium block text-[10px]">Total Purchase Value</span>
                          <span className="font-black text-slate-900 text-base">₹{client.totalPurchaseValue.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 font-medium block text-[10px]">Volume Units</span>
                          <span className="font-extrabold text-sky-700 text-sm">{client.totalUnits.toLocaleString('en-IN')} pcs</span>
                        </div>

                        <div className="text-right">
                          <span className="text-slate-400 font-medium block text-[10px]">Last Order</span>
                          <span className="font-bold text-slate-700 text-xs">{client.lastOrderDate}</span>
                        </div>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Expandable Breakdown */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-slate-500 font-semibold block text-[11px]">Total Orders Booked</span>
                            <span className="font-black text-slate-900 text-sm">{client.totalOrders} Orders</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block text-[11px]">Average Order Size</span>
                            <span className="font-black text-slate-900 text-sm">{client.avgOrderUnits} units (₹{client.avgOrderValue})</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block text-[11px]">Order Frequency</span>
                            <span className="font-black text-slate-900 text-sm">
                              {client.frequencyDays > 0 ? `Every ${client.frequencyDays} days` : 'Single order'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block text-[11px]">Top Favorite Product</span>
                            <span className="font-black text-emerald-700 text-sm">{client.mostPurchasedProduct}</span>
                          </div>
                        </div>

                        {/* Product-wise Purchase Table */}
                        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                          <div className="p-2.5 bg-slate-100 font-bold text-slate-700 text-xs border-b border-slate-200 flex items-center justify-between">
                            <span>PRODUCT-WISE PURCHASE BREAKDOWN</span>
                            <span>{client.productList.length} Items Purchased</span>
                          </div>
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold">
                              <tr>
                                <th className="p-2">Product Name</th>
                                <th className="p-2 text-center">Cases</th>
                                <th className="p-2 text-center">Loose Pcs</th>
                                <th className="p-2 text-center">Total Units</th>
                                <th className="p-2 text-right">Total Billing (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {client.productList.map((prod) => (
                                <tr key={prod.name} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-slate-800">{prod.name}</td>
                                  <td className="p-2 text-center">{prod.cases}</td>
                                  <td className="p-2 text-center">{prod.pieces}</td>
                                  <td className="p-2 text-center font-bold text-sky-700">{prod.totalUnits}</td>
                                  <td className="p-2 text-right font-black text-slate-900">₹{prod.revenue.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW & ROUTE CHARTS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROUTE COMPARISON CHART */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Route-wise Revenue Comparison</span>
                </h3>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Revenue']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="Revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CATEGORY DONUT CHART */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <PieIcon className="w-4 h-4 text-emerald-600" />
                  <span>Category Revenue Contribution</span>
                </h3>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TOP PARTIES RANKING LEADERBOARD */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Top Retailers Leaderboard</span>
              </h3>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500">Rank by:</span>
                {(['revenue', 'cases', 'orders'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTopPartyMetric(m)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                      topPartyMetric === m ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {topParties.map((tp, idx) => (
                <div
                  key={tp.partyId}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-900'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{tp.shopName}</div>
                      <div className="text-[11px] text-slate-500">
                        {tp.ordersCount} Total Orders • {tp.cases} Total Cases Booked
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-black text-slate-900 text-base">
                    ₹{tp.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
