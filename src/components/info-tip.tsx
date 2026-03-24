"use client";

import { useState, useRef, useEffect } from "react";

/**
 * 小 ⓘ 信息提示按钮，点击弹出浮层 tooltip
 * 支持移动端点击，点击外部关闭
 */
export function InfoTip({ text, color = "#9A7850" }: { text: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        tipRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <style>{`@keyframes bubblePop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
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

      {open && (
        <div
          ref={tipRef}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: -6,
            zIndex: 500,
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
            position: "absolute",
            top: -7,
            left: 10,
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `7px solid color-mix(in srgb, ${color} 30%, transparent)`,
          }} />
          <div style={{
            position: "absolute",
            top: -5,
            left: 11,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: `6px solid color-mix(in srgb, ${color} 10%, #fffdf7)`,
          }} />
          {text}
        </div>
      )}
    </span>
  );
}
