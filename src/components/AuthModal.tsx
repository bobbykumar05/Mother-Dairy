import React, { useState } from 'react';
import { Shield, UserPlus, LogIn, Lock, Mail, User as UserIcon, Phone, Briefcase, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { signUpWithFirebase, loginWithFirebase } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('SIGNUP');
  
  // Sign Up Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('SALES');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'SIGNUP') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          throw new Error('Please fill in Name, Email, and Password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const newUser = await signUpWithFirebase(email.trim(), password, name.trim(), role, phone.trim());
        setSuccessMsg(`Registered as ${role === 'ADMIN' ? 'Admin' : 'Sales'}!`);
        setTimeout(() => {
          onAuthSuccess(newUser);
          onClose();
        }, 800);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter email and password.');
        }

        const loggedInUser = await loginWithFirebase(email.trim(), password);
        setSuccessMsg(`Welcome, ${loggedInUser.name}!`);
        setTimeout(() => {
          onAuthSuccess(loggedInUser);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let message = err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'Email already registered. Try logging in.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Compact Square/Rectangular Card Modal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-xs sm:max-w-sm w-full p-5 sm:p-6 relative border border-slate-200 text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1 mb-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-blue-700 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {mode === 'SIGNUP' ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Mother Dairy • Firebase Sync
          </p>
        </div>

        {/* Compact Mode Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('SIGNUP');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              mode === 'SIGNUP' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              mode === 'LOGIN' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Role *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('SALES')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                    role === 'SALES'
                      ? 'border-sky-600 bg-sky-50 text-sky-800 ring-2 ring-sky-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sales</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                    role === 'ADMIN'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Harsh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="email"
                placeholder="e.g. harsh@motherdairy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-9 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. 9835109283"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:from-sky-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'SIGNUP' ? (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create {role === 'ADMIN' ? 'Admin' : 'Sales'} Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            {mode === 'SIGNUP' ? 'Already registered?' : 'Need a team account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'SIGNUP' ? 'LOGIN' : 'SIGNUP');
                setError('');
                setSuccessMsg('');
              }}
              className="text-sky-600 font-bold hover:underline cursor-pointer ml-1"
            >
              {mode === 'SIGNUP' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
