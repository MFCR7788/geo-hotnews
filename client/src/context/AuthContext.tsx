import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User, UserSettings, tokenStore } from '../services/auth.js';

interface AuthContextType {
  user: User | null;
  settings: UserSettings | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
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
    if (!tokenStore.getAccessToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
      tokenStore.saveUser(me);
      if (me.settings) setSettings(me.settings as UserSettings);
    } catch {
      // Token 无效，已在 auth.ts 里处理跳转
    } finally {
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

  const register = async (email: string, password: string, name?: string) => {
    const data = await authApi.register(email, password, name);
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
      register,
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
