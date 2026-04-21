import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { authApi } from '../services/auth.js';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('请输入邮箱'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MFCR" className="w-12 h-12 rounded-xl object-contain mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">找回密码</h1>
          <p className="text-slate-400 text-sm mt-1">输入注册邮箱，我们发送重置链接</p>
        </div>

        <div className="bg-[#0a0a1a] border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">邮件已发送</h3>
              <p className="text-slate-400 text-sm mb-6">
                如果 <span className="text-white">{email}</span> 已注册，重置链接已发往该邮箱，请在 1 小时内完成重置。
              </p>
              <button
                onClick={onBack}
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">注册邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-[#050510] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '发送重置链接'}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full text-slate-500 hover:text-slate-300 transition-colors text-sm flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
