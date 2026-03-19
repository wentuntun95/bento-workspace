"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X, Check, Camera, Pencil, Trash2 } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";
import { ChestBurst } from "@/components/chest-burst";

const THEME = { base: "#a78bfa", dark: "#6d28d9", pale: "#ede9fe" };

const PASTEL_COLORS = [
  { bg: "#e0f2fe", text: "#0369a1" },
  { bg: "#dcfce7", text: "#16a34a" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#fff7ed", text: "#c2410c" },
  { bg: "#fefce8", text: "#a16207" },
  { bg: "#f0fdf4", text: "#166534" },
  { bg: "#fdf4ff", text: "#86198f" },
];

function getColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return PASTEL_COLORS[hash % PASTEL_COLORS.length];
}

async function compressImage(file: File, maxPx = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      cvs.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cvs.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── WishTile ─────────────────────────────────────────────────
type WishTileProps = {
  w: { id: string; title: string; cost: number; imageUrl?: string };
  points: number;
  onRedeem: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function WishTile({ w, points, onRedeem, onEdit, onDelete }: WishTileProps) {
  const [hovered, setHovered] = useState(false);
  const color = getColor(w.id);
  const affordable = points >= w.cost;
  const progress = Math.min(points / w.cost, 1);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        background: color.bg,
        aspectRatio: "1 / 1",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 图片层 */}
      {w.imageUrl && (
        <img src={w.imageUrl} alt={w.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}

      {/* 底部进度条 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: "rgba(0,0,0,0.12)",
      }}>
        <div style={{
          height: "100%", width: `${progress * 100}%`,
          background: affordable ? "#fbbf24" : THEME.base,
          transition: "width 0.4s ease",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      {/* 文字：底部 */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "5px 6px 7px", gap: 1,
      }}>
        <span style={{
          color: color.text, fontSize: 10, fontWeight: 700, lineHeight: 1.25,
          wordBreak: "break-all",
          textShadow: w.imageUrl ? "0 1px 4px rgba(255,255,255,0.8)" : "none",
        }}>
          {w.title}
        </span>
        <span style={{
          color: color.text, fontSize: 9, fontWeight: 800, opacity: 0.7,
          textShadow: w.imageUrl ? "0 1px 4px rgba(255,255,255,0.8)" : "none",
        }}>
          {w.cost} 分
        </span>
      </div>

      {/* 左上角：兑换 badge（积分达标时始终可见，不受 hover 影响）*/}
      {affordable && (
        <button
          onClick={e => { e.stopPropagation(); onRedeem(); }}
          style={{
            position: "absolute", top: 4, left: 4,
            background: "#fbbf24", border: "none", borderRadius: 5,
            padding: "2px 5px", cursor: "pointer",
            fontSize: 9, fontWeight: 800, color: "#78350f",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            animation: "pulse 1.5s ease-in-out infinite",
            zIndex: 2,
          }}
        >
          兑换!
        </button>
      )}

      {/* 右上角：hover 时出现编辑/删除（与左上角兑换不冲突）*/}
      {hovered && (
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3, zIndex: 2 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
                     padding: "3px 4px", cursor: "pointer", color: "#374151",
                     display: "flex", alignItems: "center" }}>
            <Pencil size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
                     padding: "3px 4px", cursor: "pointer", color: "#ef4444",
                     display: "flex", alignItems: "center" }}>
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}


