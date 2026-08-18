import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  UserCheck,
  ShieldAlert,
  Save,
  CheckCircle,
  FileText,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, User, ActivityLog, UserRole } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  users: User[];
  logs: ActivityLog[];
  currentUser: User;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  onResetAllData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  logs,
  currentUser,
  onUpdateSettings,
  onResetAllData,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Distributor Settings & System Audit Logs</h2>
          <p className="text-xs text-slate-500">Configure business info, UPI credentials, invoice headers & audit trails</p>
        </div>
      </div>

      {/* Current Signed-in User Profile Card */}
      {currentUser && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md border border-sky-300/30 shrink-0">
              {currentUser.name ? currentUser.name.trim().charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">{currentUser.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Signed in as: <strong className="text-sky-300">{currentUser.email || currentUser.username}</strong>
                {currentUser.phone && ` • Phone: ${currentUser.phone}`}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-300">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Account Session</span>
            </span>
          </div>
        </div>
      )}

      {/* SETTINGS FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-sky-600" />
          <span>Agency & Business Profile</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business / Agency Name *</label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Distributor Entity Name</label>
            <input
              type="text"
              value={formData.distributorName}
              onChange={(e) => setFormData({ ...formData, distributorName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Phone Number *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>


        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Footer Declaration</label>
          <textarea
            rows={2}
            value={formData.invoiceFooter}
            onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Settings Saved Successfully!</span>
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>SAVE SETTINGS</span>
            </button>
          </div>
        </div>
      </form>

      {/* DATA MANAGEMENT & SAMPLE DATA CLEAR */}
      {onResetAllData && (
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-3">
          <h3 className="font-bold text-rose-900 text-base border-b border-rose-100 pb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Sample Analytics & Order Data Reset</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              Database Maintenance
            </span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <p className="text-slate-600">
              Clear all sample orders, visits, and analytics records. This will reset Analytics metrics to zero so you can begin entering real distributor orders.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all sample data and start Analytics fresh with zero orders?')) {
                  onResetAllData();
                }
              }}
              className="shrink-0 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear Sample Data</span>
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM AUDIT ACTIVITY LOGS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <span>Firebase Audit Trails & Team Activity Logs</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            🔥 Firebase Live Sync
          </span>
        </h3>

        <div className="space-y-2 text-xs">
          {logs.length === 0 ? (
            <p className="text-center py-6 text-slate-400">No activity logs recorded yet.</p>
          ) : (
            logs.slice(0, 20).map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      log.userRole === 'MANAGER' ? 'bg-purple-100 text-purple-800' :
                      log.userRole === 'ADMIN' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.userRole || 'USER'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{log.details}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    User: <strong className="text-slate-700">{log.userName}</strong> • Module: {log.module || log.entity || 'SYSTEM'}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 shrink-0 font-medium text-right">
                  {new Date(log.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
