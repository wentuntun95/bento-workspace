"use client";

import { useState, useEffect } from "react";
import {
  DndContext, rectIntersection, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/store";
import { TaskCard }       from "./cards/task-card";
import { CalendarCard }   from "./cards/calendar-card";
import { EnergyTreeCard } from "./cards/energy-tree-card";
import { LedgerCard }     from "./cards/ledger-card";
import { WishlistCard }   from "./cards/wishlist-card";
import { NoteWall, NoteWallGrid } from "./cards/note-card";
import { MusicCard }      from "./cards/music-card";
import { WeatherCard }    from "./cards/weather-card";
import { WebsideCard }   from "./cards/webside-card";
import { ImageStickerGrid } from "./cards/image-sticker-card";
import { ConfettiManager } from "./confetti-manager";
import type { Task }      from "@/lib/store";

// ─── Smart Sensors (保留，DDL 拖拽仍需要) ─────────────────────────
const INTERACTIVE_TAGS = ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "OPTION", "A", "LABEL"];
function isInteractive(el: Element | null): boolean {
  if (!el) return false;
  if (INTERACTIVE_TAGS.includes(el.tagName.toUpperCase())) return true;
  return isInteractive(el.parentElement);
}
class SmartPointerSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown" as const,
    handler: ({ nativeEvent }: React.PointerEvent) => !isInteractive(nativeEvent.target as Element),
  }];
}
class SmartKeyboardSensor extends KeyboardSensor {
  static activators = [{
    eventName: "onKeyDown" as const,
    handler: ({ nativeEvent: event }: React.KeyboardEvent<Element>) => {
      if (isInteractive(event.target as Element)) return false;
      return event.key === " " || event.key === "Enter";
    },
  }];
}

// ─── Placeholder Shell ────────────────────────────────────────────
function PlaceholderCard({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 select-none">
      <span style={{ fontSize: 36, opacity: 0.35 }}>{icon}</span>
      <span
        className="font-black text-foreground/25 tracking-wide"
        style={{ fontSize: 13, fontFamily: "var(--font-caveat, cursive)" }}
      >
        {title}
      </span>
      {sub && <span className="text-[10px] text-foreground/18 font-medium">{sub}</span>}
    </div>
  );
}

// ─── CardContent ──────────────────────────────────────────────────
const TASK_TITLES: Record<string, string> = {
  survive: "Survive", creation: "Creation", fun: "Fun & Rest", heal: "Heal",
};
function CardContent({ type }: { type: string }) {
  if (["survive", "creation", "fun", "heal"].includes(type)) {
    return <TaskCard type={type as Task["type"]} title={TASK_TITLES[type]} />;
  }
  if (type === "calendar")   return <CalendarCard />;
  if (type === "energytree") return <EnergyTreeCard />;
  if (type === "ledger")     return <LedgerCard />;
  if (type === "wishlist")   return <WishlistCard />;
  if (type === "music")      return <MusicCard />;
  if (type === "weather")    return <WeatherCard />;
  if (type === "note")       return <NoteWallGrid />;
  if (type === "image")      return <ImageStickerGrid />;
  if (type === "webside")    return <WebsideCard />;
  return null;
}

// ─── Per-type styles ──────────────────────────────────────────────
const CARD_STYLES: Record<string, { cls: string; rotate?: string }> = {
  survive:    { cls: "bg-sky-50" },
  fun:        { cls: "bg-pink-50" },
  heal:       { cls: "bg-violet-50" },
  creation:   { cls: "bg-green-50" },
  energytree: { cls: "bg-green-50/20" },
  note:       { cls: "bg-amber-50" },       // 去採旋转
  weather:    { cls: "" },
  image:      { cls: "bg-neutral-100" },   // 去掉旋转
  music:      { cls: "bg-indigo-50" },
  webside:    { cls: "bg-emerald-50" },
  calendar:   { cls: "bg-amber-50/70 backdrop-blur-md" },
  ledger:     { cls: "bg-slate-50" },
  wishlist:   { cls: "bg-purple-50" },
};

