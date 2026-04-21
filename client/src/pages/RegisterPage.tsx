import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!form.email || !form.password) return '邮箱和密码必填';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '邮箱格式不正确';
    if (form.password.length < 6) return '密码至少6位';
    if (form.password !== form.confirmPassword) return '两次密码不一致';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      await register(form.email, form.password, form.name);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#050510] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all";

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="MFCR" className="w-12 h-12 rounded-xl object-contain" />
            <div className="text-left">
              <h1 className="text-xl font-bold text-white">MFCR-HotNews</h1>
              <p className="text-xs text-slate-500">热点监控系统</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">创建您的账户</p>
        </div>

        <div className="bg-[#0a0a1a] border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">注册成功！</h3>
              <p className="text-slate-400 text-sm mb-6">请返回登录页面登录</p>
              <button
                onClick={onSwitchToLogin}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Zap className="w-4 h-4" />
                返回登录
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 昵称 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">昵称（选填）</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="您的昵称"
                    className={inputClass}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">密码（至少6位）</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="设置密码"
                    className={inputClass.replace('pr-4', 'pr-12')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 确认密码 */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="再次输入密码"
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}

              {/* 注册按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    立即注册
                  </>
                )}
              </button>
            </form>
          )}

          {/* 切换登录 */}
          <div className="mt-6 text-center text-sm text-slate-500">
            已有账户？
            <button
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
            >
              立即登录
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
