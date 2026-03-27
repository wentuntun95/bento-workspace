"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Trash2, Plus, Check, X, Copy, Pencil } from "lucide-react";
import { useWorkspaceStore, type Note, type NoteCategory } from "@/lib/store";

// ─── 分类配置 ─────────────────────────────────────────────────────
const CATEGORIES: { value: NoteCategory; color: string; text: string; dot: string }[] = [
  { value: "笔记", color: "rgba(251,188,  5,0.12)", text: "#B8860B", dot: "#FBBC05" },
  { value: "提醒", color: "rgba(234, 67, 53,0.10)", text: "#C0392B", dot: "#EA4335" },
  { value: "清单", color: "rgba( 52,168, 83,0.10)", text: "#1D7A35", dot: "#34A853" },
  { value: "会议", color: "rgba( 66,133,244,0.10)", text: "#1A56CC", dot: "#4285F4" },
];
const getCat = (v: NoteCategory) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[0];

// 笔记本格线背景
const GRID_BG = {
  backgroundImage: `
    linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)
  `,
  backgroundSize: "22px 22px",
};

// ─── 单张便签卡（1×1）──────────────────────────────────────────────
export function NoteCard({ note, size }: { note: Note; size: number }) {
  const removeNote  = useWorkspaceStore(s => s.removeNote);
  const updateNote  = useWorkspaceStore(s => s.updateNote);
  const [hovered, setHovered]   = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState(note.content);
  const [cat,     setCat]       = useState<NoteCategory>(note.category);
  const [copied,  setCopied]    = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

  const copyContent = () => {
    navigator.clipboard.writeText(note.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cat0 = getCat(note.category);

  const submit = () => {
    updateNote(note.id, draft.trim() || note.content, cat);
    setEditing(false);
  };

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: 20,
        overflow: "hidden",
        background: "#fefce8",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "2px 3px 10px rgba(0,0,0,0.07)",
        position: "relative",
        flexShrink: 0,
        ...GRID_BG,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* 分类标签行 */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "14px 14px 2px" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat0.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: cat0.text, letterSpacing: "0.05em" }}>
          {note.category}
        </span>
      </div>

      {!note.content.trim() && (
        <div style={{ padding: "0 12px 4px", lineHeight: 1 }}>
          <span style={{ fontFamily: "var(--font-caveat, cursive)", fontSize: 22, fontWeight: 700, color: cat0.text, opacity: 0.35 }}>
            Note
          </span>
        </div>
      )}

      {editing ? (
        <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", height: "calc(100% - 80px)", gap: 6 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") { setDraft(note.content); setEditing(false); } }}
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontSize: 12, lineHeight: 1.6, color: cat0.text, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCat(c.value)}
                style={{ padding: "2px 7px", borderRadius: 99, border: "1.5px solid", borderColor: cat === c.value ? c.dot : "transparent", background: cat === c.value ? c.color : "rgba(0,0,0,0.05)", fontSize: 9, fontWeight: 700, color: c.text, cursor: "pointer" }}>
                {c.value}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button onClick={() => { setDraft(note.content); setEditing(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.3)" }}><X size={13} /></button>
            <button onClick={submit} style={{ background: "none", border: "none", cursor: "pointer", color: cat0.text }}><Check size={13} /></button>
          </div>
        </div>
      ) : (
        <div className="scrollbar-none" style={{ padding: "0 12px 10px", overflowY: "auto", height: "calc(100% - 36px)", cursor: "text" }} onClick={() => setEditing(true)}>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: cat0.text, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {note.content || <span style={{ opacity: 0.35 }}>点击编辑…</span>}
          </p>
        </div>
      )}

      {hovered && !editing && (
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
          <button onClick={copyContent}
            style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 8, padding: "4px 5px", cursor: "pointer", color: copied ? "#16a34a" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button onClick={e => { e.stopPropagation(); removeNote(note.id); }}
            style={{ background: "rgba(255,255,255,0.85)", border: "none", borderRadius: 8, padding: "4px 5px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 新增便签按钮卡（+号展开 form）──────────────────────────────────
export function AddNoteCard({ size }: { size: number }) {
  const addNote = useWorkspaceStore(s => s.addNote);
  const [open, setOpen]     = useState(false);
  const [content, setContent] = useState("");
  const [cat, setCat]         = useState<NoteCategory>("笔记");
  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) textRef.current?.focus(); }, [open]);

  const submit = () => {
    if (!content.trim()) return;
    addNote(content.trim(), cat);
    setContent(""); setCat("笔记"); setOpen(false);
  };

  const cat0 = getCat(cat);

  return (
    <div
      style={{ width: size, height: size, borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", backgroundColor: open ? "#fffdf5" : "rgba(255,253,245,0.7)", display: "flex", flexDirection: "column", position: "relative", flexShrink: 0, overflow: "hidden", transition: "background 0.15s", boxShadow: "2px 3px 10px rgba(0,0,0,0.06)", ...GRID_BG }}
      onPointerDown={e => e.stopPropagation()}
    >
      {!open ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", cursor: "pointer" }} onClick={() => setOpen(true)}>
          <div style={{ padding: "14px 14px 4px", lineHeight: 1 }}>
            <span style={{ fontFamily: "var(--font-caveat, cursive)", fontSize: 22, fontWeight: 700, color: "rgba(0,0,0,0.2)" }}>Note</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingBottom: 14 }}>
            <Plus size={14} color="rgba(0,0,0,0.18)" strokeWidth={2} />
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.2)", fontWeight: 700, fontFamily: "var(--font-caveat, cursive)" }}>新建便签</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 12, gap: 8 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCat(c.value)}
                style={{ padding: "2px 7px", borderRadius: 99, border: "1.5px solid", borderColor: cat === c.value ? c.dot : "transparent", background: cat === c.value ? c.color : "rgba(0,0,0,0.05)", fontSize: 9, fontWeight: 700, color: c.text, cursor: "pointer" }}>
                {c.value}
              </button>
            ))}
          </div>
          <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
            onKeyDown={e => { e.stopPropagation(); if (e.key === "Escape") { setOpen(false); setContent(""); } }}
            placeholder="写点什么…"
            style={{ flex: 1, resize: "none", border: "none", outline: "none", background: "transparent", fontSize: 12, lineHeight: 1.65, color: cat0.text, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setOpen(false); setContent(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.25)" }}><X size={14} /></button>
            <button onClick={submit} disabled={!content.trim()}
              style={{ background: cat0.dot, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700, opacity: content.trim() ? 1 : 0.4 }}>
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── NoteWall：动态贴纸区（flex column-wrap，向右扩展）──────────────
export function NoteWall() {
  const notes    = useWorkspaceStore(s => s.notes);
  const NOTE_SIZE = Math.floor((window.innerHeight - 120 - 48) / 3);

  return (
    <div
      style={{ height: "100%", padding: 12, paddingLeft: 0, display: "flex", flexDirection: "column", flexWrap: "wrap", alignContent: "flex-start", gap: 12 }}
      onPointerDown={e => e.stopPropagation()}
    >
      {notes.map(n =>
        <NoteCard key={n.id} note={n} size={NOTE_SIZE} />
      )}
      <AddNoteCard size={NOTE_SIZE} />
    </div>
  );
}

// ─── 日期/时间格式化 ──────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "今天";
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── 复制按钮（带瞬时 ✓ 反馈）────────────────────────────────────────────────
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="w-5 h-5 rounded-full flex items-center justify-center bg-white/80 text-slate-400 hover:text-green-600 transition-colors"
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard.writeText(content).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

// ─── 全部便签弹窗（按日期分组 + 搜索/分类筛选）────────────────────────────
function AllNotesModal({ onClose }: { onClose: () => void }) {
  const notes      = useWorkspaceStore(s => s.notes);
  const removeNote = useWorkspaceStore(s => s.removeNote);
  const updateNote = useWorkspaceStore(s => s.updateNote);

  const [query,     setQuery]     = useState("");
  const [catFilter, setCatFilter] = useState<NoteCategory | "全部">("全部");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editCat,   setEditCat]   = useState<NoteCategory>("笔记");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editingId) editRef.current?.focus(); }, [editingId]);

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditDraft(n.content);
    setEditCat(n.category);
  };
  const submitEdit = () => {
    if (editingId) updateNote(editingId, editDraft.trim() || editDraft, editCat);
    setEditingId(null);
  };

  const allCats: (NoteCategory | "全部")[] = ["全部", "笔记", "提醒", "清单", "会议"];

  const filtered = [...notes]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(n => {
      const matchCat = catFilter === "全部" || n.category === catFilter;
      const matchQ   = !query.trim() || n.content.toLowerCase().includes(query.trim().toLowerCase());
      return matchCat && matchQ;
    });

  const groups: { date: string; items: Note[] }[] = [];
  filtered.forEach(n => {
    const d = fmtDate(n.createdAt);
    const g = groups.find(x => x.date === d);
    if (g) g.items.push(n); else groups.push({ date: d, items: [n] });
  });

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl flex flex-col"
        style={{ width: 480, height: 560 }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 flex-shrink-0">
          <h2 style={{ fontFamily: "var(--font-caveat)", fontSize: 20, fontWeight: 600 }} className="text-slate-700">
            全部便签
          </h2>
          <button className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-xs flex items-center justify-center" onClick={onClose}>✕</button>
        </div>

        {/* 搜索 + 分类筛选 */}
        <div className="px-5 pt-3 pb-2 flex flex-col gap-2 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索便签内容…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full text-[12px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-amber-300 placeholder:text-slate-400 text-slate-700"
            />
            {query && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs" onClick={() => setQuery("")}>✕</button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {allCats.map(c => {
              const cat0 = c === "全部" ? null : getCat(c);
              const active = catFilter === c;
              return (
                <button key={c}
                  className="text-[10px] px-2.5 py-0.5 rounded-full transition-colors"
                  style={{
                    background: active ? (cat0?.dot ?? "#64748b") : "rgba(0,0,0,0.05)",
                    color: active ? "white" : "#64748b",
                  }}
                  onClick={() => setCatFilter(c)}
                >{c}</button>
              );
            })}
          </div>
        </div>

        {/* 便签列表 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-5 py-2 flex flex-col gap-4">
          {groups.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-10">
              {notes.length === 0 ? "还没有便签" : "没有匹配的便签"}
            </div>
          )}
          {groups.map(g => (
            <div key={g.date}>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide mb-2">{g.date}</div>
              <div className="flex flex-col gap-2">
                {g.items.map(n => {
                  const cat0 = getCat(n.category);
                  const isEditThis = editingId === n.id;
                  return (
                    <div key={n.id} className="relative rounded-2xl px-3 py-2.5 group"
                      style={{ background: cat0.color || "#fefce8", border: "1px solid rgba(0,0,0,0.06)" }}>
                      {isEditThis ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1 flex-wrap">
                            {CATEGORIES.map(c => (
                              <button key={c.value} onClick={() => setEditCat(c.value)}
                                className="text-[9px] px-1.5 py-0.5 rounded-full transition-colors"
                                style={{ background: editCat === c.value ? c.dot : "rgba(0,0,0,0.08)", color: editCat === c.value ? "white" : "#888" }}>
                                {c.value}
                              </button>
                            ))}
                          </div>
                          <textarea
                            ref={editRef}
                            value={editDraft}
                            onChange={e => {
                              setEditDraft(e.target.value);
                              const t = e.target;
                              t.style.height = 'auto';
                              t.style.height = t.scrollHeight + 'px';
                            }}
                            onKeyDown={e => {
                              if (e.key === "Escape") setEditingId(null);
                              if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); submitEdit(); }
                            }}
                            className="w-full bg-transparent outline-none resize-none text-[12px] leading-relaxed text-slate-700 min-h-[60px]"
                            style={{ overflowWrap: "anywhere" }}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">取消</button>
                            <button onClick={submitEdit} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-white">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cat0.dot }} />
                          <p className="text-[12px] text-slate-700 leading-relaxed flex-1 whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}>{n.content}</p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{fmtTime(n.createdAt)}</span>
                        </div>
                      )}
                      {!isEditThis && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-white/80 text-slate-400 hover:text-amber-500 transition-colors"
                            onClick={() => startEdit(n)}
                          ><Pencil size={10} /></button>
                          <CopyButton content={n.content} />
                          <button
                            className="w-5 h-5 rounded-full flex items-center justify-center bg-white/80 text-red-400 hover:text-red-600"
                            onClick={() => removeNote(n.id)}
                          ><Trash2 size={11} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



// ─── NoteWallGrid：网格布局专用竖向便签列 ─────────────────────────────────
export function NoteWallGrid() {
  const notes   = useWorkspaceStore(s => s.notes);
  const addNote = useWorkspaceStore(s => s.addNote);

  const [adding, setAdding]       = useState(false);
  const [content, setContent]     = useState("");
  const [category, setCategory]   = useState<NoteCategory>("笔记");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (adding) textRef.current?.focus(); }, [adding]);

  const submit = () => {
    if (content.trim()) addNote(content.trim(), category);
    setContent(""); setCategory("笔记"); setAdding(false);
  };

  const sorted   = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isActive = adding || editingId !== null;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 flex-shrink-0">
        <span className="text-base text-slate-600" style={{ fontFamily: "var(--font-caveat)", fontWeight: 600 }}>
          Notes
        </span>
        <button className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowModal(true)}>
          查看更多 »
        </button>
      </div>

      {/* 滚动便签列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-2.5 pb-2 flex flex-col gap-1.5">
        {sorted.map(note => (
          <NoteCardRow
            key={note.id}
            note={note}
            isEditing={editingId === note.id}
            onStartEdit={() => setEditingId(note.id)}
            onEndEdit={() => setEditingId(null)}
          />
        ))}
        {notes.length === 0 && !adding && (
          <div className="text-center text-slate-400 text-[11px] py-8">点下方按钮添加第一条便签</div>
        )}
      </div>

      {/* 底部固定区 */}
      <div className={`flex-shrink-0 ${adding ? "border-t border-black/5" : ""}`}>
        {adding ? (
          <div className="p-2.5 flex flex-col gap-1.5">
            <div className="flex gap-1">
              {(["笔记", "提醒", "清单", "会议"] as NoteCategory[]).map(c => {
                const cat0 = getCat(c);
                return (
                  <button key={c}
                    className="text-[9px] px-1.5 py-0.5 rounded-full transition-colors"
                    style={{ background: category === c ? cat0.dot : "rgba(0,0,0,0.05)", color: category === c ? "white" : "#888" }}
                    onClick={() => setCategory(c)}
                  >{c}</button>
                );
              })}
            </div>
            <textarea
              ref={textRef}
              placeholder="写点什么…"
              rows={3}
              className="w-full bg-white/80 rounded-xl border border-amber-200 outline-none resize-none scrollbar-none text-[11px] text-slate-700 px-2.5 py-2 placeholder:text-slate-400 focus:border-amber-300"
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  const ta = e.currentTarget;
                  const s = ta.selectionStart ?? content.length;
                  const end = ta.selectionEnd ?? s;
                  setContent(content.substring(0, s) + "\n" + content.substring(end));
                } else if (e.key === "Enter") {
                  e.preventDefault(); submit();
                } else if (e.key === "Escape") {
                  setAdding(false); setContent("");
                }
              }}
            />
            <div className="flex gap-1.5 justify-end">
              <button className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" onClick={() => { setAdding(false); setContent(""); }}>取消</button>
              <button className="text-[10px] px-2.5 py-1 rounded-full bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-40" disabled={!content.trim()} onClick={submit}>添加</button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            <button
              className="w-full py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
              style={{ color: "#b45309", fontFamily: "var(--font-caveat, cursive)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(251,191,36,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              onClick={() => setAdding(true)}
            >
              <Plus size={11} /> 新建便签
            </button>
          </div>
        )}
      </div>

      {showModal && <AllNotesModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── 行式便签卡（内容自适应高度）──────────────────────────────────────────
function NoteCardRow({ note, isEditing, onStartEdit, onEndEdit }: {
  note: Note;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const removeNote = useWorkspaceStore(s => s.removeNote);
  const updateNote = useWorkspaceStore(s => s.updateNote);
  const [draft, setDraft]     = useState(note.content);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied]   = useState(false);
  const cat0 = getCat(note.category);

  const copyNote = () => {
    navigator.clipboard.writeText(note.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = () => {
    updateNote(note.id, draft.trim() || note.content, note.category);
    onEndEdit();
  };

  return (
    <div
      className="relative rounded-xl px-2.5 py-2 flex-shrink-0 cursor-pointer"
      style={{ background: cat0.color || "#fefce8", border: "1px solid rgba(0,0,0,0.06)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isEditing && onStartEdit()}
    >
      <div className="flex gap-1.5 items-start">
        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cat0.dot }} />
        {isEditing ? (
          <textarea
            autoFocus
            className="flex-1 bg-transparent outline-none resize-none scrollbar-none text-[11px] leading-relaxed text-slate-700"
            value={draft}
            style={{ minHeight: 36, height: 'auto' }}
            onChange={e => {
              setDraft(e.target.value);
              const t = e.target;
              t.style.height = 'auto';
              t.style.height = t.scrollHeight + "px";
            }}
            onBlur={submit}
            onKeyDown={e => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                const ta = e.currentTarget;
                const s = ta.selectionStart ?? draft.length;
                const end = ta.selectionEnd ?? s;
                const next = draft.substring(0, s) + "\n" + draft.substring(end);
                setDraft(next);
                requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1; });
              } else if (e.key === "Enter") {
                e.preventDefault(); submit();
              } else if (e.key === "Escape") {
                setDraft(note.content); onEndEdit();
              }
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          /* 非编辑状态：文本 + hover 删除按钮（放在同一分支，彻底避免状态竞争） */
          <div className="flex-1 relative">
            <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap" style={{ overflowWrap: "anywhere" }}>{note.content}</p>
            {hovered && (
              <div className="absolute top-0 right-0 flex gap-1">
                <button
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-white/80 text-slate-400 hover:text-green-600 transition-colors"
                  onClick={e => { e.stopPropagation(); copyNote(); }}
                >{copied ? <Check size={10} /> : <Copy size={10} />}</button>
                <button
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-white/80 text-red-400 hover:text-red-600 transition-colors"
                  onClick={e => { e.stopPropagation(); removeNote(note.id); }}
                ><Trash2 size={11} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

