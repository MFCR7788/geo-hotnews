import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Lock, Upload, Palette, Globe, Bell,
  CheckCircle, AlertCircle, ChevronRight, X, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { authApi, UserSettings } from '../services/auth.js';

const SOURCES = [
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'weibo', label: '微博' },
  { key: 'zhihu', label: '知乎' },
  { key: 'toutiao', label: '今日头条' },
  { key: 'bilibili', label: 'B站' },
  { key: 'baidu', label: '百度' },
  { key: 'bing', label: 'Bing' },
  { key: 'rss', label: 'RSS' },
];

const THEME_COLORS = [
  '#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316'
];

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: Section[] = [
  { id: 'profile', label: '个人资料', icon: <User className="w-4 h-4" /> },
  { id: 'logo', label: 'Logo 定制', icon: <Upload className="w-4 h-4" /> },
  { id: 'theme', label: '界面主题', icon: <Palette className="w-4 h-4" /> },
  { id: 'sources', label: '数据源偏好', icon: <Globe className="w-4 h-4" /> },
  { id: 'notifications', label: '通知设置', icon: <Bell className="w-4 h-4" /> },
  { id: 'security', label: '安全设置', icon: <Lock className="w-4 h-4" /> },
];

export default function SettingsPage({ onClose }: { onClose: () => void }) {
  const { user, settings, updateSettings, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [name, setName] = useState(user?.name || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(settings?.themeMode || 'dark');
  const [themeColor, setThemeColor] = useState(settings?.themeColor || '#3b82f6');
  const [selectedSources, setSelectedSources] = useState<string[]>(
    settings?.sourcePrefs ? settings.sourcePrefs.split(',') : SOURCES.map(s => s.key)
  );
  const [notifyEmail, setNotifyEmail] = useState(settings?.notifyEmail ?? true);
  const [notifyWeb, setNotifyWeb] = useState(settings?.notifyWeb ?? true);
  const [notifyHighOnly, setNotifyHighOnly] = useState(settings?.notifyHighOnly ?? true);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  // 上传 Logo 到 ImgBB
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showFeedback('error', '图片大小不能超过 2MB');
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/auth/upload-logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('mfcr_access_token')}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      setLogoUrl(data.url);
      showFeedback('success', 'Logo 上传成功');
    } catch (err: any) {
      showFeedback('error', err.message || '上传失败');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ name });
      await refreshUser();
      showFeedback('success', '个人资料已保存');
    } catch (err: any) {
      showFeedback('error', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { showFeedback('error', '请填写所有密码字段'); return; }
    if (newPassword.length < 6) { showFeedback('error', '新密码至少6位'); return; }
    if (newPassword !== confirmPassword) { showFeedback('error', '两次密码不一致'); return; }
    setSaving(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      showFeedback('success', '密码已修改，请重新登录');
    } catch (err: any) {
      showFeedback('error', err.message || '修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (extra?: Partial<UserSettings>) => {
    setSaving(true);
    try {
      await updateSettings({
        logoUrl: logoUrl || null,
        themeMode,
        themeColor,
        sourcePrefs: selectedSources.join(','),
        notifyEmail,
        notifyWeb,
        notifyHighOnly,
        ...extra
      });
      showFeedback('success', '设置已保存');
    } catch (err: any) {
      showFeedback('error', err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleSource = (key: string) => {
    setSelectedSources(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const sectionContent: Record<string, React.ReactNode> = {
    profile: (
      <div className="space-y-5">
        <h3 className="text-white font-medium">个人资料</h3>
        <div>
          <label className="block text-sm text-slate-400 mb-2">邮箱</label>
          <div className="flex items-center gap-3 bg-[#050510] border border-slate-700 rounded-xl px-4 py-3">
            <Mail className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400 text-sm">{user?.email}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">昵称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="您的昵称"
            className="w-full bg-[#050510] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">角色</label>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            user?.role === 'admin'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}>
            {user?.role === 'admin' ? '管理员' : '普通用户'}
          </span>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存资料'}
        </button>
      </div>
    ),

    logo: (
      <div className="space-y-5">
        <h3 className="text-white font-medium">Logo 定制</h3>
        <p className="text-slate-500 text-sm">上传您自己的 Logo，替换左上角的品牌图标。</p>
        
        {/* 预览 */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#050510] border border-slate-700 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Upload className="w-6 h-6 text-slate-600" />
            )}
          </div>
          <div>
            <p className="text-slate-300 text-sm">当前 Logo</p>
            {logoUrl && (
              <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center gap-1">
                <X className="w-3 h-3" />移除
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={logoUploading}
          className="flex items-center gap-2 bg-[#050510] border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white px-5 py-3 rounded-xl text-sm transition-all"
        >
          <Upload className="w-4 h-4" />
          {logoUploading ? '上传中...' : '选择图片（≤2MB）'}
        </button>

        <button
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存 Logo'}
        </button>
      </div>
    ),

    theme: (
      <div className="space-y-6">
        <h3 className="text-white font-medium">界面主题</h3>
        
        {/* 深色/浅色 */}
        <div>
          <label className="block text-sm text-slate-400 mb-3">主题模式</label>
          <div className="flex gap-3">
            {[
              { value: 'dark', label: '深色', icon: <Moon className="w-4 h-4" /> },
              { value: 'light', label: '浅色', icon: <Sun className="w-4 h-4" /> }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setThemeMode(opt.value as 'dark' | 'light')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm transition-all ${
                  themeMode === opt.value
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-[#050510] border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 主题色 */}
        <div>
          <label className="block text-sm text-slate-400 mb-3">主题色</label>
          <div className="flex flex-wrap gap-3">
            {THEME_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setThemeColor(color)}
                className={`w-10 h-10 rounded-xl transition-all border-2 ${
                  themeColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-slate-500">自定义色值：</label>
            <input
              type="text"
              value={themeColor}
              onChange={e => setThemeColor(e.target.value)}
              placeholder="#3b82f6"
              className="bg-[#050510] border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm w-28 focus:outline-none focus:border-blue-500"
            />
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: themeColor }} />
          </div>
        </div>

        <button
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存主题'}
        </button>
      </div>
    ),

    sources: (
      <div className="space-y-5">
        <h3 className="text-white font-medium">数据源偏好</h3>
        <p className="text-slate-500 text-sm">选择您关心的数据来源，热点监控将优先展示这些平台的内容。</p>
        <div className="grid grid-cols-2 gap-3">
          {SOURCES.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSource(s.key)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                selectedSources.includes(s.key)
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-[#050510] border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <span>{s.label}</span>
              {selectedSources.includes(s.key) && <CheckCircle className="w-4 h-4" />}
            </button>
          ))}
        </div>
        <button
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存偏好'}
        </button>
      </div>
    ),

    notifications: (
      <div className="space-y-5">
        <h3 className="text-white font-medium">通知设置</h3>
        <div className="space-y-4">
          {[
            { key: 'notifyEmail', label: '邮件通知', desc: '新热点发送邮件', value: notifyEmail, setter: setNotifyEmail },
            { key: 'notifyWeb', label: 'Web 通知', desc: '浏览器内实时推送', value: notifyWeb, setter: setNotifyWeb },
            { key: 'notifyHighOnly', label: '仅高优先级', desc: '只通知 urgent/high 级热点', value: notifyHighOnly, setter: setNotifyHighOnly },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between bg-[#050510] border border-slate-800 rounded-xl px-4 py-4">
              <div>
                <p className="text-white text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => item.setter(!item.value)}
                className={`relative w-12 h-6 rounded-full transition-colors ${item.value ? 'bg-blue-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.value ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => handleSaveSettings()}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    ),

    security: (
      <div className="space-y-5">
        <h3 className="text-white font-medium">修改密码</h3>
        <div className="space-y-4">
          {[
            { label: '当前密码', value: oldPassword, setter: setOldPassword, placeholder: '输入当前密码', autoComplete: 'current-password' },
            { label: '新密码', value: newPassword, setter: setNewPassword, placeholder: '至少6位', autoComplete: 'new-password' },
            { label: '确认新密码', value: confirmPassword, setter: setConfirmPassword, placeholder: '再次输入新密码', autoComplete: 'new-password' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm text-slate-400 mb-2">{field.label}</label>
              <input
                type="password"
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                className="w-full bg-[#050510] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleChangePassword}
          disabled={saving}
          className="bg-red-600/80 hover:bg-red-500/80 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? '修改中...' : '确认修改密码'}
        </button>
        <p className="text-slate-600 text-xs">修改密码后将退出所有设备，需重新登录。</p>
      </div>
    )
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a1a] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex overflow-hidden shadow-2xl"
      >
        {/* 左侧导航 */}
        <div className="w-48 bg-[#050510] border-r border-slate-800 p-4 flex flex-col">
          <div className="mb-6">
            <h2 className="text-white font-semibold text-sm px-2">账户设置</h2>
          </div>
          <nav className="space-y-1 flex-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeSection === s.id
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>设置</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{SECTIONS.find(s => s.id === activeSection)?.label}</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 反馈提示 */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm">{feedback.msg}</span>
              </motion.div>
            )}

            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {sectionContent[activeSection]}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
