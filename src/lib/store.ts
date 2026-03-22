import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays } from "date-fns";
import { type TaskHistoryEntry, todayStr, currentISOWeek } from "./points";

export type { TaskHistoryEntry } from "./points";

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  type: "survive" | "creation" | "fun" | "heal";
  createdAt: string;  // ISO 时间字符串
}

export interface DDLItem {
  id: string;
  title: string;
  date: Date;
  time: string;        // HH:MM format
  contact?: string;    // optional relationship person
}

export interface WishItem {
  id: string;
  title: string;
  cost: number;
  imageUrl?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;      // 负数表示消耗，正数表示获取
  date: string;
  imageUrl?: string;
}

export type NoteCategory = '笔记' | '提醒' | '清单' | '会议';
export interface Note {
  id: string;
  content: string;
  category: NoteCategory;
  createdAt: string;
}

export interface ImageSticker {
  id: string;
  imageUrl: string;
  caption?: string;
  w: number;            // 嵌入模式宽度
  h: number;            // 嵌入模式高度（= w / aspectRatio）
  aspectRatio: number;  // nw/nh，永不变
  expanded: boolean;    // 是否处于浮动模式
  expandedX: number;    // fixed 坐标 x
  expandedY: number;    // fixed 坐标 y
  expandedW: number;    // 浮动宽度（高 = expandedW / aspectRatio）
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  url: string;            // '/music/xxx.mp3' for bundled, base64 for uploaded
  type: 'bundled' | 'uploaded';
}

export const DEFAULT_TRACKS: MusicTrack[] = [
  { id: 'photograph',    title: 'Photograph',              url: '/music/Photograph.mp3',             type: 'bundled' },
  { id: 'prayer-x',     title: 'Prayer X',                url: '/music/Prayer X.mp3',               type: 'bundled' },
  { id: 'ac-rainy',     title: 'Animal Crossing · Rainy', url: '/music/Animal Crossing Rainy.mp3',  type: 'bundled' },
];

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  emoji?: string;
  createdAt: string;
}

export const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'github',    title: 'GitHub',         url: 'https://github.com',                                          emoji: '🐱', createdAt: new Date().toISOString() },
  { id: 'gemini',    title: 'Gemini',         url: 'https://gemini.google.com',                                   emoji: '✨', createdAt: new Date().toISOString() },
  { id: 'pinterest', title: 'Pinterest',      url: 'https://www.pinterest.com',                                   emoji: '📌', createdAt: new Date().toISOString() },
  { id: 'awwwards', title: 'Awwwards',        url: 'https://www.awwwards.com/websites/sites_of_the_day/',         emoji: '🏆', createdAt: new Date().toISOString() },
  { id: 'waytoagi', title: 'WayToAGI',        url: 'https://www.waytoagi.com/zh',                                 emoji: '🤖', createdAt: new Date().toISOString() },
];

interface WorkspaceState {
  tasks: Task[];
  ddls: DDLItem[];

  // 积分系统（派生架构）
  taskHistory: TaskHistoryEntry[];   // 每日归档，不可变
  lastDailyReset: string;            // "YYYY-MM-DD"
  lastWeeklyReset: string;           // "YYYY-WW"

  addTask: (text: string, type: Task["type"]) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addDdl: (title: string, date: Date, time: string, contact?: string) => void;
  removeDdl: (id: string) => void;
  updateDdl: (id: string, patch: Partial<Pick<DDLItem, "title" | "time" | "contact">>) => void;
  moveDdlToTask: (ddlId: string, targetType: Task["type"]) => void;

  // 每日/每周重置
  checkAndResetDaily: () => void;
  checkAndResetWeekly: () => void;

