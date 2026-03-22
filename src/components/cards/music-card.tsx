"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/lib/store";
import { List, Upload, Trash2, X, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1 } from "lucide-react";

const TRACK_THEMES: Record<string, { bg1: string; bg2: string; disc: string; groove: string }> = {
  "photograph":  { bg1: "#cdb8f0", bg2: "#e8d8f8", disc: "rgba(210,190,255,0.38)", groove: "rgba(160,130,220,0.18)" },
  "prayer-x":    { bg1: "#80bce0", bg2: "#c5dff5", disc: "rgba(160,210,245,0.38)", groove: "rgba(100,170,220,0.18)" },
  "zelda-botw":  { bg1: "#7ec87e", bg2: "#c8eac8", disc: "rgba(160,230,160,0.38)", groove: "rgba(90,180,90,0.18)"  },
};
const DEFAULT_THEME = { bg1: "#a0b8e0", bg2: "#d0dff5", disc: "rgba(180,210,245,0.38)", groove: "rgba(120,160,220,0.18)" };
const getTheme = (id: string) => TRACK_THEMES[id] ?? DEFAULT_THEME;

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function discGrooveStyle(disc: string, groove: string): React.CSSProperties {
  const stops = Array.from({ length: 10 }, (_, i) => {
    const r = 28 + i * 3.8;
    return `${disc} ${r - 0.4}%, ${groove} ${r}%, ${disc} ${r + 0.4}%`;
  }).join(", ");
  return { background: `radial-gradient(circle, transparent 26%, ${stops}, ${disc} 98%)` };
}



