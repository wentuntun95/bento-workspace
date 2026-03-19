"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = ["#f472b6","#38bdf8","#4ade80","#a78bfa","#fbbf24","#fb7185","#34d399","#f97316","#818cf8"];

// ─── Canvas 物理彩带爆发 ─────────────────────────────────────────────
function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    console.log("🎉 Canvas ConfettiBurst mounted!");
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // Set canvas to full window
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 + 100, // burst from slightly below center
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 1) * 20 - 5,
      size: Math.random() * 6 + 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360,
      rotSpd: (Math.random() - 0.5) * 10,
    }));

    let rafId: number;
    let opacity = 1;

    const draw = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      opacity -= 0.005; // fade out slowly

      if (opacity <= 0) {
        onDoneRef.current();
        return;
      }

      ctx.globalAlpha = Math.max(0, opacity);

      for (const p of pieces) {
        p.vy += 0.3; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpd;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(rafId);
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />,
    document.body
  );
}

/** 工具函数：从 task-card handleToggle 调用 */
export function triggerConfettiIfMilestone(newCompletedCount: number) {
  if (newCompletedCount > 0 && newCompletedCount % 5 === 0) {
    window.dispatchEvent(new CustomEvent("confettiTime"));
  }
}

/** 全局挂载，监听 confettiTime 事件 */
export function ConfettiManager() {
  const mountKey      = useRef(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => {
      console.log("🎉 confettiTime event received!");
      mountKey.current += 1;
      setShow(true);
    };
    window.addEventListener("confettiTime", handler);
    return () => window.removeEventListener("confettiTime", handler);
  }, []);

  if (!show) return null;

  return (
    <ConfettiBurst
      key={mountKey.current}
      onDone={() => setShow(false)}
    />
  );
}
