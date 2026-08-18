import React, { useState } from 'react';
import {
  UserPlus,
  LogIn,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Milk,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { signUpWithFirebase, loginWithFirebase, resetPasswordWithFirebase } from '../lib/firebase';

interface AuthPageProps {
  initialMode?: 'SIGNIN' | 'SIGNUP' | 'FORGOT';
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'SIGNIN',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'SIGNIN' | 'SIGNUP' | 'FORGOT'>(initialMode);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('SALES');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validations
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address format (e.g. name@example.com).');
      return;
    }

    if (mode === 'FORGOT') {
      setLoading(true);
      try {
        await resetPasswordWithFirebase(trimmedEmail);
        setSuccessMsg(
          `Password reset link sent to ${trimmedEmail}! Please check your email inbox or spam folder.`
        );
      } catch (err: any) {
        console.error('Password reset error:', err);
        let message = 'Failed to send password reset email. Please try again.';
        if (err.code === 'auth/user-not-found') {
          message = 'No account found with this email address. Please check your typing or Sign Up.';
        } else if (err.code === 'auth/invalid-email') {
          message = 'The email address format is invalid.';
        } else if (err.code === 'auth/too-many-requests') {
          message = 'Too many requests. Please wait a few minutes before trying again.';
        }
        setError(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!trimmedPassword) {
      setError('Please enter your password.');
      return;
    }
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'SIGNUP') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'SIGNUP') {
        const newUser = await signUpWithFirebase(
          trimmedEmail,
          trimmedPassword,
          name.trim(),
          role,
          phone.trim()
        );
        setSuccessMsg(`Account created successfully! Welcome, ${newUser.name}.`);
        setTimeout(() => {
          onAuthSuccess(newUser);
        }, 600);
      } else {
        const loggedInUser = await loginWithFirebase(trimmedEmail, trimmedPassword);
        setSuccessMsg(`Signed in successfully! Welcome back, ${loggedInUser.name}.`);
        setTimeout(() => {
          onAuthSuccess(loggedInUser);
        }, 600);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let message = err?.message || 'Authentication failed. Please try again.';

      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'The email address format is invalid.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please choose a stronger password (min 6 characters).';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please wait a few minutes before trying again.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Auth Card */}
      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 p-6 sm:p-8 z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 border border-sky-400/30">
            {mode === 'FORGOT' ? <KeyRound className="w-8 h-8" /> : <Milk className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-3">
            {mode === 'FORGOT' ? 'Reset Password' : 'Mother Dairy Sales'}
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            {mode === 'SIGNIN'
              ? 'Sign in to access sales routes & store management'
              : mode === 'SIGNUP'
              ? 'Create a new account for your sales team'
              : 'Enter your registered email address to receive a password reset link.'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up (Hidden when in Forgot Password mode) */}
        {mode !== 'FORGOT' ? (
          <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => {
                setMode('SIGNIN');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'SIGNIN'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('SIGNUP');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                mode === 'SIGNUP'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode('SIGNIN');
              setError('');
              setSuccessMsg('');
            }}
            className="flex items-center space-x-1.5 text-xs text-sky-400 font-bold hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-900/40 border border-red-500/50 text-red-200 text-xs font-medium rounded-xl flex items-start space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-xl flex items-start space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required={mode === 'SIGNUP'}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Registered Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                placeholder="e.g. rajesh@motherdairy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          {mode !== 'FORGOT' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Password *
                </label>
                {mode === 'SIGNIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-semibold text-sky-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required={mode !== 'FORGOT'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'SIGNUP' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="tel"
                  placeholder="e.g. 9835109283"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs rounded-xl shadow-lg hover:from-sky-400 hover:to-blue-500 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'FORGOT' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Password Reset Link</span>
              </>
            ) : mode === 'SIGNUP' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Links */}
        <div className="pt-4 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-400">
            {mode === 'FORGOT' ? (
              <button
                onClick={() => {
                  setMode('SIGNIN');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-sky-400 font-bold hover:underline cursor-pointer"
              >
                Remembered your password? Sign In
              </button>
            ) : (
              <>
                {mode === 'SIGNIN' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  onClick={() => {
                    setMode(mode === 'SIGNIN' ? 'SIGNUP' : 'SIGNIN');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-sky-400 font-bold hover:underline cursor-pointer ml-1"
                >
                  {mode === 'SIGNIN' ? 'Sign Up' : 'Sign In'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