export function MusicCard() {
  const tracks          = useWorkspaceStore(s => s.tracks);
  const currentTrackId  = useWorkspaceStore(s => s.currentTrackId);
  const setCurrentTrack = useWorkspaceStore(s => s.setCurrentTrack);
  const addTrack        = useWorkspaceStore(s => s.addTrack);
  const removeTrack     = useWorkspaceStore(s => s.removeTrack);
  const musicCommand    = useWorkspaceStore(s => s.musicCommand);
  const clearMusicCommand = useWorkspaceStore(s => s.clearMusicCommand);

  const track      = tracks.find(t => t.id === currentTrackId) ?? tracks[0];
  const trackIndex = tracks.findIndex(t => t.id === track?.id);
  const theme      = getTheme(track?.id ?? "");

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const autoPlayRef = useRef(false);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [showList, setShowList] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"list" | "single">("list");
  const repeatModeRef = useRef<"list" | "single">("list");
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // ── 小鱿音乐控制 ──────────────────────────────────────────────
  useEffect(() => {
    if (!musicCommand) return;
    const { cmd, index } = musicCommand;
    if (cmd === "play") {
      setPlaying(true);
    } else if (cmd === "next") {
      autoPlayRef.current = true;
      const nxt = tracks[(trackIndex + 1) % tracks.length];
      if (nxt) setCurrentTrack(nxt.id);
    } else if (cmd === "prev") {
      autoPlayRef.current = true;
      const prv = tracks[(trackIndex - 1 + tracks.length) % tracks.length];
      if (prv) setCurrentTrack(prv.id);
    } else if (cmd === "goto" && index !== undefined) {
      const t = tracks[index];
      if (t) { autoPlayRef.current = true; setCurrentTrack(t.id); }
    }
    clearMusicCommand();
  }, [musicCommand, clearMusicCommand, tracks, trackIndex, setCurrentTrack]);


  useEffect(() => {
    if (!track) return;
    const audio = new Audio(track.url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrent(audio.currentTime);
    audio.onended = () => {
      if (repeatModeRef.current === "single") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        autoPlayRef.current = true; goNext();
      }
    };
    const shouldPlay = autoPlayRef.current;
    autoPlayRef.current = false;
    setCurrent(0);
    if (shouldPlay) { audio.play().catch(() => {}); setPlaying(true); }
    else { setPlaying(false); }
    return () => { audio.pause(); audio.src = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    playing ? a.play().catch(() => setPlaying(false)) : a.pause();
  }, [playing]);

  const goNext = useCallback(() => {
    const nxt = tracks[(trackIndex + 1) % tracks.length];
    if (nxt) { autoPlayRef.current = true; setCurrentTrack(nxt.id); }
  }, [tracks, trackIndex, setCurrentTrack]);

  const goPrev = useCallback(() => {
    const prv = tracks[(trackIndex - 1 + tracks.length) % tracks.length];
    if (prv) { autoPlayRef.current = true; setCurrentTrack(prv.id); }
  }, [tracks, trackIndex, setCurrentTrack]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (audioRef.current) audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    addTrack(file.name.replace(/\.[^.]+$/, ""), URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!track) return null;
  const progress = duration > 0 ? current / duration : 0;
  const grooveStyle = discGrooveStyle(theme.disc, theme.groove);

  const btnBase: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  };

  return (
    <div style={{
      height: "100%", position: "relative", borderRadius: 20, overflow: "hidden",
      display: "flex", flexDirection: "column",
      background: `linear-gradient(160deg, ${theme.bg1} 0%, ${theme.bg2} 100%)`,
    }}>
      {/* 歌单面板 */}
      {showList && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 30, borderRadius: 20,
          backdropFilter: "blur(20px) saturate(1.5)",
          background: `linear-gradient(160deg, ${theme.bg1}ee 0%, ${theme.bg2}ee 100%)`,
          display: "flex", flexDirection: "column", padding: "14px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 10px" }}>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700 }}>播放列表</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(255,255,255,0.25)", border: "none",
                  borderRadius: 8, padding: "4px 8px", cursor: "pointer",
                  color: "rgba(255,255,255,0.85)", fontSize: 10 }}>
                <Upload size={10} /> 上传
              </button>
              <button onClick={() => setShowList(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}>
                <X size={15} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }} className="scrollbar-none">
            {tracks.map((t, i) => (
              <div key={t.id} onClick={() => { setCurrentTrack(t.id); setPlaying(true); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", cursor: "pointer",
                  borderLeft: t.id === currentTrackId ? "2px solid rgba(255,255,255,0.85)" : "2px solid transparent",
                  background: t.id === currentTrackId ? "rgba(255,255,255,0.15)" : "transparent",
                }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", width: 14 }}>{i + 1}</span>
                  <span style={{
                    fontSize: 11, color: t.id === currentTrackId ? "#fff" : "rgba(255,255,255,0.75)",
                    fontWeight: t.id === currentTrackId ? 700 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{t.title}</span>
                </div>
                {t.type === "uploaded" && (
                  <button onClick={e => { e.stopPropagation(); removeTrack(t.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 2 }}>
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 唱机区（overflow:hidden 防溢出，minHeight:0 允许收缩） */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: 0 }}>
        {/* 磨砂唱盘（缩小至 62%） */}
        <div style={{
          width: 120, height: 120,
          borderRadius: "50%",
          ...grooveStyle,
          backdropFilter: "blur(6px) saturate(1.4)",
          WebkitBackdropFilter: "blur(6px) saturate(1.4)",
          boxShadow: playing
            ? `0 6px 32px rgba(0,0,0,0.18), 0 0 50px ${theme.disc}`
            : `0 6px 24px rgba(0,0,0,0.12)`,
          position: "relative", flexShrink: 0,
          animation: playing ? "disc-spin 7s linear infinite" : "none",
          transition: "box-shadow 0.5s",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "36%", height: "36%", borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #3a3a3a, #111)",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${theme.disc} 0%, transparent 65%)`,
            }} />
          </div>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: "6%", height: "6%", borderRadius: "50%",
            background: theme.bg2,
          }} />
        </div>

        {/* 白色写实唱臂 */}
        <svg viewBox="0 0 80 140" style={{
          position: "absolute",
          right: "6%", top: "4%",
          width: 56,
          transform: playing ? "rotate(-18deg)" : "rotate(0deg)",
          transformOrigin: "68px 14px",
          transition: "transform 0.9s cubic-bezier(0.34, 1.2, 0.64, 1)",
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.22))",
          zIndex: 10,
        }}>
          <circle cx="68" cy="14" r="11" fill="rgba(255,255,255,0.55)" />
          <circle cx="68" cy="14" r="7"  fill="rgba(255,255,255,0.85)" />
          <circle cx="68" cy="14" r="3"  fill="rgba(220,220,230,0.9)"  />
          <line x1="68" y1="20" x2="52" y2="22" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round" />
          <line x1="52" y1="22" x2="20" y2="110" stroke="rgba(255,255,255,0.88)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="20" y1="110" x2="10" y2="128" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="10" cy="129" r="4.5" fill="rgba(240,240,250,0.9)" />
          <circle cx="10" cy="129" r="2"   fill="rgba(200,200,215,0.95)" />
        </svg>
      </div>

      {/* 信息 + 控制区 */}
      <div style={{ padding: "4px 14px 12px" }}>
        {/* 标题行 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#fff",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              textShadow: "0 1px 6px rgba(0,0,0,0.2)",
            }}>{track.title}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>
              {track.type === "bundled" ? "原声音乐" : "已上传"}
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 2.5, borderRadius: 99, background: "rgba(255,255,255,0.25)", cursor: "pointer" }} onClick={seek}>
            <div style={{
              height: "100%", borderRadius: 99, background: "rgba(255,255,255,0.85)",
              width: `${progress * 100}%`, transition: "width 0.25s linear", position: "relative",
            }}>
              <div style={{
                position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)",
                width: 9, height: 9, borderRadius: "50%", background: "#fff",
                boxShadow: "0 0 8px rgba(255,255,255,0.7)",
              }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.55)" }}>{fmt(current)}</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.55)" }}>{fmt(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 — flex 均分，播放居中稍大 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
          {/* 歌单 */}
          <button onClick={() => setShowList(v => !v)}
            style={{ ...btnBase, color: showList ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)", padding: 6 }}>
            <List size={15} />
          </button>
          {/* 上一首 */}
          <button onClick={goPrev} style={{ ...btnBase, color: "rgba(255,255,255,0.75)", padding: 6 }}>
            <SkipBack size={17} strokeWidth={2} />
          </button>
          {/* 播放/暂停（紧凑 32px 毛玻璃圆） */}
          <button onClick={() => setPlaying(v => !v)}
            style={{
              width: 36, height: 36,
              borderRadius: "50%", cursor: "pointer",
              background: "rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
            }}>
            {playing
              ? <Pause  size={15} fill="currentColor" strokeWidth={0} />
              : <Play   size={15} fill="currentColor" strokeWidth={0} style={{ marginLeft: 1 }} />}
          </button>
          {/* 下一首 */}
          <button onClick={goNext} style={{ ...btnBase, color: "rgba(255,255,255,0.75)", padding: 6 }}>
            <SkipForward size={17} strokeWidth={2} />
          </button>
          {/* 循环模式 */}
          <button
            onClick={() => setRepeatMode(m => m === "list" ? "single" : "list")}
            title={repeatMode === "list" ? "列表循环" : "单曲循环"}
            style={{ ...btnBase,
              color: "rgba(255,255,255,0.45)",
              padding: 6,
            }}>
            {repeatMode === "single"
              ? <Repeat1 size={15} strokeWidth={2} />
              : <Repeat  size={15} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".mp3,.flac,.ogg,.wav" className="hidden" onChange={handleUpload} />
      <style>{`@keyframes disc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
