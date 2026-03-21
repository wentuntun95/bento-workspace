/**
 * db.ts — Supabase CRUD helpers
 * 所有表操作都带 user_id，调用方无需关心 RLS
 */
import { supabase } from "./supabase";
import type { Task, TaskHistoryEntry, Transaction, WishItem, DDLItem, Note, Bookmark } from "./store";
import type { TaskHistoryEntry as THE } from "./points";

// ─── Session helper ─────────────────────────────────────────────────────────
// getSession() 强制从 localStorage 重读 JWT，避免 auth 状态变更后的时序问题
async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) console.warn("[db] no active session");
  return session;
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function loadTasks(userId: string): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, type, completed, created_at")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    text: r.title,
    type: r.type,
    completed: r.completed,
    createdAt: r.created_at,
  }));
}

export async function syncTasks(userId: string, tasks: Task[]) {
  const session = await ensureSession(); if (!session) return;
  if (tasks.length === 0) {
    await supabase.from("tasks").delete().eq("user_id", userId);
    return;
  }
  const rows = tasks.map(t => ({
    id: t.id, user_id: userId, title: t.text,
    type: t.type, completed: t.completed, created_at: t.createdAt,
  }));
  const { error } = await supabase.from("tasks").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[sync] tasks error:", error.message); return; }
  const ids = tasks.map(t => t.id);
  await supabase.from("tasks").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
}

// ─── Task History ────────────────────────────────────────────────────────────

export async function loadTaskHistory(userId: string): Promise<THE[]> {
  const { data } = await supabase
    .from("task_history")
    .select("date, survive, creation, fun, heal, pts")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  return (data ?? []).map((r: any) => ({
    date: r.date,
    survive: r.survive,
    creation: r.creation,
    fun: r.fun,
    heal: r.heal,
    pts: r.pts,
  }));
}

export async function syncTaskHistory(userId: string, history: THE[]) {
  const session = await ensureSession(); if (!session) return;
  if (history.length === 0) return;
  const rows = history.map(h => ({
    user_id: userId, date: h.date,
    survive: h.survive, creation: h.creation, fun: h.fun, heal: h.heal, pts: h.pts,
  }));
  const { error } = await supabase.from("task_history").upsert(rows, { onConflict: "user_id,date" });
  if (error) console.error("[sync] task_history error:", error.message);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function loadTransactions(userId: string): Promise<Transaction[]> {
  const { data } = await supabase
    .from("transactions")
    .select("id, title, amount, date, image_url")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    amount: r.amount,
    date: r.date,
    imageUrl: r.image_url ?? undefined,
  }));
}

export async function syncTransactions(userId: string, txns: Transaction[]) {
  const session = await ensureSession(); if (!session) return;
  if (txns.length === 0) {
    await supabase.from("transactions").delete().eq("user_id", userId);
    return;
  }
  const rows = txns.map(t => ({
    id: t.id, user_id: userId, title: t.title,
    amount: t.amount, date: t.date, image_url: t.imageUrl ?? null,
  }));
  const { error } = await supabase.from("transactions").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[sync] transactions error:", error.message); return; }
  const ids = txns.map(t => t.id);
  await supabase.from("transactions").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export async function loadWishlist(userId: string): Promise<WishItem[]> {
  const { data } = await supabase
    .from("wishlist")
    .select("id, title, cost, image_url, created_at")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    cost: r.cost,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function syncWishlist(userId: string, wishlist: WishItem[]) {
  const session = await ensureSession(); if (!session) return;
  if (wishlist.length === 0) {
    await supabase.from("wishlist").delete().eq("user_id", userId);
    return;
  }
  const rows = wishlist.map(w => ({
    id: w.id, user_id: userId, title: w.title,
    cost: w.cost, image_url: w.imageUrl ?? null, created_at: w.createdAt,
  }));
  const { error } = await supabase.from("wishlist").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[sync] wishlist error:", error.message); return; }
  const ids = wishlist.map(w => w.id);
  await supabase.from("wishlist").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
}

// ─── DDLs ────────────────────────────────────────────────────────────────────

export async function loadDdls(userId: string): Promise<DDLItem[]> {
  const { data } = await supabase
    .from("ddls")
    .select("id, title, date, time, contact")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => {
    const raw = new Date(r.date);
    const localDate = isNaN(raw.getTime())
      ? new Date()
      : new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    return { id: r.id, title: r.title, date: localDate, time: r.time ?? "00:00", contact: r.contact ?? undefined };
  });
}

export async function syncDdls(userId: string, ddls: DDLItem[]) {
  const session = await ensureSession(); if (!session) return;
  if (ddls.length === 0) {
    await supabase.from("ddls").delete().eq("user_id", userId);
    return;
  }
  const rows = ddls.map(d => ({
    id: d.id, user_id: userId, title: d.title,
    // 用本地年月日格式化，避免 toISOString() 转 UTC 后跨天偏移
    date: d.date instanceof Date
      ? `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`
      : d.date,
    time: d.time, contact: d.contact ?? null,
  }));
  const { error } = await supabase.from("ddls").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[sync] ddls error:", error.message); return; }
  const ids = ddls.map(d => d.id);
  await supabase.from("ddls").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function loadNotes(userId: string): Promise<Note[]> {
  const { data } = await supabase
    .from("notes")
    .select("id, content, category, created_at")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    category: r.category,
    createdAt: r.created_at,
  }));
}

export async function syncNotes(userId: string, notes: Note[]) {
  const session = await ensureSession(); if (!session) return;
  if (notes.length === 0) {
    await supabase.from("notes").delete().eq("user_id", userId);
    return;
  }
  const rows = notes.map(n => ({
    id: n.id, user_id: userId, content: n.content,
    category: n.category, created_at: n.createdAt,
  }));
  const { error } = await supabase.from("notes").upsert(rows, { onConflict: "id" });
  if (error) { console.error("[sync] notes error:", error.message); return; }
  const ids = notes.map(n => n.id);
  await supabase.from("notes").delete().eq("user_id", userId).not("id", "in", `(${ids.join(",")})`);
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export async function loadBookmarks(userId: string): Promise<Bookmark[]> {
  const { data } = await supabase
    .from("bookmarks")
    .select("id, title, url, emoji, created_at")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    emoji: r.emoji ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function syncBookmarks(userId: string, bookmarks: Bookmark[]) {
  if (bookmarks.length === 0) return;
  const rows = bookmarks.map(b => ({
    id: b.id,
    user_id: userId,
    title: b.title,
    url: b.url,
    emoji: b.emoji ?? null,
    created_at: b.createdAt,
  }));
  await supabase.from("bookmarks").upsert(rows, { onConflict: "id" });
}

// ─── Load All ────────────────────────────────────────────────────────────────

export async function loadAllUserData(userId: string) {
  const [tasks, taskHistory, transactions, wishlist, ddls, notes, bookmarks] = await Promise.all([
    loadTasks(userId),
    loadTaskHistory(userId),
    loadTransactions(userId),
    loadWishlist(userId),
    loadDdls(userId),
    loadNotes(userId),
    loadBookmarks(userId),
  ]);
  return { tasks, taskHistory, transactions, wishlist, ddls, notes, bookmarks };
}