  // B系 积分消耗系统
  wishlist: WishItem[];
  transactions: Transaction[];  // 全部消费流水（amount 负数）
  addWish: (title: string, cost: number, imageUrl?: string) => void;
  removeWish: (id: string) => void;
  updateWish: (id: string, title: string, cost: number, imageUrl?: string) => void;
  addTransaction: (title: string, amount: number, imageUrl?: string) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, title: string, amount: number, imageUrl?: string) => void;
  redeemWish: (id: string) => void;

  // C系 便签
  notes: Note[];
  addNote: (content: string, category: NoteCategory) => void;
  removeNote: (id: string) => void;
  updateNote: (id: string, content: string, category: NoteCategory) => void;

  // C系 图片贴纸（旧列表，保留兼容）
  imageStickers: ImageSticker[];
  imageHistory: string[];           // 最多 20 张 URL
  addImageSticker: (imageUrl: string, w: number, h: number, aspectRatio: number, caption?: string) => void;
  removeImageSticker: (id: string) => void;
  updateImageSticker: (id: string, patch: Partial<Pick<ImageSticker, 'imageUrl' | 'caption' | 'w' | 'h'>>) => void;
  setImageStickerExpanded: (id: string, expanded: boolean, x?: number, y?: number, w?: number) => void;
  addToImageHistory: (url: string) => void;

  // C系 图片卡（单图槽位，新版）
  activeImageUrl: string | null;
  activeImageAspectRatio: number;
  imageCardExpanded: boolean;
  imageCardX: number;
  imageCardY: number;
  imageCardW: number;
  setActiveImage: (url: string, aspectRatio: number) => void;
  clearActiveImage: () => void;
  setImageCardExpanded: (expanded: boolean, x?: number, y?: number, w?: number) => void;
  removeFromImageHistory: (url: string) => void;

  // C系 音乐播放器
  tracks: MusicTrack[];
  currentTrackId: string | null;
  addTrack: (title: string, url: string) => void;
  removeTrack: (id: string) => void;
  setCurrentTrack: (id: string) => void;
  // 小鱿控制音乐的璫态信号（不持久化）
  musicCommand: { cmd: 'play' | 'pause' | 'next' | 'prev' | 'goto'; index?: number } | null;
  triggerMusicCommand: (cmd: { cmd: 'play' | 'pause' | 'next' | 'prev' | 'goto'; index?: number }) => void;
  clearMusicCommand: () => void;

  // C系 快捷网址
  bookmarks: Bookmark[];
  addBookmark: (title: string, url: string, emoji?: string) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, title: string, url: string, emoji?: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      tasks: [],
      ddls: [],
      taskHistory: [],
      lastDailyReset: "",
      lastWeeklyReset: "",
      wishlist: [],
      transactions: [],
      notes: [],
      imageStickers: [],
      imageHistory: [],
      activeImageUrl: null,
      activeImageAspectRatio: 1,
      imageCardExpanded: false,
      imageCardX: 0, imageCardY: 0, imageCardW: 0,
      tracks: DEFAULT_TRACKS,
      currentTrackId: DEFAULT_TRACKS[0].id,
      musicCommand: null,
      bookmarks: DEFAULT_BOOKMARKS,

      addTask: (text, type) => set((state) => ({
        tasks: [...state.tasks, {
          id: Math.random().toString(36).substring(7),
          text, completed: false, type,
          createdAt: new Date().toISOString(),
        }]
      })),

      // 打勾/取消：只改 completed，不动积分（积分在每日归档时统一计算）
      toggleTask: (id) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t),
      })),

      // 删除任务：不回退积分（未完成不影响，已完成等归档）
      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
      })),

      // ── 每日重置：归档 → 清空 ───────────────────────────────────────────────
      checkAndResetDaily: () => set((state) => {
        const today = todayStr();
        if (state.lastDailyReset === today) return {};

        const completed = state.tasks.filter(t => t.completed);
        if (completed.length === 0 && state.lastDailyReset === "") {
          // 第一次启动且无已完成任务，只更新日期
          return { lastDailyReset: today, tasks: [] };
        }

        const entry: TaskHistoryEntry = {
          date: state.lastDailyReset || today,
          survive:  completed.filter(t => t.type === "survive").length,
          creation: completed.filter(t => t.type === "creation").length,
          fun:      completed.filter(t => t.type === "fun").length,
          heal:     completed.filter(t => t.type === "heal").length,
          pts: completed.length * 10,
        };

        const newHistory = completed.length > 0
          ? [...state.taskHistory, entry]
          : state.taskHistory;

        return {
          taskHistory: newHistory,
          tasks: [],    // 清空（未完成也丢弃）
          lastDailyReset: today,
        };
      }),

      // ── 每周重置：更新周标记（能量树自动读新周 taskHistory）──────────────────
      checkAndResetWeekly: () => set(() => ({
        lastWeeklyReset: currentISOWeek(),
      })),

      addDdl: (title, date, time, contact) => set((state) => ({
        ddls: [...state.ddls, { id: Math.random().toString(36).substring(7), title, date, time, contact }]
      })),

      removeDdl: (id) => set((state) => ({
        ddls: state.ddls.filter(d => d.id !== id)
      })),

      updateDdl: (id, patch) => set((state) => ({
        ddls: state.ddls.map(d => d.id === id ? { ...d, ...patch } : d)
      })),

      moveDdlToTask: (ddlId, targetType) => set((state) => {
        const ddl = state.ddls.find(d => d.id === ddlId);
        if (!ddl) return state;
        // 复制语义：DDL 保留在日历中，同时在目标任务卡添加一条任务
        const alreadyExists = state.tasks.some(t => t.id === `task_${ddlId}_${targetType}`);
        if (alreadyExists) return state; // 防重复
        return {
          tasks: [...state.tasks, {
            id: `task_${ddlId}_${targetType}`,
            text: ddl.title,
            completed: false,
            type: targetType,
            createdAt: new Date().toISOString(),
          }],
        };
      }),

      // B系 Actions
      addWish: (title, cost, imageUrl) => set((state) => ({
        wishlist: [...state.wishlist, {
          id: Math.random().toString(36).substring(7),
          title,
          cost,
          imageUrl,
          createdAt: new Date().toISOString(),
        }],
      })),

      removeWish: (id) => set((state) => ({
        wishlist: state.wishlist.filter(w => w.id !== id),
      })),

      updateWish: (id, title, cost, imageUrl) => set((state) => ({
        wishlist: state.wishlist.map(w =>
          w.id === id
            ? { ...w, title, cost, imageUrl }   // 始终覆盖，undefined = 清除图片
            : w
        ),
      })),

      // 消费流水：不再直接改 points，由派生函数计算
      addTransaction: (title, amount, imageUrl) => set((state) => ({
        transactions: [{
          id: Math.random().toString(36).substring(7),
          title,
          amount,
          date: new Date().toISOString(),
          imageUrl,
        }, ...state.transactions],
      })),

      removeTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter(x => x.id !== id),
      })),

      updateTransaction: (id, title, amount, imageUrl) => set((state) => ({
        transactions: state.transactions.map(x =>
          x.id === id
            ? { ...x, title, amount, imageUrl }   // 始终覆盖，undefined = 清除图片
            : x
        ),
      })),

      // redeemWish：写入 transactions（Ledger 自动显示），不改 points
      redeemWish: (id) => set((state) => {
        const wish = state.wishlist.find(w => w.id === id);
        if (!wish) return state;
        // 兑换检查：用 monthlyPoints 派生值（在组件层计算，这里直接允许）
        return {
          wishlist: state.wishlist.filter(w => w.id !== id),
          transactions: [{
            id: Math.random().toString(36).substring(7),
            title: `[兑换] ${wish.title}`,
            amount: -wish.cost,
            date: new Date().toISOString(),
            imageUrl: wish.imageUrl,   // ← 同步心愿图片到 Ledger
          }, ...state.transactions],
        };
      }),

      // C系 actions
      addNote: (content, category) => set((state) => ({
        notes: [...state.notes, {
          id: Math.random().toString(36).substring(7),
          content,
          category,
          createdAt: new Date().toISOString(),
        }],
      })),

      removeNote: (id) => set((state) => ({
        notes: state.notes.filter(n => n.id !== id),
      })),

      updateNote: (id, content, category) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, content, category } : n),
      })),

      // C系 图片贴纸 actions
      addImageSticker: (imageUrl, w, h, aspectRatio, caption) => set((state) => {
        const newSticker: ImageSticker = {
          id: Math.random().toString(36).substring(7),
          imageUrl, w, h, aspectRatio, caption,
          expanded: false, expandedX: 0, expandedY: 0, expandedW: 0,
          createdAt: new Date().toISOString(),
        };
        // 同时写入历史（相同 url 不重复）
        const history = state.imageHistory.includes(imageUrl)
          ? state.imageHistory
          : [imageUrl, ...state.imageHistory].slice(0, 20);
        return { imageStickers: [newSticker, ...state.imageStickers], imageHistory: history };
      }),

      removeImageSticker: (id) => set((state) => ({
        imageStickers: state.imageStickers.filter(s => s.id !== id),
      })),

      updateImageSticker: (id, patch) => set((state) => ({
        imageStickers: state.imageStickers.map(s => s.id === id ? { ...s, ...patch } : s),
      })),

      setImageStickerExpanded: (id, expanded, x, y, w) => set((state) => ({
        imageStickers: state.imageStickers.map(s =>
          s.id !== id ? s : {
            ...s, expanded,
            ...(x !== undefined ? { expandedX: x } : {}),
            ...(y !== undefined ? { expandedY: y } : {}),
            ...(w !== undefined ? { expandedW: w } : {}),
          }
        ),
      })),

      addToImageHistory: (url) => set((state) => {
        if (state.imageHistory.includes(url)) return {};
        return { imageHistory: [url, ...state.imageHistory].slice(0, 20) };
      }),

      // 单图槽位 actions
      setActiveImage: (url, aspectRatio) => set((state) => ({
        activeImageUrl: url,
        activeImageAspectRatio: aspectRatio,
        imageHistory: state.imageHistory.includes(url)
          ? state.imageHistory
          : [url, ...state.imageHistory].slice(0, 20),
      })),

      clearActiveImage: () => set({ activeImageUrl: null, imageCardExpanded: false }),

      setImageCardExpanded: (expanded, x, y, w) => set((state) => ({
        imageCardExpanded: expanded,
        ...(x !== undefined ? { imageCardX: x } : {}),
        ...(y !== undefined ? { imageCardY: y } : {}),
        ...(w !== undefined ? { imageCardW: w } : {}),
      })),

      removeFromImageHistory: (url) => set((state) => ({
        imageHistory: state.imageHistory.filter(u => u !== url),
      })),

      // C系 音乐播放器 actions
      addTrack: (title, url) => set((state) => ({
        tracks: [...state.tracks, {
          id: Math.random().toString(36).substring(7),
          title, url, type: 'uploaded' as const,
        }],
      })),

      removeTrack: (id) => set((state) => ({
        tracks: state.tracks.filter(t => t.id !== id),
        currentTrackId: state.currentTrackId === id
          ? (state.tracks[0]?.id ?? null)
          : state.currentTrackId,
      })),

      setCurrentTrack: (id) => set({ currentTrackId: id }),

      triggerMusicCommand: (cmd) => set({ musicCommand: cmd }),
      clearMusicCommand: () => set({ musicCommand: null }),


      addBookmark: (title, url, emoji) => set((state) => ({
        bookmarks: [...state.bookmarks, {
          id: Math.random().toString(36).substring(7),
          title, url, emoji,
          createdAt: new Date().toISOString(),
        }],
      })),

      removeBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id),
      })),

      updateBookmark: (id, title, url, emoji) => set((state) => ({
        bookmarks: state.bookmarks.map(b => b.id === id ? { ...b, title, url, emoji } : b),
      })),
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        tasks: state.tasks,
        taskHistory: state.taskHistory,
        lastDailyReset: state.lastDailyReset,
        lastWeeklyReset: state.lastWeeklyReset,
        wishlist: state.wishlist,
        transactions: state.transactions,
        notes: state.notes,
        imageStickers: state.imageStickers,
        activeImageUrl: state.activeImageUrl,
        activeImageAspectRatio: state.activeImageAspectRatio,
        imageCardExpanded: state.imageCardExpanded,
        imageCardX: state.imageCardX,
        imageCardY: state.imageCardY,
        imageCardW: state.imageCardW,
        imageHistory: state.imageHistory,
        ddls: state.ddls.map(d => ({ ...d, date: d.date.toISOString() })),
        bookmarks: state.bookmarks,
        tracks: state.tracks,
      }) as any,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // 修复 DDL 日期
        if (state.ddls) {
          state.ddls = state.ddls.map((d: any) => ({
            ...d,
            date: new Date(d.date),
            time: d.time ?? "00:00",
          }));
        }
        // localStorage 迁移：旧版有 points 字段但无 taskHistory，保留历史积分
        const legacy = state as any;
        if (legacy.points > 0 && (!state.taskHistory || state.taskHistory.length === 0)) {
          const today = new Date().toISOString().slice(0, 10);
          state.taskHistory = [{
            date: today,
            survive: 0, creation: 0, fun: 0, heal: 0,
            pts: legacy.points,
          }];
        }
        // tracks 迁移：清除已删除的 bundled 歌曲，补入新加的默认曲目
        if (state.tracks) {
          const validBundledIds = new Set(DEFAULT_TRACKS.map(t => t.id));
          // 移除不再存在的 bundled 歌曲
          state.tracks = (state.tracks as MusicTrack[]).filter(
            t => t.type !== 'bundled' || validBundledIds.has(t.id)
          );
          if (state.tracks.length === 0) state.tracks = DEFAULT_TRACKS;
          // 追加新增的默认曲目（保持用户上传的曲目不变）
          const existingIds = new Set((state.tracks as MusicTrack[]).map(t => t.id));
          for (const dt of DEFAULT_TRACKS) {
            if (!existingIds.has(dt.id)) (state.tracks as MusicTrack[]).push(dt);
          }
          // 修正 currentTrackId（曲目已被删时回退到第一首）
          const ids = new Set((state.tracks as MusicTrack[]).map(t => t.id));
          if (state.currentTrackId && !ids.has(state.currentTrackId as string)) {
            state.currentTrackId = (state.tracks as MusicTrack[])[0]?.id ?? null;
          }
        }
      },
    }
  )
);
