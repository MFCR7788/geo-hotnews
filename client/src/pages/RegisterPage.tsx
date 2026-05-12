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
      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) {
          throw new Error(text || '发送失败');
        }
        data = {};
      }
      if (!res.ok) {
        const errorMsg = data?.error || await res.text().catch(() => '发送失败');
        throw new Error(errorMsg);
      }
      
      if (data.debugCode) {
        setSmsSuccess(`验证码已发送（测试环境）: ${data.debugCode}`);
      } else {
        setSmsSuccess('验证码已发送，请注意查收');
      }
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
      setTimeout(() => navigate('/guide'), 800);
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'var(--accent-primary)/10' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="GEO星擎-AI搜索优化平台" className="w-12 h-12 rounded-xl object-contain" />
            <div className="text-left">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>GEO星擎</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI搜索优化平台</p>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>创建您的账户</p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--bg-success)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--text-success)' }} />
              </div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>注册成功！</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>正在为您跳转到首页...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label 
                  className="block text-base font-bold mb-2" 
                  style={{ color: 'var(--text-primary)' }}
                >
                  昵称（选填）
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="您的昵称"
                    className="w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none transition-all border"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-primary)'
                    }}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-base font-bold mb-2" 
                  style={{ color: 'var(--text-primary)' }}
                >
                  手机号码
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    className="w-full rounded-xl pl-10 pr-4 py-3 focus:outline-none transition-all border"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-primary)'
                    }}
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label 
                  className="block text-base font-bold mb-2" 
                  style={{ color: 'var(--text-primary)' }}
                >
                  验证码
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入验证码"
                    className="w-full rounded-xl pl-10 pr-36 py-3 focus:outline-none transition-all border"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-primary)'
                    }}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-90 disabled:opacity-60 text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1"
                    style={{ 
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)'
                    }}
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
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: 'var(--bg-success)',
                    borderColor: 'var(--border-success)'
                  }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-success)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-success)' }}>{smsSuccess}</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: 'var(--bg-error)',
                    borderColor: 'var(--border-error)'
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-error)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-error)' }}>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full disabled:opacity-50 disabled:cursor-not-allowed font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: 'var(--gradient-primary)',
                  color: 'var(--text-on-accent)'
                }}
              >
                {loading ? (
                  <div 
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--text-on-accent)', borderTopColor: 'transparent' }}
                  />
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
            <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              已有账户？
              <button
                onClick={() => onSwitchToLogin?.() ?? navigate('/login')}
                className="transition-colors ml-1"
                style={{ color: 'var(--accent-primary)' }}
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