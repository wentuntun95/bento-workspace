"use client";

import { useRef, useState, useEffect } from "react";
import { BentoGrid } from "@/components/bento-grid";
import { XiaoYouReminder } from "@/components/xiao-you-reminder";
import { EnergyReportModal } from "@/components/energy-report-modal";
import { LoginModal } from "@/components/login-modal";
import { useWorkspaceStore } from "@/lib/store";
import { monthlyPoints } from "@/lib/points";
import { useAuth } from "@/lib/auth-context";

function Header({
  onNav, currentPage, totalPages, onReport, onLogin, onApply,
}: {
  onNav: (n: number) => void;
  currentPage: number;
  totalPages: number;
  onReport: () => void;
  onLogin: () => void;
  onApply: () => void;
}) {
  const { user, mode, signOut } = useAuth();
  const tasks       = useWorkspaceStore((s) => s.tasks);
  const taskHistory  = useWorkspaceStore((s) => s.taskHistory);
  const transactions = useWorkspaceStore((s) => s.transactions);
  const pts = monthlyPoints(taskHistory, transactions, tasks);
  void pts; // 暂保留，后续用

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-3">
      {/* Left wordmark */}
      <div>
        <h1
          className="leading-none text-foreground/80 select-none"
          style={{ fontFamily: "'Caveat', cursive", fontSize: "2.6rem", fontWeight: 700 }}
        >
          The Next Move
        </h1>
        <p className="text-[10px] text-foreground/30 tracking-[0.12em] mt-0.5 ml-0.5">
          "Where you go, you go forward."
        </p>
      </div>

      {/* Center: page dots + label */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onNav(i)}
              className="transition-all duration-200"
              style={{
                width:        currentPage === i ? 18 : 7,
                height:       7,
                borderRadius: 4,
                background:   currentPage === i ? "#fb923c" : "rgba(0,0,0,0.15)",
                border:       "none",
                cursor:       "pointer",
                padding:      0,
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-foreground/20 select-none">
          {currentPage === 0 ? "Workspace" : "Planning"}
        </span>
      </div>

      {/* Right: 成就 + 鉴权按钮 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* 匿名用户显示登录/申请入口 */}
        {mode === "anon" && (
          <>
            <button onClick={onLogin} style={{
              fontSize: 11, color: "#9A7850", background: "none",
              border: "1px solid rgba(180,140,70,0.3)", borderRadius: 7,
              padding: "4px 10px", cursor: "pointer",
            }}>
              登录
            </button>
            <button onClick={onApply} style={{
              fontSize: 11, color: "#9A7850", background: "none",
              border: "1px solid rgba(180,140,70,0.3)", borderRadius: 7,
              padding: "4px 10px", cursor: "pointer",
            }}>
              申请账号
            </button>
          </>
        )}
        {/* 已登录用户 */}
        {mode === "authenticated" && user && (
          <span style={{ fontSize: 11, color: "#9A7850", cursor: "pointer" }}
            onClick={signOut} title="点击登出">
            {user.email?.split("@")[0]} ·登出
          </span>
        )}
        {/* 成就按钮 */}
        <button
          onClick={onReport}
          title="成就周报"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontFamily: "var(--font-caveat)",
            fontSize: 13, fontWeight: 700,
            color: "#a16207",
            background: "rgba(250,204,21,0.12)",
            border: "1px solid rgba(250,204,21,0.35)",
            borderRadius: 9, padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          ⭐ 成就
        </button>
      </div>
    </header>
  );
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage]             = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [loginView, setLoginView]   = useState<"login" | "apply">("login");
  const { mode, loading }           = useAuth();
  const checkAndResetDaily   = useWorkspaceStore((s) => s.checkAndResetDaily);
  const checkAndResetWeekly  = useWorkspaceStore((s) => s.checkAndResetWeekly);

  // 启动时执行每日/每周重置检查
  useEffect(() => {
    checkAndResetDaily();
    checkAndResetWeekly();
  }, [checkAndResetDaily, checkAndResetWeekly]);

  const navTo = (n: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    setPage(n);
  };

  // 手动滚动时同步 page（scrollend + 阈值判断，不用比值，因为 Screen2 宽 44vw < 100vw）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setPage(el.scrollLeft > 50 ? 1 : 0);
    el.addEventListener("scrollend", handler, { passive: true });
    return () => el.removeEventListener("scrollend", handler);
  }, []);

  if (loading) return null; // 等待 session 检查完成

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* 首次访问弹窗 (mode=null) */}
      {mode === null && <LoginModal />}
      {/* 手动触发的登录弹窗（匿名用户点按钮） */}
      {showLogin && mode === "anon" && (
        <LoginModal
          canClose
          initialView={loginView}
          onClose={() => setShowLogin(false)}
        />
      )}

      <Header
        onNav={navTo} currentPage={page} totalPages={2}
        onReport={() => setShowReport(true)}
        onLogin={() => { setLoginView("login"); setShowLogin(true); }}
        onApply={() => { setLoginView("apply"); setShowLogin(true); }}
      />

      {/* Horizontal scroll canvas */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0"
        style={{
          display: "flex",
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <BentoGrid />
      </div>

      {/* Side nav arrow — fixed right edge, vertically centered */}
      <button
        onClick={() => {
          const el = scrollRef.current;
          if (!el) return;
          navTo(el.scrollLeft > 50 ? 0 : 1);
        }}
        style={{
          position: "fixed",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 50,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          width: 28,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(0,0,0,0.35)",
          fontSize: 16,
          fontWeight: 700,
          transition: "background 0.15s, color 0.15s",
          lineHeight: 1,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.95)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.7)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.75)";
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.35)";
        }}
        title={page === 0 ? "许愿账本 →" : "← 工作台"}
      >
        {page === 0 ? "›" : "‹"}
      </button>

      <XiaoYouReminder />
      {showReport && <EnergyReportModal onClose={() => setShowReport(false)} />}
    </div>
  );
}
