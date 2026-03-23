"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// localStorage key for visit mode
const MODE_KEY = "tnm_visit_mode";

type VisitMode = "anon" | "authenticated" | null;

interface AuthContextValue {
  user: User | null;
  mode: VisitMode;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  setAnon: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<VisitMode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 读取已保存的 mode
    const saved = localStorage.getItem(MODE_KEY) as VisitMode;

    // 检查 Supabase 当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setMode("authenticated");
        localStorage.setItem(MODE_KEY, "authenticated");
      } else if (saved === "anon") {
        setMode("anon");
      } else {
        setMode(null); // 触发弹窗
      }
      setLoading(false);
    });

    // session 变化监听
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setMode("authenticated");
        localStorage.setItem(MODE_KEY, "authenticated");
      } else {
        setUser(null);
        if (mode === "authenticated") {
          setMode(null);
          localStorage.removeItem(MODE_KEY);
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMode(null);
    localStorage.removeItem(MODE_KEY);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  };

  const setAnon = () => {
    setMode("anon");
    localStorage.setItem(MODE_KEY, "anon");
  };

  return (
    <AuthContext.Provider value={{ user, mode, loading, signIn, signOut, updatePassword, setAnon }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
