import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 浏览器端单例
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── 类型别名（方便以后扩展）───────────────────────────────────────
export type DbTask = {
  id: string;
  user_id: string;
  title: string;
  type: "survive" | "creation" | "fun" | "heal";
  completed: boolean;
  created_at: string;
};

export type DbTaskHistory = {
  id: string;
  user_id: string;
  date: string;
  survive: number;
  creation: number;
  fun: number;
  heal: number;
  pts: number;
};

export type DbTransaction = {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  date: string;
  image_url?: string;
};

export type DbWishItem = {
  id: string;
  user_id: string;
  title: string;
  cost: number;
  image_url?: string;
  created_at: string;
};

export type DbDdl = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time?: string;
  contact?: string;
};

export type DbNote = {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
};

export type DbBookmark = {
  id: string;
  user_id: string;
  title: string;
  url: string;
  emoji?: string;
  created_at: string;
};

export type DbUserMeta = {
  user_id: string;
  last_daily_reset?: string;
  last_weekly_reset?: string;
  display_name?: string;
};
