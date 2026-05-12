import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const justLoggedInRef = useRef(false);
  const initRef = useRef(false);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSettings(null);
    tokenStore.clearTokens();
  }, []);

  const refreshUser = useCallback(async () => {
    if (justLoggedInRef.current) {
      justLoggedInRef.current = false;
      setIsLoading(false);
      return;
    }

    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) {
      setUser(null);
      setSettings(null);
      setIsLoading(false);
      return;
    }

    const storedUser = tokenStore.getUser();
    if (storedUser) {
      setUser(storedUser);
      if (storedUser.settings) setSettings(storedUser.settings as UserSettings);
      setIsLoading(false);
      return;
    }

    try {
      const me = await authApi.getMe();
      setUser(me);
      tokenStore.saveUser(me);
      if (me.settings) setSettings(me.settings as UserSettings);
    } catch {
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleAuthFailure = () => {
      clearAuthState();
    };
    window.addEventListener('auth:failure', handleAuthFailure);
    return () => window.removeEventListener('auth:failure', handleAuthFailure);
  }, [clearAuthState]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    if (data.user?.settings) setSettings(data.user.settings);
    setIsLoading(false);
    justLoggedInRef.current = true;
  };

  const loginWithSms = async (phone: string, code: string) => {
    const data = await authApi.loginWithSms(phone, code);
    setUser(data.user);
    if (data.user?.settings) setSettings(data.user.settings);
    setIsLoading(false);
    justLoggedInRef.current = true;
  };

  const register = async (email: string, password: string, name?: string) => {
    const data = await authApi.register(email, password, name);
    setUser(data.user);
    setIsLoading(false);
    justLoggedInRef.current = true;
  };

  const registerWithSms = async (phone: string, code: string, name?: string) => {
    const data = await authApi.registerWithSms(phone, code, name);
    setUser(data.user);
    setIsLoading(false);
    justLoggedInRef.current = true;
  };

  const logout = async () => {
    await authApi.logout();
    clearAuthState();
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
      isLoggedIn: !!user && !!tokenStore.getAccessToken(),
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
