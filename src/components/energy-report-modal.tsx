"use client";

import { useEffect, useState, useCallback } from "react";
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

// 水彩配色（吸色自 A Room of One's Own）
const P = {
  bg:     "#F5F2EC",          // 微暖白书页
  spine:  "#3A8A41",          // 中绿（主色）
  header: "#357D33",          // 深绿书眉
  gold:   "#E0D4A0",          // 偏冷的米金，衬绿
  text:   "#1A3820",          // 深墨绿文字
  muted:  "#5A8060",          // 中绿灰
  line:   "rgba(58,138,65,0.15)",
  green:  "#2D6B45",
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

  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 340); // 等动画结束后再卸载
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleClose]);

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
        animation: closing
          ? "slideOutRight 0.35s cubic-bezier(0.22,1,0.36,1) forwards"
          : "slideInRight  0.35s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* 书脊（水彩晕染） */}
        <div style={{
          width: 14, flexShrink: 0, position: "relative",
          overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10,
        }}>
          {/* 层1：基底中绿（比原来浅一档） */}
          <div style={{ position: "absolute", inset: 0, background: "#4A967C" }} />
          {/* 层2：多个不规则径向晕染池，偏心位置模拟颜料自然聚集 */}
          <div style={{
            position: "absolute", inset: 0,
            background: `
              radial-gradient(ellipse 380% 11% at 15%  3%,  #8BC0B8 0%, transparent 60%),
              radial-gradient(ellipse 220% 6%  at 80%  9%,  #60A3C0 0%, transparent 50%),
              radial-gradient(ellipse 310% 8%  at 40% 19%,  #98BDD0 0%, transparent 65%),
              radial-gradient(ellipse 180% 5%  at 70% 27%,  #8BC0B8 0%, transparent 55%),
              radial-gradient(ellipse 290% 7%  at 25% 39%,  #60A3C0 0%, transparent 58%),
              radial-gradient(ellipse 340% 9%  at 60% 47%,  #8BC0B8 0%, transparent 68%),
              radial-gradient(ellipse 200% 5%  at 10% 55%,  #357D33 0%, transparent 45%),
              radial-gradient(ellipse 260% 7%  at 75% 62%,  #4A967C 0%, transparent 55%),
              radial-gradient(ellipse 300% 8%  at 35% 71%,  #98BDD0 0%, transparent 62%),
              radial-gradient(ellipse 180% 5%  at 85% 79%,  #60A3C0 0%, transparent 50%),
              radial-gradient(ellipse 350% 9%  at 20% 88%,  #8BC0B8 0%, transparent 65%),
              radial-gradient(ellipse 160% 4%  at 55% 96%,  #357D33 0%, transparent 40%)
            `,
            opacity: 0.9,
          }} />
          {/* 层3：低频湍流，让晕染边缘有机扭曲 */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='600'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.035 0.015' numOctaves='3' seed='11' stitchTiles='stitch' result='n'/%3E%3CfeColorMatrix in='n' type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='14' height='600' filter='url(%23d)' opacity='0.28'/%3E%3C/svg%3E")`,
            mixBlendMode: "soft-light",
          }} />
          {["✦","✦","✦"].map((s, i) => (
            <span key={i} style={{ position: "relative", color: P.gold, fontSize: 7, opacity: 0.7 }}>{s}</span>
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
          {/* 书眉：水彩横向晕染 */}
          <div style={{
            position: "relative", overflow: "hidden",
            padding: "12px 14px 10px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            {/* 书眉背景层 */}
            <div style={{ position: "absolute", inset: 0, background: "#3A8A41" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: `
                radial-gradient(ellipse 40%  250% at 3%   50%, #8BC0B8 0%, transparent 55%),
                radial-gradient(ellipse 25%  300% at 18%  50%, #60A3C0 0%, transparent 48%),
                radial-gradient(ellipse 30%  180% at 38%  50%, #98BDD0 0%, transparent 52%),
                radial-gradient(ellipse 20%  220% at 57%  50%, #4A967C 0%, transparent 50%),
                radial-gradient(ellipse 18%  160% at 72%  50%, #357D33 0%, transparent 42%),
                radial-gradient(ellipse 28%  250% at 90%  50%, #8BC0B8 0%, transparent 55%)
              `,
              opacity: 0.80,
            }} />
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='44'%3E%3Cfilter id='d'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05 0.08' numOctaves='3' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='44' filter='url(%23d)' opacity='0.25'/%3E%3C/svg%3E")`,
              mixBlendMode: "soft-light",
            }} />
            <span style={{ position: "relative", fontFamily: "var(--font-caveat)", fontSize: 17, fontWeight: 900, color: P.gold, letterSpacing: "0.04em" }}>
              ✦ Achievements ✦
            </span>
            <button onClick={handleClose} style={{
              position: "relative",
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
        onClick={handleClose}
        style={{ position: "fixed", inset: 0, zIndex: 199 }}
      />

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </>
  );

  return typeof document !== "undefined" ? createPortal(drawer, document.body) : null;
}
