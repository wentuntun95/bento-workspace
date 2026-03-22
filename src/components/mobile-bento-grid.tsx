"use client";

import { useState } from "react";
import { TaskCard } from "@/components/cards/task-card";
import { CalendarCard } from "@/components/cards/calendar-card";
import { EnergyTreeCard } from "@/components/cards/energy-tree-card";
import { WeatherCard } from "@/components/cards/weather-card";
import { MusicCard } from "@/components/cards/music-card";
import { WishingLedgerCard } from "@/components/cards/wishing-ledger-card";
import { useWorkspaceStore } from "@/lib/store";
import { Trash2, Plus } from "lucide-react";

// ─── Tab 定义 ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "work",   label: "工作区",  icon: "✦" },
  { id: "rest",   label: "休闲区",  icon: "✿" },
  { id: "reward", label: "积分兑换", icon: "✸" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ─── 卡片容器 ─────────────────────────────────────────────────────────────────
function CardSlot({
  children,
  minH,
  noPad = false,
}: {
  children: React.ReactNode;
  minH?: string;
  noPad?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
        minHeight: minH,
        padding: noPad ? 0 : "14px 16px",
      }}
    >
      {children}
    </div>
  );
}

// ─── Tab 1：工作区 ────────────────────────────────────────────────────────────
function WorkTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 2×2 任务格 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <CardSlot minH="190px"><TaskCard type="survive" title="Survive" /></CardSlot>
        <CardSlot minH="190px"><TaskCard type="creation" title="Creation" /></CardSlot>
        <CardSlot minH="190px"><TaskCard type="fun" title="Fun" /></CardSlot>
        <CardSlot minH="190px"><TaskCard type="heal" title="Heal" /></CardSlot>
      </div>
      <CardSlot minH="200px" noPad><CalendarCard /></CardSlot>
      <CardSlot minH="260px" noPad><EnergyTreeCard /></CardSlot>
    </div>
  );
}

// ─── Tab 2：休闲区（便签自己读 store）────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  笔记: { bg: "rgba(251,188,5,0.12)",   text: "#B8860B", dot: "#FBBC05" },
  提醒: { bg: "rgba(234,67,53,0.10)",   text: "#C0392B", dot: "#EA4335" },
  清单: { bg: "rgba(52,168,83,0.10)",   text: "#1D7A35", dot: "#34A853" },
  会议: { bg: "rgba(66,133,244,0.10)",  text: "#1A56CC", dot: "#4285F4" },
};

function NoteList() {
  const notes      = useWorkspaceStore(s => s.notes);
  const removeNote = useWorkspaceStore(s => s.removeNote);
  const addNote    = useWorkspaceStore(s => s.addNote);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#B8860B", fontFamily: "var(--font-caveat, cursive)" }}>
          便签
        </span>
        <button
          onClick={() => setAdding(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#B8860B", padding: 2 }}
        >
          <Plus size={15} />
        </button>
      </div>
      {adding && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && text.trim()) {
                addNote(text.trim(), "笔记");
                setText(""); setAdding(false);
              }
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="新便签内容…"
            style={{
              flex: 1, fontSize: 12, border: "1px solid rgba(251,188,5,0.4)",
              borderRadius: 8, padding: "5px 8px", background: "rgba(255,255,255,0.7)", outline: "none",
            }}
          />
          <button
            onClick={() => { if (text.trim()) { addNote(text.trim(), "笔记"); setText(""); setAdding(false); } }}
            style={{ fontSize: 11, color: "#B8860B", background: "rgba(251,188,5,0.12)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
          >
            加
          </button>
        </div>
      )}
      {notes.length === 0 ? (
        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.3)", textAlign: "center", padding: "12px 0" }}>暂无便签</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {notes.slice(0, 6).map(n => {
            const c = CAT_COLORS[n.category] ?? CAT_COLORS["笔记"];
            return (
              <div
                key={n.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: c.bg, borderRadius: 10, padding: "7px 8px",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, marginTop: 4 }} />
                <span style={{ flex: 1, fontSize: 12, color: c.text, lineHeight: 1.5 }}>{n.content}</span>
                <button
                  onClick={() => removeNote(n.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.25)", padding: 1, flexShrink: 0 }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
          {notes.length > 6 && (
            <p style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", textAlign: "center" }}>
              还有 {notes.length - 6} 条…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RestTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CardSlot minH="160px" noPad><WeatherCard /></CardSlot>
      <CardSlot><NoteList /></CardSlot>
      <CardSlot minH="130px" noPad><MusicCard /></CardSlot>
    </div>
  );
}

// ─── Tab 3：积分兑换 ──────────────────────────────────────────────────────────
function RewardTab() {
  return (
    <div style={{ height: "100%" }}>
      <CardSlot minH="300px" noPad><WishingLedgerCard /></CardSlot>
    </div>
  );
}

// ─── 底部 Tab 栏 ──────────────────────────────────────────────────────────────
function TabBar({ active, onSwitch }: { active: TabId; onSwitch: (id: TabId) => void }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        display: "flex",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom, 4px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              padding: "10px 0 8px", background: "none", border: "none",
              cursor: "pointer", transition: "color 0.15s",
              color: isActive ? "#d97706" : "rgba(0,0,0,0.35)",
              position: "relative",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: "0.04em" }}>
              {tab.label}
            </span>
            {isActive && (
              <span style={{
                position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 4px) + 2px)",
                width: 16, height: 2, borderRadius: 2, background: "#d97706",
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── 手机版 Header ────────────────────────────────────────────────────────────
function MobileHeader({ onReport, onLogin }: { onReport: () => void; onLogin: () => void }) {
  return (
    <header style={{
      flexShrink: 0, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "12px 16px 6px",
      paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
    }}>
      <h1 style={{
        fontFamily: "'Caveat', cursive", fontSize: "1.75rem",
        fontWeight: 700, color: "rgba(0,0,0,0.75)", margin: 0,
      }}>
        The Next Move
      </h1>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onLogin} style={{
          fontSize: 11, color: "#9A7850", background: "none",
          border: "1px solid rgba(180,140,70,0.3)", borderRadius: 7,
          padding: "4px 10px", cursor: "pointer",
        }}>登录</button>
        <button onClick={onReport} style={{
          fontSize: 11, color: "#a16207", background: "rgba(250,204,21,0.12)",
          border: "1px solid rgba(250,204,21,0.35)", borderRadius: 7,
          padding: "4px 10px", cursor: "pointer",
          fontFamily: "var(--font-caveat)", fontWeight: 700,
        }}>⭐ 成就</button>
      </div>
    </header>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export function MobileBentoGrid({
  onReport,
  onLogin,
}: {
  onReport: () => void;
  onLogin: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("work");

  return (
    <div style={{
      height: "100svh", display: "flex", flexDirection: "column",
      overflow: "hidden",
      backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    }}>
      <MobileHeader onReport={onReport} onLogin={onLogin} />

      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 14px 14px" }}>
        {activeTab === "work"   && <WorkTab />}
        {activeTab === "rest"   && <RestTab />}
        {activeTab === "reward" && <RewardTab />}
      </main>

      <TabBar active={activeTab} onSwitch={setActiveTab} />
    </div>
  );
}
