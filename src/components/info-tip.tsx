"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type BubblePos = { top: number; left: number; tailLeft: number };

export function InfoTip({ text, color = "#9A7850" }: { text: string; color?: string }) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState<BubblePos>({ top: 0, left: 0, tailLeft: 10 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const recalc = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;

    const BUBBLE_W = Math.min(260, window.innerWidth - 16);
    const MARGIN   = 8;
    const btnCx    = r.left + r.width / 2; // 按钮中心 x

    // 气泡默认左边对齐按钮，尾巴在按钮正中下方
    let left = btnCx - 16; // 让尾巴自然落在 left+10 附近
    // 右侧溢出 → 向左推
    if (left + BUBBLE_W > window.innerWidth - MARGIN) {
      left = window.innerWidth - BUBBLE_W - MARGIN;
    }
    // 左侧溢出 → 向右推
    left = Math.max(MARGIN, left);

    // 尾巴偏移 = 按钮中心 - 气泡左边界 - 6 (half tail width)
    const tailLeft = Math.max(8, Math.min(btnCx - left - 6, BUBBLE_W - 20));

    setPos({ top: r.bottom + 10, left, tailLeft });
  }, []);

  const toggle = () => { recalc(); setOpen(v => !v); };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const bubble = open ? (
    <div style={{
      position: "fixed",
      top: pos.top,
      left: pos.left,
      zIndex: 9999,
      background: `color-mix(in srgb, ${color} 10%, #fffdf7)`,
      border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
      borderRadius: 16,
      padding: "10px 13px",
      fontSize: 11.5,
      color: "#3a3030",
      lineHeight: 1.7,
      whiteSpace: "pre-line",
      boxShadow: `0 6px 24px color-mix(in srgb, ${color} 15%, rgba(0,0,0,0.06))`,
      width: Math.min(260, window.innerWidth - 16),
      pointerEvents: "all",
      animation: "bubblePop 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
      transformOrigin: "top left",
    }}>
      {/* 尾巴跟随按钮中心 */}
      <div style={{
        position: "absolute", top: -7, left: pos.tailLeft,
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: `7px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }} />
      <div style={{
        position: "absolute", top: -5, left: pos.tailLeft + 1,
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderBottom: `6px solid color-mix(in srgb, ${color} 10%, #fffdf7)`,
      }} />
      {text}
    </div>
  ) : null;

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <style>{`@keyframes bubblePop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          width: 14, height: 14,
          borderRadius: "50%", border: "none",
          background: "transparent", color,
          fontSize: 11, cursor: "pointer",
          display: "inline-flex", alignItems: "center",
          justifyContent: "center", lineHeight: 1,
          padding: 0, flexShrink: 0,
          opacity: 0.45, transition: "opacity 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = open ? "0.8" : "0.45")}
      >
        💡
      </button>
      {typeof document !== "undefined" && bubble && createPortal(bubble, document.body)}
    </span>
  );
}
