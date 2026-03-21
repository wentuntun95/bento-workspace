"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
import { Plus, X, Check, Camera, Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import { monthlyPoints, monthlyExchanged } from "@/lib/points";
import { ChestBurst } from "@/components/chest-burst";

// ─── 共用工具 ─────────────────────────────────────────────────────────────────
const WISH_THEME = { base: "#818cf8", dark: "#3730a3", pale: "#eef2ff" };
const LED_THEME  = { base: "#60a5fa", dark: "#1d4ed8", pale: "#eff6ff" };

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

// ─── WishTile ─────────────────────────────────────────────────────────────────
function WishTile({ w, pts, onRedeem, onEdit, onDelete }: {
  w: { id: string; title: string; cost: number; imageUrl?: string };
  pts: number;
  onRedeem: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getColor(w.id);
  const affordable = pts >= w.cost;
  const progress = Math.min(pts / w.cost, 1);

  return (
    <div
      style={{ position: "relative", borderRadius: 8, overflow: "hidden",
        background: color.bg, aspectRatio: "1/1", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {w.imageUrl && (
        <img src={w.imageUrl} alt={w.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {/* 进度条 */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,0.1)" }}>
        <div style={{
          height: "100%", width: `${progress * 100}%`,
          background: affordable ? "#fbbf24" : WISH_THEME.base,
          transition: "width 0.4s ease", borderRadius: "0 2px 2px 0",
        }} />
      </div>
      {/* 文字 */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        justifyContent: "flex-end", padding: "5px 6px 7px", gap: 1 }}>
        <span style={{ color: color.text, fontSize: 10, fontWeight: 700, lineHeight: 1.25,
          wordBreak: "break-all", textShadow: w.imageUrl ? "0 1px 4px rgba(255,255,255,0.8)" : "none" }}>
          {w.title}
        </span>
        <span style={{ color: color.text, fontSize: 9, fontWeight: 800, opacity: 0.7,
          textShadow: w.imageUrl ? "0 1px 4px rgba(255,255,255,0.8)" : "none" }}>
          {w.cost} pts
        </span>
      </div>
      {/* 兑换 badge */}
      {affordable && (
        <button onClick={e => { e.stopPropagation(); onRedeem(); }}
          style={{ position: "absolute", top: 4, left: 4, background: "#fbbf24",
            border: "none", borderRadius: 5, padding: "2px 5px", cursor: "pointer",
            fontSize: 9, fontWeight: 800, color: "#78350f",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)", zIndex: 2 }}>
          兑换!
        </button>
      )}
      {/* 编辑/删除 */}
      {hovered && (
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3, zIndex: 2 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
              padding: "3px 4px", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center" }}>
            <Pencil size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
              padding: "3px 4px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LedgerTile ───────────────────────────────────────────────────────────────
function LedgerTile({ t, onDelete, onEdit }: {
  t: { id: string; title: string; amount: number; imageUrl?: string };
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasImg = !!t.imageUrl;
  const color = getColor(t.id);

  return (
    <div
      style={{ borderRadius: 8, overflow: "hidden", position: "relative",
        background: color.bg, aspectRatio: "1/1", cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasImg && (
        <img src={t.imageUrl} alt={t.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        justifyContent: "flex-end", padding: "5px 6px", gap: 1 }}>
        <span style={{ color: color.text, fontSize: 10, fontWeight: 700, lineHeight: 1.25,
          wordBreak: "break-all", textShadow: hasImg ? "0 1px 4px rgba(255,255,255,0.8)" : "none" }}>
          {t.title}
        </span>
        <span style={{ color: color.text, fontSize: 9, fontWeight: 800, opacity: 0.75,
          textShadow: hasImg ? "0 1px 4px rgba(255,255,255,0.8)" : "none" }}>
          {t.amount} pts
        </span>
      </div>
      {hovered && (
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 3 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
              padding: "3px 4px", cursor: "pointer", color: "#374151", display: "flex", alignItems: "center" }}>
            <Pencil size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "rgba(255,255,255,0.88)", border: "none", borderRadius: 5,
              padding: "3px 4px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 通用 AddForm（小表单） ────────────────────────────────────────────────────
function AddForm({ theme, costLabel, initialTitle, initialCost, initialImg, onSubmit, onCancel }: {
  theme: { base: string; pale: string };
  costLabel: string;
  initialTitle?: string;
  initialCost?: number;
  initialImg?: string;
  onSubmit: (title: string, cost: number, img?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]   = useState(initialTitle ?? "");
  const [cost,  setCost]    = useState(initialCost != null ? String(initialCost) : "");
  const [preview, setPreview] = useState<string | null>(initialImg ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 当外部编辑目标变化时同步预填充
  useEffect(() => {
    setTitle(initialTitle ?? "");
    setCost(initialCost != null ? String(initialCost) : "");
    setPreview(initialImg ?? null);
  }, [initialTitle, initialCost, initialImg]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await compressImage(file);
    setPreview(url);
  }, []);

  const submit = () => {
    const n = title.trim(), p = parseInt(cost, 10);
    if (!n || !p || p <= 0) return;
    onSubmit(n, p, preview ?? undefined);
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl border"
      style={{ background: theme.pale, borderColor: `${theme.base}30` }}>
      {preview && (
        <div className="relative w-14 h-14 rounded-xl overflow-hidden">
          <img src={preview} className="w-full h-full object-cover" />
          <button onClick={() => setPreview(null)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-red-400 flex items-center justify-center text-[9px]">
            <X size={9} />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="名称" onKeyDown={e => e.key === "Enter" && submit()}
          className="flex-1 text-[11px] px-2 py-1 rounded-lg border border-black/10 bg-white/80 outline-none" />
        <input value={cost} onChange={e => setCost(e.target.value)} placeholder={costLabel}
          onKeyDown={e => e.key === "Enter" && submit()}
          className="w-16 text-[11px] px-2 py-1 rounded-lg border border-black/10 bg-white/80 outline-none" />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/70 hover:bg-white transition-colors">
          <Camera size={12} className="text-slate-400" />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={submit}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-white text-[11px] font-semibold"
          style={{ background: theme.base }}>
          <Check size={11} /> 确认
        </button>
        <button onClick={onCancel}
          className="w-8 flex items-center justify-center py-1 rounded-lg text-[11px] bg-black/5 hover:bg-black/10 transition-colors">
          <X size={11} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── 主组件：许愿账本 ──────────────────────────────────────────────────────────
export function WishingLedgerCard() {
  const {
    tasks, taskHistory, transactions,
    wishlist, addWish, removeWish, updateWish, redeemWish,
    addTransaction, removeTransaction, updateTransaction,
  } = useWorkspaceStore();

  const pts       = monthlyPoints(taskHistory, transactions, tasks);
  const exchanged = monthlyExchanged(transactions);

  // ChestBurst 动画状态
  const [chestCost, setChestCost] = useState<number | null>(null);
  const pendingRedeemId = useRef<string | null>(null);

  // Wishlist 状态
  const [addingWish, setAddingWish]     = useState(false);
  const [editingWish, setEditingWish]   = useState<typeof wishlist[0] | null>(null);

  // Ledger 状态
  const [addingLed, setAddingLed]       = useState(false);
  const [editingLed, setEditingLed]     = useState<typeof transactions[0] | null>(null);

  const handleRedeem = (w: typeof wishlist[0]) => {
    if (pts < w.cost) return;
    pendingRedeemId.current = w.id;
    setChestCost(w.cost);
  };

  const handleChestDone = () => {
    if (pendingRedeemId.current) {
      redeemWish(pendingRedeemId.current);
      pendingRedeemId.current = null;
    }
    setChestCost(null);
  };

  // getChunkedRows 接受 oldest-first 数组，返回 [newest_chunk, ..., oldest_chunk]
  // wishlist 是 append（oldest-first）；transactions 是 prepend（newest-first，需先 reverse）
  const COLS = 4;
  function getChunkedRows<T>(oldestFirst: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < oldestFirst.length; i += COLS) chunks.push(oldestFirst.slice(i, i + COLS));
    return chunks.reverse(); // [newest_chunk, ..., oldest_chunk]
  }
  const wishRows = getChunkedRows(wishlist);                     // wishlist 已是 oldest-first
  const ledgRows = getChunkedRows([...transactions].reverse()); // transactions 需先 reverse

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* ── 全卡背景插画 ─────────────────────────────────────────────────────── */}
      <img
        src="/wishing-pool.png"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center top",
          pointerEvents: "none", userSelect: "none",
        }}
        draggable={false}
      />

      {/* ── 顶部积分浮层（在图片之上）──────────────────────────────────────── */}
      <div style={{ position: "relative", flexShrink: 0, height: 140, zIndex: 1 }}>
        <div style={{
          position: "absolute", bottom: 10, left: 12, right: 12,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        }}>
          <div className="flex flex-col" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)",
            borderRadius: 12, padding: "6px 10px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#6d28d9", letterSpacing: "0.1em", opacity: 0.7 }}>本月可用</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#6d28d9", lineHeight: 1 }}>{pts.toLocaleString()}<span style={{ fontSize: 10, marginLeft: 2 }}>pts</span></span>
          </div>
          <div className="flex flex-col items-end" style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(8px)",
            borderRadius: 12, padding: "6px 10px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.1em", opacity: 0.7 }}>本月已花</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8", lineHeight: 1 }}>{exchanged.toLocaleString()}<span style={{ fontSize: 10, marginLeft: 2 }}>pts</span></span>
          </div>
        </div>
      </div>

      {/* ── 可滚动内容区（叠在插画上，10% 透明）──────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-none"
        style={{ position: "relative", zIndex: 1, padding: "12px 14px 16px",
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(2px)",
        }}>

        {/* ── 许愿区 ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "var(--font-caveat)", fontSize: 14, fontWeight: 700, color: WISH_THEME.dark }}>
            Wishlist
          </span>
          <button onClick={() => { setAddingWish(true); setEditingWish(null); }}
            className="flex items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ fontFamily: "var(--font-caveat)", color: "rgba(0,0,0,0.35)", border: "none", background: "transparent", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Plus size={11} /> 添加
          </button>
        </div>

      {(addingWish || editingWish) && (
          <div className="mb-3">
            <AddForm
              theme={WISH_THEME}
              costLabel="积分"
              initialTitle={editingWish?.title}
              initialCost={editingWish?.cost}
              initialImg={editingWish?.imageUrl}
              onSubmit={(title, cost, img) => {
                if (editingWish) updateWish(editingWish.id, title, cost, img);
                else addWish(title, cost, img);
                setAddingWish(false); setEditingWish(null);
              }}
              onCancel={() => { setAddingWish(false); setEditingWish(null); }}
            />
          </div>
        )}

        {wishlist.length === 0 && !addingWish ? (
          <div className="text-center py-4 text-[11px] text-black/25">还没有心愿，许个愿吧 ✨</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {wishRows.map((row, ri) => (
              <Fragment key={ri}>
                {row.map(w => (
                  <WishTile key={w.id} w={w} pts={pts}
                    onRedeem={() => handleRedeem(w)}
                    onEdit={() => { setEditingWish(w); setAddingWish(false); }}
                    onDelete={() => removeWish(w.id)}
                  />
                ))}
                {/* 未满一行补空白格，岁云正确行对齐 */}
                {Array.from({ length: COLS - row.length }).map((_, j) => (
                  <div key={`wpad-${j}`} style={{ aspectRatio: "1/1" }} />
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {/* ── 分隔线 ──────────────────────────────────────────────────────── */}
        <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0 12px" }} />

        {/* ── 流水区 ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "var(--font-caveat)", fontSize: 14, fontWeight: 700, color: LED_THEME.dark }}>
            Ledger
          </span>
          <button onClick={() => { setAddingLed(true); setEditingLed(null); }}
            className="flex items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ fontFamily: "var(--font-caveat)", color: "rgba(0,0,0,0.35)", border: "none", background: "transparent", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Plus size={11} /> 添加
          </button>
        </div>

        {(addingLed || editingLed) && (
          <div className="mb-3">
            <AddForm
              theme={LED_THEME}
              costLabel="积分"
              initialTitle={editingLed?.title}
              initialCost={editingLed ? Math.abs(editingLed.amount) : undefined}
              initialImg={editingLed?.imageUrl}
              onSubmit={(title, cost, img) => {
                if (editingLed) updateTransaction(editingLed.id, title, -cost, img);
                else addTransaction(title, -cost, img);
                setAddingLed(false); setEditingLed(null);
              }}
              onCancel={() => { setAddingLed(false); setEditingLed(null); }}
            />
          </div>
        )}

        {transactions.length === 0 && !addingLed ? (
          <div className="text-center py-4 text-[11px] text-black/25">还没有消费记录</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {ledgRows.map((row, ri) => (
              <Fragment key={ri}>
                {row.map(t => (
                  <LedgerTile key={t.id} t={t}
                    onEdit={() => { setEditingLed(t); setAddingLed(false); }}
                    onDelete={() => removeTransaction(t.id)}
                  />
                ))}
                {Array.from({ length: COLS - row.length }).map((_, j) => (
                  <div key={`lpad-${j}`} style={{ aspectRatio: "1/1" }} />
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ChestBurst 动画 */}
      {chestCost !== null && typeof document !== "undefined" &&
        createPortal(
          <ChestBurst cost={chestCost} onDone={handleChestDone} />,
          document.body
        )
      }
    </div>
  );
}
