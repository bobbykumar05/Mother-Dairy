import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Store,
  MapPin,
  Package,
  Clock,
  BarChart3,
  Settings as SettingsIcon,
  UserCheck,
  PlusCircle,
  Menu,
  X,
  CalendarCheck,
  Wallet,
  User as UserIcon,
  LogOut,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { UserRole, AppSettings, User } from '../types';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  user?: User | null;
  setUser?: (user: User) => void;
  settings?: AppSettings;
  onLogout?: () => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  setCurrentView,
  user,
  setUser,
  settings,
  onLogout,
  onRefresh,
  isRefreshing = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    highlight?: boolean;
    adminOnly?: boolean;
  }

  const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quick-order', label: 'New Order', icon: PlusCircle, highlight: true },
    { id: 'today-orders', label: "Today's Orders", icon: ShoppingCart },
    { id: 'orders', label: 'Order History', icon: ClipboardList },
    { id: 'payments', label: 'Deliveries & Payments', icon: Truck },
    { id: 'parties', label: 'All Stores', icon: Store },
    { id: 'routes', label: 'Route Manager', icon: MapPin },
    { id: 'products', label: 'Product Master', icon: Package },
    { id: 'visits', label: 'Visits & Productivity', icon: Clock },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'personal-management', label: 'Personal Management', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: SettingsIcon },
  ];

  // Role display label
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : user?.role === 'MANAGER' ? 'Manager' : 'Sales';
  const userDisplayName = user?.name || 'User';

  const handleToggleRole = () => {
    if (!user || !setUser) return;
    const newRole: UserRole = user.role === 'ADMIN' ? 'SALES' : 'ADMIN';
    setUser({
      ...user,
      role: newRole,
    });
  };

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f2942] text-white shadow-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-sky-200 transition-colors">
                  {settings?.businessName || 'Mother Dairy Sales'}
                </h1>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {settings?.distributorName || 'Authorized Distributor'} • Ranchi
              </p>
            </div>
          </div>

          {/* User Dynamic Account Profile, Refresh & Logout Section */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Live Real-Time Cloud Sync Indicator & Refresh Button */}
            {onRefresh && (
              <button
                id="header-sync-refresh-btn"
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                title="Sync and fetch latest server & store data immediately"
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-300' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Server'}</span>
              </button>
            )}

            <div
              className="hidden md:flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium shrink-0"
              title="Real-time synchronized across Web & Android App"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
              <span className="font-semibold">Live</span>
            </div>

            {user && (
              <div
                id="header-user-profile-badge"
                className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700/80 hover:border-slate-600/80 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-lg shadow-xs transition-colors shrink-0 max-w-[120px] sm:max-w-[170px]"
              >
                <div className="w-5 h-5 rounded bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-[11px] shadow-2xs shrink-0">
                  {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex items-center space-x-1 min-w-0">
                  <span
                    className="font-medium text-white text-xs truncate"
                    title={user.name}
                  >
                    {user.name || userDisplayName}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title={`${roleLabel} • Online`}></span>
                </div>
              </div>
            )}

            {onLogout && (
              <button
                id="header-logout-btn"
                onClick={onLogout}
                title="Log Out"
                aria-label="Log Out"
                className="p-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/25 text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center justify-center"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="header-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col fixed left-0 top-16 bottom-0 z-30 border-r border-slate-800 overflow-y-auto justify-between">
        <div className="p-3 space-y-1">
          {mainNavItems.map((item) => {
            // Role restriction check
            if (item.adminOnly && user?.role !== 'ADMIN') {
              return null;
            }

            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : item.highlight
                    ? 'bg-sky-950/60 text-sky-300 hover:bg-sky-900/60 border border-sky-800/40'
                    : 'hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Sidebar Footer User Account Card */}
        {user && (
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email || user.username}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  user.role === 'ADMIN'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-sky-950 text-sky-400 border border-sky-800'
                }`}
              >
                {roleLabel}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-slate-900 text-slate-200 h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="font-bold text-base text-white truncate max-w-[170px]">{settings?.businessName || 'HR Trader'}</div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-1">
                {mainNavItems.map((item) => {
                  if (item.adminOnly && user?.role !== 'ADMIN') {
                    return null;
                  }
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {user && (
              <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{userDisplayName}</div>
                    <div className="text-[10px] text-slate-400">{user.email || user.username}</div>
                    <div className="text-[10px] mt-0.5">Role: <strong className={user.role === 'ADMIN' ? 'text-emerald-400' : 'text-sky-400'}>{roleLabel}</strong></div>
                  </div>
                  <div className="flex flex-col space-y-2 items-end">
                    {onLogout && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleToggleRole();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px] cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Switch Role</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Mobile Bottom Sticky Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f2942] border-t border-slate-800 text-slate-300 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            currentView === 'dashboard' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setCurrentView('routes')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            currentView === 'routes' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Routes</span>
        </button>

        <button
          onClick={() => setCurrentView('quick-order')}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-slate-900 active:scale-95 transition-transform">
            <PlusCircle className="w-7 h-7" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-sky-400">Order</span>
        </button>

        <button
          onClick={() => setCurrentView('parties')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            currentView === 'parties' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Stores</span>
        </button>

        <button
          onClick={() => setCurrentView('today-orders')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            currentView === 'today-orders' ? 'text-sky-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Today</span>
        </button>
      </div>
    </>
  );
};
