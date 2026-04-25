import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle, Phone, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.js';

interface RegisterPageProps {
  onSwitchToLogin?: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const navigate = useNavigate();
  const { registerWithSms } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [smsSuccess, setSmsSuccess] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    setSmsSuccess('');
    try {
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发送失败');
      
      setSmsSuccess('验证码已发送，请注意查收');
      setTimeout(() => setSmsSuccess(''), 3000);
      
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

  const handleRegister = async (e: React.FormEvent) => {
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
      await registerWithSms(phone, code, name);
      setSuccess(true);
      // 注册成功，跳转到操作说明页
      setTimeout(() => navigate('/guide'), 800);
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="GEO星擎" className="w-12 h-12 rounded-xl object-contain" />
            <div className="text-left">
              <h1 className="text-xl font-bold text-white">GEO星擎</h1>
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
                onClick={() => onSwitchToLogin?.() ?? navigate('/login')}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Zap className="w-4 h-4" />
                返回登录
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">昵称（选填）</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="您的昵称"
                    className={inputClass}
                    autoComplete="name"
                  />
                </div>
              </div>

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

              {smsSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400 text-sm">{smsSuccess}</span>
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

          {!success && (
            <div className="mt-6 text-center text-sm text-slate-500">
              已有账户？
              <button
                onClick={() => onSwitchToLogin?.() ?? navigate('/login')}
                className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
              >
                立即登录
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}