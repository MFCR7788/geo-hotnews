import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, Phone, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { loginWithSms } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 先检查手机号是否已注册
      const checkRes = await fetch(`/api/auth/check-phone?phone=${encodeURIComponent(phone)}`);
      const checkData = await checkRes.json();
      if (!checkRes.ok) throw new Error(checkData.error || '检查失败');

      if (!checkData.registered) {
        setError('该手机号未注册，即将跳转到注册页面...');
        setTimeout(() => onSwitchToRegister(), 1500);
        return;
      }

      // 已注册，发送验证码
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发送失败');

      setSuccess('验证码已发送，请注意查收');
      setTimeout(() => setSuccess(''), 3000);

      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await loginWithSms(phone, code);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#050510] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all";

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="GEO星擎" className="w-12 h-12 rounded-xl object-contain" />
            <div className="text-left">
              <h1 className="text-xl font-bold text-white">GEO星擎</h1>
              <p className="text-xs text-slate-500">热点监控系统</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">登录您的账户</p>
        </div>

        <div className="bg-[#0a0a1a] border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">手机号码</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className={inputClass}
                  maxLength={11}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">验证码</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入验证码"
                  className={inputClass.replace('pr-4', 'pr-36')}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                >
                  {countdown > 0 ? (
                    <>
                      <Clock className="w-3 h-3" />
                      {countdown}s
                    </>
                  ) : (
                    '获取验证码'
                  )}
                </button>
              </div>
            </div>

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 text-sm">{success}</span>
              </motion.div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  登录
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            还没有账户？
            <button
              onClick={onSwitchToRegister}
              className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
            >
              立即注册
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}