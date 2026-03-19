"use client";

import { useRef, useState, useEffect } from "react";
import { BentoGrid } from "@/components/bento-grid";
import { XiaoYouReminder } from "@/components/xiao-you-reminder";
import { useWorkspaceStore } from "@/lib/store";

function Header({
  onNav,
  currentPage,
  totalPages,
}: {
  onNav: (n: number) => void;
  currentPage: number;
  totalPages: number;
}) {
  const points = useWorkspaceStore((s) => s.points);

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

      {/* Right: points */}
      <div className="flex flex-col items-end">
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-foreground/30 mb-1">
          Energy
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-pink-400 tabular-nums leading-none" style={{ fontSize: "2rem" }}>
            {points}
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

  const navTo = (n: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    setPage(n);
  };

  // Sync dot indicator when user manually scrolls
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const p = Math.round(el.scrollLeft / el.clientWidth);
      setPage(p);
    };
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
          // Dot-grid background (scrolls with content)
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <BentoGrid />
      </div>

      <XiaoYouReminder />
    </div>
  );
}
