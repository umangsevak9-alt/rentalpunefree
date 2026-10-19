import { create } from 'zustand';
import { User, Settings } from '../types.js';
import { Session } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  token: string | null;
  session: Session | null;
  isAuthLoading: boolean;
  settings: Settings;
  setAuth: (user: User | null, token: string | null, session?: Session | null) => void;
  setAuthLoading: (isLoading: boolean) => void;
  setSettings: (settings: Settings) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  session: null,
  isAuthLoading: true,
  settings: {},
  setAuth: (user, token, session = null) => {
    const activeToken = token || session?.access_token || null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (activeToken) {
          localStorage.setItem('rp_auth_token', activeToken);
        }
        if (user) {
          localStorage.setItem('rp_auth_user', JSON.stringify(user));
        }
      } catch {}
    }
    set({ 
      user, 
      token: activeToken, 
      session: session || null, 
      isAuthLoading: false 
    });
  },
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setSettings: (settings) => set({ settings }),
  logout: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('rp_auth_token');
        localStorage.removeItem('rp_auth_user');
      } catch {}
    }
    set({ user: null, token: null, session: null, isAuthLoading: false });
  }
}));
