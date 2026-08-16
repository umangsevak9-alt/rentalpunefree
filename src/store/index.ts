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
    set({ 
      user, 
      token: token || session?.access_token || null, 
      session: session || null, 
      isAuthLoading: false 
    });
  },
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setSettings: (settings) => set({ settings }),
  logout: () => {
    set({ user: null, token: null, session: null, isAuthLoading: false });
  }
}));
