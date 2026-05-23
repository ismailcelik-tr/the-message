import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;
  setSession: (session: Session | null) => void;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAnonymous: false,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isAnonymous: session?.user?.is_anonymous ?? false,
    }),

  signInAnonymously: async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    set({
      session: data.session,
      user: data.user,
      isLoading: false,
      isAnonymous: true,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isLoading: false, isAnonymous: false });
  },
}));
