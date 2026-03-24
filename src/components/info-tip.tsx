"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export function InfoTip({ text, color = "#9A7850" }: { text: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const recalc = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const BUBBLE_W = 266; // maxWidth + 小余量
    const MARGIN = 8;
    let left = r.left - 6;
    // 右侧溢出则向左推
    if (left + BUBBLE_W > window.innerWidth - MARGIN) {
      left = window.innerWidth - BUBBLE_W - MARGIN;
    }
    // 不要超出左边界
    left = Math.max(MARGIN, left);
    setPos({ top: r.bottom + 10, left });
  }, []);

  const toggle = () => {
    recalc();
    setOpen(v => !v);
  };

  // 点击外部关闭
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

  // 滚动/resize 时关闭
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
    <div
      style={{
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
        minWidth: 170,
        maxWidth: 260,
        pointerEvents: "all",
        animation: "bubblePop 0.18s cubic-bezier(0.34,1.56,0.64,1) both",
        transformOrigin: "top left",
      }}
    >
      {/* 小尾巴 */}
      <div style={{
        position: "absolute", top: -7, left: 10,
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: `7px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }} />
      <div style={{
        position: "absolute", top: -5, left: 11,
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
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          color,
          fontSize: 11,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
          opacity: 0.45,
          transition: "opacity 0.15s",
          filter: "grayscale(0.2)",
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
