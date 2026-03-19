"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function SortableItem({ id, type, title }: { id: string; type: string; title: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  // Assign semantic base colors from CSS vars based on type
  const themeClasses: Record<string, string> = {
    survive: "bg-[var(--color-survive)] text-[var(--color-survive)]",
    creation: "bg-[var(--color-creation)] text-[var(--color-creation)]",
    fun: "bg-[var(--color-fun)] text-[var(--color-fun)]",
    heal: "bg-[var(--color-heal)] text-[var(--color-heal)]",
    calendar: "bg-white dark:bg-[#1e1e1e] border border-red-100 dark:border-red-900/30",
    energytree: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20",
  };

  const currentTheme = themeClasses[type] || "bg-card";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bento-card relative flex flex-col p-6 overflow-hidden group border border-black/5 dark:border-white/5",
        "transition-shadow duration-300",
        isDragging && "shadow-2xl scale-105 opacity-80 cursor-grabbing",
        !isDragging && "cursor-grab",
        // span logic based on type for bento mosaic effect
        type === "energytree" ? "col-span-1 md:col-span-2 row-span-2 min-h-[300px]" : "col-span-1 min-h-[150px]",
        currentTheme
      )}
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-4 right-4 text-foreground/20 group-hover:text-foreground/40 transition-colors">
        <GripHorizontal size={20} />
      </div>

      <div className="flex-1">
        <h3 className={cn("text-xl font-bold", type !== "calendar" && type !== "energytree" ? "text-foreground" : "text-foreground")}>
          {title}
        </h3>

        {/* Placeholder for content: tasks, tree voxel canvas etc. */}
        <div className="mt-4 flex-1 flex items-center justify-center opacity-40 text-sm italic">
          {type === 'energytree' ? 'Voxel Tree Canvas Here' : 'Empty List'}
        </div>
      </div>
    </div>
  );
}
