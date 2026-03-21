"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useWorkspaceStore } from "@/lib/store";
import type { Task, Transaction, WishItem, DDLItem, Note, Bookmark } from "@/lib/store";
import type { TaskHistoryEntry } from "@/lib/points";
import {
  loadAllUserData,
  syncTasks,
  syncTaskHistory,
  syncTransactions,
  syncWishlist,
  syncDdls,
  syncNotes,
  syncBookmarks,
} from "@/lib/db";

function makeDebounce<T>(fn: (v: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (v: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(v), ms);
  };
}

export function SupabaseSyncProvider() {
  const { user, mode } = useAuth();
  const loaded    = useRef(false);
  const isSyncing = useRef(false); // 防止 setState 后 subscribe 循环写

  useEffect(() => {
    if (mode !== "authenticated" || !user) {
      loaded.current = false;
      return;
    }

    const uid = user.id;
    const DELAY = 1200;

    const dTasks        = makeDebounce((v: Task[])             => syncTasks(uid, v),        DELAY);
    const dHistory      = makeDebounce((v: TaskHistoryEntry[]) => syncTaskHistory(uid, v),  DELAY);
    const dTransactions = makeDebounce((v: Transaction[])      => syncTransactions(uid, v), DELAY);
    const dWishlist     = makeDebounce((v: WishItem[])         => syncWishlist(uid, v),     DELAY);
    const dDdls         = makeDebounce((v: DDLItem[])          => syncDdls(uid, v),         DELAY);
    const dNotes        = makeDebounce((v: Note[])             => syncNotes(uid, v),        DELAY);
    const dBookmarks    = makeDebounce((v: Bookmark[])         => syncBookmarks(uid, v),    DELAY);

    if (!loaded.current) {
      loaded.current = true;

      loadAllUserData(uid).then((remote) => {
        const local = useWorkspaceStore.getState();
        const stateUpdate: Record<string, unknown> = {};
        const uploads: Promise<unknown>[] = [];

        // 逐表判断：远端有数据 → 覆盖本地；远端空但本地有 → 上传
        type TableEntry = { key: string; rem: unknown[]; loc: unknown[]; up: () => Promise<unknown> };
        const tables: TableEntry[] = [
          { key: "tasks",        rem: remote.tasks,        loc: local.tasks,        up: () => syncTasks(uid, local.tasks) },
          { key: "taskHistory",  rem: remote.taskHistory,  loc: local.taskHistory,  up: () => syncTaskHistory(uid, local.taskHistory) },
          { key: "transactions", rem: remote.transactions, loc: local.transactions, up: () => syncTransactions(uid, local.transactions) },
          { key: "wishlist",     rem: remote.wishlist,     loc: local.wishlist,     up: () => syncWishlist(uid, local.wishlist) },
          { key: "ddls",         rem: remote.ddls,         loc: local.ddls,         up: () => syncDdls(uid, local.ddls) },
          { key: "notes",        rem: remote.notes,        loc: local.notes,        up: () => syncNotes(uid, local.notes) },
          { key: "bookmarks",    rem: remote.bookmarks,    loc: local.bookmarks,    up: () => syncBookmarks(uid, local.bookmarks) },
        ];

        for (const t of tables) {
          if (t.rem.length > 0) {
            stateUpdate[t.key] = t.rem;
          } else if (t.loc.length > 0) {
            uploads.push(t.up());
          }
        }

        if (Object.keys(stateUpdate).length > 0) {
          isSyncing.current = true;
          useWorkspaceStore.setState(stateUpdate);
          setTimeout(() => { isSyncing.current = false; }, DELAY + 200);
        }
        if (uploads.length > 0) {
          Promise.all(uploads).then(() => console.log("[sync] initial upload done"));
        }
      });
    }

    // ② 订阅 store 变化 → debounce 同步
    let prev = useWorkspaceStore.getState();

    const unsub = useWorkspaceStore.subscribe((s) => {
      if (isSyncing.current) { prev = s; return; } // 加载期间跳过

      if (s.tasks        !== prev.tasks)        dTasks(s.tasks);
      if (s.taskHistory  !== prev.taskHistory)  dHistory(s.taskHistory);
      if (s.transactions !== prev.transactions) dTransactions(s.transactions);
      if (s.wishlist     !== prev.wishlist)     dWishlist(s.wishlist);
      if (s.ddls         !== prev.ddls)         dDdls(s.ddls);
      if (s.notes        !== prev.notes)        dNotes(s.notes);
      if (s.bookmarks    !== prev.bookmarks)    dBookmarks(s.bookmarks);
      prev = s;
    });

    return () => unsub();
  }, [mode, user]);

  return null;
}
