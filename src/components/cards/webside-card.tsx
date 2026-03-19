"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import type { Bookmark } from "@/lib/store";

// ─── Favicon 图片，失败则显示首字母 ──────────────────────────────────
function SiteIcon({ url, emoji, title }: { url: string; emoji?: string; title: string }) {
  const [imgErr, setImgErr] = useState(false);
  const domain = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";

  if (!imgErr && faviconUrl) {
    return (
      <img src={faviconUrl} alt={title} width={28} height={28}
        className="rounded-md object-contain"
        onError={() => setImgErr(true)}
      />
    );
  }
  if (emoji) return <span className="text-[22px] leading-none">{emoji}</span>;
  return (
    <span className="w-7 h-7 rounded-md bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold">
      {title[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

// ─── 单个书签格 ──────────────────────────────────────────────────────
function BookmarkTile({ bm, onRemove, onEdit }: {
  bm: Bookmark; onRemove: () => void; onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/70 hover:bg-white border border-black/5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-150 select-none"
      style={{ minHeight: 72 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => window.open(bm.url, "_blank")}
    >
      <SiteIcon url={bm.url} emoji={bm.emoji} title={bm.title} />
      <span className="text-[10px] text-slate-600 font-medium text-center leading-tight line-clamp-2 w-full">
        {bm.title}
      </span>
      {hovered && (
        <div className="absolute top-1 right-1 flex gap-0.5" onClick={e => e.stopPropagation()}>
          <button className="w-5 h-5 rounded-full bg-white/90 border border-black/10 text-[9px] flex items-center justify-center hover:bg-sky-50 transition-colors" onClick={onEdit}>✏️</button>
          <button className="w-5 h-5 rounded-full bg-white/90 border border-black/10 text-[9px] flex items-center justify-center hover:bg-red-50 transition-colors" onClick={onRemove}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── 浮动表单弹层（portal，出现在卡片上方）────────────────────────────
function FloatForm({ anchor, mode, initialUrl, initialTitle, onConfirm, onClose }: {
  anchor: { x: number; y: number; w: number };
  mode: "add" | "edit";
  initialUrl: string;
  initialTitle: string;
  onConfirm: (url: string, title: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl]     = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const ref = useRef<HTMLDivElement>(null);

  // 自动填充名称
  const autoFillTitle = useCallback((u: string) => {
    if (title.trim()) return;
    try {
      const full = u.trim().startsWith("http") ? u.trim() : `https://${u.trim()}`;
      setTitle(new URL(full).hostname.replace(/^www\./, ""));
    } catch { /* ignore */ }
  }, [title]);

  // 点外面关闭
  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => window.addEventListener("mousedown", onOut), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onOut);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const submit = () => {
    if (!url.trim()) return;
    const full = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    const name = title.trim() || (() => { try { return new URL(full).hostname; } catch { return full; } })();
    onConfirm(full, name);
  };

  const top = anchor.y - 8; // 上方 8px 间隔，用 translateY(-100%) 使弹层贴合

  return createPortal(
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: anchor.x,
        top,
        width: anchor.w,
        transform: "translateY(-100%)",
        zIndex: 9999,
      }}
      className="bg-white rounded-2xl shadow-xl border border-black/8 p-3 flex flex-col gap-2"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 font-medium">网址</span>
        <input
          autoFocus
          placeholder="网址 (例: github.com)"
          className="text-[11px] px-2 py-1.5 rounded-lg border border-black/10 bg-slate-50 outline-none focus:border-emerald-300 w-full"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={() => autoFillTitle(url)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 font-medium">名称</span>
        <input
          placeholder="自动读取，支持修改"
          className="text-[11px] px-2 py-1.5 rounded-lg border border-black/10 bg-slate-50 outline-none focus:border-emerald-300 w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
        />
      </div>
      <div className="flex gap-1.5 justify-end">
        <button className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] hover:bg-slate-200 transition-colors" onClick={onClose}>取消</button>
        <button
          className="px-2.5 py-1 rounded-lg text-white text-[11px] font-medium transition-colors"
          style={{ background: mode === "add" ? "#10b981" : "#0ea5e9" }}
          onClick={submit}
        >{mode === "add" ? "确认" : "保存"}</button>
      </div>
    </div>,
    document.body
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────
export function WebsideCard() {
  const { bookmarks, addBookmark, removeBookmark, updateBookmark } = useWorkspaceStore();

  const cardRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number } | null>(null);

  // 表单模式
  const [mode, setMode]   = useState<"add" | "edit" | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editUrl, setEditUrl]   = useState("");
  const [editTitle, setEditTitle] = useState("");

  const getAnchor = () => {
    const r = cardRef.current?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, w: r.width } : null;
  };

  const openAdd = () => {
    const a = getAnchor(); if (!a) return;
    setAnchor(a); setMode("add"); setEditId(null); setEditUrl(""); setEditTitle("");
  };

  const openEdit = (bm: Bookmark) => {
    const a = getAnchor(); if (!a) return;
    setAnchor(a); setMode("edit"); setEditId(bm.id); setEditUrl(bm.url); setEditTitle(bm.title);
  };

  const closeForm = () => { setMode(null); setEditId(null); };

  const handleConfirm = (url: string, title: string) => {
    if (mode === "add") {
      addBookmark(title, url, undefined);
    } else if (mode === "edit" && editId) {
      updateBookmark(editId, title, url, undefined);
    }
    closeForm();
  };

  return (
    <div ref={cardRef} className="h-full flex flex-col p-4 gap-3">
      {/* ── 标题栏 ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-base text-slate-600 select-none" style={{ fontFamily: "var(--font-caveat)", fontWeight: 600 }}>Links</h2>
        {!mode && (
          <button
            className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-medium"
            onClick={openAdd}
          >+ 添加</button>
        )}
      </div>

      {/* ── 书签宫格 ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none min-h-0">
        <div className="grid grid-cols-3 gap-2">
          {bookmarks.map(bm => (
            <BookmarkTile
              key={bm.id}
              bm={bm}
              onRemove={() => removeBookmark(bm.id)}
              onEdit={() => openEdit(bm)}
            />
          ))}
        </div>
        {bookmarks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs gap-1">
            <span className="text-2xl">🔗</span>
            <span>还没有书签，点击「添加」开始</span>
          </div>
        )}
      </div>

      {/* ── 浮动表单（portal，出现在卡片上方）── */}
      {mode && anchor && typeof document !== "undefined" && (
        <FloatForm
          anchor={anchor}
          mode={mode}
          initialUrl={editUrl}
          initialTitle={editTitle}
          onConfirm={handleConfirm}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
