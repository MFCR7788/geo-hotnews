import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User, type UserSettings, tokenStore } from '../services/auth.js';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSms: (phone: string, code: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  registerWithSms: (phone: string, code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(tokenStore.getUser());
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    console.log('[Auth] refreshUser called');
    if (!tokenStore.getAccessToken()) {
      console.log('[Auth] No access token, setting isLoading=false');
      setIsLoading(false);
      return;
    }
    try {
      console.log('[Auth] Fetching user info...');
      const me = await authApi.getMe();
      console.log('[Auth] Got user:', me);
      setUser(me);
      tokenStore.saveUser(me);
      if (me.settings) setSettings(me.settings as UserSettings);
    } catch (err) {
      console.error('[Auth] Failed to fetch user:', err);
    } finally {
      console.log('[Auth] Setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    if (data.user?.settings) setSettings(data.user.settings);
  };

  const loginWithSms = async (phone: string, code: string) => {
    const data = await authApi.loginWithSms(phone, code);
    setUser(data.user);
    if (data.user?.settings) setSettings(data.user.settings);
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await authApi.register(email, password, name);
    setUser(data.user);
  };

  const registerWithSms = async (phone: string, code: string, name?: string) => {
    const data = await authApi.registerWithSms(phone, code, name);
    setUser(data.user);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setSettings(null);
  };

  const updateSettings = async (s: Partial<UserSettings>) => {
    const updated = await authApi.updateSettings(s);
    setSettings(updated);
  };

  return (
    <AuthContext.Provider value={{
      user,
      settings,
      isLoading,
      isLoggedIn: !!user,
      login,
      loginWithSms,
      register,
      registerWithSms,
      logout,
      updateSettings,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}