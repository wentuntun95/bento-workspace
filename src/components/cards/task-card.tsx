"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Check, Trash2, X } from "lucide-react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/store";
import { triggerConfettiIfMilestone } from "@/components/confetti-manager";

// ─── Theme config (hex-based, easy to swap) ───────────────────
const THEME = {
  survive:  { name: "Survive",  base: "#38bdf8", dark: "#0369a1", light: "#7dd3fc", pale: "#e0f2fe" },
  creation: { name: "Creation", base: "#4ade80", dark: "#16a34a", light: "#86efac", pale: "#dcfce7" },
  fun:      { name: "Fun",      base: "#f472b6", dark: "#be185d", light: "#f9a8d4", pale: "#fce7f3" },
  heal:     { name: "Heal",     base: "#a78bfa", dark: "#6d28d9", light: "#c4b5fd", pale: "#ede9fe" },
};

type TaskType = keyof typeof THEME;

// ─── +10 飞出动效 ─────────────────────────────────────────────
function PointsPop({ onDone }: { onDone: () => void }) {
  // useRef 存最新 onDone，useEffect 空数组只跑一次，避免 timeout 被反复重置
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 900);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span
      className="absolute left-2 top-1 text-[16px] font-black text-amber-500 pointer-events-none select-none z-10 whitespace-nowrap"
      style={{ animation: "pointsPop 0.55s ease-out forwards" }}
    >
      +10
    </span>
  );
}

interface TaskCardProps {
  type: TaskType;
  title: string;
}

export function TaskCard({ type }: TaskCardProps) {
  const allTasks   = useWorkspaceStore(s => s.tasks);
  const addTask    = useWorkspaceStore(s => s.addTask);
  const toggleTask = useWorkspaceStore(s => s.toggleTask);
  const removeTask = useWorkspaceStore(s => s.removeTask);

  const tasks = React.useMemo(() => allTasks.filter(t => t.type === type), [allTasks, type]);
  const done  = tasks.filter(t => t.completed).length;

  const [adding, setAdding] = useState(false);
  const [text, setText]     = useState("");
  const [pops, setPops]     = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-task-${type}`,
    data: { accepts: "ddl", type },
  });

  // 只有 DDL 被拖入时才触发样式，避免卡片排序误触
  const { active } = useDndContext();
  const isDDLOver = isOver && active?.data.current?.type === "ddl";

  const t = THEME[type];

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) { setAdding(false); return; }
    addTask(trimmed, type);
    setText("");
    setAdding(false);
  };

  const handleToggle = (id: string, wasDone: boolean) => {
    toggleTask(id);
    if (!wasDone) {
      setPops(prev => [...prev, id]);
      // 全局已完成数：当前已完成(未包含本次) + 1
      const nextCompleted = allTasks.filter(t => t.completed && t.id !== id).length + 1;
      triggerConfettiIfMilestone(nextCompleted);
    }
  };

  const EMPTY_MSGS: Record<TaskType, string> = {
    survive:  "来一个生存任务吧 📘",
    creation: "创造点什么吧 🌱",
    fun:      "今天想玩什么？🌸",
    heal:     "给自己一点温柔 💜",
  };

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col h-full w-full relative transition-all duration-200"
      style={isDDLOver ? { outline: `2px solid ${t.base}80`, outlineOffset: "2px", background: `${t.pale}` } : undefined}
    >
      {/* Drop badge */}
      {isDDLOver && (
        <div
          className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm border"
          style={{ background: "white", color: t.dark, borderColor: `${t.base}50` }}
        >
          <span>+</span><span>复制到此处</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span
          className="text-[14px] font-black leading-none tracking-wide"
          style={{ color: t.dark, fontFamily: "var(--font-caveat, cursive)" }}
        >
          {t.name}
        </span>
        {tasks.length > 0 && (
          <span className="text-[9px] font-semibold text-foreground/30 tabular-nums">
            {done}/{tasks.length}
          </span>
        )}
      </div>

      {/* ── Task list ── stopPropagation 阻止触发外层卡片拖拽 */}
      <div
        className="flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col gap-[3px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {tasks.length === 0 && !adding ? (
          <div className="flex-1" />
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="group relative flex items-center gap-2 px-2 py-[5px] rounded-lg transition-all duration-300"
              style={{
                background: task.completed ? `${t.pale}` : "rgba(255,255,255,0.45)",
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(task.id, task.completed)}
                className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-300"
                style={task.completed
                  ? { background: t.base, borderColor: "transparent" }
                  : { background: "transparent", borderColor: t.base }}
              >
                {task.completed && <Check size={10} strokeWidth={3} className="text-white" />}
              </button>

              {/* Text */}
              <span
                className="flex-1 text-[12px] leading-snug min-w-0 truncate font-medium transition-all duration-300"
                style={{ color: task.completed ? t.dark : undefined,
                         textDecoration: task.completed ? "line-through" : "none",
                         opacity: task.completed ? 0.6 : 1 }}
              >
                {task.text}
              </span>

              {/* +10 pop */}
              {pops.includes(task.id) && (
                <PointsPop
                  key={task.id}
                  onDone={() => setPops(p => p.filter(x => x !== task.id))}
                />
              )}

              {/* Delete */}
              <button
                onClick={() => removeTask(task.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-400"
                style={{ color: "rgba(0,0,0,0.3)" }}
              >
                <X size={11} />
              </button>
            </div>
          ))
        )}

        {/* Inline input */}
        {adding && (
          <div
            className="flex items-center gap-2 px-2 py-[5px] rounded-lg bg-white/70 border"
            style={{ borderColor: `${t.base}60` }}
          >
            <div className="flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 bg-transparent"
                 style={{ borderColor: t.base }} />
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onBlur={() => setTimeout(() => { setAdding(false); setText(""); }, 150)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter") submit();
                if (e.key === "Escape") { setAdding(false); setText(""); }
              }}
              placeholder="添加任务…"
              className="flex-1 text-[12px] bg-transparent outline-none border-b"
              style={{ borderColor: `${t.base}50`, fontFamily: "var(--font-caveat, cursive)", color: t.dark }}
            />
            <button onClick={submit} disabled={!text.trim()}
                    className="flex-shrink-0 transition-opacity"
                    style={{ opacity: text.trim() ? 1 : 0.3, color: t.base }}>
              <Check size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Add button ── */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex-shrink-0 mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={{ color: t.dark, fontFamily: "var(--font-caveat, cursive)" }}
          onMouseEnter={e => (e.currentTarget.style.background = `${t.pale}`)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Plus size={12} /> 添加任务
        </button>
      )}

    </div>
  );
}
