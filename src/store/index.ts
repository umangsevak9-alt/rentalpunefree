import { create } from 'zustand';
import { User, Settings } from '../types.js';

interface AppState {
  user: User | null;
  token: string | null;
  settings: Settings;
  setAuth: (user: User | null, token: string | null) => void;
  setSettings: (settings: Settings) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  settings: {},
  setAuth: (user, token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ user, token });
  },
  setSettings: (settings) => set({ settings }),
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));
