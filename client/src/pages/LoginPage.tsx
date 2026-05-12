import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, Phone, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext.js';

interface LoginPageProps {
  onSwitchToRegister?: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const navigate = useNavigate();
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
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      let data: any;
      try { data = await res.json(); } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) throw new Error(text || '发送失败');
        data = {};
      }
      if (!res.ok) throw new Error(data?.error || await res.text().catch(() => '发送失败'));
      if (data.debugCode) {
        setSuccess(`验证码已发送（测试环境）: ${data.debugCode}`);
      } else {
        setSuccess('验证码已发送，请注意查收');
      }
      setTimeout(() => setSuccess(''), 3000);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) { setError('请输入正确的手机号'); return; }
    if (!code || code.length !== 6) { setError('请输入6位验证码'); return; }
    setLoading(true);
    setError('');
    try {
      await loginWithSms(phone, code);
      navigate('/guide');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#F5F5F7'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{ marginBottom: '20px' }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #007AFF, #5856D6)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,122,255,0.30)'
            }}>
              <img src="/logo.png" alt="GEO" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain' }} />
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ fontSize: '34px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}
          >
            GEO星擎
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ fontSize: '17px', color: '#8E8E93', margin: 0 }}
          >
            欢迎回来
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.04)'
          }}
        >
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#636366', marginBottom: '8px' }}>
                手机号码
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#AEAEB2', zIndex: 1 }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  maxLength={11}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 16px 0 44px',
                    background: '#FAFAFA',
                    border: '1px solid #D2D2D7',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: '#1C1C1E',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#007AFF'; e.target.style.boxShadow = '0 0 0 4px rgba(0,122,255,0.12)'; e.target.style.background = '#FFFFFF' }}
                  onBlur={e => { e.target.style.borderColor = '#D2D2D7'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFAFA' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#636366', marginBottom: '8px' }}>
                验证码
              </label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#AEAEB2', zIndex: 1 }} />
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入验证码"
                  maxLength={6}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '0 120px 0 44px',
                    background: '#FAFAFA',
                    border: '1px solid #D2D2D7',
                    borderRadius: '12px',
                    fontSize: '15px',
                    color: '#1C1C1E',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#007AFF'; e.target.style.boxShadow = '0 0 0 4px rgba(0,122,255,0.12)'; e.target.style.background = '#FFFFFF' }}
                  onBlur={e => { e.target.style.borderColor = '#D2D2D7'; e.target.style.boxShadow = 'none'; e.target.style.background = '#FAFAFA' }}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: countdown > 0 ? '8px 14px' : '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: countdown > 0 ? '#F5F5F7' : '#007AFF',
                    color: countdown > 0 ? '#8E8E93' : '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: countdown > 0 || loading ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.5 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(52,199,89,0.10)',
                  color: '#34C759',
                  fontSize: '14px',
                  marginTop: '12px'
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255,59,48,0.10)',
                  color: '#FF3B30',
                  fontSize: '14px',
                  marginTop: '12px'
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                border: 'none',
                borderRadius: '12px',
                background: '#007AFF',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.15s ease',
                marginTop: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,122,255,0.25)'
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,122,255,0.30)' }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,122,255,0.25)' }}
            >
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF', borderRadius: '50%', animation: 'apple-spin 0.8s linear infinite' }} />
              ) : (
                <>
                  <Zap size={16} />
                  登录
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '14px', color: '#8E8E93' }}>
              还没有账户？
              <button
                onClick={() => onSwitchToRegister?.() ?? navigate('/register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007AFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginLeft: '4px'
                }}
              >
                立即注册
              </button>
            </span>
          </div>
        </motion.div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#AEAEB2', marginTop: '24px' }}>
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </motion.div>
    </div>
  );
}
