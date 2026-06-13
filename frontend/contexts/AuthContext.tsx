"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, Profile, supabase } from "@/lib/supabase";

type AuthResult = { error?: string; needsConfirmation?: boolean };

type AuthValue = {
  /** false while we're still restoring the session on first load */
  ready: boolean;
  /** whether Supabase env vars are present at all */
  configured: boolean;
  user: User | null;
  profile: Profile | null;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // If Supabase isn't configured, there's nothing to restore; we're "ready" immediately.
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    loadProfile(user.id);
  }, [user]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Accounts are not available yet." };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // When email confirmation is on, Supabase returns a user but no session.
    if (data.user && !data.session) return { needsConfirmation: true };
    return {};
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Accounts are not available yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        ready,
        configured: isSupabaseConfigured,
        user,
        profile,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
