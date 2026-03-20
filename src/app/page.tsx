"use client";

import { useRef, useState, useEffect } from "react";
import { BentoGrid } from "@/components/bento-grid";
import { XiaoYouReminder } from "@/components/xiao-you-reminder";
import { useWorkspaceStore } from "@/lib/store";
import { monthlyPoints } from "@/lib/points";

function Header({
  onNav,
  currentPage,
  totalPages,
}: {
  onNav: (n: number) => void;
  currentPage: number;
  totalPages: number;
}) {
  const tasks       = useWorkspaceStore((s) => s.tasks);
  const taskHistory  = useWorkspaceStore((s) => s.taskHistory);
  const transactions = useWorkspaceStore((s) => s.transactions);
  const pts = monthlyPoints(taskHistory, transactions, tasks);

  return (
    <header className="flex-shrink-0 flex items-end justify-between px-8 pt-6 pb-3">
      {/* Left wordmark */}
      <div>
        <h1
          className="leading-none text-foreground/80 select-none"
          style={{ fontFamily: "'Caveat', cursive", fontSize: "2.6rem", fontWeight: 700 }}
        >
          HOME
        </h1>
        <p className="text-[10px] text-foreground/30 tracking-[0.22em] uppercase mt-0.5 ml-0.5">
          能量回收站
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
                width:           currentPage === i ? 18 : 7,
                height:          7,
                borderRadius:    4,
                background:      currentPage === i ? "#fb923c" : "rgba(0,0,0,0.15)",
                border:          "none",
                cursor:          "pointer",
                padding:         0,
              }}
            />
          ))}
        </div>
        <span className="text-[9px] text-foreground/20 select-none">
          {currentPage === 0 ? "Workspace" : "Planning"}
        </span>
      </div>

      {/* Right: 本月可用积分 */}
      <div className="flex flex-col items-end">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/30 mb-1">
          本月积分
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-pink-400 tabular-nums leading-none" style={{ fontSize: "2rem" }}>
            {pts}
          </span>
          <span className="text-[11px] text-foreground/35 font-medium">pts</span>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
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

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <Header onNav={navTo} currentPage={page} totalPages={2} />

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
    </div>
  );
}
