"use client";

import { createPortal } from "react-dom";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  format, startOfWeek, endOfWeek, eachDayOfInterval,
  isToday, isSameDay, addWeeks, isBefore, startOfDay,
} from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, DDLItem } from "@/lib/store";
import { Plus, X, ChevronLeft, ChevronRight, Pencil } from "lucide-react";

// 手写体 CSS variable (Caveat)
const CAVEAT = { fontFamily: "var(--font-caveat, cursive)" };

// ─── Time validation ─────────────────────────────────────────
function isPastDateTime(date: Date, timeStr: string): boolean {
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  return isBefore(dt, new Date());
}

function isPastDate(date: Date): boolean {
  return isBefore(startOfDay(date), startOfDay(new Date()));
}

// ─── 中文星期 ──────────────────────────────────────────────────
const CN_WEEKDAY = ["日","一","二","三","四","五","六"];

// ─── Floating event form (portal, centered) ──────────────────
function FloatingEventForm({
  date, initial, onSubmit, onCancel, submitLabel = "添加",
}: {
  date: Date;
  initial?: Partial<DDLItem>;
  onSubmit: (v: { title: string; time: string; contact: string }) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const isToday_ = isToday(date);

  // 时间默认值：编辑时用已有值，新增时用当前时间
  const nowH = String(new Date().getHours()).padStart(2, "0");
  const nowM = String(new Date().getMinutes()).padStart(2, "0");
  const initHH = initial?.time ? initial.time.split(":")[0] : nowH;
  const initMM = initial?.time ? initial.time.split(":")[1] : nowM;

  const [title,   setTitle]   = useState(initial?.title   ?? "");
  const [hh,      setHh]      = useState(initHH);
  const [mm,      setMm]      = useState(initMM);
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [timeErr, setTimeErr] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    if (!title.trim()) return onCancel();
    const h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      setTimeErr("时间无效");
      return;
    }
    const time = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    if (isToday_ && isPastDateTime(date, time)) {
      setTimeErr("时间不能早于现在");
      return;
    }
    setTimeErr("");
    onSubmit({ title: title.trim(), time, contact: contact.trim() });
  };

  const form = (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.08)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        className="bg-amber-50/95 rounded-2xl shadow-xl border border-amber-200/60 p-5 w-80 flex flex-col gap-3"
        style={{ backdropFilter: "blur(12px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <p className="text-[16px] font-bold text-amber-900/60" style={CAVEAT}>
            {submitLabel === "保存" ? "✏ 编辑事项" : "✦ 新增事项"}
          </p>
          {/* 日期：清晰的中文格式 */}
          <p className="text-[13px] font-bold text-amber-700/70 mt-1" style={CAVEAT}>
            {format(date, "M月d日")}
            <span className="ml-1 text-amber-600/60">周{CN_WEEKDAY[date.getDay()]}</span>
            {isToday_ && <span className="ml-2 text-amber-500 text-[11px]">· 今天</span>}
          </p>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="事项标题"
          className="w-full text-[15px] bg-transparent border-b-2 border-amber-300/50 focus:border-amber-500/60 outline-none pb-1.5 transition-colors placeholder:text-amber-300/60 text-amber-900/80"
          style={CAVEAT}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Time — 分段 HH : MM */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-amber-700/40 uppercase tracking-wider">时间</span>
            <div className="flex items-center gap-1">
              <input
                type="text" inputMode="numeric" maxLength={2}
                value={hh}
                onChange={e => { setHh(e.target.value.replace(/\D/g,"").slice(0,2)); setTimeErr(""); }}
                onBlur={e => setHh(String(Math.min(23, parseInt(e.target.value||"0",10))).padStart(2,"0"))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-9 text-center text-[16px] font-bold bg-amber-100/60 border border-amber-300/50 focus:border-amber-500/70 outline-none rounded-lg py-1 text-amber-900/80"
                style={CAVEAT}
              />
              <span className="text-[16px] font-black text-amber-600/60 select-none">:</span>
              <input
                type="text" inputMode="numeric" maxLength={2}
                value={mm}
                onChange={e => { setMm(e.target.value.replace(/\D/g,"").slice(0,2)); setTimeErr(""); }}
                onBlur={e => setMm(String(Math.min(59, parseInt(e.target.value||"0",10))).padStart(2,"0"))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-9 text-center text-[16px] font-bold bg-amber-100/60 border border-amber-300/50 focus:border-amber-500/70 outline-none rounded-lg py-1 text-amber-900/80"
                style={CAVEAT}
              />
            </div>
            {timeErr && <span className="text-[9px] text-red-400">{timeErr}</span>}
          </label>
          {/* Contact */}
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-amber-700/40 uppercase tracking-wider">关系人</span>
            <input
              value={contact} onChange={(e) => setContact(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="选填"
              className="text-[13px] bg-transparent border-b border-amber-300/40 focus:border-amber-500/60 outline-none pb-1 text-amber-900/70 w-full"
              style={CAVEAT}
            />
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={!title.trim()}
            className="flex-1 py-2 text-[13px] font-bold rounded-xl bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-30 transition-colors"
            style={CAVEAT}>
            {submitLabel}
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 text-[13px] rounded-xl bg-amber-100 hover:bg-amber-200/70 text-amber-700/60 transition-colors"
            style={CAVEAT}>
            取消
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(form, document.body);
}


type FormState = { mode: "add"; date: Date } | { mode: "edit"; ddl: DDLItem } | null;

// ─── Single DDL bullet ────────────────────────────────────────
function DDLBullet({ ddl, onEdit }: { ddl: DDLItem; onEdit: (d: DDLItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `ddl-${ddl.id}`, data: { type: "ddl", originalId: ddl.id },
  });
  const removeDdl = useWorkspaceStore((s) => s.removeDdl);
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "group flex items-center gap-1.5 py-[2px] min-w-0 rounded transition-colors hover:bg-amber-200/30",
        isDragging && "opacity-40"
      )}>
      {/* Red dot (drag handle) */}
      <span {...listeners} {...attributes}
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 cursor-grab active:cursor-grabbing mt-px" />

      {/* Time — 11px mono, medium weight */}
      <span className="flex-shrink-0 text-[11px] font-mono font-semibold text-amber-700/70 tabular-nums w-9 leading-none">
        {ddl.time ?? ""}
      </span>

      {/* Title — 11px Caveat, bold, primary */}
      <span className="flex-1 min-w-0 text-[11px] font-bold text-amber-950/80 truncate leading-snug" style={CAVEAT}>
        {ddl.title}
      </span>

      {/* Contact — 11px Caveat, normal, tertiary */}
      {ddl.contact && (
        <span className="flex-shrink-0 text-[11px] text-amber-700/55 italic truncate max-w-[56px]" style={CAVEAT}>
          {ddl.contact}
        </span>
      )}

      {/* Actions — desktop hover / mobile always visible */}
      <span className="flex-shrink-0 flex gap-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto mobile-ddl-actions transition-opacity">
        <button onClick={() => onEdit(ddl)}
          className="text-amber-600/60 hover:text-amber-700 p-0.5 rounded transition-colors">
          <Pencil size={9} />
        </button>
        <button onClick={() => removeDdl(ddl.id)}
          className="text-amber-600/60 hover:text-red-500 p-0.5 rounded transition-colors">
          <X size={9} />
        </button>
      </span>
    </div>
  );
}

// ─── Day row ──────────────────────────────────────────────────
function DayRow({ day, weekdayShort, ddls, onFormOpen }: {
  day: Date; weekdayShort: string; ddls: DDLItem[];
  onFormOpen: (s: FormState) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const dayDdls = ddls
    .filter(d => isSameDay(d.date, day))
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const isCurrentDay = isToday(day);
  const pastDay = isPastDate(day);

  // 挂载后自动滚动到当天行
  useEffect(() => {
    if (isCurrentDay && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "start", behavior: "instant" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rowRef} className={cn(
      "flex gap-0 border-b border-amber-200/40 last:border-b-0",
      isCurrentDay ? "bg-amber-100/50" : "",
      pastDay ? "opacity-50" : ""
    )}>
      {/* Left: weekday + date */}
      <div className="flex-shrink-0 w-12 flex flex-col items-center justify-center py-2.5 border-r border-amber-200/40">
        <span
          className={cn(
            "text-[11px] font-bold leading-none",
            isCurrentDay ? "text-amber-500" : "text-amber-700/40"
          )}
          style={CAVEAT}
        >
          {weekdayShort}
        </span>
        <span
          className={cn(
            "text-[22px] font-black leading-tight",
            isCurrentDay ? "text-amber-500" : "text-amber-800/50"
          )}
          style={CAVEAT}
        >
          {format(day, "d")}
        </span>
      </div>

      {/* Right: event bullets */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-2.5 py-2 gap-px">
        {dayDdls.map(ddl => (
          <DDLBullet key={ddl.id} ddl={ddl} onEdit={(d) => onFormOpen({ mode: "edit", ddl: d })} />
        ))}
        {dayDdls.length === 0 && (
          <span className="text-[11px] text-amber-300/60 select-none" style={CAVEAT}>—</span>
        )}
      </div>

      {/* Add button (hidden for fully-past dates) */}
      <div className="flex-shrink-0 flex items-center pr-2">
        {!pastDay && (
          <button
            onClick={() => onFormOpen({ mode: "add", date: day })}
            className="text-amber-400/40 hover:text-amber-600/70 transition-colors p-1 rounded-full hover:bg-amber-200/40"
          >
            <Plus size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CalendarCard ─────────────────────────────────────────────
const MAX_WEEK_OFFSET = 5;
const WD_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function CalendarCard() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [formState, setFormState]   = useState<FormState>(null);
  const ddls      = useWorkspaceStore((s) => s.ddls);
  const addDdl    = useWorkspaceStore((s) => s.addDdl);
  const updateDdl = useWorkspaceStore((s) => s.updateDdl);

  const weekDays = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    return eachDayOfInterval({
      start: startOfWeek(base, { weekStartsOn: 1 }),
      end:   endOfWeek(base,   { weekStartsOn: 1 }),
    });
  }, [weekOffset]);

  const dateRange = `${format(weekDays[0], "MM.dd")}–${format(weekDays[6], "MM.dd")}`;

  const handleSubmit = ({ title, time, contact }: { title: string; time: string; contact: string }) => {
    if (!formState) return;
    if (formState.mode === "add") addDdl(title, formState.date, time, contact || undefined);
    else updateDdl(formState.ddl.id, { title, time, contact: contact || undefined });
    setFormState(null);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Portal form */}
      {formState && (
        <FloatingEventForm
          date={formState.mode === "add" ? formState.date : formState.ddl.date}
          initial={formState.mode === "edit" ? formState.ddl : undefined}
          submitLabel={formState.mode === "edit" ? "保存" : "添加"}
          onSubmit={handleSubmit}
          onCancel={() => setFormState(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between px-3 pt-2.5 pb-2 border-b border-amber-200/50 flex-shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-black text-amber-800/70" style={CAVEAT}>✦ Weekly</span>
          <span className="text-[14px] text-amber-600/45 italic" style={CAVEAT}>Planner</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-amber-600/40 font-mono border border-amber-300/50 rounded px-1.5 py-0.5">
            {dateRange}
          </span>
          <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}
            className="text-amber-400/50 hover:text-amber-600/70 disabled:opacity-15 p-0.5 transition-colors">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setWeekOffset(o => Math.min(MAX_WEEK_OFFSET, o + 1))} disabled={weekOffset >= MAX_WEEK_OFFSET}
            className="text-amber-400/50 hover:text-amber-600/70 disabled:opacity-15 p-0.5 transition-colors">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* 7 day rows */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {weekDays.map((day, idx) => (
          <DayRow
            key={format(day, "yyyy-MM-dd")}
            day={day}
            weekdayShort={WD_SHORT[idx]}
            ddls={ddls}
            onFormOpen={setFormState}
          />
        ))}
      </div>
    </div>
  );
}
