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
import { todayStr } from "@/lib/points";

import { supabase } from "@/lib/supabase";

function makeDebounce<T>(fn: (v: T) => Promise<unknown>, ms: number, onStart: () => void, onEnd: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  return (v: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onStart();
      fn(v).finally(() => onEnd());
    }, ms);
  };
}

export function SupabaseSyncProvider() {
  const { user, mode } = useAuth();
  const loaded    = useRef(false);
  const isSyncing = useRef(false); // 防止 setState 后 subscribe 循环写
  const pendingWrites = useRef(0); // 记录是否有正在进行的本地写入，防止被远端覆盖打断输入

  useEffect(() => {
    if (mode !== "authenticated" || !user) {
      loaded.current = false;
      return;
    }

    const uid = user.id;
    const DELAY = 1200;

    const onStart = () => { pendingWrites.current++; };
    const onEnd   = () => { pendingWrites.current = Math.max(0, pendingWrites.current - 1); };

    const dTasks        = makeDebounce((v: Task[])             => syncTasks(uid, v),        DELAY, onStart, onEnd);
    const dHistory      = makeDebounce((v: TaskHistoryEntry[]) => syncTaskHistory(uid, v),  DELAY, onStart, onEnd);
    const dTransactions = makeDebounce((v: Transaction[])      => syncTransactions(uid, v), DELAY, onStart, onEnd);
    const dWishlist     = makeDebounce((v: WishItem[])         => syncWishlist(uid, v),     DELAY, onStart, onEnd);
    const dDdls         = makeDebounce((v: DDLItem[])          => syncDdls(uid, v),         DELAY, onStart, onEnd);
    const dNotes        = makeDebounce((v: Note[])             => syncNotes(uid, v),        DELAY, onStart, onEnd);
    const dBookmarks    = makeDebounce((v: Bookmark[])         => syncBookmarks(uid, v),    DELAY, onStart, onEnd);

    const fetchAndMerge = (isInitial: boolean) => {
      loadAllUserData(uid).then((remote) => {
        const local = useWorkspaceStore.getState();
        const stateUpdate: Record<string, unknown> = {};
        const uploads: Promise<unknown>[] = [];
        const todayResetDone = local.lastDailyReset === todayStr();

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
          if (t.key === "tasks" && todayResetDone) {
            const today = todayStr();
            const validRemoteTasks = (t.rem as Task[]).filter(
              (task) => task.createdAt.slice(0, 10) >= today
            );
            if (isInitial) {
              if (validRemoteTasks.length > 0) {
                stateUpdate[t.key] = validRemoteTasks;
              } else if (t.rem.length > 0) {
                uploads.push(syncTasks(uid, []));
              }
            } else {
              stateUpdate[t.key] = validRemoteTasks;
            }
            continue;
          }

          if (isInitial) {
            if (t.rem.length > 0) {
              stateUpdate[t.key] = t.rem;
            } else if (t.loc.length > 0) {
              uploads.push(t.up());
            }
          } else {
            // Realtime 永远信任远端，哪怕远端是空的（说明在其他设备被清空了）
            stateUpdate[t.key] = t.rem;
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
    };

    if (!loaded.current) {
      loaded.current = true;
      fetchAndMerge(true);
    }

    // ① Supabase 实时监听，当其他设备改变数据时主动拉取
    let realtimeDebounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase.channel(`public:all:${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", filter: `user_id=eq.${uid}` }, () => {
        if (pendingWrites.current > 0) return; // 自己正在写，忽略远端推送以防打断输入
        clearTimeout(realtimeDebounceTimer);
        realtimeDebounceTimer = setTimeout(() => {
          if (pendingWrites.current === 0) fetchAndMerge(false);
        }, 800); // 防抖拉取
      })
      .subscribe();

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

    return () => {
      unsub();
      supabase.removeChannel(channel);
    };
  }, [mode, user]);

  return null;
}