// ─── GridCard ─────────────────────────────────────────────────────
function GridCard({ type, area }: { type: string; area: string }) {
  const s = CARD_STYLES[type] ?? { cls: "bg-white/60" };
  return (
    <div
      style={{
        gridArea: area,
        transform: s.rotate ? `rotate(${s.rotate})` : undefined,
        transition: "transform 200ms ease, box-shadow 200ms ease",
        ...(type === "image" ? { alignSelf: "start" } : {}),
      }}
      onMouseEnter={s.rotate ? (e) => {
        (e.currentTarget as HTMLElement).style.transform = "rotate(0deg) scale(1.012)";
      } : undefined}
      onMouseLeave={s.rotate ? (e) => {
        (e.currentTarget as HTMLElement).style.transform = `rotate(${s.rotate})`;
      } : undefined}
      className={cn(
        "relative rounded-3xl border border-black/5 shadow-sm hover:shadow-md",
        type !== "image" && "overflow-hidden",
        s.cls,
      )}
    >
      <div className={
        ["music", "weather", "webside", "note", "energytree"].includes(type) ? "h-full" :
        type === "image" ? "" :
        "h-full p-4"
      }>
        <CardContent type={type} />
      </div>
    </div>
  );
}

// 方案 A2：6列×3行，能量树 1.5序列宽单列，4任务列等宽
function Screen1() {
  return (
    <div
      className="w-screen h-full p-3"
      style={{
        display: "grid",
        gridTemplateAreas: `
          "surv  fun   tree  note  imag  muse"
          "surv  heal  tree  note  .     weat"
          "crea  crea  cal   cal   web   web "
        `,
        gridTemplateColumns: "1fr 1fr 1.5fr 1fr 1fr 0.8fr",
        gridTemplateRows: "1fr 1fr 0.6fr",
        gap: 10,
      }}
    >
      <GridCard type="survive"    area="surv" />
      <GridCard type="fun"        area="fun"  />
      <GridCard type="heal"       area="heal" />
      <GridCard type="creation"   area="crea" />
      <GridCard type="energytree" area="tree" />
      <GridCard type="note"       area="note" />
      <GridCard type="image"      area="imag" />
      <GridCard type="calendar"   area="cal"  />
      <GridCard type="music"      area="muse" />
      <GridCard type="weather"    area="weat" />
      <GridCard type="webside"    area="web"  />
    </div>
  );
}

// Screen2: 只有 Redemption + Wishlist，各占半屏
function Screen2() {
  return (
    <div
      className="h-full flex items-center"
      style={{ width: "52vw", padding: "0 20px" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateAreas: '"led wish"',
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "22vw",   // 近似正方：列宽约 25vw → 高 22vw
          gap: 12,
          width: "100%",
        }}
      >
        <GridCard type="ledger"   area="led"  />
        <GridCard type="wishlist" area="wish" />
      </div>
    </div>
  );
}


// ─── BentoGrid ────────────────────────────────────────────────────
export function BentoGrid() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(SmartKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!mounted) {
    return (
      <div className="flex">
        <div className="w-screen h-full animate-pulse bg-foreground/5 rounded-xl flex-shrink-0" />
      </div>
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const data = e.active.data.current;
    const over = e.over;
    if (data?.type === "ddl" && over) {
      const overId = String(over.id);
      const TASK_TYPES = ["survive", "creation", "fun", "heal"] as const;
      const target = TASK_TYPES.find(t => t === overId || `droppable-task-${t}` === overId);
      if (target) useWorkspaceStore.getState().moveDdlToTask(data.originalId, target);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragEnd={onDragEnd}>
      <ConfettiManager />
      {/* Horizontal canvas: Screen1 → Screen2 */}
      <div className="flex h-full" style={{ scrollSnapType: "none" }}>
        <div className="flex-shrink-0">
          <Screen1 />
        </div>
        <div className="flex-shrink-0">
          <Screen2 />
        </div>
      </div>
    </DndContext>
  );
}
