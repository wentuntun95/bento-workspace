"use client";

/**
 * XiaoYou — 小鱿桌面宠物
 * - 随机出现在屏幕角落
 * - 可拖动（指针事件）
 * - 随机切换表情包（闲置 + 点击 + 自动轮换）
 * - DDL 前 30 min 弹气泡提醒，可手动关闭
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspaceStore, DDLItem } from "@/lib/store";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 表情包配置 ───────────────────────────────────────────────
const EMOTES = [
  { src: "/squid/wusopu.png", label: "乌索普", weight: 4 },
  { src: "/squid/zeixiao.png", label: "贼笑", weight: 3 },
  { src: "/squid/liukoushui.png", label: "流口水", weight: 2 },
  { src: "/squid/xiongdaidai.png", label: "熊呆呆", weight: 2 },
  { src: "/squid/shengmenqi.png", label: "生闷气", weight: 1 },
  { src: "/squid/daku.png", label: "哭哭", weight: 1 },
] as const;

// 按权重随机抽一个表情
const totalWeight = EMOTES.reduce((s, e) => s + e.weight, 0);
function randomEmote(exclude?: string) {
  const pool = EMOTES.filter(e => e.src !== exclude);
  const w = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * w;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[0];
}

// ─── 随机角落坐标（距边缘 16–80px 随机偏移） ────────────────
const CORNERS = ["TL", "TR", "BL", "BR"] as const;
type Corner = typeof CORNERS[number];
function cornerPos(corner: Corner, W: number, H: number, size = 80) {
  const pad = 16 + Math.random() * 64;
  const x = corner.endsWith("L") ? pad : W - size - pad;
  const y = corner.startsWith("T") ? pad + 60 : H - size - pad;
  return { x, y };
}

// ─── DDL 时间差（分钟） ───────────────────────────────────────
function minutesUntil(ddl: DDLItem): number {
  if (!ddl.time) return Infinity;
  const [h, m] = ddl.time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return Infinity;
  const target = new Date(ddl.date);
  target.setHours(h, m, 0, 0);
  return Math.floor((target.getTime() - Date.now()) / 60000);
}

// ─── Component ────────────────────────────────────────────────
export function XiaoYouReminder() {
  const ddls = useWorkspaceStore(s => s.ddls);

  // Position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [emote, setEmote] = useState(() => randomEmote());

  // Drag state
  const dragRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  // Reminder state
  const [alert, setAlert] = useState<DDLItem | null>(null);
  const [minsLeft, setMinsLeft] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [alertVisible, setAlertVisible] = useState(false);

  // Hover
  const [hovered, setHovered] = useState(false);

  // Init position to random corner
  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const corner = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    const p = cornerPos(corner, W, H);
    setPos(p);
    posRef.current = p;
  }, []);

  // Auto-rotate expression every 8s when idle
  useEffect(() => {
    const id = setInterval(() => {
      if (!dragRef.current) setEmote(prev => randomEmote(prev.src));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // DDL watch
  const checkDdl = useCallback(() => {
    for (const ddl of ddls) {
      const mins = minutesUntil(ddl);
      if (mins >= 0 && mins <= 30 && !dismissed.has(ddl.id)) {
        setAlert(ddl);
        setMinsLeft(mins);
        setAlertVisible(true);
        // 切成"凶呆呆"或"打哭"表情
        setEmote(mins <= 5 ? EMOTES[5] : EMOTES[3]);
        return;
      }
    }
    // Check if current alert is still valid
    setAlert(prev => {
      if (!prev) return null;
      const mins = minutesUntil(prev);
      if (mins < 0 || mins > 30) { setAlertVisible(false); return null; }
      return prev;
    });
  }, [ddls, dismissed]);

  useEffect(() => {
    checkDdl();
    const id = setInterval(checkDdl, 30_000);
    return () => clearInterval(id);
  }, [checkDdl]);

  // ── Drag (pointer events) ─────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = true;
    offsetRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const nx = e.clientX - offsetRef.current.x;
    const ny = e.clientY - offsetRef.current.y;
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = false;
    // Snap to nearest corner
    const W = window.innerWidth, H = window.innerHeight;
    const cx = posRef.current.x, cy = posRef.current.y;
    const corner: Corner = `${cy < H / 2 ? "T" : "B"}${cx < W / 2 ? "L" : "R"}` as Corner;
    const snap = cornerPos(corner, W, H);
    posRef.current = snap;
    setPos(snap);
    // Playful expression change on drop
    setEmote(randomEmote(emote.src));
  }

  function onClick() {
    if (!dragRef.current) setEmote(prev => randomEmote(prev.src));
  }

  function dismissAlert() {
    if (alert) setDismissed(prev => new Set([...prev, alert.id]));
    setAlertVisible(false);
    setAlert(null);
    setEmote(randomEmote(emote.src));
  }

  if (!pos) return null;

  const urgent = minsLeft <= 5;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9990,
        userSelect: "none",
        transition: dragRef.current ? "none" : "left 0.5s cubic-bezier(0.34,1.2,0.64,1), top 0.5s cubic-bezier(0.34,1.2,0.64,1)",
      }}
    >
      {/* DDL 提醒气泡 */}
      {alertVisible && alert && (
        <div
          className={cn(
            "absolute bottom-[90px] right-0 w-52 rounded-2xl rounded-br-sm px-3.5 py-3",
            "bg-white/96 border border-amber-200/70 shadow-xl backdrop-blur-xl",
            "animate-[xiaoYouIn_0.4s_cubic-bezier(0.34,1.4,0.64,1)_both]"
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[11px] font-black tracking-wide", urgent ? "text-red-500" : "text-amber-500")}>
              {urgent ? "⚡ 快了快了！" : "⏰ 快到啦！"}
            </span>
            <button onClick={dismissAlert} className="text-foreground/20 hover:text-foreground/60 transition-colors">
              <X size={11} />
            </button>
          </div>
          <p className="text-[13px] font-bold text-foreground/80 leading-snug mb-1.5">{alert.title}</p>
          <div className="flex flex-col gap-0.5 text-[10px] text-foreground/40">
            <span>{minsLeft === 0 ? "现在就是截止时间！" : `还有 ${minsLeft} 分钟`}</span>
            {alert.contact && <span>👤 {alert.contact}</span>}
          </div>
          {/* Bubble tail */}
          <div className="absolute -bottom-[8px] right-5 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-white/96" />
        </div>
      )}

      {/* 小鱿本体 */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative w-20 h-20 cursor-grab active:cursor-grabbing select-none",
          "transition-transform duration-200",
          hovered && !dragRef.current && "scale-110",
        )}
        style={{ animation: dragRef.current ? "none" : "squidBob 3s ease-in-out infinite" }}
        title={`小鱿 · ${emote.label} · 点击换表情`}
      >
        <img
          src={emote.src}
          alt={`小鱿 ${emote.label}`}
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ animation: "breathe 3s ease-in-out infinite" }}
          draggable={false}
        />
      </div>

      <style>{`
        @keyframes squidBob {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02, 0.98); }
        }
        @keyframes xiaoYouIn {
          from { opacity: 0; transform: scale(0.7) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
