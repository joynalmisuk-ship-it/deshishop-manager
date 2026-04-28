import React, { useState } from 'react';
import { User, Lock, LogIn, Eye, EyeOff, HelpCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Language, translations } from '../translations';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
  onBack: () => void;
  onRegister: () => void;
  lang: Language;
}

export function Login({ onLogin, onBack, onRegister, lang }: LoginProps) {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {view === 'login' ? (
          <motion.div 
            key="login-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{t.shopManagementSystem}</h1>
              <p className="text-slate-500 mt-2">{t.loginNow}</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t.username}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder={t.username}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">{t.password}</label>
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder={t.password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                    title={showPassword ? t.hidePassword : t.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? '...' : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {t.login}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
              <button 
                onClick={onRegister} 
                className="text-emerald-600 hover:text-emerald-700 text-sm font-bold transition-colors"
              >
                {t.dontHaveAccount} {t.register}
              </button>
              <button 
                onClick={onBack} 
                className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="forgot-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Forgot Password?</h1>
              <p className="text-slate-500 mt-2">Don't worry, we're here to help.</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8">
              <p className="text-sm text-amber-800 leading-relaxed">
                For security reasons, password resets are handled by the system administrator. 
                Please contact your shop owner or the main administrator to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Support Contact</p>
                <p className="text-sm font-bold text-slate-700">Email: support@deshishop.com</p>
                <p className="text-sm font-bold text-slate-700">Phone: +880 1XXX-XXXXXX</p>
              </div>

              <button
                onClick={() => setView('login')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
