"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useWorkspaceStore } from "@/lib/store";
import { weeklyReports, totalPoints, type WeeklyReport } from "@/lib/points";

const TYPE_CFG = {
  survive:  { dot: "#3b82f6", bg: "#dbeafe", label: "生存" },
  creation: { dot: "#22c55e", bg: "#dcfce7", label: "创造" },
  fun:      { dot: "#ec4899", bg: "#fce7f3", label: "乐趣" },
  heal:     { dot: "#a855f7", bg: "#ede9fe", label: "治愈" },
};

// 牛皮纸配色（浅化）
const P = {
  bg:     "#F9EDD2",          // 米黄牛皮纸
  spine:  "#C4965A",          // 浅棕书脊
  header: "#B8813E",          // 浅棕书眉
  gold:   "#E8C060",          // 柔和金
  text:   "#5A3A10",
  muted:  "#A07848",
  line:   "rgba(180,140,70,0.18)",
  green:  "#3D6B2E",
  red:    "#963025",
};

function weekLabel(w: string) {
  return `第 ${parseInt(w.split("-")[1], 10)} 周`;
}

function WeekRow({ r }: { r: WeeklyReport }) {
  const net = r.pts - r.spent;
  const types = (["survive", "creation", "fun", "heal"] as const).filter(k => r[k] > 0);
  return (
    <div style={{ borderBottom: `1px dashed ${P.line}`, padding: "10px 0", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-caveat)", fontSize: 14, fontWeight: 700, color: P.text }}>
          ⭐ {weekLabel(r.week)}
        </span>
        <span style={{ fontFamily: "var(--font-caveat)", fontSize: 12, fontWeight: 800, color: net >= 0 ? P.green : P.red }}>
          {net >= 0 ? `盈余 ${net}` : `透支 ${Math.abs(net)}`} pts
        </span>
      </div>
      {types.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {types.map(k => {
            const c = TYPE_CFG[k];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 3, background: c.bg, borderRadius: 5, padding: "2px 7px", border: `1px solid ${c.dot}40` }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: c.dot }}>{c.label} ×{r[k]}</span>
              </div>
            );
          })}
        </div>
      )}
      {r.spent > 0 && <span style={{ fontSize: 10, color: P.muted }}>消费 −{r.spent} pts</span>}
    </div>
  );
}

export function EnergyReportModal({ onClose }: { onClose: () => void }) {
  const { tasks, taskHistory, transactions } = useWorkspaceStore();
  const reports = weeklyReports(taskHistory, transactions, tasks);
  const total   = totalPoints(taskHistory, tasks);
  const year    = new Date().getFullYear();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const drawer = (
    <>
      {/* 书本主体：右侧固定，上下不顶满，书本比例 */}
      <div style={{
        position: "fixed",
        right: 0,
        top: 95,         // Header / 成就按钮 下沿
        bottom: 165,     // weather 卡底边（viewport 754 - rect.bottom 589）
        zIndex: 200,
        width: 300,
        display: "flex",
        borderRadius: "12px 0 0 12px",
        overflow: "hidden",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
        animation: "slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* 书脊 */}
        <div style={{
          width: 9, flexShrink: 0,
          background: `linear-gradient(90deg, ${P.spine} 0%, #D4A870 100%)`,
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8,
        }}>
          {["✦","✦","✦"].map((s, i) => (
            <span key={i} style={{ color: P.gold, fontSize: 7, opacity: 0.8 }}>{s}</span>
          ))}
        </div>

        {/* 书页 */}
        <div style={{
          flex: 1,
          background: P.bg,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* 书眉 */}
          <div style={{
            background: P.header,
            padding: "12px 14px 10px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--font-caveat)", fontSize: 17, fontWeight: 900, color: P.gold, letterSpacing: "0.04em" }}>
              ✦ Achievements ✦
            </span>
            <button onClick={onClose} style={{
              background: "rgba(0,0,0,0.2)", border: `1px solid ${P.gold}50`,
              borderRadius: 6, width: 24, height: 24,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: P.gold,
            }}>
              <X size={12} />
            </button>
          </div>

          {/* 年度汇总 */}
          <div style={{ padding: "12px 16px 8px", flexShrink: 0, borderBottom: `1px solid ${P.line}` }}>
            <p style={{ fontSize: 10, color: P.muted, margin: "0 0 2px", letterSpacing: "0.1em" }}>{year} 年</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: P.text }}>
              你累计获得了{" "}
              <span style={{ color: P.header, fontSize: 21, fontWeight: 900, fontFamily: "var(--font-caveat)" }}>
                {total.toLocaleString()}
              </span>
              {" "}pts ✨
            </p>
          </div>

          {/* 周列表 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px", scrollbarWidth: "none" }}>
            {reports.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontSize: 12, color: P.muted }}>
                完成任务后这里会出现能量记录 🌱
              </div>
            ) : (
              reports.map(r => <WeekRow key={r.week} r={r} />)
            )}
          </div>
        </div>
      </div>

      {/* 点击页面其他区域关闭（无遮罩，透明） */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 199 }}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );

  return typeof document !== "undefined" ? createPortal(drawer, document.body) : null;
}
