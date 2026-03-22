"use client";

/**
 * XiaoYou — 小鱿桌面宠物 + AI 助手
 * - 随机出现在屏幕角落，可拖动，随机切换表情包
 * - DDL 前 30min 弹气泡提醒
 * - 点击打开 AI 聊天面板（MiniMax 2.7 + Web Speech API）
 * - 支持操作：addTask / addTransaction / addWish / addDdl
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspaceStore, DDLItem } from "@/lib/store";
import { monthlyPoints } from "@/lib/points";
import { X, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// 14 种情绪 ↔ 14 个表情包，AI 通过 emotion 标签驱动切换
const EMOTION_MAP: Record<string, { src: string; label: string }> = {
  greeting:    { src: "/squid/喜欢.png",      label: "打招呼" },
  happy:       { src: "/squid/嘻嘻.png",      label: "开心" },
  mischievous: { src: "/squid/嬉皮笑脸.png",  label: "坏坏的" },
  excited:     { src: "/squid/兴奋.png",      label: "兴奋" },
  obsessed:    { src: "/squid/沉迷.png",      label: "沉迷" },
  thinking:    { src: "/squid/呆住.png",      label: "思考中" },
  confused:    { src: "/squid/眼巴巴.png",    label: "困惑" },
  sad:         { src: "/squid/可怜.png",      label: "难过" },
  sulking:     { src: "/squid/委屈.png",      label: "委屈" },
  complaining: { src: "/squid/抱怨.png",      label: "抱怨" },
  urgent:      { src: "/squid/生气.png",      label: "生气" },
  success:     { src: "/squid/窃喜.png",      label: "窃喜" },
  sleepy:      { src: "/squid/闭眼不看.png",  label: "闭眼不看" },
  hungry:      { src: "/squid/饿.png",        label: "饿" },
};

// 随机待机表情池（偏向愉快情绪，weight 越高越常出现）
const IDLE_EMOTES = [
  { src: "/squid/喜欢.png",     label: "喜欢",    weight: 4 },
  { src: "/squid/嘻嘻.png",     label: "嘻嘻",    weight: 3 },
  { src: "/squid/沉迷.png",     label: "沉迷",    weight: 2 },
  { src: "/squid/嬉皮笑脸.png", label: "嬉皮笑脸",weight: 2 },
  { src: "/squid/兴奋.png",     label: "兴奋",    weight: 2 },
  { src: "/squid/呆住.png",     label: "呆住",    weight: 1 },
  { src: "/squid/饿.png",       label: "饿",      weight: 1 },
] as const;

function randomEmote(exclude?: string) {
  const pool = IDLE_EMOTES.filter(e => e.src !== exclude);
  const w = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * w;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[0];
}

function emoteByEmotion(emotion: string | null): { src: string; label: string } | null {
  if (!emotion) return null;
  return EMOTION_MAP[emotion] ?? null;
}


const CORNERS = ["TL", "TR", "BL", "BR"] as const;
type Corner = typeof CORNERS[number];
function cornerPos(corner: Corner, W: number, H: number, size = 80) {
  const pad = 16 + Math.random() * 64;
  const x = corner.endsWith("L") ? pad : W - size - pad;
  const y = corner.startsWith("T") ? pad + 60 : H - size - pad;
  return { x, y };
}

function minutesUntil(ddl: DDLItem): number {
  if (!ddl.time) return Infinity;
  const [h, m] = ddl.time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return Infinity;
  const target = new Date(ddl.date);
  target.setHours(h, m, 0, 0);
  return Math.floor((target.getTime() - Date.now()) / 60000);
}

// ─── 随机开场白 ──────────────────────────────────────────────
const GREETINGS = [
  "嗯？饲养员来了 👀",
  "呼…终于等到你了。",
  "有什么事快说，我很忙的（才没有）",
  "想说什么尽管讲，我听着呢～",
  "今天的任务完成了吗？说说看",
];

// ─── Chat types ───────────────────────────────────────────────
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface AiAction {
  action: string;
  type?: string;
  title?: string;
  content?: string;   // add_note
  category?: string;  // add_note
  pts?: number;
  cost?: number;
  date?: string;
  time?: string;
  cmd?: string;       // play_music
  index?: number;     // play_music goto
}

// ─── Web Speech API hook ──────────────────────────────────────
function useSpeechRecognition(onResult: (text: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRec) { alert("你的浏览器不支持语音识别，请使用 Chrome 或 Edge"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = "zh-CN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }, [onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, start, stop };
}

// ─── Main component ───────────────────────────────────────────
export function XiaoYouReminder() {
  const {
    ddls, tasks, taskHistory, transactions, tracks,
    addTask, addTransaction, addWish, addDdl, addNote, triggerMusicCommand,
  } = useWorkspaceStore();

  const pts = monthlyPoints(taskHistory, transactions, tasks);

  // Position
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [emote, setEmote] = useState<{ src: string; label: string }>(() => randomEmote());
  const [isDragging, setIsDragging] = useState(false);   // state 负责关 transition
  const [isPatrolling, setIsPatrolling] = useState(false); // true 时用慢速巡游过渡
  const dragRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });

  // DDL alert
  const [alert, setAlert] = useState<DDLItem | null>(null);
  const [minsLeft, setMinsLeft] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [alertVisible, setAlertVisible] = useState(false);

  // Chat panel — 从 localStorage 恢复（24h 有效）
  const CHAT_STORAGE_KEY = "xiaoyu-chat-v1";
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      if (typeof window === "undefined") throw new Error();
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) throw new Error();
      const { msgs, ts } = JSON.parse(raw) as { msgs: ChatMsg[]; ts: number };
      if (Date.now() - ts > 86400_000) throw new Error();
      return msgs;
    } catch {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      return [{ role: "assistant" as const, content: greeting }];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Hover
  const [hovered, setHovered] = useState(false);

  // Init position
  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const corner = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    const p = cornerPos(corner, W, H);
    setPos(p); posRef.current = p;
  }, []);

  // Auto-rotate emote
  useEffect(() => {
    const id = setInterval(() => {
      if (!dragRef.current && !chatOpen) setEmote(prev => randomEmote(prev.src));
    }, 8000);
    return () => clearInterval(id);
  }, [chatOpen]);

  // 边缘巡游：空闲时沿屏幕边框慢速移动（15-25s 一次，5s 滑过去）
  useEffect(() => {
    if (chatOpen) return;
    const PATROL_DURATION = 5000; // transition 时长（ms），与 CSS 保持一致
    const patrol = () => {
      if (dragRef.current || chatOpen) return;
      const W = window.innerWidth, H = window.innerHeight;
      const sz = 80, pad = 20;
      const edge = Math.floor(Math.random() * 4);
      let nx = 0, ny = 0;
      if (edge === 0)      { nx = pad + Math.random() * (W - sz - pad * 2); ny = pad + 60; }
      else if (edge === 1) { nx = W - sz - pad; ny = pad + 80 + Math.random() * (H - sz - 140); }
      else if (edge === 2) { nx = pad + Math.random() * (W - sz - pad * 2); ny = H - sz - pad; }
      else                 { nx = pad; ny = pad + 80 + Math.random() * (H - sz - 140); }
      posRef.current = { x: nx, y: ny };
      setIsPatrolling(true);
      setPos({ x: nx, y: ny });
      setTimeout(() => setIsPatrolling(false), PATROL_DURATION + 200);
    };
    // 15-25 秒移动一次
    const id = setInterval(patrol, 15000 + Math.random() * 10000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  // DDL watch
  const checkDdl = useCallback(() => {
    for (const ddl of ddls) {
      const mins = minutesUntil(ddl);
      if (mins >= 0 && mins <= 30 && !dismissed.has(ddl.id)) {
        setAlert(ddl); setMinsLeft(mins); setAlertVisible(true);
        setEmote(mins <= 5 ? IDLE_EMOTES[5] : IDLE_EMOTES[3]);
        return;
      }
    }
    setAlert(prev => {
      if (!prev) return null;
      const mins = minutesUntil(prev);
      if (mins < 0 || mins > 30) { setAlertVisible(false); return null; }
      return prev;
    });
  }, [ddls, dismissed]);

  useEffect(() => {
    checkDdl();
    const id = setInterval(checkDdl, 30_000);
    return () => clearInterval(id);
  }, [checkDdl]);

  // 保存消息到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ msgs: messages, ts: Date.now() }));
    } catch {/* quota exceeded etc */}
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Execute AI action ──────────────────────────────────────
  function executeAction(action: AiAction) {
    switch (action.action) {
      case "add_task":
        if (action.title && action.type)
          addTask(action.title, action.type as "survive"|"creation"|"fun"|"heal");
        break;
      case "add_transaction":
        if (action.title && action.pts)
          addTransaction(action.title, -Math.abs(action.pts), undefined);
        break;
      case "add_wish":
        if (action.title && action.cost)
          addWish(action.title, action.cost, undefined);
        break;
      case "add_ddl":
        if (action.title && action.date)
          addDdl(action.title, new Date(action.date), action.time ?? "", undefined);
        break;
      case "add_note": {
        const noteContent = action.content ?? action.title; // 兜底：部分模型用 title
        if (noteContent)
          addNote(noteContent, (action.category as "笔记"|"提醒"|"清单"|"会议") ?? "笔记");
        break;
      }
      case "play_music":
        if (action.cmd)
          triggerMusicCommand({ cmd: action.cmd as "play"|"pause"|"next"|"prev"|"goto", index: action.index });
        break;
    }
  }

  // ── Send message to AI ──────────────────────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg].slice(-30);
    setMessages(next);
    setInput("");
    setLoading(true);
    setEmote(EMOTION_MAP.thinking); // 思考中

    const context = {
      tasks: tasks.map(t => ({ type: t.type, text: t.text, completed: t.completed })),
      ddls: ddls.map(d => ({ title: d.title, date: d.date, time: d.time })),
      tracks: tracks.map((t, i) => ({ title: t.title, index: i })),
      pts,
      currentTime: new Date().toLocaleString("zh-CN"),
    };

    try {
      const res = await fetch("/api/xiaoyu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json() as { reply?: string; action?: AiAction; emotion?: string; error?: string };
      const reply = data.reply ?? data.error ?? "嗯，小鱿愣住了...";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (data.action) executeAction(data.action);
      // 根据 AI 返回的 emotion 切换表情，否则随机切换
      const emoted = emoteByEmotion(data.emotion ?? null);
      setEmote(emoted ?? randomEmote(EMOTION_MAP.thinking.src));
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "网络出问题了，稍后再试试吧 🥲" }]);
    } finally {
      setLoading(false);
    }
  }

  // ── Speech ────────────────────────────────────────────────
  const { listening, start: startSpeech, stop: stopSpeech } = useSpeechRecognition(
    (text) => sendMessage(text)
  );

  // ── Drag（只拖动，不打开对话）─────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // 从实际渲染位置读偷辟（巡游 transition 进行中时 posRef 已是终点）
    const wrapper = e.currentTarget.parentElement;
    const rect = wrapper?.getBoundingClientRect();
    const ax = rect ? rect.left : posRef.current.x;
    const ay = rect ? rect.top  : posRef.current.y;
    posRef.current = { x: ax, y: ay };
    offsetRef.current = { x: e.clientX - ax, y: e.clientY - ay };
    dragRef.current = true;
    setIsDragging(true); // 触发重渲染将 transition 切为 none
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const nx = e.clientX - offsetRef.current.x;
    const ny = e.clientY - offsetRef.current.y;
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  }
  function onPointerUp() {
    dragRef.current = false;
    setIsDragging(false); // 恢复 transition
    setEmote(randomEmote(emote.src));
  }
  function dismissAlert() {
    if (alert) setDismissed(prev => new Set([...prev, alert.id]));
    setAlertVisible(false); setAlert(null);
    setEmote(randomEmote(emote.src));
  }

  if (!pos) return null;
  const urgent = minsLeft <= 5;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 9990,
        userSelect: "none",
        // 拖动时无过渡；巡游时5s慢速滑动；其他0.8s弹性
        transition: isDragging
          ? "none"
          : isPatrolling
            ? "left 5s ease-in-out, top 5s ease-in-out"
            : "left 0.8s cubic-bezier(0.34,1.2,0.64,1), top 0.8s cubic-bezier(0.34,1.2,0.64,1)",
      }}
    >
      {/* DDL 提醒气泡 */}
      {alertVisible && alert && !chatOpen && (
        <div className={cn(
          "absolute bottom-[90px] right-0 w-52 rounded-2xl rounded-br-sm px-3.5 py-3",
          "bg-white/96 border border-amber-200/70 shadow-xl backdrop-blur-xl",
          "animate-[xiaoYouIn_0.4s_cubic-bezier(0.34,1.4,0.64,1)_both]"
        )}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[11px] font-black tracking-wide", urgent ? "text-red-500" : "text-amber-500")}>
              {urgent ? "⚡ 快了快了！" : "⏰ 快到啦！"}
            </span>
            <button onClick={dismissAlert} className="text-foreground/20 hover:text-foreground/60 transition-colors">
              <X size={11} />
            </button>
          </div>
          <p className="text-[13px] font-bold text-foreground/80 leading-snug mb-1.5">{alert.title}</p>
          <div className="flex flex-col gap-0.5 text-[10px] text-foreground/40">
            <span>{minsLeft === 0 ? "现在就是截止时间！" : `还有 ${minsLeft} 分钟`}</span>
            {alert.contact && <span>👤 {alert.contact}</span>}
          </div>
          <div className="absolute -bottom-[8px] right-5 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[8px] border-t-white/96" />
        </div>
      )}

      {/* ── 聊天面板 ── */}
      {chatOpen && (
        <div
          className="absolute bottom-[90px] right-0 w-72 rounded-2xl shadow-2xl border border-black/8 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)" }}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-black/5"
               style={{ background: "rgba(240,233,255,0.8)" }}>
            <div className="flex items-center gap-2">
              <img src={emote.src} alt="小鱿" className="w-6 h-6 object-contain" />
              <span style={{ fontFamily: "var(--font-caveat)", fontSize: 15, fontWeight: 700, color: "#4c1d95" }}>
                小鱿
              </span>
              {loading && <span className="text-[10px] text-purple-400 animate-pulse">思考中...</span>}
            </div>
            <button onClick={() => setChatOpen(false)} className="text-foreground/30 hover:text-foreground/70 transition-colors">
              <X size={13} />
            </button>
          </div>

          {/* Messages */}
          <div className="h-56 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-none">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[12px] leading-relaxed",
                    m.role === "user"
                      ? "bg-purple-100 text-purple-900 rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 px-2 py-2 border-t border-black/5">
            <button
              onPointerDown={e => { e.stopPropagation(); listening ? stopSpeech() : startSpeech(); }}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={listening ? {
                background: "#22c55e",
                color: "white",
                animation: "micBreath 1.2s ease-in-out infinite",
                boxShadow: "0 0 0 3px rgba(34,197,94,0.3)",
              } : {
                background: "rgba(139,92,246,0.08)",
                color: "#a78bfa",
              }}
              title={listening ? "点击停止" : "语音输入"}
            >
              <Mic size={13} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="饲养员，有什么想和我说的嘛？"
              className="flex-1 text-[12px] outline-none bg-transparent"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 text-purple-500 hover:bg-purple-200 disabled:opacity-40 transition-colors"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      )}

      {/* 声波对话按钮（独立，点击开/关聊天面板） */}
      <button
        onClick={() => { setChatOpen(o => !o); setAlertVisible(false); }}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        title={chatOpen ? "关闭对话" : "和小鱿说话"}
        className="absolute"
        style={{
          top: -28, right: -8,
          zIndex: 10,
          background: "none", border: "none", padding: 4, cursor: "pointer",
          transform: chatOpen ? "scale(1)" : "scale(1)",
          transition: "transform 0.2s",
          filter: chatOpen
            ? "drop-shadow(0 0 6px rgba(139,92,246,0.7))"
            : "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
        }}
      >
        {/* 4 rounded-rect bars — 同色系透明度渐变，中实两透 */}
        <svg width="34" height="24" viewBox="0 0 46 30" fill="none">
          <rect x="0"  y="5"  width="9" height="20" rx="4.5"
            fill={chatOpen ? "rgba(167,139,250,0.45)" : "rgba(160,155,185,0.4)"} />
          <rect x="12" y="1"  width="10" height="28" rx="5"
            fill={chatOpen ? "rgba(167,139,250,0.85)" : "rgba(160,155,185,0.75)"} />
          <rect x="25" y="1"  width="10" height="28" rx="5"
            fill={chatOpen ? "rgba(167,139,250,0.85)" : "rgba(160,155,185,0.75)"} />
          <rect x="38" y="5"  width="8"  height="20" rx="4"
            fill={chatOpen ? "rgba(167,139,250,0.45)" : "rgba(160,155,185,0.4)"} />
        </svg>
      </button>

      {/* 小鱿本体（拖拽专用，不打开对话） */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative w-20 h-20 cursor-grab select-none",
          "transition-transform duration-200",
          hovered && !dragRef.current && "scale-110",
          chatOpen && "scale-105",
        )}
        style={{ animation: dragRef.current ? "none" : "squidBob 3s ease-in-out infinite" }}
        title="拖动小鱿"
      >
        <img
          src={emote.src}
          alt={`小鱿 ${emote.label}`}
          className="w-full h-full object-contain pointer-events-none select-none"
          style={{ animation: "breathe 3s ease-in-out infinite" }}
          draggable={false}
        />
      </div>


      <style>{`
        @keyframes squidBob {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.02, 0.98); }
        }
        @keyframes xiaoYouIn {
          from { opacity: 0; transform: scale(0.7) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes micBreath {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 3px rgba(34,197,94,0.3); }
          50%       { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(34,197,94,0.15); }
        }
        @keyframes waveBar0 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.4)} }
        @keyframes waveBar1 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.6)} }
        @keyframes waveBar2 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.6)} }
        @keyframes waveBar3 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.4)} }
        @keyframes waveBar4 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.5)} }
      `}</style>
    </div>
  );
}
