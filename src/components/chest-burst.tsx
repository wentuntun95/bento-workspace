"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── 工具 ────────────────────────────────────────────────────────
const rand = (a: number, b: number) => Math.random() * (b - a) + a;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ─── 粒子 ────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  alpha: number; life: number; maxLife: number;
  type: "diamond" | "circle";
}

const DIAMOND_COLORS = ["#ffffff", "#d4f0ff", "#aaddf5", "#73c8f0", "#ffe882", "#fff0a0"];

function spawnParticles(cx: number, cy: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(2, 12);
    out.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(1, 6),
      size: i < 14 ? rand(6, 16) : rand(4, 8),
      color: DIAMOND_COLORS[Math.floor(rand(0, DIAMOND_COLORS.length))],
      alpha: 1,
      life: 0,
      maxLife: rand(45, 90),
      type: i < 20 ? "diamond" : "circle",
    });
  }
  return out;
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.45, y);
  ctx.lineTo(x, y + h); ctx.lineTo(x - w * 0.45, y);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawCirclePart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── 绘制心形 ─────────────────────────────────────────────────────
function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.3);
  ctx.bezierCurveTo(cx, cy - size * 0.15, cx - size, cy - size * 0.15, cx - size, cy + size * 0.35);
  ctx.bezierCurveTo(cx - size, cy + size * 0.8, cx, cy + size * 1.1, cx, cy + size * 1.1);
  ctx.bezierCurveTo(cx, cy + size * 1.1, cx + size, cy + size * 0.8, cx + size, cy + size * 0.35);
  ctx.bezierCurveTo(cx + size, cy - size * 0.15, cx, cy - size * 0.15, cx, cy + size * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ─── 插画风宝箱（蓝体 + 金框，多邻国风格）────────────────────────
function drawChest(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  openAngle: number, shake: number, scale: number
) {
  const W = 155, bodyH = 66, lidH = 50;
  ctx.save();
  ctx.translate(cx + shake, cy);
  ctx.scale(scale, scale);

  const bY = -bodyH / 2;   // body 顶部 y（相对绘制中心）

  // ── 地面阴影 ──
  ctx.fillStyle = "rgba(46, 110, 200, 0.20)";
  ctx.beginPath();
  ctx.ellipse(0, bY + bodyH + 14, W * 0.52, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── 箱体主色（蓝色）──
  ctx.fillStyle = "#2B88D9";
  roundRect(ctx, -W / 2, bY, W, bodyH, 12);
  ctx.fill();

  // 箱体高光横条（浅蓝）
  ctx.fillStyle = "#3FA4F0";
  roundRect(ctx, -W / 2 + 10, bY + bodyH * 0.18, W - 20, bodyH * 0.28, 5);
  ctx.fill();

  // 箱体底部暗色
  ctx.fillStyle = "#1E6CB5";
  roundRect(ctx, -W / 2 + 10, bY + bodyH * 0.65, W - 20, bodyH * 0.27, 5);
  ctx.fill();

  // ── 黄金边框（左右竖条）──
  const frameW = 24, frameH = bodyH + 16;
  ctx.fillStyle = "#FFD000";
  roundRect(ctx, -W / 2 - 8, bY - 8, frameW, frameH, 10);
  ctx.fill();
  roundRect(ctx, W / 2 - frameW + 8, bY - 8, frameW, frameH, 10);
  ctx.fill();
  // 竖条内阴影
  ctx.fillStyle = "#E6a800";
  ctx.fillRect(-W / 2 - 8 + frameW - 6, bY - 8, 6, frameH);
  ctx.fillRect(W / 2 - 6 + 8, bY - 8, 6, frameH);

  // ── 箱盖（绕底部铰链旋转）──
  ctx.save();
  ctx.translate(0, bY);
  ctx.rotate(-openAngle * (Math.PI / 1.9));
  ctx.translate(0, -lidH);

  // 盖面蓝色
  ctx.fillStyle = "#2B88D9";
  roundRect(ctx, -W / 2, 0, W, lidH, 12);
  ctx.fill();
  // 盖面高光
  ctx.fillStyle = "#3FA4F0";
  roundRect(ctx, -W / 2 + 10, 6, W - 20, lidH * 0.4, 5);
  ctx.fill();
  // 盖面暗色
  ctx.fillStyle = "#1E6CB5";
  roundRect(ctx, -W / 2 + 10, lidH * 0.7, W - 20, lidH * 0.22, 4);
  ctx.fill();

  // 盖面黄金框（顶部横条）
  ctx.fillStyle = "#FFD000";
  roundRect(ctx, -W / 2 - 8, -8, W + 16, 14, 6);
  ctx.fill();
  ctx.fillStyle = "#E6a800";
  ctx.fillRect(-W / 2 - 8, 2, W + 16, 4);

  // 盖面黄金竖条
  ctx.fillStyle = "#FFD000";
  roundRect(ctx, -W / 2 - 8, -8, frameW, lidH + 10, 10);
  ctx.fill();
  roundRect(ctx, W / 2 - frameW + 8, -8, frameW, lidH + 10, 10);
  ctx.fill();

  // 开盖时的内部黄色光晕
  if (openAngle > 0.15) {
    ctx.save();
    ctx.globalAlpha = Math.min(openAngle * 1.4, 0.92);
    const innerGrd = ctx.createRadialGradient(0, lidH * 0.3, 0, 0, lidH * 0.6, 80);
    innerGrd.addColorStop(0, "rgba(255,230,80,1)");
    innerGrd.addColorStop(0.45, "rgba(255,200,30,0.6)");
    innerGrd.addColorStop(1, "rgba(255,180,0,0)");
    ctx.fillStyle = innerGrd;
    ctx.fillRect(-W / 2, lidH * 0.1, W, 90);
    ctx.restore();
  }

  ctx.restore(); // end lid

  // ── 扁平矩形锁扣（金色边框 + 白色心形）──
  const lockY = bY + bodyH * 0.26;
  const claspW = 50, claspH = 28;
  // 锁扣阴影
  ctx.fillStyle = "#C88000";
  roundRect(ctx, -claspW / 2, lockY - claspH / 2 + 2, claspW, claspH, 9);
  ctx.fill();
  // 锁扣主体
  ctx.fillStyle = "#FFD000";
  roundRect(ctx, -claspW / 2, lockY - claspH / 2, claspW, claspH, 9);
  ctx.fill();
  // 锁扣高光
  ctx.fillStyle = "rgba(255,255,180,0.55)";
  roundRect(ctx, -claspW / 2 + 5, lockY - claspH / 2 + 4, claspW - 10, claspH * 0.38, 5);
  ctx.fill();
  // 白色心形
  drawHeart(ctx, -8, lockY - 10, 8.5, "rgba(255,255,255,0.95)");

  // ── 开盖时箱口黄色辉光 ──
  if (openAngle > 0.25) {
    ctx.save();
    ctx.globalAlpha = Math.min(openAngle * 1.6, 1) * 0.80;
    const grd = ctx.createRadialGradient(0, bY, 4, 0, bY - 10, 100);
    grd.addColorStop(0, "rgba(255, 240, 80, 1)");
    grd.addColorStop(0.5, "rgba(255,210,30,0.4)");
    grd.addColorStop(1, "rgba(255,180,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, bY - 10, 100, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 黄色十字星
function drawCrossStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#FFE030";
  ctx.shadowColor = "#FFD000"; ctx.shadowBlur = 10;
  const s = size, t = size * 0.28;
  ctx.beginPath();
  ctx.moveTo(x - t, y - s); ctx.lineTo(x + t, y - s);
  ctx.lineTo(x + t, y - t); ctx.lineTo(x + s, y - t);
  ctx.lineTo(x + s, y + t); ctx.lineTo(x + t, y + t);
  ctx.lineTo(x + t, y + s); ctx.lineTo(x - t, y + s);
  ctx.lineTo(x - t, y + t); ctx.lineTo(x - s, y + t);
  ctx.lineTo(x - s, y - t); ctx.lineTo(x - t, y - t);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// 8 颗十字星从宝箱口缓缓上升
function drawRisingStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const stars = [
    { ox: -40, size: 9, delay: 0.0 },
    { ox:  25, size: 7, delay: 0.06 },
    { ox: -70, size: 6, delay: 0.10 },
    { ox:  60, size: 10, delay: 0.04 },
    { ox:   5, size: 8, delay: 0.14 },
    { ox: -20, size: 6, delay: 0.18 },
    { ox:  45, size: 7, delay: 0.08 },
    { ox: -55, size: 9, delay: 0.16 },
  ];
  stars.forEach(s => {
    const p = Math.max(0, t - s.delay);
    if (p <= 0) return;
    const alpha = Math.min(p * 4, 1) * (t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25);
    const y = cy - 40 - p * 120; // 向上漂浮
    drawCrossStar(ctx, cx + s.ox, y, s.size, alpha);
  });
}

// 漂浮菱形（参考图中的 sparkle）
function drawFloatingDiamonds(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const diamonds = [
    { ox: -85, oy: -130, size: 10, delay: 0.0 },
    { ox:  50, oy: -165, size: 8,  delay: 0.05 },
    { ox: -45, oy: -185, size: 14, delay: 0.1 },
    { ox:  95, oy: -120, size: 9,  delay: 0.08 },
    { ox: -120, oy: -80, size: 7,  delay: 0.12 },
    { ox:  110, oy: -60, size: 8,  delay: 0.15 },
    { ox: -60,  oy:  80, size: 6,  delay: 0.18 },
    { ox:  130, oy:  30, size: 7,  delay: 0.22 },
  ];
  diamonds.forEach(d => {
    const p = Math.max(0, t - d.delay);
    if (p <= 0) return;
    const alpha = Math.min(p * 3, 1) * (t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2);
    const y = cy + d.oy - p * 30; // 缓慢上浮
    drawDiamond(ctx, cx + d.ox, y, d.size * 0.6, d.size, "rgba(255,255,255,0.92)", alpha);
  });
}

function drawFloatText(ctx: CanvasRenderingContext2D, cx: number, cy: number, cost: number, phase: number) {
  const y  = cy - phase * 90 - 80;
  const al = phase < 0.6 ? 1 : 1 - (phase - 0.6) / 0.4;
  ctx.save();
  ctx.globalAlpha = al;
  ctx.font = "bold 32px system-ui";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#3daee9"; ctx.shadowBlur = 20;
  ctx.strokeStyle = "#1e6cb5"; ctx.lineWidth = 5;
  ctx.strokeText(`-${cost} 分`, cx, y);
  ctx.fillText(`-${cost} 分`, cx, y);
  ctx.restore();
}

// ─── Canvas 主动效 ────────────────────────────────────────────────
function ChestBurstCanvas({ cost, onDone }: { cost: number; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.52;

    let frame = 0;
    const TOTAL = 180;
    let particles: Particle[] = [];
    let spawned = false;

    const raf = requestAnimationFrame(function tick() {
      frame++;
      const t = frame / TOTAL;
      ctx.clearRect(0, 0, W, H);

      let scale = 1, shake = 0, openAngle = 0, globalAlpha = 1;

      if (t < 0.18) {
        const p = t / 0.18;
        scale = p < 0.75 ? lerp(0, 1.15, p / 0.75) : lerp(1.15, 1.0, (p - 0.75) / 0.25);
      } else if (t < 0.40) {
        const p = (t - 0.18) / 0.22;
        shake = Math.sin(p * Math.PI * 9) * 8 * (1 - p);
      } else if (t < 0.62) {
        openAngle = (t - 0.40) / 0.22;
      } else if (t < 0.88) {
        openAngle = 1;
        if (!spawned) { particles = spawnParticles(cx, cy - 50); spawned = true; }
      } else {
        openAngle = 1;
        globalAlpha = 1 - (t - 0.88) / 0.12;
      }

      ctx.globalAlpha = globalAlpha;

      // 漂浮菱形 + 黄色十字星（从 Phase3 开始）
      if (t > 0.38) {
        drawFloatingDiamonds(ctx, cx, cy, (t - 0.38) / 0.62);
        drawRisingStars(ctx, cx, cy, (t - 0.38) / 0.62);
      }

      // 粒子
      particles.forEach(p => {
        p.life++; p.x += p.vx; p.vy += 0.35; p.y += p.vy; p.vx *= 0.96;
        const lt = p.life / p.maxLife;
        p.alpha = lt > 0.65 ? 1 - (lt - 0.65) / 0.35 : 1;
        if (p.type === "diamond") drawDiamond(ctx, p.x, p.y, p.size * 0.55, p.size, p.color, p.alpha);
        else drawCirclePart(ctx, p.x, p.y, p.size / 2, p.color, p.alpha * 0.7);
      });

      drawChest(ctx, cx, cy, openAngle, shake, scale);

      if (t >= 0.62 && t < 0.9) drawFloatText(ctx, cx, cy, cost, (t - 0.62) / 0.28);

      ctx.globalAlpha = 1;

      if (frame < TOTAL) requestAnimationFrame(tick);
      else cbRef.current();
    });

    return () => cancelAnimationFrame(raf);
  }, [cost]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        pointerEvents: "none",
        width: "100vw", height: "100vh",
      }}
    />
  );
}

export function ChestBurst({ cost, onDone }: { cost: number; onDone: () => void }) {
  return createPortal(<ChestBurstCanvas cost={cost} onDone={onDone} />, document.body);
}
