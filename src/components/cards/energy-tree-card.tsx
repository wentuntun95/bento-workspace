"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { weeklyEarned, monthlyEarned, currentISOWeek, type TaskHistoryEntry } from "@/lib/points";

// ── 按 ISO 周筛选 taskHistory，展开为虚拟果实列表 ──────────────────────────
function getISOWeekFromStr(dateStr: string): string {
  const d = new Date(dateStr);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-${String(wk).padStart(2, "0")}`;
}

type VirtualFruit = { type: string };

function buildWeeklyFruits(
  taskHistory: TaskHistoryEntry[],
  currentTasks: { completed: boolean; type: string }[]
): VirtualFruit[] {
  const week = currentISOWeek();
  const historic: VirtualFruit[] = [];
  for (const entry of taskHistory) {
    if (getISOWeekFromStr(entry.date) !== week) continue;
    for (let i = 0; i < entry.survive; i++)  historic.push({ type: "survive" });
    for (let i = 0; i < entry.creation; i++) historic.push({ type: "creation" });
    for (let i = 0; i < entry.fun; i++)      historic.push({ type: "fun" });
    for (let i = 0; i < entry.heal; i++)     historic.push({ type: "heal" });
  }
  const today: VirtualFruit[] = currentTasks.filter(t => t.completed).map(t => ({ type: t.type }));
  return [...historic, ...today];
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS — matches energytree-design-note.md exactly
// ─────────────────────────────────────────────────────────────
// U (px per block) is computed at draw-time based on container size
// see draw() → const U = ...

// Bark palette
const B = { bark: "#8B5E3C", mid: "#6B4226", shd: "#4A2C14", lt: "#C49A6C", root: "#5C3D1E" };

// Leaf colour tiers (5 tiers, 0-4) — from design doc
const LC = ["#eaff88", "#8ee030", "#3ea810", "#1a5c06", "#062e01"] as const;

// Fruit colours by task type
const FRUIT: Record<string, [string, string]> = {
  survive:  ["#60b8f8", "#38bdf8"],
  creation: ["#86efac", "#4ade80"],
  fun:      ["#f9a8d4", "#f472b6"],
  heal:     ["#c4b5fd", "#a78bfa"],
};

// Fruit slot positions — 50 slots via golden-angle spiral
// r goes from 0.35 (inner canopy) to 1.15 (branch tips just outside ellipse)
const FRUIT_SLOTS = (() => {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: 50 }, (_, i) => {
    const t = i / 50;
    const r = 0.35 + t * 0.80;   // 35% → 115% of canopy radius
    const theta = i * golden;
    return {
      gx: Math.round(19 * r * Math.cos(theta)),       // ECX=0
      gy: Math.round(-27 + 18 * r * Math.sin(theta)), // ECY=-27, ERY=18
    };
  });
})();

// ─── Seeded hash ─────────────────────────────────────────────
const rng = (n: number) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5) % 1;

// ─── Canopy: single-ellipse + brightness-threshold (doc v8) ──
const ECX = 0, ECY = -27, ERX = 19, ERY = 18, NOISE_THR = 0.18;
const LIGHT = { x: -0.25, y: -1.0 }; // from design doc

interface ClusterCentre { x: number; y: number }
const CLUSTER_CENTRES: ClusterCentre[] = [];
for (let ci = -7; ci <= 7; ci++) {
  for (let ri = -11; ri <= -2; ri++) {
    CLUSTER_CENTRES.push({
      x: ci * 5 + (rng(ci * 7 + ri * 13) - 0.5) * 3.5,
      y: ri * 4 + (rng(ci * 11 + ri * 17) - 0.5) * 2.5,
    });
  }
}

function computeBrightness(gx: number, gy: number): number {
  // Find nearest cluster centre
  let minDist = 999, nx = 0, ny = 0;
  for (const c of CLUSTER_CENTRES) {
    const dx = gx - c.x, dy = gy - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) { minDist = d; nx = dx / (d || 1); ny = dy / (d || 1); }
  }
  const dot = nx * (-LIGHT.x) + ny * (-LIGHT.y);
  const facing = (dot + 1) / 2;
  // clusterB: near-centre + facing-light = bright
  const clusterB = Math.max(0, 1.3 - minDist * 0.52) * (0.4 + facing * 0.6);
  // global Y gradient (top=1, bottom=0)
  const globalY = 1 - ((gy - (ECY - ERY)) / (2 * ERY));
  const yMod = 0.40 + Math.max(0, Math.min(1, globalY)) * 0.90;
  return Math.min(1, clusterB * yMod);
}

function brightnessToTier(b: number): number {
  if (b > 0.82) return 0;
  if (b > 0.60) return 1;
  if (b > 0.36) return 2;
  if (b > 0.16) return 3;
  return 4;
}

function buildCanopy() {
  const cells: { gx: number; gy: number; tier: number }[] = [];
  for (let gx = -ERX - 3; gx <= ERX + 3; gx++) {
    for (let gy = ECY - ERY - 3; gy <= ECY + ERY + 3; gy++) {
      const dx = (gx - ECX) / ERX, dy = (gy - ECY) / ERY;
      const r2 = dx * dx + dy * dy;
      const seed = rng(gx * 17.3 + gy * 31.7);
      const atEdge = r2 > (1 - NOISE_THR) ** 2 && r2 < (1 + NOISE_THR) ** 2;
      const inside = atEdge
        ? seed < (1 - (Math.sqrt(r2) - (1 - NOISE_THR)) / (2 * NOISE_THR))
        : r2 < 1;
      if (!inside) continue;
      cells.push({ gx, gy, tier: brightnessToTier(computeBrightness(gx, gy)) });
    }
  }
  return cells;
}

// ─── Trunk (12 blocks high, narrowing top) ───────────────────
function buildTrunk() {
  const cells: { gx: number; gy: number; col: string }[] = [];
  for (let gy = -12; gy <= 0; gy++) {
    const t = (-gy) / 12; // 0 at base, 1 at top
    const hw = Math.max(1, Math.round(3 - t * 2));
    for (let gx = -hw; gx <= hw; gx++) {
      const isEdge = Math.abs(gx) === hw;
      cells.push({ gx, gy, col: isEdge ? B.shd : (gx <= 0 ? B.mid : B.bark) });
    }
  }
  return cells;
}

// ─── Stump (年轮底座) ────────────────────────────────────────
function buildStump() {
  const cols = ["#e8c060", "#c89030", "#9c6018", "#6e3c0c", "#3e2004"];
  const cells: { gx: number; gy: number; col: string }[] = [];
  for (let gy = 0; gy <= 3; gy++) {
    const w = 3 + gy;
    for (let gx = -w; gx <= w; gx++) {
      const t = Math.min(4, Math.floor(((gx + w) / (2 * w + 1)) * 5));
      cells.push({ gx, gy, col: cols[t] });
    }
  }
  return cells;
}

// ─── Branches ────────────────────────────────────────────────
function buildBranches() {
  const cells: { gx: number; gy: number; col: string }[] = [];
  for (const [dx, dy, len] of [[-1,-1,6],[1,-1,5],[-2,-1,4],[2,-1,3]] as [number,number,number][]) {
    for (let i = 1; i <= len; i++) {
      cells.push({ gx: dx * i, gy: -12 + dy * i, col: i === 1 ? B.mid : B.bark });
    }
  }
  return cells;
}

// ─── Door pixels (5×8 handcrafted) ──────────────────────────
type DC = "f" | "w" | "p" | "d" | "h";
const DOOR_LAYOUT: [number, number, DC][] = [
  [-2,-11,"f"],[-1,-11,"w"],[0,-11,"w"],[1,-11,"w"],[2,-11,"f"],
  [-2,-10,"f"],[-1,-10,"w"],[0,-10,"d"],[1,-10,"w"],[2,-10,"f"],
  [-2,-9,"f"], [-1,-9,"w"], [0,-9,"w"], [1,-9,"w"], [2,-9,"f"],
  [-2,-8,"f"], [-1,-8,"d"], [0,-8,"w"], [1,-8,"d"], [2,-8,"f"],
  [-2,-7,"f"], [-1,-7,"w"], [0,-7,"p"], [1,-7,"w"], [2,-7,"f"],
  [-2,-6,"f"], [-1,-6,"w"], [0,-6,"w"], [1,-6,"w"], [2,-6,"f"],
  [-2,-5,"f"], [-1,-5,"p"], [0,-5,"p"], [1,-5,"p"], [2,-5,"f"],
  [-2,-4,"f"], [-1,-4,"w"], [0,-4,"w"], [1,-4,"h"], [2,-4,"f"],
  [-2,-3,"f"], [-1,-3,"w"], [0,-3,"w"], [1,-3,"w"], [2,-3,"f"],
];
const DOOR_COL: Record<DC, string> = { f: B.shd, w: "#c8803a", p: "#7a4420", d: "#5a3010", h: "#e8c030" };

// ─── Pre-build geometry ───────────────────────────────────────
const GEO_CANOPY   = buildCanopy();
const GEO_TRUNK    = buildTrunk();
const GEO_STUMP    = buildStump();
const GEO_BRANCHES = buildBranches();

// ─── Particles ───────────────────────────────────────────────
interface Leaf { x:number;y:number;resetY:number;vx:number;vy:number;phase:number;rot:number;rotSpd:number;col:string;w:number;h:number }
interface FF   { x:number;y:number;spd:number;phase:number;drift:number;sz:number;col:string }

const LFC = ["#7ad828","#d4ff70","#3ea810","#a8e040"];
const FFC = ["#fde68a","#fbbf24","#a7f3d0","#d8b4fe"];

const LEAVES: Leaf[] = Array.from({ length: 16 }, (_, i) => ({
  x: (rng(i*3.1)-0.5)*150, y: -(rng(i*7.3)*220+10), resetY: -(rng(i*7.3)*220+10),
  vx: (rng(i*11.5)-0.5)*0.5, vy: 0.35+rng(i*5.7)*0.55, phase: rng(i*2.9)*Math.PI*2,
  rot: rng(i*15)*Math.PI*2, rotSpd: (rng(i*8.1)-0.5)*0.06,
  col: LFC[i%LFC.length], w: 3+rng(i*4.1)*2, h: 2+rng(i*6.7)*1.2,
}));

const FIREFLIES: FF[] = Array.from({ length: 12 }, (_, i) => ({
  x: (rng(i*3.3)-0.5)*170, y: -(rng(i*6.7)*190+20),
  spd: 0.12+rng(i*2.9)*0.20, phase: rng(i*5.1)*Math.PI*2,
  drift: (rng(i*9.7)-0.5)*1.4, sz: 1.5+rng(i*4.3)*2, col: FFC[i%FFC.length],
}));

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export function EnergyTreeCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { tasks, taskHistory } = useWorkspaceStore();
  const wPts = weeklyEarned(taskHistory, tasks);
  const mPts = monthlyEarned(taskHistory, tasks);

  // Hybrid B：本周 taskHistory 展开 + 今日实时 tasks
  const allFruits = buildWeeklyFruits(taskHistory, tasks);
  const fruits = allFruits
    .slice(-FRUIT_SLOTS.length)
    .map((t, i) => ({ slot: FRUIT_SLOTS[i], type: t.type }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number, tick = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width  = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    window.addEventListener("resize", resize);
    resize();

    const blk = (gx: number, gy: number, col: string, ox: number, oy: number, u: number, sw = 0, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.fillRect(ox + gx * u + sw, oy + gy * u, u - 1, u - 1);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      const rect = canvasRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const { width: W, height: H } = rect;
      ctx.clearRect(0, 0, W, H);
      tick += 0.016;

      // origin: bottom-centre, from design doc (ox=W*0.495, oy=H*0.94)
      const ox = W * 0.495, oy = H * 0.94;
      // 动态像素块大小：随充容器高度自适应（H/72 约为 90% zoom 时 = 7px）
      const U = Math.max(4, Math.min(14, Math.round(H / 72)));
      const SW = Math.sin(tick * 0.65) * 2.5; // sway

      // Stump
      GEO_STUMP.forEach(({ gx, gy, col }) => blk(gx, gy, col, ox, oy, U));

      // Trunk
      GEO_TRUNK.forEach(({ gx, gy, col }) => {
        const p = (-gy) / 12;
        blk(gx, gy, col, ox, oy, U, SW * p * 0.25);
      });

      // Door (no glow)
      DOOR_LAYOUT.forEach(([gx, gy, dc]) => {
        const col = DOOR_COL[dc];
        blk(gx, gy, col, ox, oy, U, SW * 0.15);
      });

      // Branches
      GEO_BRANCHES.forEach(({ gx, gy, col }) => {
        const p = (-gy) / 16;
        blk(gx, gy, col, ox, oy, U, SW * p * 0.65);
      });

      // Canopy (breathing alpha animation)
      GEO_CANOPY.forEach(({ gx, gy, tier }) => {
        const br = 0.88 + Math.sin(tick * 1.4 + gx * 0.28 + gy * 0.22) * 0.12;
        const ss = 1.05 + Math.abs(gx) * 0.01;
        blk(gx, gy, LC[tier], ox, oy, U, SW * ss, br);
      });

      // Fruits (2U×2U, glowing)
      const FU = U * 2 + 1;
      fruits.forEach(({ slot, type }, i) => {
        const [light, glow] = FRUIT[type] ?? FRUIT.creation;
        const fy = Math.sin(tick * 1.2 + i * 1.7) * 7;
        const cx = ox + slot.gx * U + SW * 1.2;
        const cy = oy + slot.gy * U + fy;
        ctx.save();
        ctx.shadowColor = glow; ctx.shadowBlur = 32;
        ctx.fillStyle = light; ctx.globalAlpha = 0.95;
        ctx.fillRect(cx, cy, FU, FU);
        ctx.shadowBlur = 10;
        ctx.fillStyle = light; ctx.globalAlpha = 0.70;
        ctx.fillRect(cx + 1, cy + 1, FU - 2, FU - 2);
        ctx.shadowBlur = 0; ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.85;
        ctx.fillRect(cx + 1, cy + 1, 3, 3);
        ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.5; ctx.globalAlpha = 1;
        ctx.strokeRect(cx + 0.25, cy + 0.25, FU - 0.5, FU - 0.5);
        ctx.restore();
      });

      // Falling leaves
      LEAVES.forEach(lf => {
        lf.y += lf.vy; lf.x += lf.vx + Math.sin(tick * 0.7 + lf.phase) * 0.5; lf.rot += lf.rotSpd;
        if (lf.y > 80) { lf.y = lf.resetY; lf.x = (rng(tick * 0.02 + lf.phase) - 0.5) * 150; }
        ctx.save();
        ctx.translate(ox + lf.x, oy + lf.y); ctx.rotate(lf.rot);
        ctx.fillStyle = lf.col; ctx.globalAlpha = 0.80;
        ctx.beginPath(); ctx.ellipse(0, 0, lf.w, lf.h, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Fireflies
      FIREFLIES.forEach(ff => {
        ff.y -= ff.spd; ff.x += Math.sin(tick * 0.85 + ff.phase) * ff.drift;
        if (ff.y < -H * 0.92) { ff.y = 20; ff.x = (rng(tick * 0.03 + ff.phase) - 0.5) * 170; }
        const al = 0.35 + Math.sin(tick * 2.1 + ff.phase) * 0.65;
        ctx.save();
        ctx.shadowColor = ff.col; ctx.shadowBlur = 16;
        ctx.fillStyle = ff.col; ctx.globalAlpha = al;
        ctx.fillRect(ox + ff.x, oy + ff.y, ff.sz, ff.sz);
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFruits.length, allFruits.map(f => f.type).join(",")]);

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden rounded-3xl">
      {/* Flat background — per impeccable: no gradient AI slop */}
      {/* 薄荷绿调浅色底 = 设计文档 "薄荷绿", 但非渐变 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "oklch(95.5% 0.025 150)" }}
      />
      {/* Very subtle dot grid for texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle,#1a5c06 1px,transparent 1px)", backgroundSize: "20px 20px" }}
      />

      {/* Canvas */}
      <div className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: "pixelated" }} />
      </div>

      {/* HUD */}
      <div className="relative z-10 p-4 flex flex-col justify-between h-full pointer-events-none">
        <div className="flex justify-between items-end">
          <div className="pointer-events-auto flex flex-col bg-white/65 backdrop-blur-md px-3 py-2 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/70 mb-0.5">Energy</span>
            <span className="text-lg font-black text-emerald-700 leading-none">
            <span className="text-[9px] font-medium text-emerald-500/80">本周累计</span>
              <span className="text-lg font-black text-emerald-700 ml-1.5">{wPts}</span>
              <span className="text-[9px] font-medium text-emerald-500/80 ml-3">本月累计</span>
              <span className="ml-1 text-emerald-500 font-semibold">{mPts}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