// ─── 主组件 ───────────────────────────────────────────────────
export function WishlistCard() {
  const { points, wishlist, addWish, removeWish, updateWish, redeemWish } = useWorkspaceStore();

  // 开宝箱状态
  const [chestCost, setChestCost] = useState<number | null>(null);
  const pendingRedeemId = useRef<string | null>(null);

  // Add form
  const [adding, setAdding]     = useState(false);
  const [title, setTitle]       = useState("");
  const [cost, setCost]         = useState("");
  const [preview, setPreview]   = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  // Edit
  const [editId, setEditId]           = useState<string | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editCost, setEditCost]       = useState("");
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const editRef     = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) titleRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editId) editRef.current?.focus(); }, [editId]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPreview(await compressImage(file));
  }, []);
  const handleEditFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setEditPreview(await compressImage(file));
  }, []);

  const cancel = () => {
    setAdding(false); setTitle(""); setCost(""); setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = () => {
    const name = title.trim(), pts = parseInt(cost, 10);
    if (!name || !pts || pts <= 0) return;
    addWish(name, pts, preview ?? undefined);
    cancel();
  };

  const openEdit = (w: typeof wishlist[0]) => {
    setEditId(w.id); setEditTitle(w.title); setEditCost(String(w.cost));
    setEditPreview(null);
    if (editFileRef.current) editFileRef.current.value = "";
  };

  const submitEdit = () => {
    if (!editId) return;
    const name = editTitle.trim(), pts = parseInt(editCost, 10);
    if (!name || !pts || pts <= 0) return;
    updateWish(editId, name, pts, editPreview ?? undefined);
    setEditId(null); setEditPreview(null);
  };

  const handleRedeem = (w: typeof wishlist[0]) => {
    if (points < w.cost) return;
    pendingRedeemId.current = w.id;
    setChestCost(w.cost); // 开启动效
  };

  const onChestDone = () => {
    if (pendingRedeemId.current) {
      redeemWish(pendingRedeemId.current);
      pendingRedeemId.current = null;
    }
    setChestCost(null);
  };

  const displayList = [...wishlist].reverse();

  return (
    <>
      {chestCost !== null && <ChestBurst cost={chestCost} onDone={onChestDone} />}

      <div className="flex flex-col h-full w-full relative" onPointerDown={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="text-[14px] font-black leading-none tracking-wide"
                style={{ color: THEME.dark, fontFamily: "var(--font-caveat, cursive)" }}>
            Wishlist
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-black tabular-nums leading-none" style={{ color: THEME.dark }}>
              {points.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-foreground/30">分</span>
          </div>
        </div>

        {/* ── 心愿格子，从下往上 ── */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col-reverse">
          {displayList.length === 0 && !adding ? (
            <div className="flex items-center justify-center py-6">
              <span className="text-[11px] text-foreground/30">许个愿吧 ✨</span>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridAutoFlow: "dense",
              gap: 3,
              alignContent: "end",
            }}>
              {displayList.map(w => (
                <WishTile key={w.id} w={w} points={points}
                  onRedeem={() => handleRedeem(w)}
                  onEdit={() => openEdit(w)}
                  onDelete={() => removeWish(w.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── 编辑行 ── */}
        {editId && (
          <div className="flex-shrink-0 mt-2 flex items-center gap-2 px-2 py-2 rounded-lg border"
               style={{ background: "rgba(255,255,255,0.9)", borderColor: `${THEME.base}60` }}>
            <button type="button" onClick={() => editFileRef.current?.click()}
                    className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 28, height: 28, background: editPreview ? "transparent" : THEME.pale,
                             border: `1.5px dashed ${THEME.base}70`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {editPreview
                ? <img src={editPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Camera size={12} color={THEME.base} />}
            </button>
            <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditFile} />
            <input ref={editRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
                   onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") submitEdit(); if (e.key === "Escape") { setEditId(null); setEditPreview(null); } }}
                   className="flex-1 text-[12px] bg-transparent outline-none border-b pb-0.5 font-medium"
                   style={{ borderColor: `${THEME.base}50`, color: THEME.dark, fontFamily: "var(--font-caveat, cursive)" }} />
            <input type="number" min="1" value={editCost} onChange={e => setEditCost(e.target.value)}
                   onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") submitEdit(); if (e.key === "Escape") { setEditId(null); setEditPreview(null); } }}
                   className="w-[48px] text-[12px] bg-transparent outline-none border-b pb-0.5 font-medium tabular-nums text-right"
                   style={{ borderColor: `${THEME.base}50`, color: THEME.dark }} />
            <button onClick={() => { setEditId(null); setEditPreview(null); }} className="text-foreground/25 hover:text-foreground/60 flex-shrink-0"><X size={13} /></button>
            <button onClick={submitEdit} disabled={!editTitle.trim() || !editCost}
                    className="flex-shrink-0 transition-opacity"
                    style={{ opacity: editTitle.trim() && editCost ? 1 : 0.3, color: THEME.base }}><Check size={14} /></button>
          </div>
        )}

        {/* ── 新增一行表单 ── */}
        {adding && (
          <div className="flex-shrink-0 mt-2 flex items-center gap-2 px-2 py-2 rounded-lg border"
               style={{ background: "rgba(255,255,255,0.85)", borderColor: `${THEME.base}50` }}>
            <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 28, height: 28, background: preview ? "transparent" : THEME.pale,
                             border: `1.5px dashed ${THEME.base}70`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {preview
                ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Camera size={12} color={THEME.base} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
                   onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && cost) handleSubmit(); if (e.key === "Escape") cancel(); }}
                   placeholder="心愿名称…"
                   className="flex-1 text-[12px] bg-transparent outline-none border-b pb-0.5 font-medium"
                   style={{ borderColor: `${THEME.base}50`, color: THEME.dark, fontFamily: "var(--font-caveat, cursive)" }} />
            <input type="number" min="1" value={cost} onChange={e => setCost(e.target.value)}
                   onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && title.trim()) handleSubmit(); if (e.key === "Escape") cancel(); }}
                   placeholder="积分"
                   className="w-[48px] text-[12px] bg-transparent outline-none border-b pb-0.5 font-medium tabular-nums text-right"
                   style={{ borderColor: `${THEME.base}50`, color: THEME.dark }} />
            <button onClick={cancel} className="text-foreground/25 hover:text-foreground/60 flex-shrink-0"><X size={13} /></button>
            <button onClick={handleSubmit} disabled={!title.trim() || !cost}
                    className="flex-shrink-0 transition-opacity"
                    style={{ opacity: title.trim() && cost ? 1 : 0.3, color: THEME.base }}><Check size={14} /></button>
          </div>
        )}

        {/* ── Add button ── */}
        {!adding && !editId && (
          <button
            onClick={() => setAdding(true)}
            className="flex-shrink-0 mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ color: THEME.dark, fontFamily: "var(--font-caveat, cursive)" }}
            onMouseEnter={e => (e.currentTarget.style.background = THEME.pale)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Plus size={12} /> 许个愿
          </button>
        )}
      </div>
    </>
  );
}
